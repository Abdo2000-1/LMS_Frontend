import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Send, ShieldAlert, Award, FileQuestion, HelpCircle, Check, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function formatDateTime(value) {
  if (!value) return "غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متاح";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDraftKey(courseId, quizId) {
  return `quiz_draft_${courseId}_${quizId}`;
}

function readDraft(draftKey) {
  try {
    return sessionStorage.getItem(draftKey) || localStorage.getItem(draftKey);
  } catch {
    return null;
  }
}

function writeDraft(draftKey, payload) {
  try {
    const value = JSON.stringify(payload);
    sessionStorage.setItem(draftKey, value);
    localStorage.setItem(draftKey, value);
  } catch {}
}

function clearDraft(draftKey) {
  try {
    sessionStorage.removeItem(draftKey);
    localStorage.removeItem(draftKey);
  } catch {}
}

export default function QuizRunner({ quiz, onSubmit, onExit, embedded = false }) {
  const { courseId } = useParams();
  const { user, refreshProfile } = useAuth();

  const questions = useMemo(() => Array.isArray(quiz?.questions) ? quiz.questions : [], [quiz?.questions]);
  const isExam = Boolean(quiz?.isMandatory);

  // Attempt records for the current user
  const previousAttempt = useMemo(() => {
    return user?.quizResults?.[courseId]?.[quiz?.quizId];
  }, [user?.quizResults, courseId, quiz?.quizId]);

  const [attemptState, setAttemptState] = useState("table"); // "table" | "running" | "result"
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [visitedQuestions, setVisitedQuestions] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState((quiz?.minutes || 10) * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Set initial state based on previous attempts
  useEffect(() => {
    const draftKey = getDraftKey(courseId, quiz?.quizId);
    let foundDraft = false;
    try {
      const raw = readDraft(draftKey);
      foundDraft = !!raw;
    } catch {}
    setHasDraft(foundDraft);
    setSubmitError("");
    setResult(null);
    setReviewMode(false);
    setIsSubmitting(false);

    if (previousAttempt) {
      setAttemptState("table");
    } else {
      setAttemptState("intro");
    }

    if (!foundDraft) {
      setAnswers({});
      setVisitedQuestions(new Set());
      setCurrentIndex(0);
      setTimeLeft((quiz?.minutes || 10) * 60);
    }
  }, [quiz?.quizId, previousAttempt, questions, courseId, quiz?.minutes]);

  useEffect(() => {
    if (attemptState !== "running") return undefined;
    const draftKey = getDraftKey(courseId, quiz?.quizId);
    writeDraft(draftKey, {
      answers,
      timeLeft,
      currentIndex,
    });
    return undefined;
  }, [answers, timeLeft, currentIndex, attemptState, courseId, quiz?.quizId]);

  // Track visited questions
  useEffect(() => {
    if (attemptState === "running" && questions[currentIndex]) {
      setVisitedQuestions((prev) => {
        const next = new Set(prev);
        next.add(questions[currentIndex].questionId);
        return next;
      });
    }
  }, [currentIndex, attemptState, questions]);

  // Timer logic
  useEffect(() => {
    if (attemptState !== "running" || timeLeft <= 0) return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          void autoSubmit();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [attemptState, timeLeft]);

  const currentQuestion = questions[currentIndex] || null;
  const totalDurationSeconds = Math.max(1, (Number(quiz?.minutes || 10) || 10) * 60);
  const timeSpentSeconds = Math.max(0, totalDurationSeconds - timeLeft);

  // Stats calculation
  const solvedCount = useMemo(() => {
    return Object.keys(answers).filter((key) => answers[key] !== undefined && answers[key] !== null).length;
  }, [answers]);

  const openedCount = visitedQuestions.size;
  const unsolvedCount = Math.max(0, openedCount - solvedCount);
  const introWrapperClass = embedded
    ? "w-full bg-[#F8FAFC] dark:bg-slate-950 px-0 py-0 font-['Cairo',_sans-serif]"
    : "fixed inset-0 z-[100] bg-[#F8FAFC] dark:bg-slate-950 flex items-center justify-center px-4 font-['Cairo',_sans-serif]";
  const tableWrapperClass = embedded
    ? "w-full bg-[#F8FAFC] dark:bg-slate-950 overflow-y-auto px-0 py-0 font-['Cairo',_sans-serif]"
    : "fixed inset-0 z-[100] bg-[#F8FAFC] dark:bg-slate-950 overflow-y-auto px-4 py-8 font-['Cairo',_sans-serif]";
  const runningWrapperClass = embedded
    ? "w-full bg-[#F8FAFC] dark:bg-slate-950 overflow-y-auto px-0 py-0 font-['Cairo',_sans-serif]"
    : "fixed inset-0 z-[100] bg-[#F8FAFC] dark:bg-slate-950 overflow-y-auto px-4 py-6 font-['Cairo',_sans-serif]";
  const resultWrapperClass = embedded
    ? "w-full bg-[#F8FAFC] dark:bg-slate-950 overflow-y-auto px-0 py-0 font-['Cairo',_sans-serif]"
    : "fixed inset-0 z-[100] bg-[#F8FAFC] dark:bg-slate-950 overflow-y-auto px-4 py-8 font-['Cairo',_sans-serif]";

  async function autoSubmit() {
    await handleSubmit();
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const quizResult = await onSubmit?.(answers, timeSpentSeconds);
      await refreshProfile?.();
      clearDraft(getDraftKey(courseId, quiz?.quizId));
      setResult({
        ...(quizResult || {}),
        timeSpentSeconds: quizResult?.timeSpentSeconds ?? timeSpentSeconds,
        createdAt: quizResult?.createdAt || new Date().toISOString(),
      });
      setAttemptState("result");
      setReviewMode(true);
    } catch (err) {
      console.error(err);
      setSubmitError(err?.message || "تعذر إنهاء الاختبار. تأكد من الاتصال وحاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleExitLater() {
    setSubmitError("");
    // Save draft answers/state to sessionStorage for later resumption
    const draftKey = getDraftKey(courseId, quiz?.quizId);
    writeDraft(draftKey, {
      answers,
      timeLeft,
      currentIndex,
    });
    setHasDraft(true);
    setAttemptState("table");
    onExit?.();
  }

  function startExamNew() {
    const draftKey = getDraftKey(courseId, quiz?.quizId);
    let savedAnswers = {};
    let savedTime = (quiz?.minutes || 10) * 60;
    let savedIndex = 0;
    try {
      const raw = readDraft(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        savedAnswers = draft.answers || {};
        savedTime = draft.timeLeft ?? savedTime;
        savedIndex = draft.currentIndex ?? 0;
      }
      clearDraft(draftKey);
    } catch {}
    setAnswers(savedAnswers);
    setVisitedQuestions(new Set(questions[savedIndex] ? [questions[savedIndex].questionId] : []));
    setCurrentIndex(savedIndex);
    setTimeLeft(savedTime);
    setAttemptState("running");
    setReviewMode(false);
    setHasDraft(false);
  }

  function startExamFresh() {
    const draftKey = getDraftKey(courseId, quiz?.quizId);
    clearDraft(draftKey);
    setAnswers({});
    setVisitedQuestions(new Set(questions[0] ? [questions[0].questionId] : []));
    setCurrentIndex(0);
    setTimeLeft((quiz?.minutes || 10) * 60);
    setAttemptState("running");
    setReviewMode(false);
    setHasDraft(false);
  }

  function goPrevious() {
    setCurrentIndex((idx) => Math.max(0, idx - 1));
  }

  function goNext() {
    setCurrentIndex((idx) => Math.min(questions.length - 1, idx + 1));
  }

  // --- 0. RENDER DRAFT CHOICE SCREEN ---
  if (attemptState === "intro" && !previousAttempt) {
    return (
      <div className={introWrapperClass}>
        <div className={`w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-cyan-900/5 dark:shadow-slate-950/40 border border-slate-200 dark:border-slate-800 text-center space-y-4 text-right ${embedded ? "" : "max-w-md"}`}>
          <div className="w-14 h-14 rounded-full bg-[#0077B6]/10 dark:bg-[#00A8E8]/10 flex items-center justify-center mx-auto">
            <span className="text-2xl text-[#0077B6] dark:text-[#00A8E8]">?</span>
          </div>
          <h2 className="text-xl font-black text-[#0077B6] dark:text-[#00A8E8]">{quiz?.title || "الاختبار"}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
              <div className="text-[#0077B6] text-lg font-black">{questions.length}</div>
              <div>عدد الأسئلة</div>
            </div>
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
              <div className="text-[#0077B6] text-lg font-black">{quiz?.minutes || 10}</div>
              <div>الدقائق</div>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
            اضغط ابدأ للدخول للاختبار. يمكن حفظ التقدم والعودة لاحقًا إذا تم استخدام زر "استكمال لاحقًا".
          </p>
          {hasDraft && (
            <div className="rounded-2xl border border-[#FF6B35]/25 bg-[#FF6B35]/10 px-4 py-3 text-sm font-bold text-[#FF6B35] dark:text-[#FFB08F]">
              لديك محاولة محفوظة يمكنك استكمالها الآن أو بدء محاولة جديدة.
            </div>
          )}
          <div className="space-y-2 pt-2">
            {hasDraft ? (
              <>
                <button
                  type="button"
                  onClick={startExamNew}
                  className="w-full py-3 bg-[#0077B6] hover:bg-[#005f92] dark:bg-[#00A8E8] dark:hover:bg-[#0077B6] text-white font-extrabold rounded-2xl shadow-md transition-colors"
                >
                  استكمال المحاولة السابقة
                </button>
                <button
                  type="button"
                  onClick={startExamFresh}
                  className="w-full py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold rounded-2xl transition-colors"
                >
                  بدء من جديد
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startExamFresh}
                className="w-full py-3 bg-[#0077B6] hover:bg-[#005f92] dark:bg-[#00A8E8] dark:hover:bg-[#0077B6] text-white font-extrabold rounded-2xl shadow-md transition-colors"
              >
                ابدأ الامتحان / الكويز
              </button>
            )}
            <button
              type="button"
              onClick={() => { setHasDraft(false); onExit?.(); }}
              className="w-full py-2.5 text-slate-400 dark:text-slate-500 text-sm font-bold rounded-2xl hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              العودة للمنهج
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 1. RENDER PREVIOUS ATTEMPT TABLE ---
  if (attemptState === "table" && previousAttempt) {
    return (
      <div className={tableWrapperClass}>
        <div className={`mx-auto space-y-6 ${embedded ? "w-full" : "max-w-2xl"}`}>
          <div className="text-center bg-[#0077B6] dark:bg-[#00A8E8] text-white py-4 px-6 rounded-2xl shadow-md">
            <h1 className="text-lg sm:text-xl font-bold">
              {quiz?.title || "امتحان المادة"}
            </h1>
            <p className="text-xs opacity-90 mt-1">كورس الكيمياء للدكتور مينا موريد</p>
          </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-cyan-900/5 dark:shadow-slate-950/40 border border-slate-200 dark:border-slate-800 overflow-hidden text-right">
            <h2 className="text-lg font-bold mb-4 text-[#0077B6] dark:text-[#00A8E8]">تفاصيل محاولتك السابقة:</h2>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3">الدرجة</th>
                    <th className="px-4 py-3">الزمن المستغرق</th>
                    <th className="px-4 py-3">التاريخ</th>
                    <th className="px-4 py-3">النسبة</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  <tr>
                    <td className="px-4 py-4 text-chem-cta text-lg">
                      <span dir="ltr" className="inline-flex items-center gap-1 text-[#FF6B35] dark:text-[#FFB08F]">
                        {previousAttempt.earnedPoints} / {previousAttempt.totalPoints}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      <span dir="ltr" className="inline-flex items-center gap-1 text-[#0077B6] dark:text-[#00A8E8]">
                        {formatTime(previousAttempt.timeSpentSeconds || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">{formatDateTime(previousAttempt.updatedAt || previousAttempt.takenAt)}</td>
                    <td className="px-4 py-4 text-slate-500 dark:text-slate-300">{previousAttempt.percentage}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            {!isExam && (
              <button
                type="button"
                onClick={startExamNew}
                className="w-full sm:w-auto px-8 py-3 bg-[#FF6B35] hover:bg-[#e05621] dark:bg-[#FF6B35] dark:hover:bg-[#ff7d49] text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/20 transition-all duration-200"
              >
                إعادة الكويز
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setResult(previousAttempt);
                setAttemptState("result");
                setReviewMode(true);
              }}
              className="w-full sm:w-auto px-8 py-3 bg-[#0077B6] hover:bg-[#005f92] dark:bg-[#00A8E8] dark:hover:bg-[#0077B6] text-white font-extrabold rounded-2xl shadow-lg shadow-blue-500/20 transition-all duration-200"
            >
              مشاهدة الإجابات ومذاكرتها
            </button>
            <button
              type="button"
              onClick={onExit}
              className="w-full sm:w-auto px-8 py-3 bg-slate-300 hover:bg-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-extrabold rounded-2xl transition-all duration-200"
            >
              العودة للمنهج
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. RENDER RUNNING EXAM SCREEN ---
  if (attemptState === "running" && currentQuestion) {
    return (
      <div className={runningWrapperClass}>
        <div className={`mx-auto grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6 items-start ${embedded ? "w-full" : "max-w-5xl"}`}>
          
          {/* Main Question view (Left) */}
          <div className="space-y-6">
            
            {/* Centered Timer Banner */}
            <div className="bg-[#FF6B35] dark:bg-[#00A8E8] text-white rounded-2xl px-8 py-3.5 shadow-lg shadow-red-500/10 text-center w-full max-w-sm mx-auto flex flex-col items-center">
              <span className="text-xs font-bold tracking-widest opacity-90">باقي من الزمن</span>
              <span dir="ltr" className="text-3xl font-black mt-1.5 tracking-wider font-mono">{formatTime(timeLeft)}</span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl shadow-cyan-950/5 dark:shadow-slate-950/40 text-right space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="rounded-full bg-[#FF6B35]/10 px-4 py-1.5 text-xs font-extrabold text-[#FF6B35] dark:text-[#FFB08F]">
                  درجة واحدة
                </span>
                <span className="text-sm font-black text-[#0077B6] dark:text-[#00A8E8]">
                  السؤال الحالي: {currentIndex + 1}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 leading-relaxed">
                {currentQuestion.prompt}
              </h2>

              {currentQuestion.questionImageUrl && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                  <img
                    src={currentQuestion.questionImageUrl}
                    alt={currentQuestion.prompt || "صورة السؤال"}
                    className="max-h-[28rem] w-full object-contain"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3.5 mt-8">
                {currentQuestion.choices.map((choice, idx) => {
                  const isSelected = answers[currentQuestion.questionId] === idx;
                  const labelLetter = ["أ", "ب", "ج", "د"][idx] || String.fromCharCode(65 + idx);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [currentQuestion.questionId]: idx }))}
                      className={`flex items-center justify-between w-full rounded-2xl border p-4 text-right transition-all duration-200 ${
                        isSelected
                          ? "border-[#0077B6] bg-[#0077B6]/5 ring-1 ring-[#0077B6]"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#00A8E8] dark:hover:bg-slate-700"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold transition-colors ${
                          isSelected ? "bg-[#0077B6] dark:bg-[#00A8E8] text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                        }`}>
                          {labelLetter}
                        </span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-100">{choice}</span>
                      </span>
                      <span className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-[#0077B6]" : "border-slate-300 dark:border-slate-600"
                      }`}>
                        {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-[#0077B6]" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
                <button
                  type="button"
                  onClick={goPrevious}
                  disabled={currentIndex === 0}
                  className="px-6 py-2.5 bg-cyan-100 hover:bg-cyan-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-[#0077B6] dark:text-[#00A8E8] font-extrabold rounded-xl transition duration-200 flex items-center gap-1"
                >
                  <ArrowLeft size={16} />
                  السابق
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={currentIndex === questions.length - 1}
                  className="px-6 py-2.5 bg-cyan-100 hover:bg-cyan-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-[#0077B6] dark:text-[#00A8E8] font-extrabold rounded-xl transition duration-200 flex items-center gap-1"
                >
                  التالي
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Stats & Question Grid Sidebar (Right) */}
          <div className="space-y-6">
            
            {/* Stats Cards */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xl shadow-cyan-950/5 dark:shadow-slate-950/40 border border-slate-200 dark:border-slate-800 text-right space-y-4">
              <h3 className="font-black text-[#0077B6] dark:text-[#00A8E8] text-base border-b border-slate-100 dark:border-slate-800 pb-2">إحصائيات الامتحان</h3>
              <div className="space-y-2 text-sm font-extrabold">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-900 dark:text-slate-100">{questions.length * 1}</span>
                  <span className="text-slate-500 dark:text-slate-400">إجمالي درجات الامتحان</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-900 dark:text-slate-100">{questions.length}</span>
                  <span className="text-slate-500 dark:text-slate-400">عدد الأسئلة</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-900 dark:text-slate-100">{openedCount}</span>
                  <span className="text-slate-500 dark:text-slate-400">عدد الأسئلة التي تم فتحها</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-red-600 dark:text-red-400">{unsolvedCount}</span>
                  <span className="text-slate-500 dark:text-slate-400">عدد الأسئلة غير المحلولة</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-[#0077B6] dark:text-[#00A8E8]">{solvedCount}</span>
                  <span className="text-slate-500 dark:text-slate-400">عدد الأسئلة المحلولة</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-orange-600 dark:text-[#FFB08F]">{currentIndex + 1}</span>
                  <span className="text-slate-500 dark:text-slate-400">السؤال الحالي</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-900 dark:text-slate-100">
                    <span dir="ltr" className="inline-flex items-center gap-1">{formatTime(timeSpentSeconds)}</span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">الزمن المستغرق</span>
                </div>
              </div>
              
              {/* Submit Buttons */}
              <div className="space-y-2 pt-2">
                {submitError && (
                  <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs font-bold text-red-700 dark:text-red-300">
                    {submitError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#0077B6] hover:bg-[#005f92] disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-md transition-colors"
                >
                  {isSubmitting ? "جارٍ الحفظ..." : "إنهاء الاختبار"}
                </button>
                <button
                  type="button"
                  onClick={handleExitLater}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-2xl shadow-md transition-colors"
                >
                  استكمال الاختبار لاحقاً
                </button>
              </div>
            </div>

            {/* Questions Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xl shadow-cyan-950/5 dark:shadow-slate-950/40 border border-slate-200 dark:border-slate-800 text-right">
              <h3 className="font-black text-[#0077B6] dark:text-[#00A8E8] text-base border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">قائمة الأسئلة</h3>
              <div className="grid grid-cols-5 gap-2.5">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = answers[q.questionId] !== undefined;
                  const isVisited = visitedQuestions.has(q.questionId);

                  let colorClass = "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200";
                  if (isAnswered) {
                    colorClass = "bg-[#0077B6] dark:bg-[#00A8E8] text-white shadow-md shadow-blue-500/20";
                  } else if (isVisited) {
                    colorClass = "bg-[#FF6B35] dark:bg-[#FF6B35] text-white shadow-md shadow-red-500/20";
                  }

                  return (
                    <button
                      key={q.questionId}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-10 w-10 rounded-full font-bold flex items-center justify-center transition-all ${colorClass} ${
                        isCurrent ? "ring-2 ring-orange-500 ring-offset-2 scale-110" : ""
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // --- 3. RENDER RESULT / EXAM REPORT SCREEN ---
  if (attemptState === "result" && result) {
    const totalQuestions = questions.length;
    const hasLiveAnswers = Object.keys(answers || {}).length > 0;
    const correctCount = hasLiveAnswers
      ? questions.filter((question) => answers?.[question.questionId] === question.correctIndex).length
      : Number(result.earnedPoints || 0);
    const incorrectCount = Math.max(0, totalQuestions - correctCount);
    const earnedPoints = Number(result.earnedPoints || 0);
    const totalPoints = Number(result.totalPoints || 0) || questions.reduce((sum, question) => sum + (Number(question.points || 1) || 1), 0);
    const resultTimeSpentSeconds = Number(result.timeSpentSeconds || 0);

    return (
      <div className={resultWrapperClass}>
        <div className={`mx-auto space-y-6 ${embedded ? "w-full" : "max-w-2xl"}`}>
          <div className="text-center bg-[#FF4F6C] text-white py-4 px-6 rounded-2xl shadow-md">
            <h1 className="text-xl font-bold">تقرير نتيجة الامتحان</h1>
            <p className="text-xs opacity-90 mt-1">منصة الدكتور مينا موريد للكيمياء</p>
          </div>

          {/* Stats Badges exactly matching the screenshot */}
          <div className="flex flex-col gap-3 items-center">
            
            {/* Total Questions (Blue) */}
            <div className="w-full max-w-sm text-center py-2.5 px-4 bg-[#0077B6] text-white font-extrabold rounded-xl shadow-sm text-sm">
              عدد الاسئلة : {totalQuestions}
            </div>

            {/* Score Percentage (Teal) */}
            <div className="w-full max-w-sm text-center py-4 px-4 bg-[#00A8E8] text-white font-black rounded-xl shadow-sm text-base flex flex-col items-center">
              <span>النتيجة : {result.percentage}%</span>
              <span className="text-xs mt-1 font-bold">
                {hasLiveAnswers ? `${correctCount} صحيحة من ${totalQuestions}` : `${earnedPoints} من ${totalPoints} درجة`}
              </span>
            </div>

            {/* Solved Questions (Yellow) */}
            <div className="w-full max-w-sm text-center py-2.5 px-4 bg-amber-500 text-white font-extrabold rounded-xl shadow-sm text-sm">
              عدد الاسئلة المحلولة : {totalQuestions}
            </div>

            {/* Correct Answers (Teal/Green) */}
            <div className="w-full max-w-sm text-center py-2.5 px-4 bg-emerald-500 text-white font-extrabold rounded-xl shadow-sm text-sm">
              {hasLiveAnswers ? `عدد الاسئلة الصحيحة : ${correctCount}` : `الدرجات الصحيحة : ${earnedPoints}`}
            </div>

            {/* Incorrect Answers (Red) */}
            <div className="w-full max-w-sm text-center py-2.5 px-4 bg-red-500 text-white font-extrabold rounded-xl shadow-sm text-sm">
              عدد الاسئلة الخاطئة : {incorrectCount}
            </div>

            <div className="w-full max-w-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
                <p className="text-[10px] font-bold text-slate-400">الزمن المستغرق</p>
                <p dir="ltr" className="mt-1 text-sm font-black text-slate-900">{formatTime(resultTimeSpentSeconds)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
                <p className="text-[10px] font-bold text-slate-400">تاريخ التسليم</p>
                <p className="mt-1 text-sm font-black text-slate-900">{formatDateTime(result.createdAt || result.takenAt)}</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-300 my-6" />

            {/* Review answers */}
          <div className="space-y-6 text-right">
            <h2 className="text-xl font-black text-[#0077B6] mb-4 text-center">الاجابات</h2>
            
            {questions.map((q, idx) => {
              const studentAnswer = answers[q.questionId];
              const isCorrect = studentAnswer === q.correctIndex;
              
              return (
                <div
                  key={q.questionId}
                  className={`rounded-2xl bg-white dark:bg-slate-900 p-5 border shadow-sm space-y-3 ${
                    isCorrect ? "border-emerald-300 dark:border-emerald-700" : "border-red-300 dark:border-red-700"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="bg-[#FF6B35] text-white px-3 py-1 rounded-full text-xs font-bold">
                      درجة واحدة
                    </span>
                    <span className="font-extrabold text-[#0077B6] dark:text-[#00A8E8] text-sm">
                      السؤال {idx + 1}
                    </span>
                  </div>

                  <p className="font-black text-slate-800 dark:text-slate-100 leading-relaxed">{q.prompt}</p>

                  <div className="grid grid-cols-1 gap-2.5 mt-2">
                    {q.choices.map((choice, cIdx) => {
                      const isOptionSelected = studentAnswer === cIdx;
                      const isOptionCorrect = q.correctIndex === cIdx;
                      
                      let optionBg = "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200";
                      if (isOptionCorrect) {
                        optionBg = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-extrabold";
                      } else if (isOptionSelected && !isCorrect) {
                        optionBg = "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 font-extrabold";
                      }

                      return (
                        <div
                          key={cIdx}
                          className={`flex items-center justify-between border rounded-xl px-4 py-2.5 text-sm ${optionBg}`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-full bg-white/80 dark:bg-slate-700 border flex items-center justify-center text-xs font-bold">
                              {["أ", "ب", "ج", "د"][cIdx]}
                            </span>
                            <span>{choice}</span>
                          </span>
                          <span>
                            {isOptionCorrect ? (
                              <Check size={16} className="text-emerald-600" />
                            ) : isOptionSelected && !isCorrect ? (
                              <X size={16} className="text-red-600" />
                            ) : null}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {!isCorrect && (
                    <p className="text-xs text-red-600 font-extrabold pt-1">
                      تصحيح الإجابة: {q.choices[q.correctIndex]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center pt-6">
            <button
              type="button"
              onClick={onExit}
              className="px-10 py-3 bg-[#0077B6] hover:bg-[#005f92] text-white font-extrabold rounded-2xl shadow-lg transition-colors"
            >
              العودة للمنهج
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
