/**
 * courseService.js
 * All course-related API calls go through the .NET backend.
 */

import apiClient from "../lib/apiClient.js";

const requestConfig = { skipGlobalErrorToast: true };

// ─── YouTube ID extractor (pure utility — no backend needed) ────
export function extractYouTubeVideoId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const directId = raw.match(/^[a-zA-Z0-9_-]{11}$/);
  if (directId) return raw;

  const fallbackMatch = raw.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0]?.slice(0, 11) || "";
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/").filter(Boolean)[1] || "";
      }
      return url.searchParams.get("v") || "";
    }
  } catch {
    return fallbackMatch?.[1] || "";
  }

  if (fallbackMatch?.[1]) return fallbackMatch[1];
  return "";
}

export function extractGoogleDriveFileId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const directId = raw.match(/^[a-zA-Z0-9_-]{20,}$/);
  if (directId) return raw;

  const fallbackMatch = raw.match(/(?:\/file\/d\/|\/d\/|id=)([a-zA-Z0-9_-]{20,})/);
  if (fallbackMatch?.[1]) return fallbackMatch[1];

  try {
    const url = new URL(raw);
    if (!url.hostname.includes("drive.google.com")) return "";
    const filePathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (filePathMatch?.[1]) return filePathMatch[1];
    return url.searchParams.get("id") || "";
  } catch {
    const partialPathMatch = raw.match(/([a-zA-Z0-9_-]{20,})(?:\/view|\?|$)/);
    return partialPathMatch?.[1] || "";
  }
}

function mapLessonVideo(lesson, module, index) {
  const videoUrl = lesson.videoUrl || "";
  return {
    unitId: lesson.id || `lesson_${module?.id || "module"}_${index + 1}`,
    lessonId: lesson.id || "",
    moduleId: module?.id || "",
    moduleTitle: module?.title || "",
    order: Number(lesson.sortOrder || index + 1),
    title: lesson.title || "",
    content: lesson.content || "",
    youtubeVideoId: extractYouTubeVideoId(videoUrl),
    driveFileId: extractGoogleDriveFileId(videoUrl),
    videoUrl,
    isFree: Boolean(lesson.isPreview),
    isPreview: Boolean(lesson.isPreview),
  };
}

// ─── Build course content list (for sorting videos/resources/quizzes) ──
export function buildCourseContent(course = {}) {
  const videos = (course.units || []).map((unit) => ({ ...unit, type: "video", sortOrder: Number(unit.order || 0) }));
  const moduleVideos = (course.modules || []).flatMap((module) =>
    (module.lessons || []).map((lesson, index) => ({
      ...mapLessonVideo(lesson, module, index),
      type: "video",
      sortOrder: Number(lesson.sortOrder || index + 1),
    }))
  );
  const resources = (course.resources || []).map((resource) => ({
    ...resource,
    type: "resource",
    sortOrder: Number(resource.order || 0),
  }));
  const quizzes = (course.quizzes || []).map((quiz) => ({ ...quiz, type: "quiz", sortOrder: Number(quiz.order || 0) }));
  return [...videos, ...moduleVideos, ...resources, ...quizzes].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    if (timeA !== timeB) return timeA - timeB; // Oldest first (FIFO)
    return (a.sortOrder || 0) - (b.sortOrder || 0); // fallback to order if same time
  });
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
    hasFullAccess: Boolean(course.hasFullAccess),
    unlockedLectureIds: Array.isArray(course.unlockedLectureIds) ? course.unlockedLectureIds : [],
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

export async function getCourseGrades() {
  try {
    const { data } = await apiClient.get("/api/courses/grades", requestConfig);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

// ─── Course CRUD ─────────────────────────────────────────────────

export async function createCourse(input) {
  const payload = input?.payload || input || {};
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
    }, requestConfig);
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function updateCourse(courseId, input) {
  const payload = input?.payload || input || {};
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
    }, requestConfig);
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function deleteLesson(lessonId) {
  try {
    await apiClient.delete(`/api/lessons/${lessonId}`, requestConfig);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function deleteCourse(courseId) {
  try {
    await apiClient.delete(`/api/courses/${courseId}`, requestConfig);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getCourseById(courseId, options = {}) {
  try {
    const { data } = await apiClient.get(`/api/courses/${courseId}`, {
      params: { includeUnpublished: Boolean(options.includeUnpublished) },
      ...requestConfig,
    });
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

const FALLBACK_COURSES = [
  {
    id: "d93d33f9-3155-4076-a6cf-6c5d781de68b",
    idText: "d93d33f9-3155-4076-a6cf-6c5d781de68b",
    teacherId: "00000000-0000-0000-0000-000000000000",
    title: "كيمياء 1 - الترم الأول (الاتزان الكيميائي)",
    slug: "chemistry-term-one",
    description: "كورس تجريبي غني بالفيديوهات والملفات والكويزات يوضح تجربة المنصة الكاملة في الاتزان الكيميائي.",
    grade: "الصف الثالث الثانوي",
    price: 199.0,
    discountPercent: 25,
    thumbnailUrl: "https://images.unsplash.com/photo-1532634896-26909d0d7b2c?q=80&w=1200&auto=format&fit=crop",
    isPublished: true,
    studentsCount: 154,
    createdAt: "2026-08-10T12:00:00Z",
    updatedAt: "2026-08-10T12:00:00Z",
    units: [
      { unitId: "unit_1", order: 1, title: "مقدمة في الاتزان الكيميائي", youtubeVideoId: "dQw4w9WgXcQ", isFree: true },
      { unitId: "unit_2", order: 2, title: "ثابت الاتزان Kc والتفاعلات الانعكاسية", youtubeVideoId: "M7lc1UVf-VE", isFree: false },
      { unitId: "unit_3", order: 3, title: "تأثير العوامل المختلفة على الاتزان", youtubeVideoId: "ysz5S6PUM-U", isFree: false }
    ],
    resources: [
      { resourceId: "resource_1", order: 1, title: "ملخص الباب الثالث - الاتزان", fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", fileName: "equilibrium-summary.pdf", fileType: "pdf", isFree: true }
    ],
    quizzes: [
      {
        quizId: "quiz_1",
        title: "اختبار الاتزان التفاعلي الأول",
        minutes: 20,
        questionsCount: 2,
        isMandatory: true,
        questions: [
          { questionId: "q1", prompt: "ما رمز ثابت الاتزان؟", choices: ["Kc", "Ke", "Ka", "Kb"], correctIndex: 0, points: 2 },
          { questionId: "q2", prompt: "عند الاتزان تكون السرعتان متساويتين؟", choices: ["نعم متساويتان", "لا غير متساويتين"], correctIndex: 0, points: 3 }
        ]
      }
    ],
    modules: []
  }
];

// ─── Course listing with polling ────────────────────────────────

async function loadCourses(includeUnpublished = false) {
  try {
    const { data } = await apiClient.get("/api/courses", {
      params: { includeUnpublished },
      ...requestConfig,
    });
    if (Array.isArray(data) && data.length > 0) {
      return data.map(mapCourse);
    }
    return FALLBACK_COURSES;
  } catch {
    return FALLBACK_COURSES;
  }
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
        if (active) callback(items && items.length > 0 ? items : FALLBACK_COURSES);
      })
      .catch(() => {
        if (active) callback(FALLBACK_COURSES);
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
    }, requestConfig);
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
    }, requestConfig);
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
      isMandatory: Boolean(quizPayload.isMandatory),
      questions: (quizPayload.questions || []).map((q, index) => ({
        questionId: q.questionId || `question_${index + 1}`,
        prompt: String(q.prompt || "").trim(),
        questionImageUrl: String(q.questionImageUrl || "").trim(),
        choices: (q.choices || []).map((c) => String(c || "").trim()).filter(Boolean),
        correctIndex: Number(q.correctIndex || 0),
        points: Number(q.points || 1),
      })),
    }, requestConfig);
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

function mapExam(exam) {
  return {
    id: exam.id || exam.idText || "",
    courseId: exam.courseId || "",
    courseTitle: exam.courseTitle || "",
    title: exam.title || "",
    description: exam.description || "",
    imageUrl: exam.imageUrl || "",
    price: Number(exam.price || 0),
    isFree: Boolean(exam.isFree || Number(exam.price || 0) === 0),
    isPublished: exam.isPublished !== false,
    minutes: Number(exam.minutes || 30),
    questionsCount: Number(exam.questionsCount || (exam.questions || []).length),
    questions: Array.isArray(exam.questions) ? exam.questions : [],
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
  };
}

export async function createExam(payload) {
  try {
    const { data } = await apiClient.post("/api/exams", {
      courseId: payload.courseId || null,
      title: String(payload.title || "").trim(),
      description: String(payload.description || "").trim(),
      imageUrl: String(payload.imageUrl || payload.thumbnailUrl || "").trim(),
      price: payload.isFree ? 0 : Number(payload.price || 0),
      isFree: Boolean(payload.isFree),
      isPublished: payload.isPublished !== false,
      minutes: Number(payload.minutes || 30),
      questions: (payload.questions || []).map((q, index) => ({
        questionId: q.questionId || `question_${index + 1}`,
        prompt: String(q.prompt || "").trim(),
        questionImageUrl: String(q.questionImageUrl || "").trim(),
        choices: (q.choices || []).map((c) => String(c || "").trim()).filter(Boolean),
        correctIndex: Number(q.correctIndex || 0),
        points: Number(q.points || 1),
      })),
    }, requestConfig);
    return mapExam(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export function subscribeExams(callback, includeUnpublished = false) {
  let active = true;

  const load = () =>
    apiClient
      .get("/api/exams", {
        params: { includeUnpublished },
        ...requestConfig,
      })
      .then(({ data }) => {
        if (active) callback(Array.isArray(data) ? data.map(mapExam) : []);
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
    }, requestConfig);
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function deleteResourceFromCourse(courseId, resourceId) {
  try {
    const { data } = await apiClient.delete(`/api/courses/${courseId}/resources/${resourceId}`, requestConfig);
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function deleteQuizFromCourse(courseId, quizId) {
  try {
    const { data } = await apiClient.delete(`/api/courses/${courseId}/quizzes/${quizId}`, requestConfig);
    return mapCourse(data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ─── Enrollment ─────────────────────────────────────────────────

export async function enrollStudentInCourse({ uid, courseId }) {
  try {
    await apiClient.post(`/api/courses/${courseId}/enroll`, null, requestConfig);
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
    }, requestConfig);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ─── Quiz Attempts ──────────────────────────────────────────────

export async function submitQuizAttempt({ uid, courseId, quiz, timeSpentSeconds = 0 }) {
  try {
    const answers = {};
    const textAnswers = {};
    if (quiz.answers) {
      Object.entries(quiz.answers).forEach(([qId, ans]) => {
        if (typeof ans === "number") {
          answers[qId] = ans;
        } else if (typeof ans === "string") {
          textAnswers[qId] = ans;
        }
      });
    }

    const { data } = await apiClient.post(`/api/courses/${courseId}/quiz-attempts`, {
      quizId: quiz.quizId || "",
      quizTitle: quiz.title || "",
      questions: (quiz.questions || []).map((q, index) => ({
        questionId: q.questionId || `question_${index + 1}`,
        type: q.type || (q.choices && q.choices.length > 0 ? "mcq" : "essay"),
        prompt: String(q.prompt || "").trim(),
        choices: q.choices || [],
        correctIndex: Number(q.correctIndex || 0),
        points: Number(q.points || 1),
        modelAnswer: q.modelAnswer || null,
        gradingRubric: q.gradingRubric || null,
      })),
      answers,
      textAnswers,
      timeSpentSeconds: Number(timeSpentSeconds || 0),
    }, requestConfig);
    return {
      id: data.id,
      earnedPoints: data.earnedPoints,
      totalPoints: data.totalPoints,
      percentage: data.percentage,
      timeSpentSeconds: data.timeSpentSeconds ?? Number(timeSpentSeconds || 0),
      createdAt: data.createdAt,
      evaluations: data.evaluations || {},
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export function subscribeQuizAttempts(callback) {
  let active = true;

  const load = () =>
    apiClient
      .get("/api/courses/quiz-attempts", requestConfig)
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
    const { data } = await apiClient.get("/api/users/students", requestConfig);
    const list = Array.isArray(data) ? data : [];
    // Filter out code-only placeholder accounts (e.g. "طالب (كود ...)")
    return list.filter(s => {
      const name = String(s.name || s.fullName || "").trim();
      const email = String(s.email || "").trim().toLowerCase();
      const isCode = name.includes("كود") || name.startsWith("طالب (كود") || email.startsWith("code_") || email.endsWith("@student.lms");
      return !isCode;
    });
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function blockStudent(uid) {
  try {
    await apiClient.patch(`/api/users/${uid}/block`, null, requestConfig);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function unblockStudent(uid) {
  try {
    await apiClient.patch(`/api/users/${uid}/unblock`, null, requestConfig);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function submitExamAttempt({ examId, answers, timeSpentSeconds = 0 }) {
  try {
    const { data } = await apiClient.post(`/api/exams/${examId}/attempt`, {
      answers,
      timeSpentSeconds: Number(timeSpentSeconds || 0),
    }, requestConfig);
    return {
      earnedPoints: data.earnedPoints,
      totalPoints: data.totalPoints,
      percentage: data.percentage,
      timeSpentSeconds: data.timeSpentSeconds ?? Number(timeSpentSeconds || 0),
      createdAt: data.createdAt,
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function deleteExam(examId) {
  try {
    await apiClient.delete(`/api/exams/${examId}`, requestConfig);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function parseExamDocument(file, onUploadProgress) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post("/api/exams/parse-document", formData, {
      ...requestConfig,
      timeout: 240000, // 4 minutes timeout for deep AI analysis of large exams
      headers: {
        ...requestConfig.headers,
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(percent);
        }
      },
    });
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

