/**
 * courseService.js
 * All course-related API calls go through the .NET backend.
 */

import apiClient from "../lib/apiClient.js";

// ─── YouTube ID extractor (pure utility — no backend needed) ────
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

// ─── Build course content list (for sorting videos/resources/quizzes) ──
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

function extractErrorMessage(error) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.title ||
    error?.response?.data?.message ||
    error?.message ||
    "حدث خطأ غير متوقع."
  );
}

// ─── Map backend CourseResponse → frontend course shape ──────────
function mapCourse(course) {
  return {
    id: course.id || course.idText || "",
    teacherId: course.teacherId || "",
    title: course.title || "",
    slug: course.slug || "",
    description: course.description || "",
    grade: course.grade || "",
    price: Number(course.price || 0),
    discountPercent: Number(course.discountPercent || 0),
    thumbnailUrl: course.thumbnailUrl || "",
    isPublished: course.isPublished !== false,
    units: Array.isArray(course.units) ? course.units : [],
    resources: Array.isArray(course.resources) ? course.resources : [],
    quizzes: Array.isArray(course.quizzes) ? course.quizzes : [],
    modules: Array.isArray(course.modules) ? course.modules : [],
    studentsCount: Number(course.studentsCount || 0),
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

// ─── Course CRUD ─────────────────────────────────────────────────

export async function createCourse({ teacherId, payload }) {
  try {
    const { data } = await apiClient.post("/api/courses", {
      title: String(payload.title || "").trim(),
      description: String(payload.description || "").trim(),
      grade: String(payload.grade || "").trim(),
      price: Number(payload.price || 0),
      discountPercent: Number(payload.discountPercent || 0),
      thumbnailUrl: String(payload.thumbnailUrl || "").trim(),
      isPublished: payload.isPublished !== false,
      units: payload.units || [],
      resources: payload.resources || [],
      quizzes: payload.quizzes || [],
    });
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function updateCourse(courseId, payload) {
  try {
    const { data } = await apiClient.put(`/api/courses/${courseId}`, {
      title: String(payload.title || "").trim(),
      description: String(payload.description || "").trim(),
      grade: String(payload.grade || "").trim(),
      price: Number(payload.price || 0),
      discountPercent: Number(payload.discountPercent || 0),
      thumbnailUrl: String(payload.thumbnailUrl || "").trim(),
      isPublished: payload.isPublished !== false,
      slug: payload.slug || "",
      units: payload.units || [],
      resources: payload.resources || [],
      quizzes: payload.quizzes || [],
    });
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function deleteCourse(courseId) {
  try {
    await apiClient.delete(`/api/courses/${courseId}`);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getCourseById(courseId) {
  try {
    const { data } = await apiClient.get(`/api/courses/${courseId}`);
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ─── Course listing with polling ────────────────────────────────

async function loadCourses(includeUnpublished = false) {
  const { data } = await apiClient.get("/api/courses", {
    params: { includeUnpublished },
  });
  return Array.isArray(data) ? data.map(mapCourse) : [];
}

/**
 * Subscribe to courses list with periodic refresh.
 * Returns an unsubscribe function.
 */
export function subscribeCourses(callback, includeUnpublished = false) {
  let active = true;

  const load = () =>
    loadCourses(includeUnpublished)
      .then((items) => {
        if (active) callback(items);
      })
      .catch(() => {
        if (active) callback([]);
      });

  load();
  const timer = setInterval(load, 10000);
  return () => {
    active = false;
    clearInterval(timer);
  };
}

// ─── Modules & Lessons ──────────────────────────────────────────

export async function addModuleToCourse(courseId, modulePayload) {
  try {
    const { data } = await apiClient.post(`/api/courses/${courseId}/modules`, {
      title: String(modulePayload.title || "").trim(),
      sortOrder: Number(modulePayload.sortOrder || modulePayload.order || 1),
    });
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function addLessonToModule(moduleId, lessonPayload) {
  try {
    const { data } = await apiClient.post(`/api/courses/modules/${moduleId}/lessons`, {
      title: String(lessonPayload.title || "").trim(),
      content: String(lessonPayload.content || "").trim(),
      videoUrl: String(lessonPayload.videoUrl || lessonPayload.youtubeVideoId || "").trim(),
      sortOrder: Number(lessonPayload.sortOrder || lessonPayload.order || 1),
      isPreview: Boolean(lessonPayload.isPreview || lessonPayload.isFree),
    });
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ─── Quizzes ────────────────────────────────────────────────────

export async function addQuizToCourse(courseId, quizPayload) {
  try {
    const { data } = await apiClient.post(`/api/courses/${courseId}/quizzes`, {
      quizId: quizPayload.quizId || "",
      title: String(quizPayload.title || "").trim(),
      minutes: Number(quizPayload.minutes || 10),
      questionsCount: Number(quizPayload.questionsCount || (quizPayload.questions || []).length),
      order: Number(quizPayload.order || 1),
      questions: (quizPayload.questions || []).map((q, index) => ({
        questionId: q.questionId || `question_${index + 1}`,
        prompt: String(q.prompt || "").trim(),
        choices: (q.choices || []).map((c) => String(c || "").trim()).filter(Boolean),
        correctIndex: Number(q.correctIndex || 0),
        points: Number(q.points || 1),
      })),
    });
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ─── Resources ──────────────────────────────────────────────────

export async function addResourceToCourse(courseId, resourcePayload) {
  try {
    const { data } = await apiClient.post(`/api/courses/${courseId}/resources`, {
      resourceId: resourcePayload.resourceId || "",
      title: String(resourcePayload.title || "").trim(),
      fileUrl: String(resourcePayload.fileUrl || "").trim(),
      fileName: String(resourcePayload.fileName || "").trim(),
      fileType: String(resourcePayload.fileType || "").trim(),
      order: Number(resourcePayload.order || 1),
      isFree: Boolean(resourcePayload.isFree),
    });
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ─── Enrollment ─────────────────────────────────────────────────

export async function enrollStudentInCourse({ uid, courseId }) {
  try {
    await apiClient.post(`/api/courses/${courseId}/enroll`);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ─── Progress ───────────────────────────────────────────────────

export async function markLessonCompleted({ uid, courseId, unitId, totalUnits }) {
  try {
    await apiClient.post(`/api/courses/${courseId}/progress/lessons`, {
      unitId,
      totalUnits: Number(totalUnits || 1),
    });
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ─── Quiz Attempts ──────────────────────────────────────────────

export async function submitQuizAttempt({ uid, courseId, quiz }) {
  try {
    const { data } = await apiClient.post(`/api/courses/${courseId}/quiz-attempts`, {
      quizId: quiz.quizId || "",
      quizTitle: quiz.title || "",
      questions: (quiz.questions || []).map((q, index) => ({
        questionId: q.questionId || `question_${index + 1}`,
        prompt: String(q.prompt || "").trim(),
        choices: q.choices || [],
        correctIndex: Number(q.correctIndex || 0),
        points: Number(q.points || 1),
      })),
      answers: quiz.answers || {},
    });
    return {
      earnedPoints: data.earnedPoints,
      totalPoints: data.totalPoints,
      percentage: data.percentage,
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export function subscribeQuizAttempts(callback) {
  let active = true;

  const load = () =>
    apiClient
      .get("/api/courses/quiz-attempts")
      .then(({ data }) => {
        if (active) callback(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) callback([]);
      });

  load();
  const timer = setInterval(load, 10000);
  return () => {
    active = false;
    clearInterval(timer);
  };
}

// ─── Students (Teacher/Admin) ────────────────────────────────────

export async function getTenantStudents() {
  try {
    const { data } = await apiClient.get("/api/users/students");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function blockStudent(uid) {
  try {
    await apiClient.patch(`/api/users/${uid}/block`);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function unblockStudent(uid) {
  try {
    await apiClient.patch(`/api/users/${uid}/unblock`);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ─── Email/Phone existence checks ───────────────────────────────

export async function phoneExists(phone) {
  // These checks are done server-side during registration
  // Return false here; backend will throw 400 if duplicate
  return false;
}

export async function emailExists(email) {
  // These checks are done server-side during registration
  // Return false here; backend will throw 400 if duplicate
  return false;
}
