import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CirclePlay,
  FileText,
  HelpCircle,
  Lock,
  BookOpen,
  GraduationCap,
  Clock,
  Users,
  Star,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  buildCourseContent,
  getCourseById,
  markLessonCompleted,
  submitQuizAttempt,
  enrollStudentInCourse,
  deleteQuizFromCourse,
  deleteLesson,
  deleteResourceFromCourse,
} from "../services/courseService.js";
import AppHeader from "../components/AppHeader.jsx";
import Footer from "../components/Footer.jsx";
import QuizRunner from "../components/QuizRunner.jsx";
import StudentVideoPlayer from "../components/StudentVideoPlayer.jsx";

function mandatoryQuizLockReason(item, index, contentItems, quizResults = {}) {
  for (let i = 0; i < index; i += 1) {
    const previous = contentItems[i];
    if (previous?.type === "quiz" && previous.isMandatory && !quizResults[previous.quizId]) {
      return "يجب اجتياز الكويز أولًا لفتح المحتوى التالي";
    }
  }
  return "";
}

export default function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [course, setCourse] = useState(null);
  const [selectedContentIndex, setSelectedContentIndex] = useState(0);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [error, setError] = useState("");

  const isTeacher = ["teacher", "admin", "developer"].includes(String(user?.role || "").toLowerCase());
  const watchedLessons = useMemo(
    () => user?.progress?.[courseId]?.watchedLessons || [],
    [user?.progress, courseId]
  );
  const enrolled = useMemo(
    () => (user?.enrolledCourses || []).includes(courseId),
    [user?.enrolledCourses, courseId]
  );
  const finalPrice = course ? Math.max(0, course.price * (1 - (course.discountPercent || 0) / 100)) : 0;
  const isFree = finalPrice === 0;
  // Teacher can always access everything
  const hasAccess = isTeacher || enrolled || isFree;

  useEffect(() => {
    let mounted = true;
    getCourseById(courseId, { includeUnpublished: isTeacher })
      .then((result) => { if (mounted) setCourse(result); })
      .catch(() => { if (mounted) setError("تعذر تحميل الكورس."); });
    return () => { mounted = false; };
  }, [courseId, isTeacher]);

  // Auto-enroll student in free courses silently so backend endpoints work
  useEffect(() => {
    if (!course || !user || isTeacher) return;
    if (isFree && !enrolled) {
      enrollStudentInCourse({ uid: user.uid, courseId })
        .then(() => refreshProfile())
        .catch(() => {});
    }
  }, [course?.id, isFree, enrolled, isTeacher, user?.uid, courseId, refreshProfile]);

  const units = useMemo(() => {
    if (!course?.units) return [];
    return [...course.units].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [course?.units]);

  const quizzes = useMemo(() => {
    if (!course?.quizzes) return [];
    return [...course.quizzes].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [course?.quizzes]);

  const rawContentItems = useMemo(() => buildCourseContent(course || {}), [course]);

  const allVideosCount = useMemo(() => rawContentItems.filter((item) => item.type === "video").length, [rawContentItems]);
  const allResourcesCount = useMemo(() => rawContentItems.filter((item) => item.type === "resource").length, [rawContentItems]);
  const allQuizzesCount = useMemo(() => rawContentItems.filter((item) => item.type === "quiz").length, [rawContentItems]);

  const userAllowedUnitsForCourse = user?.allowedUnits?.[courseId] || user?.allowedUnits?.[course?.id];
  const isSelectiveCodeStudent = !isTeacher && Array.isArray(userAllowedUnitsForCourse) && userAllowedUnitsForCourse.length > 0;

  const contentItems = useMemo(() => {
    if (isTeacher || !isSelectiveCodeStudent) return rawContentItems;
    // Selective Code student: ONLY show allowed lectures, PDFs, and quizzes!
    return rawContentItems.filter((item) => {
      const ids = [item.id, item.unitId, item.lessonId, item.resourceId, item.quizId].filter(Boolean);
      return ids.some((id) => userAllowedUnitsForCourse.includes(id));
    });
  }, [rawContentItems, isTeacher, isSelectiveCodeStudent, userAllowedUnitsForCourse]);

  const selectedContent = contentItems[selectedContentIndex] || null;
  const courseQuizResults = user?.quizResults?.[courseId] || {};
  const selectedUnit =
    selectedContent?.type === "video"
      ? selectedContent
      : units.find((u) => u.unitId === selectedContent?.unitId) || null;
  const selectedUnitIndex = selectedUnit
    ? units.findIndex((u) => u.unitId === selectedUnit.unitId)
    : -1;
  const selectedMandatoryLockReason = selectedContent
    ? mandatoryQuizLockReason(selectedContent, selectedContentIndex, contentItems, courseQuizResults)
    : "";
  // Teacher sees everything; enrolled students see enrolled content; non-enrolled see only free
  const selectedUnlocked = selectedContent
    ? isTeacher ||
      !selectedMandatoryLockReason &&
        (selectedContent.isFree || hasAccess)
    : false;

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/courses");
  }

  async function completeLesson() {
    if (!selectedUnit || !hasAccess || watchedLessons.includes(selectedUnit.unitId)) return;
    setIsSavingProgress(true);
    setError("");
    try {
      await markLessonCompleted({
        uid: user.uid,
        courseId,
        unitId: selectedUnit.unitId,
        totalUnits: units.length,
      });
      await refreshProfile();
    } catch (saveError) {
      setError(saveError.message || "تعذر حفظ تقدم الدرس.");
    } finally {
      setIsSavingProgress(false);
    }
  }

  function closeQuizRunner() {
    const fallbackIndex = contentItems.findIndex((item) => item.type !== "quiz");
    if (fallbackIndex >= 0 && fallbackIndex !== selectedContentIndex) {
      setSelectedContentIndex(fallbackIndex);
    } else {
      navigate("/courses");
    }
  }

  async function handleDeleteItem(item, e) {
    if (e) e.stopPropagation();
    const itemTypeName = item.type === "quiz" ? "الكويز" : item.type === "resource" ? "الملف" : "المحاضرة";
    if (!window.confirm(`هل أنت متأكد من حذف ${itemTypeName} (${item.title}) نهائياً من الكورس؟`)) return;
    
    try {
      if (item.type === "quiz") {
        await deleteQuizFromCourse(courseId, item.quizId);
      } else if (item.type === "resource") {
        await deleteResourceFromCourse(courseId, item.resourceId);
      } else if (item.type === "video") {
        await deleteLesson(item.lessonId);
      }
      
      const refreshed = await getCourseById(courseId, { includeUnpublished: isTeacher });
      setCourse(refreshed);
      setSelectedContentIndex(0);
    } catch (err) {
      alert(err.message || "تعذر حذف العنصر.");
    }
  }

  if (!course) {
    return (
      <div dir="rtl" className="min-h-screen bg-white dark:bg-slate-950 font-['Cairo',sans-serif]">
        <AppHeader active="/courses" />
        <main className="max-w-5xl mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-cyan-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-[#0077B6]" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-bold">
            {error || "جارٍ تحميل تفاصيل الكورس..."}
          </p>
        </main>
      </div>
    );
  }

  const isQuizSelected = selectedContent?.type === "quiz" && selectedUnlocked;

  if (isQuizSelected) {
    return (
      <div dir="rtl" className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Cairo',sans-serif] transition-colors duration-500">
        <AppHeader active="/courses" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <QuizRunner
            key={`quiz-${selectedContent.quizId || selectedContentIndex}`}
            quiz={selectedContent}
            embedded={true}
            onExit={closeQuizRunner}
            onSubmit={async (answers, timeSpentSeconds) => {
              const result = await submitQuizAttempt({
                uid: user.uid,
                courseId,
                quiz: { ...selectedContent, answers },
                timeSpentSeconds,
              });
              await refreshProfile();
              return result;
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Cairo',sans-serif] transition-colors duration-500"
    >
      <AppHeader active="/courses" />

      {/* ═══ BIG BLUE HERO HEADER ════════════════════════════════ */}
      <header className="relative overflow-hidden bg-gradient-to-l from-[#003f6b] via-[#0077B6] to-[#00A8E8] text-white">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full bg-[#FF6B35]/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-white/60 text-sm font-bold">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} className="shrink-0" />
              <span>رجوع</span>
            </button>
            <span>/</span>
            <span className="text-white/90 truncate max-w-[240px]">{course.title}</span>
          </div>

          {/* Title & desc */}
          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3">{course.title}</h1>
          {course.description && (
            <p className="text-white/75 text-sm sm:text-base max-w-2xl leading-relaxed mb-6">
              {course.description}
            </p>
          )}

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {course.grade && (
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold">
                <GraduationCap size={13} /> {course.grade}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold">
              <CirclePlay size={13} /> {allVideosCount} فيديو
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold">
              <FileText size={13} /> {allResourcesCount} ملف
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold">
              <HelpCircle size={13} /> {allQuizzesCount} كويز
            </span>
          </div>

          {/* Price row */}
          <div className="flex flex-wrap items-center gap-4">
            {isFree ? (
              <span className="text-2xl font-black text-emerald-300">مجاني</span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">{finalPrice.toFixed(0)}</span>
                <span className="text-lg font-bold text-white/70">ج.م</span>
                {course.discountPercent > 0 && (
                  <span className="text-sm text-white/50 line-through">
                    {course.price.toFixed(0)} ج.م
                  </span>
                )}
                {course.discountPercent > 0 && (
                  <span className="bg-[#FF6B35] text-white text-xs font-black px-2 py-0.5 rounded-full">
                    -{course.discountPercent}%
                  </span>
                )}
              </div>
            )}

            {!hasAccess && !isFree && (
              <Link
                to={`/courses/${course.id}/payment`}
                className="inline-flex items-center gap-2 bg-[#FF6B35] hover:bg-orange-500 text-white font-extrabold px-6 py-3 rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                دخول الكورس
                <ArrowLeft size={16} />
              </Link>
            )}
            {hasAccess && !isTeacher && (
              <span className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold px-4 py-2 rounded-full text-sm">
                <CheckCircle2 size={15} /> مشترك
              </span>
            )}
            {isTeacher && (
              <span className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 text-amber-300 font-bold px-4 py-2 rounded-full text-sm">
                <Star size={15} /> وصول المدرس
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ═══ MAIN VIDEO PLAYER — FULL WIDTH ═══════════════════ */}
        <section className="rounded-[1.75rem] overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/5">
          {selectedContent?.type === "video" && selectedUnit && selectedUnlocked ? (
            true ? (
              <StudentVideoPlayer
                key={`video-${selectedUnit.unitId || selectedContentIndex}`}
                fileId={selectedUnit.driveFileId}
                youtubeVideoId={selectedUnit.youtubeVideoId}
                videoUrl={selectedUnit.videoUrl}
                courseId={courseId}
                token={localStorage.getItem("lms_access_token") || ""}
                studentId={user?.studentId || user?.uid || user?.phone || ""}
                onEnded={completeLesson}
              />
            ) : (
              <div className="relative pb-[56.25%] h-0 overflow-hidden bg-black">
                <iframe
                  id="course-video-player"
                  title={selectedUnit.title}
                  src={`https://www.youtube-nocookie.com/embed/${selectedUnit.youtubeVideoId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
                {/* Watermark */}
                <div
                  className="absolute pointer-events-none z-[45] select-none text-white/25 text-xs font-extrabold"
                  style={{ top: "30%", left: "38%" }}
                >
                  {user?.phone} · {user?.name}
                </div>
              </div>
            )
          ) : selectedContent?.type === "resource" && selectedUnlocked ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center gap-5 p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-cyan-100 dark:bg-slate-800 flex items-center justify-center">
                <FileText size={30} className="text-[#0077B6]" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{selectedContent.title}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedContent.fileName || "ملف مرفق بالكورس"}</p>
              </div>
              <a
                href={selectedContent.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0077B6] px-6 py-3 text-sm font-extrabold text-white hover:bg-[#FF6B35] transition-colors"
              >
                فتح الملف
                <ArrowLeft size={15} />
              </a>
            </div>
          ) : (
            /* LOCKED STATE — with price + subscribe */
            <div className="relative overflow-hidden bg-slate-950 text-white min-h-[380px] flex flex-col items-center justify-center p-8 text-center">
              {/* Blurred bg */}
              {course.thumbnailUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-10 blur-sm scale-105"
                  style={{ backgroundImage: `url(${course.thumbnailUrl})` }}
                />
              )}
              <div className="absolute inset-0 bg-slate-950/80" />

              <div className="relative z-10 flex flex-col items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/30 flex items-center justify-center">
                  <Lock size={36} className="text-[#FF6B35]" />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-white">المحتوى مغلق</h3>
                    <p className="text-slate-400 text-sm mt-2 max-w-sm leading-relaxed">
                      {selectedMandatoryLockReason ||
                      "هذا المحتوى يحتاج صلاحية وصول لعرض الفيديوهات والملفات والكويزات."}
                  </p>
                </div>

                {!hasAccess && !isFree && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-baseline gap-2 text-white">
                      <span className="text-4xl font-black">{finalPrice.toFixed(0)}</span>
                      <span className="text-lg text-white/60 font-bold">ج.م</span>
                    </div>
                    <Link
                      to={`/courses/${course.id}/payment`}
                      className="inline-flex items-center gap-2 bg-[#FF6B35] hover:bg-orange-500 text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-200 text-base"
                    >
                      ادخل الكورس
                      <ArrowLeft size={16} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Currently selected content title bar */}
          {selectedContent && (
            <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                {selectedContent.type === "resource" ? (
                  <FileText size={16} className="text-[#0077B6] dark:text-[#00A8E8] shrink-0" />
                ) : selectedContent.type === "quiz" ? (
                  <HelpCircle size={16} className="text-[#FF6B35] shrink-0" />
                ) : (
                  <CirclePlay size={16} className="text-[#0077B6] dark:text-[#00A8E8] shrink-0" />
                )}
                <span className="text-sm font-extrabold truncate text-slate-900 dark:text-slate-100">
                  {selectedContent.title}
                </span>
              </div>
              {hasAccess && selectedContent.type === "video" && selectedUnlocked && (
                <button
                  type="button"
                  disabled={!selectedUnit || isSavingProgress || watchedLessons.includes(selectedUnit?.unitId)}
                  onClick={completeLesson}
                  className="shrink-0 text-xs font-extrabold px-4 py-1.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSavingProgress
                    ? "جارٍ الحفظ..."
                    : watchedLessons.includes(selectedUnit?.unitId)
                    ? "✓ مكتمل"
                    : "تم الإنهاء"}
                </button>
              )}
            </div>
          )}
        </section>

        {/* ═══ CONTENT LIST — SORTED OLDEST TO NEWEST ═══════════ */}
        <section>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-[#0077B6]" />
            محتوى الكورس
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
              ({contentItems.length} عنصر)
            </span>
          </h2>

          <div className="space-y-2">
            {contentItems.map((item, index) => {
              const unitIndex =
                item.type === "video" ? units.findIndex((u) => u.unitId === item.unitId) : -1;
              const lockReason = mandatoryQuizLockReason(
                item,
                index,
                contentItems,
                courseQuizResults
              );
              const unlocked =
                isTeacher ||
                (!lockReason && (item.isFree || hasAccess));
              const watched = item.type === "video" && watchedLessons.includes(item.unitId);
              const Icon =
                item.type === "resource"
                  ? FileText
                  : item.type === "quiz"
                  ? HelpCircle
                  : CirclePlay;
              const isSelected = index === selectedContentIndex;

              return (
                <button
                  key={`${item.type}-${item.unitId || item.resourceId || item.quizId}`}
                  type="button"
                  disabled={!unlocked && !isTeacher}
                  onClick={() => {
                    if (!unlocked && !isTeacher) return;
                    setSelectedContentIndex(index);
                  }}
                  className={`w-full rounded-2xl border px-4 py-3.5 text-right transition-all duration-200 flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-[#0077B6] bg-[#0077B6]/8 dark:border-[#00A8E8] dark:bg-[#00A8E8]/10 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#0077B6]/40 dark:hover:border-[#00A8E8]/30"
                  } ${!unlocked && !isTeacher ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Index number */}
                    <span
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                        isSelected
                          ? "bg-[#0077B6] text-white dark:bg-[#00A8E8]"
                          : watched
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {watched ? <CheckCircle2 size={14} /> : index + 1}
                    </span>

                    {/* Content info */}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate text-right">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[11px] font-bold ${
                            item.type === "resource"
                              ? "text-purple-500"
                              : item.type === "quiz"
                              ? "text-orange-500"
                              : "text-[#0077B6] dark:text-[#00A8E8]"
                          }`}
                        >
                          {item.type === "resource"
                            ? "ملف"
                            : item.type === "quiz"
                            ? `كويز${item.isMandatory ? " (إجباري)" : ""}`
                            : `فيديو ${unitIndex + 1}`}
                        </span>
                        {item.isFree && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 rounded-full">
                            مجاني
                          </span>
                        )}
                        {lockReason && !isTeacher && (
                          <span className="text-[10px] font-bold text-[#FF6B35]">{lockReason}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right icon & Teacher Actions */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {isTeacher && (
                      <span
                        role="button"
                        title="حذف هذا العنصر نهائياً"
                        onClick={(e) => handleDeleteItem(item, e)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </span>
                    )}
                    {watched ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : !unlocked && !isTeacher ? (
                      <Lock size={16} className="text-slate-400 dark:text-slate-600" />
                    ) : (
                      <Icon
                        size={17}
                        className={
                          item.type === "resource"
                            ? "text-purple-400"
                            : item.type === "quiz"
                            ? "text-[#FF6B35]"
                            : "text-[#0077B6] dark:text-[#00A8E8]"
                        }
                      />
                    )}
                  </div>
                </button>
              );
            })}

            {contentItems.length === 0 && (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 font-bold">
                لا يوجد محتوى في هذا الكورس حتى الآن.
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
