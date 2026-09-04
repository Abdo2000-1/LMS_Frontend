import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Flag,
  ArrowRight,
  ArrowLeft,
  Send,
  Award,
  BookOpen,
  HelpCircle,
  X,
  RefreshCw,
  Home,
  Check,
  ChevronRight,
  Sparkles,
  RotateCcw,
  Eye,
  FileQuestion
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getExamById, submitExamAttempt } from "../services/courseService.js";

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TakeExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Exam flow states: "intro" | "running" | "result"
  const [examState, setExamState] = useState("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: answerValue }
  const [flagged, setFlagged] = useState(new Set()); // Set of questionIds
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);

  const timerRef = useRef(null);

  // Load exam on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getExamById(examId)
      .then((data) => {
        if (!mounted) return;
        if (!data) throw new Error("الامتحان غير موجود.");
        setExam(data);
        setTimeLeft((data.minutes || 30) * 60);
      })
      .catch((err) => {
        if (mounted) setError(err.message || "تعذر تحميل بيانات الامتحان.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examId]);

  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const baseQuestions = useMemo(() => {
    if (!exam || !Array.isArray(exam.questions)) return [];
    return exam.questions.map((q, idx) => ({
      ...q,
      questionId: q.questionId || `q_${idx}`,
      type: q.type || (q.choices && q.choices.length > 0 ? "mcq" : "essay"),
      points: Number(q.points || 1),
      choices: Array.isArray(q.choices) ? q.choices : [],
    }));
  }, [exam]);

  const [shuffledList, setShuffledList] = useState([]);
  const questions = shuffledList.length > 0 ? shuffledList : baseQuestions;

  const totalPoints = useMemo(() => {
    return questions.reduce((sum, q) => sum + (q.points || 1), 0);
  }, [questions]);

  // Prevent accidental close or reload during running exam
  useEffect(() => {
    if (examState !== "running") return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "⚠️ الامتحان جارٍ الآن! هل أنت متأكد من المغادرة؟ لن يتم حفظ إجاباتك غير المسلمة.";
      return e.returnValue;
    };

    const handleHashChange = () => {
      if (window.location.hash !== `#/exam/${examId}`) {
        const confirmExit = window.confirm("⚠️ الامتحان جارٍ الآن! هل أنت متأكد من الخروج قبل تسليم إجاباتك؟");
        if (!confirmExit) {
          window.location.hash = `#/exam/${examId}`;
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [examState, examId]);

  // Timer runner
  useEffect(() => {
    if (examState !== "running") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examState]);

  const currentQuestion = questions[currentIndex] || questions[0] || null;
  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== "").length;
  const unansweredCount = questions.length - answeredCount;
  const timeSpentSeconds = (exam?.minutes || 30) * 60 - timeLeft;

  function handleStartExam() {
    const listToShuffle = baseQuestions.length > 0 ? baseQuestions : questions;
    const shuffled = shuffleArray(listToShuffle);
    setShuffledList(shuffled);
    setAnswers({});
    setFlagged(new Set());
    setCurrentIndex(0);
    setTimeLeft((exam?.minutes || 30) * 60);
    setExamState("running");
    setReviewMode(false);
  }

  function handleSelectChoice(questionId, choiceIndex) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: choiceIndex,
    }));
  }

  function handleTextAnswer(questionId, text) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: text,
    }));
  }

  function toggleFlag(questionId) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  async function handleFinalSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitModalOpen(false);

    try {
      const res = await submitExamAttempt({
        examId: exam.id,
        answers,
        timeSpentSeconds,
      });

      setResult({
        ...res,
        answers,
        timeSpentSeconds,
      });

      setExamState("result");
      await refreshProfile?.();
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء تسليم الامتحان.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Timer styling
  const isTimerCritical = timeLeft < 60;
  const isTimerWarning = timeLeft < 300 && !isTimerCritical;

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center font-['Cairo',sans-serif]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#0077B6] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">جارٍ تجهيز صفحة الامتحان...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-['Cairo',sans-serif]">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">تعذر فتح الامتحان</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error || "لم يتم العثور على الامتحان المطلوب."}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0077B6] text-white font-extrabold text-xs hover:bg-[#00A8E8] transition shadow-md"
          >
            <Home size={15} />
            <span>العودة للرئيسية</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Cairo',sans-serif] flex flex-col selection:bg-cyan-500/20">
      {/* ═══ STANDALONE TOP NAVIGATION HEADER ═════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Right: Exit button & Exam title */}
          <div className="flex items-center gap-3 min-w-0">
            {examState !== "running" ? (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition shrink-0"
                title="الرجوع"
              >
                <ArrowRight size={18} />
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs font-black flex items-center gap-1.5 shrink-0 select-none border border-red-200 dark:border-red-900/50">
                <Lock size={14} />
                <span className="hidden sm:inline">ممنوع الخروج أثناء الامتحان</span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                {exam.title}
              </h1>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate">
                {exam.courseTitle || "امتحان كيمياء مستقل"}
              </p>
            </div>
          </div>

          {/* Left: Timer & Action buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {examState === "running" && (
              <>
                {/* Floating Timer Badge */}
                <div
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl font-mono text-sm font-black transition-all ${
                    isTimerCritical
                      ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20"
                      : isTimerWarning
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                      : "bg-[#0077B6]/10 text-[#0077B6] dark:text-[#00A8E8] dark:bg-cyan-950 border border-cyan-200 dark:border-cyan-800"
                  }`}
                >
                  <Clock size={16} className={isTimerCritical ? "animate-spin" : ""} />
                  <span dir="ltr">{formatTime(timeLeft)}</span>
                </div>

                {/* Direct Submit Header Button */}
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-sm"
                >
                  <CheckCircle2 size={15} />
                  <span>تسليم الامتحان</span>
                </button>
              </>
            )}

            {examState === "intro" && (
              <span className="text-xs font-black bg-cyan-100 dark:bg-cyan-950 text-[#0077B6] dark:text-cyan-300 px-3 py-1.5 rounded-xl border border-cyan-200 dark:border-cyan-800">
                {questions.length} سؤال · {exam.minutes} دقيقة
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ═══ 1. INTRO / START SCREEN ═════════════════════════════════════ */}
      {examState === "intro" && (
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl space-y-8"
          >
            {/* Exam Banner Image / Header */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#003f6b] via-[#0077B6] to-[#00A8E8] text-white p-6 sm:p-8">
              <div className="relative z-10 space-y-2">
                <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-extrabold text-white">
                  <Sparkles size={13} /> امتحان إلكتروني
                </span>
                <h2 className="text-2xl sm:text-3xl font-black">{exam.title}</h2>
                <p className="text-white/80 text-xs sm:text-sm font-medium max-w-xl leading-relaxed">
                  {exam.description || "اختبر معلوماتك وراجع أهم أفكار المنهج مع التقييم الفوري ونموذج الإجابة."}
                </p>
              </div>
            </div>

            {/* Exam Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center space-y-1">
                <FileQuestion size={22} className="mx-auto text-[#0077B6] dark:text-cyan-400" />
                <p className="text-lg font-black text-slate-900 dark:text-white">{questions.length}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">عدد الأسئلة</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center space-y-1">
                <Clock size={22} className="mx-auto text-amber-500" />
                <p className="text-lg font-black text-slate-900 dark:text-white">{exam.minutes} دقيقة</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">زمن الامتحان</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center space-y-1">
                <Award size={22} className="mx-auto text-emerald-500" />
                <p className="text-lg font-black text-slate-900 dark:text-white">{totalPoints} درجات</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">الدرجة الكلية</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center space-y-1">
                <CheckCircle2 size={22} className="mx-auto text-cyan-500" />
                <p className="text-lg font-black text-slate-900 dark:text-white">تلقائي</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">تصحيح فوري</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-5 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
              <h4 className="text-sm font-black text-[#0077B6] dark:text-cyan-300 flex items-center gap-2">
                <HelpCircle size={16} /> تعليمات هامة قبل البدء:
              </h4>
              <ul className="list-disc list-inside space-y-1 pr-1">
                <li>يبدأ عداد الوقت فور الضغط على زر "بدء الامتحان الآن".</li>
                <li>يمكنك التنقل بين الأسئلة بحرية وتمييز أي سؤال بعلامة 🚩 لمراجعته قبل التسليم.</li>
                <li>يتم حفظ إجاباتك تلقائياً كل ثانية ولن تضيع في حال انقطاع الاتصال المؤقت.</li>
                <li>عند انتهاء الوقت سيتم تسليم إجاباتك تلقائياً واحتساب النتيجة.</li>
              </ul>
            </div>

            {/* Start CTA */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                الرجوع لاحقاً
              </button>

              <button
                type="button"
                onClick={handleStartExam}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#0077B6] to-[#00A8E8] hover:opacity-95 text-white font-black text-sm transition shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
              >
                <span>بدء الامتحان الآن</span>
                <ArrowLeft size={17} />
              </button>
            </div>
          </motion.div>
        </main>
      )}

      {/* ═══ 2. RUNNING EXAM SCREEN (TWO COLUMN LAYOUT) ══════════════════ */}
      {examState === "running" && currentQuestion && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6 items-start">
          {/* Main Question Column (Left/Center) */}
          <div className="space-y-4">
            {/* Linear Progress Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-[#0077B6] dark:text-[#00A8E8]">
                  السؤال {currentIndex + 1} من {questions.length}
                </span>
                <span className="text-slate-400 font-mono">
                  {Math.round(((currentIndex + 1) / questions.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#0077B6] to-[#00A8E8] h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
              {/* Question Header: Badges & Flag */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-[#0077B6] dark:text-cyan-300 text-xs font-black">
                    {currentQuestion.points || 1} {currentQuestion.points === 1 ? "درجة" : "درجات"}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                    {currentQuestion.type === "essay" ? "سؤال مقالي" : "اختيار من متعدد"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleFlag(currentQuestion.questionId)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition ${
                    flagged.has(currentQuestion.questionId)
                      ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                      : "text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Flag size={13} className={flagged.has(currentQuestion.questionId) ? "fill-current" : ""} />
                  <span>{flagged.has(currentQuestion.questionId) ? "مميّز للمراجعة" : "تمييز السؤال"}</span>
                </button>
              </div>

              {/* Question Text */}
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-relaxed whitespace-pre-line">
                {currentQuestion.prompt}
              </h2>

              {/* Question Image (if present) */}
              {currentQuestion.questionImageUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2">
                  <img
                    src={currentQuestion.questionImageUrl}
                    alt="صورة السؤال"
                    className="max-h-80 w-auto mx-auto rounded-xl object-contain"
                  />
                </div>
              )}

              {/* Options / Text Input */}
              {currentQuestion.type === "essay" || (!currentQuestion.choices || currentQuestion.choices.length === 0) ? (
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                    اكتب إجابتك المقالية بالتفصيل:
                  </label>
                  <textarea
                    rows={6}
                    value={answers[currentQuestion.questionId] || ""}
                    onChange={(e) => handleTextAnswer(currentQuestion.questionId, e.target.value)}
                    placeholder="اكتب إجابتك هنا ليتم تصحيحها ومراجعتها..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-4 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20 transition"
                  />
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {currentQuestion.choices.map((choice, cIdx) => {
                    const isSelected = answers[currentQuestion.questionId] === cIdx;
                    const letter = ["أ", "ب", "ج", "د", "هـ"][cIdx] || String(cIdx + 1);

                    return (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => handleSelectChoice(currentQuestion.questionId, cIdx)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border text-right transition-all duration-200 ${
                          isSelected
                            ? "border-[#0077B6] dark:border-[#00A8E8] bg-cyan-50/70 dark:bg-cyan-950/40 shadow-sm ring-1 ring-[#0077B6]"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-cyan-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition ${
                              isSelected
                                ? "bg-[#0077B6] text-white"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed break-words">
                            {choice}
                          </span>
                        </div>

                        {/* Radio Checkmark */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mr-3 transition ${
                            isSelected
                              ? "border-[#0077B6] dark:border-[#00A8E8] bg-[#0077B6] dark:bg-[#00A8E8]"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isSelected && <Check size={12} className="text-white stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Question Navigation Controls */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                >
                  <ArrowRight size={15} />
                  <span>السؤال السابق</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="px-6 py-2.5 rounded-xl bg-[#0077B6] hover:bg-[#00A8E8] text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span>السؤال التالي</span>
                    <ArrowLeft size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSubmitModalOpen(true)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle2 size={16} />
                    <span>مراجعة وتسليم الامتحان</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Column (Question Palette / Grid) */}
          <aside className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <span>خريطة الأسئلة</span>
                <span className="text-xs font-bold text-slate-400">
                  {answeredCount} من {questions.length} مُجاب
                </span>
              </h3>

              {/* Status Counters */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-extrabold">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-base font-black">{answeredCount}</p>
                  <p>تم الحل</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <p className="text-base font-black">{unansweredCount}</p>
                  <p>متبقي</p>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <p className="text-base font-black">{flagged.size}</p>
                  <p>مراجعة</p>
                </div>
              </div>

              {/* Number Grid */}
              <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1 scrollbar-thin">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = answers[q.questionId] !== undefined && answers[q.questionId] !== "";
                  const isFlagged = flagged.has(q.questionId);

                  return (
                    <button
                      key={q.questionId}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`relative h-10 rounded-xl text-xs font-black transition-all duration-150 flex items-center justify-center ${
                        isCurrent
                          ? "bg-[#0077B6] text-white ring-2 ring-[#0077B6] ring-offset-2 dark:ring-offset-slate-900 scale-105 shadow-md"
                          : isAnswered
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : isFlagged
                          ? "bg-amber-400 text-slate-950 hover:bg-amber-500"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span>{idx + 1}</span>
                      {isFlagged && !isCurrent && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Submit Button in Sidebar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(true)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black hover:opacity-95 transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>تسليم الامتحان الآن</span>
                </button>
              </div>
            </div>
          </aside>
        </main>
      )}

      {/* ═══ 3. RESULT & REVIEW SCREEN ═══════════════════════════════════ */}
      {examState === "result" && result && (
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl text-center space-y-6"
          >
            {/* Score Ring / Trophy */}
            <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <Award size={48} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                تم تسليم امتحانك بنجاح!
              </h2>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {result.percentage >= 85
                  ? "ما شاء الله! أداء ممتاز ومستوى متميز في الكيمياء 🌟"
                  : result.percentage >= 65
                  ? "أداء جيد جداً، واصل المراجعة والتدريب لتصل للدرجة النهائية 💪"
                  : "تم تسجيل النتيجة. راجع الأسئلة ونموذج الإجابة لتعزيز نقاط ضعفك 📚"}
              </p>
            </div>

            {/* Score Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {result.earnedPoints} <span className="text-xs text-slate-400">/ {result.totalPoints}</span>
                </p>
                <p className="text-xs font-bold text-slate-500 mt-1">الدرجة المحققة</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-2xl font-black text-[#0077B6] dark:text-[#00A8E8]">
                  {result.percentage}%
                </p>
                <p className="text-xs font-bold text-slate-500 mt-1">النسبة المئوية</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                  {formatTime(result.timeSpentSeconds || timeSpentSeconds)}
                </p>
                <p className="text-xs font-bold text-slate-500 mt-1">الوقت المستغرق</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                  {questions.length}
                </p>
                <p className="text-xs font-bold text-slate-500 mt-1">إجمالي الأسئلة</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReviewMode((prev) => !prev)}
                className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-black text-slate-800 dark:text-slate-200 transition flex items-center gap-2"
              >
                <Eye size={16} />
                <span>{reviewMode ? "إخفاء نموذج الإجابة" : "عرض ومراجعة الإجابات النموذجية"}</span>
              </button>

              {exam?.allowRetake !== false ? (
                <button
                  type="button"
                  onClick={handleStartExam}
                  className="px-6 py-3 rounded-2xl bg-[#0077B6] hover:bg-[#00A8E8] text-white text-xs font-black transition flex items-center gap-2 shadow-sm"
                >
                  <RotateCcw size={16} />
                  <span>إعادة المحاولة</span>
                </button>
              ) : (
                <div className="px-5 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-black flex items-center gap-2">
                  <Lock size={15} />
                  <span>هذا الامتحان غير مسموح بإعادته مرة أخرى بناءً على تعليمات المعلم</span>
                </div>
              )}

              <Link
                to="/"
                className="px-6 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2"
              >
                <Home size={16} />
                <span>العودة للرئيسية</span>
              </Link>
            </div>
          </motion.div>

          {/* Review Answers List */}
          {reviewMode && (
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen size={20} className="text-[#0077B6]" />
                <span>مراجعة إجابات الامتحان بالتفصيل</span>
              </h3>

              {questions.map((q, qIdx) => {
                const studentAns = result.answers?.[q.questionId];
                const isCorrect = q.type !== "essay" && studentAns === q.correctIndex;

                return (
                  <div
                    key={q.questionId}
                    className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border shadow-sm space-y-4 ${
                      isCorrect
                        ? "border-emerald-200 dark:border-emerald-800/80"
                        : q.type === "essay"
                        ? "border-cyan-200 dark:border-cyan-800/80"
                        : "border-red-200 dark:border-red-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#0077B6] dark:text-[#00A8E8]">
                        سؤال {qIdx + 1} ({q.points || 1} {q.points === 1 ? "درجة" : "درجات"})
                      </span>
                      <span
                        className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                          isCorrect
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                            : q.type === "essay"
                            ? "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400"
                            : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {isCorrect ? "✓ إجابة صحيحة" : q.type === "essay" ? "سؤال مقالي" : "✕ إجابة غير صحيحة"}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-relaxed">
                      {q.prompt}
                    </h4>

                    {/* Choices Review */}
                    {q.choices && q.choices.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.choices.map((c, cIdx) => {
                          const isStudentPick = studentAns === cIdx;
                          const isModelAnswer = q.correctIndex === cIdx;

                          return (
                            <div
                              key={cIdx}
                              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                                isModelAnswer
                                  ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-800 dark:text-emerald-200 font-black"
                                  : isStudentPick && !isCorrect
                                  ? "bg-red-50 dark:bg-red-950/50 border-red-400 text-red-800 dark:text-red-200"
                                  : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              <span>{c}</span>
                              {isModelAnswer && <span className="text-emerald-600 font-black">✓ الإجابة الصحيحة</span>}
                              {isStudentPick && !isModelAnswer && <span className="text-red-500 font-black">اختيارك</span>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs font-bold">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <p className="text-slate-400 mb-1">إجابتك المسجلة:</p>
                          <p className="text-slate-800 dark:text-slate-100">{studentAns || "لم تتم الإجابة"}</p>
                        </div>
                        {q.modelAnswer && (
                          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                            <p className="text-emerald-600 dark:text-emerald-400 font-black mb-1">الإجابة النموذجية:</p>
                            <p className="text-emerald-800 dark:text-emerald-200">{q.modelAnswer}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ═══ SUBMIT CONFIRMATION MODAL ═══════════════════════════════════ */}
      <AnimatePresence>
        {submitModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 text-right"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  هل أنت متأكد من تسليم الامتحان؟
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  راجِع إحصائيات إجاباتك أدناه قبل تأكيد التسليم النهائي.
                </p>
              </div>

              {/* Stats Review */}
              <div className="grid grid-cols-2 gap-3 text-center text-xs font-black">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                  <p className="text-lg">{answeredCount}</p>
                  <p>أسئلة تم حلها</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  <p className="text-lg">{unansweredCount}</p>
                  <p>أسئلة متبقية</p>
                </div>
              </div>

              {unansweredCount > 0 && (
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
                  ⚠️ تنبيه: لديك {unansweredCount} سؤال لم تقم بحله بعد!
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  العودة للمراجعة
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>جارٍ التسليم...</span>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>تأكيد التسليم الآن</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
