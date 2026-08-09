import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, CirclePlay, Lock, NotebookPen, Timer, ArrowLeft, FileText, HelpCircle, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { buildCourseContent, getCourseById, markLessonCompleted, submitQuizAttempt } from "../services/courseService.js";
import AppHeader from "../components/AppHeader.jsx";
import Footer from "../components/Footer.jsx";

function lessonUnlocked(index, units, watchedLessons) {
  if (index === 0) return true;
  const previousUnit = units[index - 1];
  return watchedLessons.includes(previousUnit.unitId);
}

export default function CourseDetails() {
  const { courseId } = useParams();
  const { user, refreshProfile } = useAuth();

  const [course, setCourse] = useState(null);
  const [selectedContentIndex, setSelectedContentIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [error, setError] = useState("");
  const playerRef = useRef(null);

  const watchedLessons = useMemo(() => user?.progress?.[courseId]?.watchedLessons || [], [user?.progress, courseId]);
  const enrolled = useMemo(() => (user?.enrolledCourses || []).includes(courseId), [user?.enrolledCourses, courseId]);

  useEffect(() => {
    let mounted = true;
    getCourseById(courseId)
      .then((result) => {
        if (!mounted) return;
        setCourse(result);
      })
      .catch(() => {
        if (!mounted) return;
        setError("تعذر تحميل الكورس.");
      });

    return () => {
      mounted = false;
    };
  }, [courseId]);

  const units = useMemo(() => {
    if (!course?.units) return [];
    return [...course.units].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [course?.units]);

  const quizzes = useMemo(() => {
    if (!course?.quizzes) return [];
    return [...course.quizzes].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [course?.quizzes]);

  const contentItems = useMemo(() => buildCourseContent(course || {}), [course]);
  const selectedContent = contentItems[selectedContentIndex] || null;
  const selectedUnit =
    selectedContent?.type === "video" ? selectedContent : units.find((unit) => unit.unitId === selectedContent?.unitId) || null;
  const selectedUnitIndex = selectedUnit ? units.findIndex((unit) => unit.unitId === selectedUnit.unitId) : -1;
  const selectedUnlocked = selectedContent
    ? selectedContent.isFree || enrolled || (selectedUnitIndex >= 0 && lessonUnlocked(selectedUnitIndex, units, watchedLessons))
    : false;

  async function completeLesson() {
    if (!selectedUnit || !enrolled || watchedLessons.includes(selectedUnit.unitId)) return;
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

  useEffect(() => {
    if (!selectedUnit || !selectedUnlocked || !enrolled) return undefined;

    let cancelled = false;

    function setupPlayer() {
      if (cancelled || !window.YT?.Player) return;
      if (playerRef.current?.destroy) playerRef.current.destroy();
      playerRef.current = new window.YT.Player("course-video-player", {
        events: {
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              completeLesson();
            }
          },
        },
      });
    }

    if (window.YT?.Player) {
      setupPlayer();
    } else {
      const existingScript = document.querySelector("script[src='https://www.youtube.com/iframe_api']");
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
      }
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === "function") previousReady();
        setupPlayer();
      };
    }

    return () => {
      cancelled = true;
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [enrolled, selectedUnit?.unitId, selectedUnit?.youtubeVideoId, selectedUnlocked, watchedLessons]);

  async function handleSubmitQuiz() {
    if (!selectedContent || selectedContent.type !== "quiz" || !enrolled) return;
    setIsSubmittingQuiz(true);
    setError("");
    setQuizResult(null);
    try {
      const result = await submitQuizAttempt({
        uid: user.uid,
        courseId,
        quiz: { ...selectedContent, answers: quizAnswers },
      });
      setQuizResult(result);
      await refreshProfile();
    } catch (quizError) {
      setError(quizError.message || "تعذر تصحيح الكويز.");
    } finally {
      setIsSubmittingQuiz(false);
    }
  }

  if (!course) {
    return (
      <div dir="rtl" className="min-h-screen bg-white dark:bg-slate-950">
        <AppHeader active="/courses" />
        <main className="max-w-7xl mx-auto px-6 sm:px-10 py-10 text-center">
          <p className="text-slate-500 dark:text-slate-400">جارٍ تحميل تفاصيل الكورس...</p>
        </main>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Cairo',_sans-serif] transition-colors duration-500"
    >
      <AppHeader active="/courses" />

      <main className="max-w-7xl mx-auto px-6 sm:px-10 py-10 space-y-6">
        <section className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex flex-col lg:flex-row gap-5 lg:items-center lg:justify-between">
            <div className="text-right">
              <h1 className="text-2xl font-extrabold mb-2">{course.title}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{course.description || "كورس متكامل بالفيديوهات والكويزات."}</p>
            </div>

            {!enrolled && (
              <Link
                to={`/courses/${course.id}/payment`}
                className="inline-flex items-center justify-center gap-2 bg-red-800 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-red-900 transition-colors duration-300"
              >
                اشترك الآن
                <ArrowLeft size={16} />
              </Link>
            )}
          </div>
        </section>

        {error && (
          <div className="text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40 rounded-xl px-4 py-3 text-right">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
            {selectedContent?.type === "video" && selectedUnit && selectedUnlocked ? (
              <div className="relative pb-[56.25%] h-0">
                <iframe
                  id="course-video-player"
                  title={selectedUnit.title}
                  src={`https://www.youtube-nocookie.com/embed/${selectedUnit.youtubeVideoId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute top-4 right-4 bg-black/35 text-white text-xs px-2 py-1 rounded">
                    {user?.name} • {user?.phone || user?.email}
                  </div>
                </div>
              </div>
            ) : selectedContent?.type === "resource" && selectedUnlocked ? (
              <div className="min-h-[320px] flex flex-col items-center justify-center gap-4 p-8 text-center">
                <FileText size={54} className="text-red-800 dark:text-amber-400" />
                <div>
                  <h2 className="text-xl font-extrabold">{selectedContent.title}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedContent.fileName || "ملف مرفق بالكورس"}</p>
                </div>
                <a
                  href={selectedContent.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-red-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-900 transition-colors"
                >
                  فتح الملف
                  <ArrowLeft size={15} />
                </a>
              </div>
            ) : selectedContent?.type === "quiz" && selectedUnlocked ? (
              <div className="p-5 sm:p-7 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold">{selectedContent.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {selectedContent.questions?.length || 0} سؤال · {selectedContent.minutes || 10} دقيقة
                    </p>
                  </div>
                  {user?.quizResults?.[courseId]?.[selectedContent.quizId] && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      آخر درجة: {user.quizResults[courseId][selectedContent.quizId].percentage}%
                    </div>
                  )}
                </div>

                {(selectedContent.questions || []).map((question, questionIndex) => (
                  <div key={question.questionId} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4">
                    <p className="font-bold mb-3">
                      {questionIndex + 1}. {question.prompt}
                    </p>
                    <div className="grid gap-2">
                      {question.choices.map((choice, choiceIndex) => (
                        <label
                          key={`${question.questionId}-${choiceIndex}`}
                          className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-sm cursor-pointer border border-transparent hover:border-amber-300"
                        >
                          <input
                            type="radio"
                            name={question.questionId}
                            checked={Number(quizAnswers[question.questionId]) === choiceIndex}
                            onChange={() => setQuizAnswers((prev) => ({ ...prev, [question.questionId]: choiceIndex }))}
                          />
                          <span>{choice}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {quizResult && (
                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 p-4 text-amber-900 dark:text-amber-200">
                    درجتك: {quizResult.earnedPoints} من {quizResult.totalPoints} · {quizResult.percentage}%
                  </div>
                )}

                <button
                  type="button"
                  disabled={!enrolled || isSubmittingQuiz}
                  onClick={handleSubmitQuiz}
                  className="w-full rounded-xl bg-red-800 py-3 font-extrabold text-white hover:bg-red-900 disabled:opacity-60"
                >
                  {isSubmittingQuiz ? "جاري التصحيح..." : "تصحيح الكويز"}
                </button>
              </div>
            ) : (
              <div className="h-[320px] flex items-center justify-center bg-black text-white/80 text-sm">
                {selectedContent ? "هذا المحتوى مقفول لحين الاشتراك أو فتح المحتوى السابق." : "اختر عنصرًا من محتوى الكورس."}
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 ring-1 ring-black/5 dark:ring-white/10">
            <h2 className="font-extrabold mb-3">محتوى الكورس</h2>
            <div className="space-y-2 max-h-[23rem] overflow-auto pr-1">
              {contentItems.map((item, index) => {
                const unitIndex = item.type === "video" ? units.findIndex((unit) => unit.unitId === item.unitId) : -1;
                const unlocked = item.isFree || enrolled || (unitIndex >= 0 && lessonUnlocked(unitIndex, units, watchedLessons));
                const watched = item.type === "video" && watchedLessons.includes(item.unitId);
                const Icon = item.type === "resource" ? FileText : item.type === "quiz" ? HelpCircle : CirclePlay;
                const progress = item.type === "video" && watched ? 100 : 0;
                return (
                  <button
                    key={`${item.type}-${item.unitId || item.resourceId || item.quizId}`}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      setSelectedContentIndex(index);
                      setQuizResult(null);
                    }}
                    className={`w-full text-right rounded-xl border px-3 py-3 flex items-center justify-between gap-2 transition-all duration-300 ${
                      index === selectedContentIndex
                        ? "border-red-800 dark:border-amber-400 bg-red-50 dark:bg-amber-400/10"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    } ${!unlocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.type === "resource" ? "ملف" : item.type === "quiz" ? "كويز" : `درس ${unitIndex + 1}`}
                      </p>
                      {item.type === "video" && (
                        <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-red-800 dark:bg-amber-400" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                    {watched ? <CheckCircle2 size={18} className="text-emerald-500" /> : unlocked ? <Icon size={18} /> : <Lock size={16} />}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 ring-1 ring-black/5 dark:ring-white/10">
            <h2 className="font-extrabold mb-3 flex items-center gap-2">
              <BarChart3 size={18} />
              مؤشراتك في الكورس
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">الفيديوهات المكتملة</p>
                <p className="text-2xl font-extrabold">{watchedLessons.length}/{units.length}</p>
              </div>
              <div className="rounded-xl bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">تقدم الكورس</p>
                <p className="text-2xl font-extrabold">{user?.progress?.[courseId]?.percentage || 0}%</p>
              </div>
              <div className="rounded-xl bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">الكويزات</p>
                <p className="text-2xl font-extrabold">{Object.keys(user?.quizResults?.[courseId] || {}).length}/{quizzes.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 ring-1 ring-black/5 dark:ring-white/10 space-y-3">
            <h2 className="font-extrabold">تقدمك في الكورس</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              نسبة التقدم: {user?.progress?.[courseId]?.percentage || 0}%
            </p>
            <button
              type="button"
              disabled={!selectedUnit || !enrolled || !selectedUnlocked || isSavingProgress}
              onClick={completeLesson}
              className="w-full bg-red-800 text-white font-bold rounded-xl py-2.5 hover:bg-red-900 transition-colors duration-300 disabled:opacity-60"
            >
              {isSavingProgress ? "جارٍ الحفظ..." : "تم إنهاء هذا الدرس"}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <NotebookPen size={13} />
              لازم تخلص الدروس بالترتيب عشان يفتح الدرس اللي بعده.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
