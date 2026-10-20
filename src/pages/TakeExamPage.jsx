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
  FileQuestion,
  Lock,
  Camera,
  UploadCloud,
  Trash2,
  ZoomIn,
  Image as ImageIcon,
  Bot,
  Loader2,
  WifiOff,
  LogOut
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getExamById, submitExamAttempt, uploadExamAnswerImage, gradeExamSingleEssay } from "../services/courseService.js";
import { parseEssayAnswer, formatEssayAnswer, compressImageFile } from "../services/essayService.js";

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
  const [exitWarningModalOpen, setExitWarningModalOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);

  // Network & persistence states
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [restoredNotice, setRestoredNotice] = useState(false);

  // Essay image answer upload & preview states
  const [answerImages, setAnswerImages] = useState({}); // { [questionId]: imageUrl }
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState(null);

  const timerRef = useRef(null);
  const expireAtRef = useRef(null);
  const answerImagesRef = useRef(answerImages);
  useEffect(() => { answerImagesRef.current = answerImages; }, [answerImages]);

  // Online / Offline network listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-dismiss restore notice after 6 seconds
  useEffect(() => {
    if (!restoredNotice) return;
    const t = setTimeout(() => setRestoredNotice(false), 6000);
    return () => clearTimeout(t);
  }, [restoredNotice]);

  // Load exam on mount or when examId changes
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setExamState("intro");
    setResult(null);
    setShuffledList([]);
    setAnswers({});
    setAnswerImages({});
    setFlagged(new Set());
    setCurrentIndex(0);
    setError("");
    setRestoredNotice(false);
    expireAtRef.current = null;

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

  const hasEssayQuestions = useMemo(() => {
    return questions.some((q) => q.type === "essay" || (!q.choices || q.choices.length === 0));
  }, [questions]);

  // Retake policy and prior attempt determination
  const isTeacherOrAdmin = ["teacher", "admin", "developer"].includes(String(user?.role || "").toLowerCase());

  const isRetakeForbidden = useMemo(() => {
    if (isTeacherOrAdmin) return false;
    if (!exam) return false;
    return exam.allowRetake === false || exam.id === "13629ef7-7c19-4c55-bb34-52a759780c66";
  }, [exam, isTeacherOrAdmin]);

  const priorAttempt = useMemo(() => {
    if (!exam) return null;
    if (exam.lastAttempt) return exam.lastAttempt;
    const fromUser = user?.quizResults?.[exam.courseId]?.[exam.id] || user?.quizResults?.[exam.id];
    if (fromUser) return fromUser;
    if (user?.id) {
      try {
        const key = `lms_exam_attempted_${user.id}_${exam.id}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.userId === user.id || !parsed.userId)) {
            return parsed;
          }
        }
      } catch {}
    }
    return null;
  }, [exam, user]);

  const hasCompletedAttempt = useMemo(() => {
    if (isTeacherOrAdmin) return false;
    if (exam?.hasAttempted) return true;
    if (exam?.lastAttempt) return true;
    if (user?.quizResults?.[exam?.courseId]?.[exam?.id] || user?.quizResults?.[exam?.id]) return true;
    if (user?.id) {
      try {
        const saved = localStorage.getItem(`lms_exam_attempted_${user.id}_${exam?.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.userId === user.id) return true;
        }
      } catch {}
    }
    return false;
  }, [isTeacherOrAdmin, exam, user]);

  // Clean up legacy un-scoped localStorage items that previously bled teacher attempts to students
  useEffect(() => {
    if (exam?.id) {
      try {
        localStorage.removeItem(`lms_exam_attempted_${exam.id}`);
      } catch {}
    }
  }, [exam?.id]);

  // Resume in-progress exam if student was actively taking it and refreshed / reloaded / returned
  useEffect(() => {
    if (!exam?.id || examState !== "intro" || hasCompletedAttempt) return;

    try {
      const progressKey = `lms_exam_active_progress_${exam.id}`;
      const savedStr = localStorage.getItem(progressKey);
      if (!savedStr) return;

      const saved = JSON.parse(savedStr);
      if (!saved || !saved.expireAt) return;

      // Verify that if a userId was attached to the draft, it matches current user
      if (saved.userId && user?.id && saved.userId !== user.id) return;

      const now = Date.now();
      const remainingSeconds = Math.floor((saved.expireAt - now) / 1000);

      if (remainingSeconds > 0) {
        // Reconstruct questions order
        if (Array.isArray(saved.questionIds) && saved.questionIds.length > 0 && baseQuestions.length > 0) {
          const map = new Map(baseQuestions.map((q) => [q.questionId, q]));
          const ordered = saved.questionIds.map((id) => map.get(id)).filter(Boolean);
          if (ordered.length > 0) {
            setShuffledList(ordered);
          }
        }

        setAnswers(saved.answers || {});
        setAnswerImages(saved.answerImages || {});
        setFlagged(new Set(saved.flagged || []));
        setCurrentIndex(saved.currentIndex || 0);
        setTimeLeft(remainingSeconds);
        expireAtRef.current = saved.expireAt;
        setExamState("running");
        setRestoredNotice(true);
      } else {
        // Expired while away
        localStorage.removeItem(progressKey);
      }
    } catch (err) {
      console.warn("Failed to resume exam from localStorage:", err);
    }
  }, [exam?.id, examState, hasCompletedAttempt, baseQuestions, user?.id]);

  // Auto-persist active exam progress to localStorage
  useEffect(() => {
    if (examState !== "running" || !exam?.id) return;

    try {
      const progressKey = `lms_exam_active_progress_${exam.id}`;
      const now = Date.now();
      const existingStr = localStorage.getItem(progressKey);
      const existing = existingStr ? JSON.parse(existingStr) : {};

      const payload = {
        examId: exam.id,
        userId: user?.id,
        startedAt: existing.startedAt || now,
        expireAt: expireAtRef.current || existing.expireAt || (now + (exam.minutes || 30) * 60 * 1000),
        questionIds: questions.map((q) => q.questionId),
        answers,
        answerImages,
        flagged: Array.from(flagged),
        currentIndex,
      };

      localStorage.setItem(progressKey, JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to auto-save exam progress:", e);
    }
  }, [answers, answerImages, flagged, currentIndex, examState, exam?.id, exam?.minutes, questions, user?.id]);

  // Refs for access inside native event handlers
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const timeLeftRef = useRef(timeLeft);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  const currentQuestion = questions[currentIndex] || questions[0] || null;

  const isQuestionAnswered = (qId) => {
    const ans = answers[qId];
    const img = answerImages[qId];
    if (img && String(img).trim().length > 0) return true;
    if (ans === undefined || ans === null || ans === "") return false;
    if (typeof ans === "string") return ans.trim().length > 0;
    return true;
  };

  const answeredCount = questions.filter((q) => isQuestionAnswered(q.questionId)).length;
  const unansweredCount = questions.length - answeredCount;
  const timeSpentSeconds = (exam?.minutes || 30) * 60 - timeLeft;

  // Auto-submit routine triggered on leaving or confirmation
  async function performSubmission(customAnswers, customTimeLeft) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitModalOpen(false);
    setExitWarningModalOpen(false);

    try {
      const rawAnswers = customAnswers || answersRef.current || answers;
      const rawImages = answerImagesRef.current || answerImages;
      const tLeft = customTimeLeft !== undefined ? customTimeLeft : (timeLeftRef.current !== undefined ? timeLeftRef.current : timeLeft);
      const spent = Math.max(1, (exam?.minutes || 30) * 60 - tLeft);

      const numericAnswers = {};
      const textAnswers = {};
      const combinedForReview = {};

      questions.forEach((q) => {
        const qId = q.questionId;
        const ans = rawAnswers[qId];
        const img = rawImages[qId];

        if (q.type === "essay" || (!q.choices || q.choices.length === 0)) {
          const formatted = formatEssayAnswer(ans, img);
          if (formatted) {
            textAnswers[qId] = formatted;
            combinedForReview[qId] = formatted;
          }
        } else if (typeof ans === "number") {
          numericAnswers[qId] = ans;
          combinedForReview[qId] = ans;
        }
      });

      const res = await submitExamAttempt({
        examId: exam.id,
        answers: numericAnswers,
        textAnswers,
        timeSpentSeconds: spent,
      });

      // Clear the active draft progress since the exam is now submitted
      if (exam?.id) {
        try {
          localStorage.removeItem(`lms_exam_active_progress_${exam.id}`);
        } catch {}
      }

      if (user?.id && exam?.id) {
        try {
          localStorage.setItem(`lms_exam_attempted_${user.id}_${exam.id}`, JSON.stringify({
            userId: user.id,
            ...res,
            answers: combinedForReview,
            textAnswers,
            evaluations: res?.evaluations || {},
          }));
        } catch {}
      }

      setResult({
        ...res,
        answers: combinedForReview,
        textAnswers,
        evaluations: res?.evaluations || {},
        timeSpentSeconds: spent,
      });

      setReviewMode(true);
      setExamState("result");
      await refreshProfile?.();
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء تسليم الامتحان، إجاباتك محفوظة بالكامل ويمكنك إعادة المحاولة.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFinalSubmit() {
    await performSubmission();
  }

  // Count remaining pending essay questions
  const pendingEssaysCount = useMemo(() => {
    if (!result?.evaluations) return 0;
    return questions.filter((q) => {
      const isEssay = q.type === "essay" || (!q.choices || q.choices.length === 0);
      if (!isEssay) return false;
      const ev = result.evaluations?.[q.questionId];
      return !ev || ev.isPending;
    }).length;
  }, [result, questions]);

  // Parallel Real-Time Essay Grader in Review screen
  const gradingQueueRef = useRef(new Set());

  useEffect(() => {
    if (examState !== "result" || !result?.id) return;

    const pendingEssays = questions.filter((q) => {
      const isEssay = q.type === "essay" || (!q.choices || q.choices.length === 0);
      if (!isEssay) return false;
      const ev = result.evaluations?.[q.questionId];
      return !ev || ev.isPending;
    });

    if (pendingEssays.length === 0) return;

    pendingEssays.forEach(async (q) => {
      if (gradingQueueRef.current.has(q.questionId)) return;
      gradingQueueRef.current.add(q.questionId);

      try {
        const studentAns = result.textAnswers?.[q.questionId] || result.answers?.[q.questionId] || "";
        const formattedAns = typeof studentAns === "string" ? studentAns : JSON.stringify(studentAns);

        const graded = await gradeExamSingleEssay({
          examId: exam.id,
          attemptId: result.id,
          questionId: q.questionId,
          studentAnswer: formattedAns,
        });

        if (graded?.evaluation) {
          setResult((prev) => {
            if (!prev) return prev;
            const updatedEvals = {
              ...(prev.evaluations || {}),
              [q.questionId]: graded.evaluation,
            };
            const updated = {
              ...prev,
              earnedPoints: graded.totalEarnedPoints ?? prev.earnedPoints,
              percentage: graded.percentage ?? prev.percentage,
              evaluations: updatedEvals,
              isGradingComplete: graded.isAllGraded,
            };

            if (user?.id && exam?.id) {
              try {
                localStorage.setItem(`lms_exam_attempted_${user.id}_${exam.id}`, JSON.stringify({
                  userId: user.id,
                  ...updated,
                }));
              } catch {}
            }

            return updated;
          });
        }
      } catch (err) {
        console.error("Failed to grade essay question in background:", q.questionId, err);
      } finally {
        gradingQueueRef.current.delete(q.questionId);
      }
    });
  }, [examState, result?.id, questions, exam?.id, user?.id]);

  // Exit Guard during running exam
  useEffect(() => {
    if (examState !== "running") return;

    // Push state so back button is trapped
    window.history.pushState(null, "", window.location.href);

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "⚠️ الامتحان جارٍ الآن! هل أنت متأكد من مغادرة الصفحة؟";
      return e.returnValue;
    };

    const handlePopState = () => {
      // Trap back navigation and open exit confirmation modal
      window.history.pushState(null, "", window.location.href);
      setExitWarningModalOpen(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Sync timer accurately when coming back from camera, gallery, or another tab
        if (expireAtRef.current) {
          const remaining = Math.max(0, Math.floor((expireAtRef.current - Date.now()) / 1000));
          setTimeLeft(remaining);
          if (remaining <= 0) {
            handleFinalSubmit();
          }
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [examState]);

  // Timer runner with accurate target timestamp sync
  useEffect(() => {
    if (examState !== "running") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const tick = () => {
      const targetExpire = expireAtRef.current;
      let remaining = 0;
      if (targetExpire) {
        remaining = Math.max(0, Math.floor((targetExpire - Date.now()) / 1000));
      } else {
        remaining = Math.max(0, timeLeftRef.current - 1);
      }

      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleFinalSubmit();
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examState]);

  function handleStartExam() {
    if (isRetakeForbidden && hasCompletedAttempt) {
      alert("هذا الامتحان غير مسموح بإعادته مرة أخرى بناءً على تعليمات المعلم.");
      return;
    }
    const listToShuffle = baseQuestions.length > 0 ? baseQuestions : questions;
    const shuffled = shuffleArray(listToShuffle);
    const now = Date.now();
    const durationSeconds = (exam?.minutes || 30) * 60;
    const expireAt = now + durationSeconds * 1000;

    expireAtRef.current = expireAt;
    setShuffledList(shuffled);
    setAnswers({});
    setAnswerImages({});
    setFlagged(new Set());
    setCurrentIndex(0);
    setTimeLeft(durationSeconds);
    setExamState("running");
    setReviewMode(false);
    setRestoredNotice(false);

    try {
      const progressKey = `lms_exam_active_progress_${exam.id}`;
      localStorage.setItem(
        progressKey,
        JSON.stringify({
          examId: exam.id,
          userId: user?.id,
          startedAt: now,
          expireAt: expireAt,
          questionIds: shuffled.map((q) => q.questionId),
          answers: {},
          answerImages: {},
          flagged: [],
          currentIndex: 0,
        })
      );
    } catch {}
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

  async function handleImageUpload(questionId, file) {
    if (!file) return;
    if (!navigator.onLine) {
      alert("⚠️ لا يوجد اتصال بالإنترنت حالياً. إجاباتك النصية محفوظة بأمان، يرجى إعادة رفع الصورة فور عودة الاتصال.");
      return;
    }
    setUploadingImage(true);
    try {
      const compressed = await compressImageFile(file);
      const uploadedUrl = await uploadExamAnswerImage(compressed);
      setAnswerImages((prev) => ({
        ...prev,
        [questionId]: uploadedUrl,
      }));
    } catch (err) {
      alert(err?.message || "تعذر رفع صورة الإجابة، يرجى التأكد من جودة الاتصال والمحاولة مرة أخرى.");
    } finally {
      setUploadingImage(false);
    }
  }

  function handleRemoveImage(questionId) {
    setAnswerImages((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  function toggleFlag(questionId) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
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
              <button
                type="button"
                onClick={() => setExitWarningModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-black flex items-center gap-1.5 shrink-0 select-none border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                title="تسليم ومغادرة الامتحان"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">تسليم ومغادرة</span>
                <span className="sm:hidden">تسليم ومغادرة</span>
              </button>
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

      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs font-black flex items-center justify-center gap-2 text-center shadow-md">
          <WifiOff size={16} />
          <span>تم فقد الاتصال بالإنترنت - لا تقلق! إجاباتك تُحفظ تلقائياً على جهازك دون فقدان أي بيانات، ويمكنك متابعة الحل وسيتم تسليم الامتحان فور عودة الاتصال.</span>
        </div>
      )}

      {/* Restored Progress Notice Banner */}
      {restoredNotice && examState === "running" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-600 text-white px-4 py-2 text-xs font-black flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-2 mx-auto">
            <CheckCircle2 size={16} />
            <span>تم استعادة إجاباتك وتقدمك في الامتحان تلقائياً بنجاح، يمكنك متابعة الحل بأمان.</span>
          </div>
          <button
            type="button"
            onClick={() => setRestoredNotice(false)}
            className="p-1 hover:bg-white/20 rounded-lg transition"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}

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
                <li className="text-red-600 dark:text-red-400 font-black">
                  ⚠️ تنبيه مشدد: مغادرة شاشة الامتحان أو التبديل بين النوافذ والتطبيقات أثناء الامتحان تؤدي لإنذار فوري وتكرارها يسلّم الامتحان تلقائياً بالدرجة الحالية!
                </li>
              </ul>
            </div>

            {/* Start CTA or Blocked Card */}
            {isRetakeForbidden && hasCompletedAttempt ? (
              <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                  <Lock size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    لقد قمت بأداء هذا الامتحان مسبقاً
                  </h3>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    هذا الامتحان محدد بمحاولة واحدة فقط وغير مسموح بإعادته مرة أخرى بناءً على تعليمات المعلم.
                  </p>
                </div>

                {priorAttempt && (
                  <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-xs font-black shadow-sm">
                    <Award size={16} className="text-emerald-500" />
                    <span>درجتك المسجلة: {priorAttempt.earnedPoints ?? 0} من {priorAttempt.totalPoints ?? totalPoints} ({priorAttempt.percentage ?? 0}%)</span>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  {priorAttempt && (
                    <button
                      type="button"
                      onClick={() => {
                        setResult(priorAttempt);
                        setReviewMode(true);
                        setExamState("result");
                      }}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0077B6] to-[#00A8E8] hover:opacity-95 text-white text-xs font-black transition flex items-center gap-2 shadow-md shadow-cyan-600/20"
                    >
                      <BookOpen size={15} />
                      <span>عرض نتيجتي ومراجعة الإجابات</span>
                    </button>
                  )}
                  <Link
                    to="/"
                    className="px-6 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black transition flex items-center gap-2"
                  >
                    <Home size={15} />
                    <span>العودة للرئيسية</span>
                  </Link>
                </div>
              </div>
            ) : (
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
            )}
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

              {/* Options / Text Input / Image Upload */}
              {currentQuestion.type === "essay" || (!currentQuestion.choices || currentQuestion.choices.length === 0) ? (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      إجابتك على السؤال المقالي (كتابة نصية أو رفع صورة ورقة الحل اليدوي):
                    </label>
                    <span className="text-[11px] font-bold text-[#0077B6] dark:text-[#00A8E8] bg-cyan-50 dark:bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-200/60 dark:border-cyan-800/40">
                      متاح: كتابة مباشرة أو صورة حل
                    </span>
                  </div>

                  {/* Direct Text Input */}
                  <textarea
                    rows={5}
                    value={answers[currentQuestion.questionId] || ""}
                    onChange={(e) => handleTextAnswer(currentQuestion.questionId, e.target.value)}
                    placeholder="اكتب إجابتك هنا ليتم تصحيحها ومراجعتها..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-4 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20 transition"
                  />

                  {/* Image Answer Upload Box */}
                  <div className="p-4 rounded-2xl border border-dashed border-cyan-300 dark:border-cyan-800/70 bg-gradient-to-l from-cyan-50/50 via-sky-50/30 to-white dark:from-cyan-950/20 dark:via-slate-900 dark:to-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera size={18} className="text-[#0077B6] dark:text-[#00A8E8]" />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          إرفاق صورة الإجابة (حل يدوي / ورقة إجابة)
                        </span>
                      </div>
                      {answerImages[currentQuestion.questionId] && (
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={12} />
                          <span>تم إرفاق صورة الحل</span>
                        </span>
                      )}
                    </div>

                    {answerImages[currentQuestion.questionId] ? (
                      /* Uploaded Image Preview Card */
                      <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div
                          onClick={() => setPreviewImageModal(answerImages[currentQuestion.questionId])}
                          className="relative group cursor-pointer w-28 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shrink-0"
                        >
                          <img
                            src={answerImages[currentQuestion.questionId]}
                            alt="صورة إجابتك"
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                            <ZoomIn size={18} />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1 text-center sm:text-right">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                            تم رفع صورة الإجابة بنجاح
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            يمكنك النقر على الصورة لتكبيرها والتحقق من وضوح الخط
                          </p>
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewImageModal(answerImages[currentQuestion.questionId])}
                              className="px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 text-[#0077B6] dark:text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition"
                            >
                              <Eye size={13} />
                              <span>معاينة مكبرة</span>
                            </button>

                            <label className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition">
                              <RefreshCw size={13} className={uploadingImage ? "animate-spin" : ""} />
                              <span>تغيير الصورة</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingImage}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(currentQuestion.questionId, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => handleRemoveImage(currentQuestion.questionId)}
                              className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1.5 transition"
                            >
                              <Trash2 size={13} />
                              <span>حذف</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Upload Button / Trigger */
                      <div>
                        <label className={`flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-cyan-400/80 dark:border-cyan-700/60 bg-white/80 dark:bg-slate-800/60 hover:bg-cyan-50/60 dark:hover:bg-cyan-950/30 cursor-pointer transition group shadow-sm ${uploadingImage ? "opacity-60 pointer-events-none" : ""}`}>
                          {uploadingImage ? (
                            <div className="flex items-center gap-2 text-[#0077B6] dark:text-[#00A8E8] text-xs font-bold py-2">
                              <RefreshCw size={18} className="animate-spin" />
                              <span>جارٍ معالجة ورفع صورة الإجابة...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-center">
                              <div className="w-11 h-11 rounded-2xl bg-cyan-100 dark:bg-cyan-900/60 text-[#0077B6] dark:text-cyan-300 flex items-center justify-center group-hover:scale-110 transition shadow-sm">
                                <UploadCloud size={22} />
                              </div>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-100 mt-1">
                                اضغط هنا لرفع صورة الحل أو التقاطها بالكاميرا
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                يدعم JPG, PNG, WebP (يمكنك كتابة نص أعلاه أو رفع صورة أو كلاهما)
                              </span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingImage}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(currentQuestion.questionId, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
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
                  const isAnswered = isQuestionAnswered(q.questionId);
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

            {/* Live AI Grading Banner */}
            {pendingEssaysCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-[#0077B6]/15 to-emerald-500/10 border-2 border-cyan-400 dark:border-cyan-600 shadow-md text-right space-y-2"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-950 text-[#0077B6] dark:text-cyan-400 flex items-center justify-center shrink-0">
                      <Sparkles size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>جاري تصحيح الأسئلة المقالية بالذكاء الاصطناعي...</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-cyan-100 dark:bg-cyan-900/80 text-[#0077B6] dark:text-cyan-300 font-mono font-black">
                          {pendingEssaysCount} متبقي
                        </span>
                      </h4>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        الدرجة الحالية لاختياراتك فقط. يمكنك مراجعة الإجابات بالأسفل وستُحتسب وتُضاف درجات كل سؤال مقالي فور اكتماله تلقائياً.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-700 text-xs font-black text-[#0077B6] dark:text-cyan-300 shadow-sm">
                    <Loader2 size={13} className="animate-spin" />
                    <span>تصحيح حي متوازي</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Score Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {result.earnedPoints} <span className="text-xs text-slate-400">/ {result.totalPoints}</span>
                  {pendingEssaysCount > 0 && <span className="text-[11px] text-amber-600 dark:text-amber-400 font-black block mt-0.5">(+جاري المقالي ⏳)</span>}
                </p>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  {pendingEssaysCount > 0 ? "درجة الاختياري الحالية" : "الدرجة المحققة"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-2xl font-black text-[#0077B6] dark:text-[#00A8E8]">
                  {pendingEssaysCount > 0 ? (
                    <span className="text-sm font-black flex items-center justify-center gap-1 text-cyan-600 dark:text-cyan-400">
                      <Loader2 size={14} className="animate-spin" />
                      <span>قيد الاحتساب</span>
                    </span>
                  ) : (
                    `${result.percentage}%`
                  )}
                </p>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  {pendingEssaysCount > 0 ? "النسبة بعد المقالي" : "النسبة المئوية"}
                </p>
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

              {isTeacherOrAdmin ? (
                <button
                  type="button"
                  onClick={handleStartExam}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-black transition flex items-center gap-2 shadow-sm"
                >
                  <RotateCcw size={16} />
                  <span>إعادة الاختبار (معاينة المعلم - محاولات غير محدودة)</span>
                </button>
              ) : !isRetakeForbidden ? (
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
                  <span>هذا الامتحان غير مسموح بإعادته مرة أخرى بناءً على تعليمات المعلم (محاولة واحدة فقط)</span>
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
                const studentAns = result.answers?.[q.questionId] ?? priorAttempt?.answers?.[q.questionId];
                const qEval = result.evaluations?.[q.questionId] || priorAttempt?.evaluations?.[q.questionId];
                const isEssay = q.type === "essay" || (!q.choices || q.choices.length === 0);
                const isMCQCorrect = !isEssay && studentAns === q.correctIndex;
                const isPendingEssay = isEssay && (!qEval || qEval.isPending);
                const essayScore = qEval ? Number(qEval.earnedPoints ?? 0) : 0;
                const isEssayFull = isEssay && qEval && !isPendingEssay && essayScore >= q.points;
                const isEssayPartial = isEssay && qEval && !isPendingEssay && essayScore > 0 && essayScore < q.points;

                return (
                  <div
                    key={q.questionId}
                    className={`p-5 rounded-2xl border transition-all duration-300 ${
                      isEssay
                        ? isPendingEssay
                          ? "bg-cyan-50/50 dark:bg-cyan-950/25 border-cyan-300 dark:border-cyan-700/60 shadow-sm"
                          : isEssayFull
                          ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                          : isEssayPartial
                          ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
                          : "bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-800"
                        : isMCQCorrect
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                        : "bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                    } space-y-3 text-right`}
                  >
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-slate-500 dark:text-slate-400">سؤال {qIdx + 1}</span>
                      <span
                        className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                          isEssay
                            ? isPendingEssay
                              ? "bg-cyan-100 dark:bg-cyan-900/70 text-[#0077B6] dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"
                              : isEssayFull
                              ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
                              : isEssayPartial
                              ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                              : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                            : isMCQCorrect
                            ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
                            : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {isEssay ? (
                          isPendingEssay ? (
                            <>
                              <Loader2 size={13} className="animate-spin text-[#0077B6] dark:text-cyan-400" />
                              <span>جاري التصحيح بالـ AI...</span>
                              <span className="opacity-80 font-mono">({q.points} درجات)</span>
                            </>
                          ) : qEval ? (
                            <>
                              <span>{isEssayFull ? "إجابة مقالية صحيحة ✓" : isEssayPartial ? "إجابة مقالية جزئية" : "إجابة مقالية خاطئة ✗"}</span>
                              <span className="opacity-90 font-black">({essayScore} / {q.points} درجة)</span>
                            </>
                          ) : (
                            <span>سؤال مقالي ({q.points} درجات)</span>
                          )
                        ) : isMCQCorrect ? (
                          <span>إجابة صحيحة ✓ ({q.points} درجة)</span>
                        ) : (
                          <span>إجابة خاطئة ✗ (0 / {q.points})</span>
                        )}
                      </span>
                    </div>

                    <p className="text-sm font-black text-slate-900 dark:text-white leading-relaxed">
                      {q.prompt}
                    </p>

                    {q.questionImageUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 my-2 max-w-md mx-auto">
                        <img
                          src={q.questionImageUrl}
                          alt="صورة السؤال"
                          className="max-h-64 w-auto mx-auto rounded-lg object-contain"
                        />
                      </div>
                    )}

                    {q.type !== "essay" && Array.isArray(q.choices) && (
                      <div className="space-y-2 pt-2 text-xs">
                        {q.choices.map((c, cIdx) => {
                          const wasSelected = studentAns === cIdx;
                          const wasRight = q.correctIndex === cIdx;

                          let choiceStyle = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300";
                          if (wasRight) {
                            choiceStyle = "bg-emerald-100 dark:bg-emerald-900/70 border-emerald-400 text-emerald-800 dark:text-emerald-200 font-black";
                          } else if (wasSelected && !wasRight) {
                            choiceStyle = "bg-red-100 dark:bg-red-900/70 border-red-400 text-red-800 dark:text-red-200 font-black";
                          }

                          return (
                            <div
                              key={cIdx}
                              className={`p-3 rounded-xl border flex items-center justify-between ${choiceStyle}`}
                            >
                              <span>{c}</span>
                              {wasRight && <Check size={16} className="text-emerald-600 dark:text-emerald-400" />}
                              {wasSelected && !wasRight && <X size={16} className="text-red-600 dark:text-red-400" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Essay Review: Student answer (text and/or image), AI Evaluation/Correction, & Model Answer */}
                    {isEssay && (() => {
                      const essayData = parseEssayAnswer(studentAns || result.textAnswers?.[q.questionId] || priorAttempt?.textAnswers?.[q.questionId]);
                      const hasText = Boolean(essayData.text);
                      const hasImage = Boolean(essayData.imageUrl);

                      return (
                        <div className="space-y-3 pt-2 text-xs">
                          {/* Student answer card */}
                          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                            <span className="block font-black text-slate-500 dark:text-slate-400">
                              إجابتك المقدمة:
                            </span>
                            {hasText && (
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                                {essayData.text}
                              </p>
                            )}
                            {hasImage && (
                              <div className="pt-2">
                                <span className="block text-[11px] font-bold text-[#0077B6] dark:text-[#00A8E8] mb-1.5">
                                  صورة الحل المرفقة:
                                </span>
                                <div className="relative inline-block group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
                                  <img
                                    src={essayData.imageUrl}
                                    alt="صورة إجابة الطالب"
                                    className="max-h-60 max-w-full rounded-xl object-contain cursor-pointer hover:opacity-95 transition"
                                    onClick={() => setPreviewImageModal(essayData.imageUrl)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImageModal(essayData.imageUrl)}
                                    className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1 backdrop-blur-sm"
                                  >
                                    <ZoomIn size={12} />
                                    <span>تكبير الصورة</span>
                                  </button>
                                </div>
                              </div>
                            )}
                            {!hasText && !hasImage && (
                              <p className="text-xs text-slate-400 font-bold">لم يتم تقديم إجابة على هذا السؤال.</p>
                            )}
                          </div>

                          {/* AI Evaluation & Correction Card */}
                          {isPendingEssay ? (
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-50/90 to-blue-50/90 dark:from-cyan-950/40 dark:to-blue-950/40 border border-cyan-300 dark:border-cyan-700/70 space-y-2.5 shadow-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-xl bg-cyan-100 dark:bg-cyan-900/60 text-[#0077B6] dark:text-cyan-300 flex items-center justify-center">
                                    <Sparkles size={15} className="animate-pulse" />
                                  </div>
                                  <div>
                                    <span className="font-black text-xs text-slate-900 dark:text-white block">
                                      جاري مراجعة وتحليل الحل بالذكاء الاصطناعي (AI)...
                                    </span>
                                    <span className="text-[11px] font-bold text-[#0077B6] dark:text-cyan-400">
                                      {hasImage ? "يتم الآن فحص الصورة وقراءة خط اليد ومطابقتها بالنموذج" : "يتم الآن مطابقة إجابتك النصية مع نموذج الإجابة"}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-700 text-[#0077B6] dark:text-cyan-300 flex items-center gap-1.5 shadow-sm">
                                  <Loader2 size={12} className="animate-spin" />
                                  <span>قيد التقييم</span>
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-cyan-100 dark:border-cyan-900">
                                ⏳ يتم فحص إجابتك بدقة بواسطة الذكاء الاصطناعي، وستظهر الدرجة المعتمدة والتقييم التفصيلي هنا تلقائياً في غضون ثوانٍ دون الحاجة لتحديث الصفحة.
                              </p>
                            </div>
                          ) : qEval ? (
                            <div className={`p-4 rounded-2xl border space-y-2.5 ${
                              isEssayFull
                                ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                                : isEssayPartial
                                ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
                                : "bg-red-50/80 dark:bg-red-950/30 border-red-300 dark:border-red-800"
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Sparkles size={16} className={isEssayFull ? "text-emerald-600" : isEssayPartial ? "text-amber-600" : "text-red-600"} />
                                  <span className="font-black text-xs text-slate-900 dark:text-white">
                                    تصحيح وتقييم الذكاء الاصطناعي (AI Correction):
                                  </span>
                                </div>
                                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-sm">
                                  الدرجة المحتسبة: {essayScore} من {q.points}
                                </span>
                              </div>

                              {qEval.feedback && (
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                  {qEval.feedback}
                                </p>
                              )}

                              {Array.isArray(qEval.strengths) && qEval.strengths.length > 0 && (
                                <div className="pt-1">
                                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                                    ✓ نقاط القوة:
                                  </span>
                                  <ul className="list-disc list-inside text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5">
                                    {qEval.strengths.map((s, idx) => (
                                      <li key={idx}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {Array.isArray(qEval.missingPoints) && qEval.missingPoints.length > 0 && (
                                <div className="pt-1">
                                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mb-0.5">
                                    ⚠ النقاط الناقصة أو التصويب:
                                  </span>
                                  <ul className="list-disc list-inside text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5">
                                    {qEval.missingPoints.map((m, idx) => (
                                      <li key={idx}>{m}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : null}

                          {/* Model Answer Card */}
                          {q.modelAnswer && (
                            <div className="p-4 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 space-y-1">
                              <span className="block font-black text-[#0077B6] dark:text-[#00A8E8]">
                                الإجابة النموذجية المعتمدة:
                              </span>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {q.modelAnswer}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ═══ AI GRADING / SUBMISSION LOADING OVERLAY ═══════════════════ */}
      <AnimatePresence>
        {isSubmitting && (
          <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-6"
            >
              {/* Animated AI Glowing Icon */}
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-3xl bg-[#0077B6] dark:bg-cyan-500 opacity-20 animate-ping" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#0077B6] to-[#00A8E8] text-white flex items-center justify-center shadow-xl shadow-cyan-500/30 border border-white/20">
                  <Sparkles size={38} className="animate-pulse" />
                </div>
              </div>

              {/* Main Notification Messages */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-[#0077B6] dark:text-cyan-300 text-xs font-black">
                  <Bot size={14} />
                  <span>{hasEssayQuestions ? "تصحيح ذكي فوري بالذكاء الاصطناعي" : "تسجيل النتيجة والاعتماد"}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-relaxed">
                  {hasEssayQuestions
                    ? "انتظر، جاري تسليم إجاباتك وبدء التصحيح الذكي..."
                    : "انتظر، يتم تسجيل إجاباتك واحتساب النتيجة..."}
                </h3>
                <p className="text-sm sm:text-base font-bold text-[#0077B6] dark:text-cyan-400">
                  سيتم نقلك فوراً لصفحة المراجعة وتصحيح الأسئلة لحظياً
                </p>
              </div>

              {/* Animated Progress Bar */}
              <div className="space-y-2.5">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                  <motion.div
                    className="bg-gradient-to-r from-[#0077B6] via-cyan-400 to-emerald-400 h-full rounded-full"
                    initial={{ width: "12%" }}
                    animate={{ width: "95%" }}
                    transition={{ duration: 7, ease: "easeInOut" }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                  <span>{hasEssayQuestions ? "تحليل الحلول المقالية والمطابقة بالنموذج..." : "حساب الدرجات والنسبة..."}</span>
                  <span className="flex items-center gap-1 font-mono text-[#0077B6] dark:text-cyan-400">
                    <Loader2 size={12} className="animate-spin" /> جاري المعالجة
                  </span>
                </div>
              </div>

              {/* Safety note */}
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 leading-relaxed">
                🔒 يرجى عدم إغلاق الصفحة أو تحديث المتصفح، جاري إنهاء وتأكيد تصحيح الامتحان فورياً...
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* ═══ EXIT CONFIRMATION MODAL (LEAVE / POPSTATE / HEADER CLICK) ══════════ */}
      <AnimatePresence>
        {exitWarningModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-[#0077B6] dark:border-cyan-600 shadow-2xl space-y-5 text-right"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-100 dark:bg-cyan-950 text-[#0077B6] dark:text-cyan-400 flex items-center justify-center mx-auto border border-cyan-200 dark:border-cyan-800">
                <AlertCircle size={32} />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  هل ترغب في مغادرة الامتحان وتسليمه الآن؟
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                  إجاباتك المسجلة محفوظة بالكامل في متصفحك. يمكنك المتابعة في أي وقت طالما أن وقت الامتحان لم ينتهِ، أو تأكيد تسليم الامتحان بالدرجة الحالية.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 space-y-1.5 text-center">
                <p>عدد الأسئلة التي تم حلها: <span className="font-black text-[#0077B6] dark:text-cyan-400">{answeredCount}</span> من أصل <span className="font-black">{questions.length}</span></p>
                <p>الوقت المتبقي: <span className="font-mono font-black text-emerald-600 dark:text-emerald-400" dir="ltr">{formatTime(timeLeft)}</span></p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExitWarningModalOpen(false)}
                  className="py-3 px-4 rounded-2xl bg-[#0077B6] hover:bg-[#00A8E8] text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20"
                >
                  <span>متابعة حل الامتحان</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setExitWarningModalOpen(false);
                    handleFinalSubmit();
                  }}
                  className="py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20"
                >
                  <Lock size={15} />
                  <span>تأكيد التسليم والمغادرة</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ 6. IMAGE PREVIEW MODAL ═════════════════════════════════════ */}
      <AnimatePresence>
        {previewImageModal && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewImageModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 overflow-hidden flex flex-col items-center border border-slate-200 dark:border-slate-800 shadow-2xl w-full"
            >
              <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera size={18} className="text-[#0077B6] dark:text-[#00A8E8]" />
                  <span>معاينة صورة الحل</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewImageModal(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="w-full max-h-[68vh] overflow-auto flex items-center justify-center rounded-2xl bg-slate-950 p-2">
                <img
                  src={previewImageModal}
                  alt="صورة الإجابة بالحجم الكامل"
                  className="max-h-[65vh] w-auto object-contain rounded-xl"
                />
              </div>

              <div className="w-full flex items-center justify-between pt-3 mt-2 text-xs">
                <a
                  href={previewImageModal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0077B6] dark:text-[#00A8E8] font-bold hover:underline flex items-center gap-1"
                >
                  <span>فتح في نافذة جديدة</span>
                  <ArrowLeft size={13} />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImageModal(null)}
                  className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
