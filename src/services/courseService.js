import { api } from "./apiClient.js";

export function extractYouTubeVideoId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const directId = raw.match(/^[a-zA-Z0-9_-]{11}$/);
  if (directId) return raw;

  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/").filter(Boolean)[1] || "";
      }
      return url.searchParams.get("v") || "";
    }
  } catch {
    const match = raw.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] || "";
  }

  return "";
}

function normalizeUnits(units = []) {
  return units
    .map((unit, index) => ({
      unitId: unit.unitId || `unit_${index + 1}`,
      order: Number.isFinite(unit.order) ? unit.order : index + 1,
      title: String(unit.title || "").trim(),
      youtubeVideoId: extractYouTubeVideoId(unit.youtubeVideoId),
      isFree: Boolean(unit.isFree),
    }))
    .filter((unit) => unit.title && unit.youtubeVideoId);
}

function normalizeQuestions(questions = []) {
  return questions
    .map((question, index) => ({
      questionId: question.questionId || `question_${index + 1}`,
      prompt: String(question.prompt || "").trim(),
      choices: (question.choices || []).map((choice) => String(choice || "").trim()).filter(Boolean).slice(0, 4),
      correctIndex: Number(question.correctIndex || 0),
      points: Number(question.points || 1),
    }))
    .filter((question) => question.prompt && question.choices.length >= 2 && question.correctIndex < question.choices.length);
}

function normalizeQuizzes(quizzes = []) {
  return quizzes
    .map((quiz, index) => ({
      quizId: quiz.quizId || `quiz_${index + 1}`,
      title: String(quiz.title || "").trim(),
      minutes: Number(quiz.minutes || 10),
      questionsCount: Number(quiz.questionsCount || quiz.questions?.length || 0),
      order: Number.isFinite(quiz.order) ? quiz.order : index + 1,
      questions: normalizeQuestions(quiz.questions || []),
    }))
    .filter((quiz) => quiz.title);
}

function normalizeResources(resources = []) {
  return resources
    .map((resource, index) => ({
      resourceId: resource.resourceId || `resource_${index + 1}`,
      title: String(resource.title || "").trim(),
      fileUrl: String(resource.fileUrl || "").trim(),
      fileName: String(resource.fileName || "").trim(),
      fileType: String(resource.fileType || "").trim(),
      order: Number(resource.order || index + 1),
      isFree: Boolean(resource.isFree),
    }))
    .filter((resource) => resource.title && resource.fileUrl);
}

function mapCourse(course) {
  return {
    id: course.id,
    teacherId: course.teacherId,
    title: course.title,
    slug: course.slug,
    description: course.description || "",
    grade: course.grade || "",
    price: Number(course.price || 0),
    discountPercent: Number(course.discountPercent || 0),
    thumbnailUrl: course.thumbnailUrl || "",
    isPublished: Boolean(course.isPublished),
    units: course.units || [],
    resources: course.resources || [],
    quizzes: course.quizzes || [],
    studentsCount: Number(course.studentsCount || 0),
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

export function buildCourseContent(course = {}) {
  const videos = (course.units || []).map((unit) => ({ ...unit, type: "video", sortOrder: Number(unit.order || 0) }));
  const resources = (course.resources || []).map((resource) => ({
    ...resource,
    type: "resource",
    sortOrder: Number(resource.order || 0),
  }));
  const quizzes = (course.quizzes || []).map((quiz) => ({ ...quiz, type: "quiz", sortOrder: Number(quiz.order || 0) }));
  return [...videos, ...resources, ...quizzes].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createCourse({ payload }) {
  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim();
  const grade = String(payload.grade || "").trim();
  const price = Number(payload.price || 0);
  const discountPercent = Number(payload.discountPercent || 0);
  const thumbnailUrl = String(payload.thumbnailUrl || "").trim();
  const units = normalizeUnits(payload.units || []);
  const resources = normalizeResources(payload.resources || []);

  if (!title) throw new Error("اسم الكورس مطلوب.");
  if (!thumbnailUrl) throw new Error("صورة الكورس مطلوبة.");
  if (!units.length && !resources.length) throw new Error("لازم تضيف على الأقل درس فيديو أو ملف.");

  const created = await api.post("/courses", {
    title,
    description,
    grade,
    price,
    discountPercent,
    thumbnailUrl,
    units,
    resources,
    isPublished: true,
  });
  return mapCourse(created);
}

export async function deleteCourse(courseId) {
  await api.delete(`/courses/${courseId}`);
}

async function loadCourses() {
  const data = await api.get("/courses?includeUnpublished=true");
  return (data || []).map(mapCourse);
}

export function subscribeCourses(callback) {
  let active = true;
  const load = () =>
    loadCourses()
      .then((items) => {
        if (active) callback(items);
      })
      .catch(() => {
        if (active) callback([]);
      });

  load();
  const timer = setInterval(load, 7000);
  return () => {
    active = false;
    clearInterval(timer);
  };
}

export async function getCourseById(courseId) {
  const course = await api.get(`/courses/${courseId}?includeUnpublished=true`);
  return mapCourse(course);
}

export async function addQuizToCourse(courseId, quizPayload) {
  const course = await getCourseById(courseId);
  if (!course) throw new Error("الكورس غير موجود.");

  const questions = normalizeQuestions(quizPayload.questions || []);
  if (!questions.length) throw new Error("لازم تضيف سؤالين اختيارات على الأقل في الكويز.");

  const next = await api.post(`/courses/${courseId}/quizzes`, {
    quizId: `quiz_${Date.now()}`,
    title: String(quizPayload.title || "").trim(),
    minutes: Number(quizPayload.minutes || 10),
    questionsCount: questions.length,
    order: Number(quizPayload.order || buildCourseContent(course).length + 1),
    questions,
  });
  return mapCourse(next);
}

export async function addResourceToCourse(courseId, resourcePayload) {
  const course = await getCourseById(courseId);
  if (!course) throw new Error("الكورس غير موجود.");

  const normalized = normalizeResources([
    {
      ...resourcePayload,
      resourceId: `resource_${Date.now()}`,
      order: Number(resourcePayload.order || buildCourseContent(course).length + 1),
    },
  ]);
  if (!normalized.length) throw new Error("الملف غير صالح.");

  const next = await api.post(`/courses/${courseId}/resources`, normalized[0]);
  return mapCourse(next);
}

export async function enrollStudentInCourse({ courseId }) {
  await api.post(`/courses/${courseId}/enroll`, {});
}

export async function markLessonCompleted({ courseId, unitId, totalUnits }) {
  await api.post(`/courses/${courseId}/progress/lessons`, {
    unitId,
    totalUnits: Number(totalUnits || 1),
  });
}

export async function submitQuizAttempt({ courseId, quiz }) {
  return api.post(`/courses/${courseId}/quiz-attempts`, {
    quizId: quiz.quizId,
    quizTitle: quiz.title,
    answers: quiz.answers || {},
    questions: normalizeQuestions(quiz.questions || []),
  });
}

export function subscribeQuizAttempts(callback) {
  let active = true;
  const load = () =>
    api
      .get("/courses/quiz-attempts")
      .then((items) => {
        if (active) callback(items || []);
      })
      .catch(() => {
        if (active) callback([]);
      });

  load();
  const timer = setInterval(load, 8000);
  return () => {
    active = false;
    clearInterval(timer);
  };
}

export async function getTenantStudents() {
  return api.get("/users/students");
}

export async function blockStudent(uid) {
  await api.patch(`/users/${uid}/block`, {});
}

export async function unblockStudent(uid) {
  await api.patch(`/users/${uid}/unblock`, {});
}

export async function phoneExists(phone) {
  const normalized = String(phone || "").replace(/\D/g, "");
  if (!normalized) return false;
  const students = await getTenantStudents();
  return students.some((student) => String(student.phone || "") === normalized);
}

export async function emailExists(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  const students = await getTenantStudents();
  return students.some((student) => String(student.email || "").trim().toLowerCase() === normalized);
}
