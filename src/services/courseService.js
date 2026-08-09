import { deleteOne, find, findOne, insertOne, objectIdFilter, updateOne } from "./appwriteDbService.js";

const COURSES_COLLECTION = "courses";
const USERS_COLLECTION = "users";
const QUIZ_ATTEMPTS_COLLECTION = "quizAttempts";

export function extractYouTubeVideoId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const directId = raw.match(/^[a-zA-Z0-9_-]{11}$/);
  if (directId) return raw;

  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] || "";
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
      order: Number(unit.order || index + 1),
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

function normalizeResources(resources = []) {
  return resources
    .map((resource, index) => ({
      resourceId: resource.resourceId || `resource_${Date.now()}_${index}`,
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
    teacherId: course.teacherId || "",
    title: course.title || "",
    slug: course.slug || "",
    description: course.description || "",
    grade: course.grade || "",
    price: Number(course.price || 0),
    discountPercent: Number(course.discountPercent || 0),
    thumbnailUrl: course.thumbnailUrl || "",
    isPublished: course.isPublished !== false,
    units: course.units || [],
    resources: course.resources || [],
    quizzes: course.quizzes || [],
    studentsCount: Number(course.studentsCount || 0),
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
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

export async function createCourse({ teacherId, payload }) {
  const title = String(payload.title || "").trim();
  const thumbnailUrl = String(payload.thumbnailUrl || "").trim();
  const units = normalizeUnits(payload.units || []);
  const resources = normalizeResources(payload.resources || []);

  if (!title) throw new Error("اسم الكورس مطلوب.");
  if (!thumbnailUrl) throw new Error("صورة الكورس مطلوبة.");
  if (!units.length && !resources.length) throw new Error("لازم تضيف على الأقل درس فيديو أو ملف.");

  const now = new Date().toISOString();
  const created = await insertOne(COURSES_COLLECTION, {
    teacherId,
    title,
    slug: `${slugify(title) || "course"}-${Date.now()}`,
    description: String(payload.description || "").trim(),
    grade: String(payload.grade || "").trim(),
    price: Number(payload.price || 0),
    discountPercent: Number(payload.discountPercent || 0),
    thumbnailUrl,
    units,
    resources,
    quizzes: [],
    studentsCount: 0,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  });
  return mapCourse(created);
}

export async function deleteCourse(courseId) {
  await deleteOne(COURSES_COLLECTION, objectIdFilter(courseId));
}

async function loadCourses() {
  const data = await find(COURSES_COLLECTION, {
    filter: {},
    sort: { createdAt: -1 },
  });
  return data.map(mapCourse);
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
  const course = await findOne(COURSES_COLLECTION, { filter: objectIdFilter(courseId) });
  if (!course) throw new Error("الكورس غير موجود.");
  return mapCourse(course);
}

export async function addQuizToCourse(courseId, quizPayload) {
  const course = await getCourseById(courseId);
  const questions = normalizeQuestions(quizPayload.questions || []);
  if (!questions.length) throw new Error("لازم تضيف سؤالين اختيارات على الأقل في الكويز.");

  const quiz = {
    quizId: `quiz_${Date.now()}`,
    title: String(quizPayload.title || "").trim(),
    minutes: Number(quizPayload.minutes || 10),
    questionsCount: questions.length,
    order: Number(quizPayload.order || buildCourseContent(course).length + 1),
    questions,
  };

  const quizzes = [...(course.quizzes || []), quiz];
  await updateOne(COURSES_COLLECTION, {
    filter: objectIdFilter(courseId),
    update: { $set: { quizzes, updatedAt: new Date().toISOString() } },
  });
  return { ...course, quizzes };
}

export async function addResourceToCourse(courseId, resourcePayload) {
  const course = await getCourseById(courseId);
  const normalized = normalizeResources([
    {
      ...resourcePayload,
      resourceId: `resource_${Date.now()}`,
      order: Number(resourcePayload.order || buildCourseContent(course).length + 1),
    },
  ]);
  if (!normalized.length) throw new Error("الملف غير صالح.");

  const resources = [...(course.resources || []), normalized[0]];
  await updateOne(COURSES_COLLECTION, {
    filter: objectIdFilter(courseId),
    update: { $set: { resources, updatedAt: new Date().toISOString() } },
  });
  return { ...course, resources };
}

export async function enrollStudentInCourse({ uid, courseId }) {
  const user = await findOne(USERS_COLLECTION, { filter: { appwriteUserId: uid } });
  if (!user) throw new Error("المستخدم غير موجود.");
  const enrolledCourses = Array.from(new Set([...(user.enrolledCourses || []), courseId]));
  await updateOne(USERS_COLLECTION, {
    filter: { appwriteUserId: uid },
    update: { $set: { enrolledCourses, updatedAt: new Date().toISOString() } },
  });
}

export async function markLessonCompleted({ uid, courseId, unitId, totalUnits }) {
  const user = await findOne(USERS_COLLECTION, { filter: { appwriteUserId: uid } });
  if (!user) throw new Error("المستخدم غير موجود.");
  const progress = { ...(user.progress || {}) };
  const current = progress[courseId] || { watchedLessons: [], percentage: 0 };
  const watchedLessons = Array.from(new Set([...(current.watchedLessons || []), unitId]));
  progress[courseId] = {
    watchedLessons,
    percentage: Math.min(100, Math.round((watchedLessons.length / Math.max(Number(totalUnits || 1), 1)) * 100)),
    updatedAt: new Date().toISOString(),
  };
  await updateOne(USERS_COLLECTION, {
    filter: { appwriteUserId: uid },
    update: { $set: { progress, updatedAt: new Date().toISOString() } },
  });
}

export async function submitQuizAttempt({ uid, courseId, quiz }) {
  const questions = normalizeQuestions(quiz.questions || []);
  const totalPoints = questions.reduce((sum, question) => sum + Number(question.points || 1), 0);
  const earnedPoints = questions.reduce((sum, question) => {
    return sum + (Number(quiz.answers?.[question.questionId]) === Number(question.correctIndex) ? Number(question.points || 1) : 0);
  }, 0);
  const percentage = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const now = new Date().toISOString();

  await insertOne(QUIZ_ATTEMPTS_COLLECTION, {
    uid,
    courseId,
    quizId: quiz.quizId,
    quizTitle: quiz.title,
    earnedPoints,
    totalPoints,
    percentage,
    answers: quiz.answers || {},
    createdAt: now,
  });

  const user = await findOne(USERS_COLLECTION, { filter: { appwriteUserId: uid } });
  if (user) {
    const quizResults = { ...(user.quizResults || {}) };
    quizResults[courseId] = {
      ...(quizResults[courseId] || {}),
      [quiz.quizId]: { earnedPoints, totalPoints, percentage, updatedAt: now },
    };
    await updateOne(USERS_COLLECTION, {
      filter: { appwriteUserId: uid },
      update: { $set: { quizResults, updatedAt: now } },
    });
  }

  return { earnedPoints, totalPoints, percentage };
}

export function subscribeQuizAttempts(callback) {
  let active = true;
  const load = () =>
    find(QUIZ_ATTEMPTS_COLLECTION, { sort: { createdAt: -1 } })
      .then((items) => {
        if (active) callback(items);
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
  return find(USERS_COLLECTION, {
    filter: { role: "student" },
    sort: { createdAt: -1 },
  });
}

export async function blockStudent(uid) {
  await updateOne(USERS_COLLECTION, {
    filter: { appwriteUserId: uid },
    update: { $set: { isBlocked: true, updatedAt: new Date().toISOString() } },
  });
}

export async function unblockStudent(uid) {
  await updateOne(USERS_COLLECTION, {
    filter: { appwriteUserId: uid },
    update: { $set: { isBlocked: false, updatedAt: new Date().toISOString() } },
  });
}

export async function phoneExists(phone) {
  const normalized = String(phone || "").replace(/\D/g, "");
  if (!normalized) return false;
  return Boolean(await findOne(USERS_COLLECTION, { filter: { phone: normalized } }));
}

export async function emailExists(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  return Boolean(await findOne(USERS_COLLECTION, { filter: { email: normalized } }));
}
