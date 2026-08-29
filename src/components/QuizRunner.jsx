import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Send,
  ShieldAlert,
  Award,
  FileQuestion,
  HelpCircle,
  Check,
  X,
  Sparkles,
  Loader2,
  BookOpen,
  Timer,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { evaluateEssayAi } from "../services/essayService.js";

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
  return `quiz_draft_${courseId || "direct"}_${quizId}`;
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
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const handleBackToCourse = () => {
    if (typeof onExit === "function") {
      onExit();
    } else {
      navigate(courseId ? `/courses/${courseId}` : "/courses");
    }
  };

  // Normalize questions with guaranteed IDs and points
  const questions = useMemo(() => {
    if (!Array.isArray(quiz?.questions)) return [];
    return quiz.questions.map((q, idx) => ({
      ...q,
      questionId: q.questionId || q.id || `q_${idx}`,
      type: q.type || (q.choices && q.choices.length > 0 ? "mcq" : "essay"),
      points: Number(q.points || 1),
      choices: Array.isArray(q.choices) ? q.choices : [],
    }));
  }, [quiz?.questions]);

  // Attempt records for the current user
  const previousAttempt = useMemo(() => {
    const cid = courseId || "direct";
    return user?.quizResults?.[cid]?.[quiz?.quizId] || user?.quizResults?.[quiz?.quizId];
  }, [user?.quizResults, courseId, quiz?.quizId]);

  const [attemptState, setAttemptState] = useState("table"); // "intro" | "table" | "running" | "result"
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [visitedQuestions, setVisitedQuestions] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState((quiz?.minutes || 10) * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Progressive AI essay evaluations state
  const [essayEvaluations, setEssayEvaluations] = useState({});
  const [evaluatingEssayIds, setEvaluatingEssayIds] = useState(new Set());

  // Set initial state based on previous attempts, without overwriting active results/reviews
  useEffect(() => {
    const draftKey = getDraftKey(courseId, quiz?.quizId);
    let foundDraft = false;
    try {
      const raw = readDraft(draftKey);
      foundDraft = !!raw;
    } catch {}
    setHasDraft(foundDraft);
    setSubmitError("");

    // Do NOT interrupt if the user is in reviewMode, result, or running
    setAttemptState((current) => {
      if (current === "result" || current === "running") return current;
      if (previousAttempt) return "table";
      return "intro";
    });

    if (!foundDraft && attemptState !== "result" && attemptState !== "running") {
      setAnswers({});
      setVisitedQuestions(new Set());
      setCurrentIndex(0);
      setTimeLeft((quiz?.minutes || 10) * 60);
    }
  }, [quiz?.quizId, previousAttempt, courseId, quiz?.minutes]);

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

  // Timer countdown
  useEffect(() => {
    if (attemptState !== "running") return undefined;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          autoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attemptState]);

  const currentQuestion = questions[currentIndex];
  const timeSpentSeconds = (quiz?.minutes || 10) * 60 - timeLeft;

  async function autoSubmit() {
    await handleSubmit();
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const submittedAnswers = { ...answers };

      // Submit to backend (which runs Gemini AI grading)
      const quizResult = await onSubmit?.(submittedAnswers, timeSpentSeconds);
      
      setResult({
        ...(quizResult || {}),
        answers: submittedAnswers,
        textAnswers: submittedAnswers,
        timeSpentSeconds: quizResult?.timeSpentSeconds ?? timeSpentSeconds,
        createdAt: quizResult?.createdAt || new Date().toISOString(),
        evaluations: quizResult?.evaluations || {},
      });

      setAttemptState("result");
      setReviewMode(true);
      clearDraft(getDraftKey(courseId, quiz?.quizId));
      await refreshProfile?.();
    } catch (err) {
      console.error(err);
      setSubmitError(err?.message || "تعذر إنهاء الاختبار. تأكد من الاتصال وحاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleExitLater() {
    setSubmitError("");
    const draftKey = getDraftKey(courseId, quiz?.quizId);
    writeDraft(draftKey, {
      answers,
      timeLeft,
      currentIndex,
    });
    setHasDraft(true);
    setAttemptState("table");
    handleBackToCourse();
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
    setEssayEvaluations({});
  }

  function goPrevious() {
    setCurrentIndex((idx) => Math.max(0, idx - 1));
  }

  function goNext() {
    setCurrentIndex((idx) => Math.min(questions.length - 1, idx + 1));
  }

  const runningWrapperClass = embedded
    ? "w-full bg-white dark:bg-slate-950 overflow-y-auto px-0 py-0 font-['Cairo',_sans-serif]"
    : "fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md overflow-y-auto px-4 py-6 font-['Cairo',_sans-serif] flex items-center justify-center";
  const resultWrapperClass = embedded
    ? "w-full bg-white dark:bg-slate-950 overflow-y-auto px-0 py-0 font-['Cairo',_sans-serif]"
    : "fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md overflow-y-auto px-4 py-8 font-['Cairo',_sans-serif] flex items-center justify-center";

  // --- 1. RENDER RUNNING EXAM SCREEN ---
  if (attemptState === "running" && currentQuestion) {
    return (
      <div className={runningWrapperClass}>
        <div className={`mx-auto grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6 items-start ${embedded ? "w-full" : "max-w-5xl w-full"}`}>
          {/* Main Question view (Left) */}
          <div className="space-y-6">
            {/* Centered Timer Banner */}
            <div className="bg-[#FF6B35] dark:bg-[#00A8E8] text-white rounded-2xl px-8 py-3.5 shadow-lg shadow-red-500/10 text-center w-full max-w-sm mx-auto flex flex-col items-center">
              <span className="text-xs font-bold tracking-widest opacity-90 flex items-center gap-1.5">
                <Timer size={14} /> باقي من الزمن
              </span>
              <span dir="ltr" className="text-3xl font-black mt-1.5 tracking-wider font-mono">
                {formatTime(timeLeft)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl text-right space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="rounded-full bg-[#FF6B35]/10 px-4 py-1.5 text-xs font-extrabold text-[#FF6B35] dark:text-[#FFB08F]">
                  {currentQuestion.points || 1} درجة
                </span>
                <span className="text-sm font-black text-[#0077B6] dark:text-[#00A8E8]">
                  السؤال الحالي: {currentIndex + 1} من {questions.length}
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

              {currentQuestion.type === "essay" || (!currentQuestion.choices || currentQuestion.choices.length === 0) ? (
                <div className="space-y-3 mt-6">
                  <label className="block text-xs font-bold text-slate-500">ادخل إجابتك المقالية بالتفصيل:</label>
                  <textarea
                    rows={6}
                    value={answers[currentQuestion.questionId] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAnswers((prev) => ({ ...prev, [currentQuestion.questionId]: val }));
                    }}
                    placeholder="اكتب إجابتك هنا ليقوم الذكاء الاصطناعي والمعلم بتقييمها..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0077B6]"
                  />
                </div>
              ) : (
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
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold transition-colors ${
                              isSelected ? "bg-[#0077B6] dark:bg-[#00A8E8] text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            {labelLetter}
                          </span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-100">{choice}</span>
                        </span>
                        <span
                          className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-[#0077B6]" : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-[#0077B6]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

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
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-xl text-right space-y-4">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
                خريطة الأسئلة
              </h3>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 max-h-60 overflow-y-auto p-1 scrollbar-thin">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const val = answers[q.questionId];
                  const isSolved = (typeof val === "number") || (typeof val === "string" && val.trim().length > 0);

                  return (
                    <button
                      key={q.questionId}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-10 rounded-xl text-xs font-black transition-all flex items-center justify-center ${
                        isCurrent
                          ? "bg-[#0077B6] text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-300"
                          : isSolved
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {submitError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold">
                  {submitError}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-[#FF6B35] to-[#f4511e] hover:brightness-110 text-white font-black rounded-2xl shadow-lg shadow-orange-500/25 transition duration-200 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                إنهاء وتسليم الاختبار
              </button>

              <button
                type="button"
                onClick={handleExitLater}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs transition duration-200"
              >
                حفظ والخروج للمتابعة لاحقاً
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. RENDER RESULTS / REVIEW SCREEN ---
  if (attemptState === "result" || reviewMode) {
    const totalQuestions = questions.length;
    const totalMaxPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

    let dynamicEarnedPoints = 0;
    let dynamicCorrectCount = 0;

    questions.forEach((q) => {
      const isEssay = q.type === "essay" || (!q.choices || q.choices.length === 0);
      const studentAns = answers[q.questionId] ?? result?.textAnswers?.[q.questionId] ?? result?.answers?.[q.questionId] ?? previousAttempt?.textAnswers?.[q.questionId] ?? previousAttempt?.answers?.[q.questionId];

      if (isEssay) {
        const evalInfo = essayEvaluations[q.questionId] || result?.evaluations?.[q.questionId] || previousAttempt?.evaluations?.[q.questionId];
        if (evalInfo && typeof evalInfo.earnedPoints === "number") {
          dynamicEarnedPoints += evalInfo.earnedPoints;
          if (evalInfo.isCorrect || evalInfo.earnedPoints >= (q.points || 1) * 0.5) {
            dynamicCorrectCount += 1;
          }
        }
      } else {
        if (studentAns === q.correctIndex) {
          dynamicEarnedPoints += (q.points || 1);
          dynamicCorrectCount += 1;
        }
      }
    });

    const earnedPoints = Math.round(dynamicEarnedPoints * 10) / 10;
    const dynamicPercentage = totalMaxPoints > 0 ? Math.round((earnedPoints / totalMaxPoints) * 100) : 0;
    const incorrectCount = Math.max(0, totalQuestions - dynamicCorrectCount);

    return (
      <div className={resultWrapperClass}>
        <div className={`mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-2xl space-y-8 ${embedded ? "w-full" : "max-w-4xl w-full"}`}>
          {/* Header Branding */}
          <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-6">
            <span className="text-xs font-black text-[#0077B6] dark:text-[#00A8E8] uppercase tracking-widest block">
              منصة الدكتور مينا موريد للكيمياء
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
              نتيجة {quiz?.title || "الاختبار"}
            </h1>
          </div>

          {/* Results Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {/* Total Questions */}
            <div className="py-3.5 px-4 bg-[#0077B6] text-white font-extrabold rounded-2xl shadow-md text-sm">
              عدد الأسئلة: {totalQuestions}
            </div>

            {/* Score Percentage */}
            <div className="py-3.5 px-4 bg-gradient-to-r from-[#00A8E8] to-[#38D9C8] text-white font-black rounded-2xl shadow-md text-base flex flex-col items-center justify-center">
              <span>النتيجة: {dynamicPercentage}%</span>
              <span className="text-xs font-bold mt-0.5">
                {earnedPoints} من {totalMaxPoints} درجة
              </span>
            </div>

            {/* Correct Answers */}
            <div className="py-3.5 px-4 bg-emerald-500 text-white font-extrabold rounded-2xl shadow-md text-sm">
              الأسئلة الصحيحة: {dynamicCorrectCount}
            </div>

            {/* Incorrect Answers */}
            <div className="py-3.5 px-4 bg-red-500 text-white font-extrabold rounded-2xl shadow-md text-sm">
              الأسئلة الخاطئة: {incorrectCount}
            </div>
          </div>

          {/* Review Details */}
          <div className="space-y-6 text-right pt-4">
            <h2 className="text-xl font-black text-[#0077B6] dark:text-[#00A8E8] border-r-4 border-[#0077B6] pr-3">
              تفاصيل الإجابات والتصحيح بالذكاء الاصطناعي
            </h2>

            {questions.map((q, idx) => {
              const isEssay = q.type === "essay" || (!q.choices || q.choices.length === 0);
              const studentAnswer = answers[q.questionId] 
                ?? result?.textAnswers?.[q.questionId] 
                ?? result?.answers?.[q.questionId] 
                ?? previousAttempt?.textAnswers?.[q.questionId] 
                ?? previousAttempt?.answers?.[q.questionId];

              const evalInfo = essayEvaluations[q.questionId] 
                || result?.evaluations?.[q.questionId] 
                || previousAttempt?.evaluations?.[q.questionId];

              const isCorrect = evalInfo
                ? (evalInfo.isCorrect || (evalInfo.earnedPoints && evalInfo.earnedPoints >= (q.points || 1) * 0.5))
                : isEssay
                ? false
                : studentAnswer === q.correctIndex;

              const questionPoints = q.points || 1;
              const questionEarnedPoints = evalInfo?.earnedPoints ?? (isCorrect ? questionPoints : 0);

              return (
                <div
                  key={q.questionId}
                  className={`rounded-3xl bg-slate-50/60 dark:bg-slate-800/40 p-6 border shadow-sm space-y-4 ${
                    isCorrect
                      ? "border-emerald-400 dark:border-emerald-700/80 bg-emerald-50/10"
                      : "border-red-400 dark:border-red-700/80 bg-red-50/10"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`px-3.5 py-1 rounded-full text-xs font-extrabold shadow-sm text-white ${
                      isCorrect ? "bg-emerald-600" : "bg-red-600"
                    }`}>
                      {questionEarnedPoints} / {questionPoints} درجة
                    </span>
                    <span className="font-black text-[#0077B6] dark:text-[#00A8E8] text-sm flex items-center gap-2">
                      {isCorrect ? (
                        <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">✓ إجابة صحيحة</span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded-full font-bold">✗ إجابة غير صحيحة</span>
                      )}
                      السؤال {idx + 1} {isEssay ? "(سؤال مقالي)" : "(اختيار من متعدد)"}
                    </span>
                  </div>

                  <p className="font-black text-slate-800 dark:text-slate-100 text-base leading-relaxed">{q.prompt}</p>

                  {/* Essay Question Review */}
                  {isEssay ? (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="block text-xs font-bold text-slate-500 mb-1">إجابتك المكتوبة:</span>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                            {studentAnswer !== undefined && studentAnswer !== null && String(studentAnswer).trim().length > 0 ? String(studentAnswer) : "لم يتم تقديم إجابة."}
                          </p>
                        </div>

                        {q.modelAnswer && (
                          <div className="p-4 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
                            <span className="block text-xs font-bold text-[#0077B6] dark:text-[#00A8E8] mb-1">
                              الإجابة النموذجية المعتمدة:
                            </span>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                              {q.modelAnswer}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Progressive AI Evaluation Box */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-850 border border-blue-200 dark:border-blue-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#0077B6] dark:text-[#00A8E8] flex items-center gap-1.5">
                            <Sparkles size={14} className="text-amber-500" />
                            تصحيح وتحليل الذكاء الاصطناعي (Gemini AI):
                          </span>
                          <span
                            className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                              isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {isCorrect ? "تم قبول الإجابة ✓" : "إجابة غير صحيحة ✗"}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
                          {evalInfo?.feedback || "تم تسجيل الإجابة وتحليلها بنجاح."}
                        </p>

                        {evalInfo?.strengths && evalInfo.strengths.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                            <span className="text-[11px] font-bold text-emerald-700">النقاط الصحيحة:</span>
                            {evalInfo.strengths.map((str, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md"
                              >
                                ✓ {str}
                              </span>
                            ))}
                          </div>
                        )}

                        {evalInfo?.missingPoints && evalInfo.missingPoints.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                            <span className="text-[11px] font-bold text-amber-700">توضيحات المنهج:</span>
                            {evalInfo.missingPoints.map((mis, mIdx) => (
                              <span
                                key={mIdx}
                                className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md"
                              >
                                ℹ {mis}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* MCQ Choices Review */
                    <div className="grid grid-cols-1 gap-2.5 mt-2">
                      {q.choices.map((choice, cIdx) => {
                        const isOptionSelected = studentAnswer === cIdx;
                        const isOptionCorrect = q.correctIndex === cIdx;

                        let optionBg = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200";
                        if (isOptionCorrect) {
                          optionBg = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-extrabold ring-1 ring-emerald-400";
                        } else if (isOptionSelected && !isCorrect) {
                          optionBg = "bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-700 text-red-800 dark:text-red-200 font-extrabold ring-1 ring-red-400";
                        }

                        return (
                          <div
                            key={cIdx}
                            className={`flex items-center justify-between border rounded-2xl px-4 py-3 text-sm ${optionBg}`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-700 border flex items-center justify-center text-xs font-bold">
                                {["أ", "ب", "ج", "د"][cIdx] || cIdx + 1}
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

                      {!isCorrect && q.choices[q.correctIndex] && (
                        <p className="text-xs text-red-600 font-extrabold pt-1">
                          الإجابة الصحيحة: {q.choices[q.correctIndex]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Action */}
          <div className="text-center pt-6">
            <button
              type="button"
              onClick={handleBackToCourse}
              className="px-10 py-3.5 bg-gradient-to-r from-[#0077B6] to-[#00A8E8] hover:brightness-110 text-white font-black rounded-2xl shadow-lg transition-all"
            >
              العودة للمنهج
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. RENDER INTRO / TABLE SCREEN ---
  const introContainerClass = embedded
    ? "w-full max-w-2xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-right space-y-6 shadow-xl"
    : "fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-['Cairo',_sans-serif]";

  return (
    <div className={introContainerClass} dir="rtl">
      <div className="w-full max-w-2xl mx-auto p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-right space-y-6 shadow-2xl">
        <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">{quiz?.title || "كويز تفاعلي"}</h2>
          <p className="text-xs text-slate-500 font-bold">
            عدد الأسئلة: {questions.length} | المدة الزمنية: {quiz?.minutes || 10} دقيقة
          </p>
        </div>

        {previousAttempt && (
          <div className="p-4 bg-cyan-50 dark:bg-slate-800 rounded-2xl text-xs font-bold text-[#0077B6] dark:text-cyan-300 space-y-1">
            <p>آخر محاولة: {previousAttempt.earnedPoints} / {previousAttempt.totalPoints} ({previousAttempt.percentage}%)</p>
            <p>التاريخ: {formatDateTime(previousAttempt.updatedAt || previousAttempt.takenAt)}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2">
          <button
            type="button"
            onClick={startExamNew}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#FF6B35] hover:bg-[#e05621] text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 transition"
          >
            {hasDraft ? "استكمال الاختبار السابق" : previousAttempt ? "إعادة الاختبار" : "ابدأ الاختبار الآن"}
          </button>

          {previousAttempt && (
            <button
              type="button"
              onClick={() => {
                setResult(previousAttempt);
                setAttemptState("result");
                setReviewMode(true);
              }}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#0077B6] hover:bg-[#005f92] text-white font-black rounded-2xl transition"
            >
              مراجعة الإجابات
            </button>
          )}

          <button
            type="button"
            onClick={handleBackToCourse}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black rounded-2xl transition"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
