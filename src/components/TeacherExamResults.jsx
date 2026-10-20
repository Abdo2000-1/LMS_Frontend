import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Users,
  Eye,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Phone,
  MessageCircle,
  AlertCircle,
  Sparkles,
  BookOpen,
  Calendar,
  X,
  ExternalLink,
  Printer,
  ChevronDown,
  Check,
  TrendingUp,
  HelpCircle,
  Image as ImageIcon,
  Star,
  Save
} from "lucide-react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  subscribeExams,
  getExamStudentsReport,
  getStudentExamAttemptDetail,
  reviewTeacherEssay,
  reEvaluateAttemptEssays
} from "../services/courseService.js";

function formatSeconds(sec) {
  const safe = Math.max(0, Number(sec) || 0);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TeacherExamResults({ initialExamId = null }) {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(initialExamId || "");
  const [reportData, setReportData] = useState(null);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "attempted" | "not_attempted" | "passed" | "failed" | "top"
  const [gradeFilter, setGradeFilter] = useState("all");

  // Selected Student Attempt Detail Modal
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [attemptDetail, setAttemptDetail] = useState(null);
  const [loadingAttemptDetail, setLoadingAttemptDetail] = useState(false);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reEvaluatingAi, setReEvaluatingAi] = useState(false);
  const [customScores, setCustomScores] = useState({});
  const [customFeedbacks, setCustomFeedbacks] = useState({});

  // 1. Fetch available exams list
  useEffect(() => {
    setLoadingExams(true);
    const unsub = subscribeExams((list) => {
      const arr = Array.isArray(list) ? list : [];
      setExams(arr);
      if (arr.length > 0 && !selectedExamId) {
        setSelectedExamId(initialExamId || arr[0].id);
      }
      setLoadingExams(false);
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [initialExamId]);

  // 2. Fetch Report Data when selected exam changes
  const loadReport = async (examId) => {
    if (!examId) return;
    try {
      setLoadingReport(true);
      setError("");
      const data = await getExamStudentsReport(examId);
      setReportData(data);
    } catch (err) {
      console.error("Error loading exam report:", err);
      setError(err.message || "تعذر تحميل تقرير درجات الامتحان.");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      loadReport(selectedExamId);
    }
  }, [selectedExamId]);

  // 3. Open Student Attempt Review Modal
  const handleOpenAttemptDetail = async (student) => {
    if (!student.attemptId) return;
    try {
      setSelectedAttemptId(student.attemptId);
      setLoadingAttemptDetail(true);
      setActiveQuestionIdx(0);
      const detail = await getStudentExamAttemptDetail(selectedExamId, student.attemptId);
      setAttemptDetail(detail);
    } catch (err) {
      alert(err.message || "تعذر تحميل كراسة إجابة الطالب.");
      setSelectedAttemptId(null);
    } finally {
      setLoadingAttemptDetail(false);
    }
  };

  // Teacher Essay Review / Override Submit
  const handleTeacherReviewSubmit = async (questionId, score, teacherFeedback, approveAi = false) => {
    if (!selectedExamId || !selectedAttemptId) return;
    try {
      setReviewSubmitting(true);
      const res = await reviewTeacherEssay(selectedExamId, selectedAttemptId, {
        questionId,
        score: Number(score) || 0,
        teacherFeedback: teacherFeedback || null,
        approveAi
      });

      // Update attemptDetail questions locally
      setAttemptDetail((prev) => {
        if (!prev) return prev;
        const updatedQuestions = prev.questions.map((q) => {
          if (q.questionId === questionId) {
            return {
              ...q,
              earnedPoints: res.questionScore,
              isCorrect: res.questionScore >= (q.points * 0.5),
              isTeacherReviewed: true,
              teacherScore: res.questionScore,
              teacherFeedback: teacherFeedback || q.feedback,
              teacherReviewedAt: new Date().toISOString()
            };
          }
          return q;
        });

        return {
          ...prev,
          earnedPoints: res.attemptTotalEarned,
          percentage: res.attemptPercentage,
          questions: updatedQuestions
        };
      });

      // Update student row in reportData list
      setReportData((prev) => {
        if (!prev || !prev.students) return prev;
        const updatedStudents = prev.students.map((st) => {
          if (st.attemptId === selectedAttemptId) {
            return {
              ...st,
              earnedPoints: Math.round(res.attemptTotalEarned),
              percentage: res.attemptPercentage,
              pendingTeacherReviewCount: Math.max(0, (st.pendingTeacherReviewCount || 1) - 1)
            };
          }
          return st;
        });
        return {
          ...prev,
          students: updatedStudents
        };
      });
    } catch (err) {
      console.error("Error updating teacher essay review:", err);
      alert(err.message || "فشل حفظ مراجعة السؤال المقالي");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Re-evaluate Essays with AI using new prompt
  const handleReEvaluateEssays = async () => {
    if (!selectedExamId || !selectedAttemptId) return;
    if (!window.confirm("هل تريد إعادة تصحيح جميع الأسئلة المقالية في هذا الامتحان بالذكاء الاصطناعي (AI) وتحديث الدرجة تلقائياً؟")) return;
    try {
      setReEvaluatingAi(true);
      await reEvaluateAttemptEssays(selectedExamId, selectedAttemptId);
      // Refresh attempt details
      const detail = await getStudentExamAttemptDetail(selectedExamId, selectedAttemptId);
      setAttemptDetail(detail);
      // Refresh report
      if (selectedExamId) {
        loadReport(selectedExamId);
      }
    } catch (err) {
      console.error("Error re-evaluating essays:", err);
      alert(err.message || "تعذر إعادة تصحيح الأسئلة المقالية.");
    } finally {
      setReEvaluatingAi(false);
    }
  };

  // 4. Excel Export
  const handleExportExcel = () => {
    if (!reportData || !reportData.students || reportData.students.length === 0) {
      alert("لا توجد بيانات متاحة للتصدير حالياً.");
      return;
    }

    const rows = filteredStudents.map((s, idx) => ({
      "م": idx + 1,
      "كود الطالب": s.studentCode || "-",
      "اسم الطالب": s.fullName || "بدون اسم",
      "رقم الهاتف": s.phone || "-",
      "هاتف ولي الأمر": s.parentPhone || "-",
      "الصف الدراسي": s.grade || "-",
      "السنتر": s.center || "-",
      "المحافظة": s.governorate || "-",
      "حالة الامتحان": s.hasAttempted ? "تم أداء الامتحان" : "لم يمتحن بعد",
      "الدرجة": s.hasAttempted ? `${s.earnedPoints ?? 0} / ${s.totalPoints ?? reportData.totalPoints}` : "-",
      "النسبة المئوية": s.hasAttempted ? `${s.percentage ?? 0}%` : "-",
      "النتيجة": s.hasAttempted ? (s.percentage >= 50 ? "ناجح" : "راسب") : "-",
      "الوقت المستغرق (دقيقة)": s.hasAttempted ? formatSeconds(s.timeSpentSeconds) : "-",
      "تاريخ التسليم": s.hasAttempted && s.submittedAt ? new Date(s.submittedAt).toLocaleString("ar-EG", { hour12: true }) : "-"
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "كشف الدرجات");

    const safeTitle = (reportData.examTitle || "امتحان").replace(/[\/\\?%*:|"<>]/g, "_");
    XLSX.writeFile(workbook, `كشف_درجات_${safeTitle}.xlsx`);
  };

  // Unique grades in the student list
  const availableGrades = useMemo(() => {
    if (!reportData?.students) return [];
    const set = new Set();
    reportData.students.forEach((s) => {
      if (s.grade && s.grade.trim()) set.add(s.grade.trim());
    });
    return Array.from(set);
  }, [reportData]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    if (!reportData?.students) return [];
    return reportData.students.filter((s) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = (s.fullName || "").toLowerCase().includes(q);
        const matchPhone = (s.phone || "").includes(q);
        const matchParentPhone = (s.parentPhone || "").includes(q);
        const matchCode = (s.studentCode || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchParentPhone && !matchCode) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter === "attempted" && !s.hasAttempted) return false;
      if (statusFilter === "not_attempted" && s.hasAttempted) return false;
      if (statusFilter === "passed" && (!s.hasAttempted || (s.percentage ?? 0) < 50)) return false;
      if (statusFilter === "failed" && (!s.hasAttempted || (s.percentage ?? 0) >= 50)) return false;
      if (statusFilter === "top" && (!s.hasAttempted || (s.percentage ?? 0) < 85)) return false;

      // 3. Grade Filter
      if (gradeFilter !== "all" && s.grade !== gradeFilter) {
        return false;
      }

      return true;
    });
  }, [reportData, searchQuery, statusFilter, gradeFilter]);

  const stats = reportData?.stats || {
    totalStudents: 0,
    attemptedCount: 0,
    notAttemptedCount: 0,
    averagePercentage: 0,
    highestPercentage: 0,
    passedCount: 0,
    failedCount: 0
  };

  const attendanceRate = stats.totalStudents > 0
    ? Math.round((stats.attemptedCount / stats.totalStudents) * 100)
    : 0;

  return (
    <div className="space-y-6 font-['Cairo',_sans-serif]" dir="rtl">
      {/* ═══ 1. HEADER & EXAM PICKER ═══════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/70 text-[#0077B6] dark:text-[#00A8E8] text-xs font-black">
              <Award size={15} />
              <span>لوحة المعلم • متابعة نتائج الطلاب وكراسات الإجابة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              نتائج وكراسات إجابات الامتحانات
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
              تابع من أدى الامتحان ومن لم يمتحن بعد، واطلع على إجابات كل طالب سؤالاً بسؤال بالتفصيل.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => loadReport(selectedExamId)}
              disabled={loadingReport}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-black text-slate-700 dark:text-slate-300 transition flex items-center gap-2"
            >
              <RefreshCw size={14} className={loadingReport ? "animate-spin" : ""} />
              <span>تحديث البيانات</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!reportData || filteredStudents.length === 0}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 disabled:opacity-50 text-white text-xs font-black transition flex items-center gap-2 shadow-md shadow-emerald-600/20"
            >
              <Download size={15} />
              <span>تصدير كشف الدرجات (Excel)</span>
            </button>
          </div>
        </div>

        {/* Exam Selection Dropdown */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              اختر الامتحان المراد عرض نتائجه:
            </label>
            <div className="relative">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                disabled={loadingExams}
                className="w-full appearance-none px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-black text-slate-900 dark:text-white pl-10 focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} {ex.courseTitle ? `(${ex.courseTitle})` : ""} • {ex.questionsCount || 0} أسئلة • {ex.minutes || 30} دقيقة
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {reportData && (
            <div className="shrink-0 flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-r border-slate-200 dark:border-slate-700 pr-0 sm:pr-4">
              <div className="text-center px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">إجمالي الدرجات</span>
                <span className="text-sm font-black text-[#0077B6] dark:text-[#00A8E8]">
                  {reportData.totalPoints} درجة
                </span>
              </div>
              <div className="text-center px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">عدد الأسئلة</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                  {reportData.questionsCount} سؤال
                </span>
              </div>
              <div className="text-center px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">المدة</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                  {reportData.minutes} دقيقة
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 2. ANALYTICS & STATS CARDS ═══════════════════════════════════ */}
      {reportData && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
          {/* Card 1: Total Registered */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-right space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-black">إجمالي الطلاب</span>
              <Users size={16} />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalStudents}
            </p>
            <span className="text-[11px] font-bold text-slate-400 block">طالب مسجل</span>
          </div>

          {/* Card 2: Attended */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 shadow-sm text-right space-y-1">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-xs font-black">حضروا الامتحان</span>
              <CheckCircle2 size={16} />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {stats.attemptedCount}
              </p>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                {attendanceRate}%
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600/80 dark:text-emerald-400/80 block">
              نسبة الحضور
            </span>
          </div>

          {/* Card 3: Absent */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-slate-900 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 shadow-sm text-right space-y-1">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-xs font-black">لم يمتحنوا بعد</span>
              <Clock size={16} />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
                {stats.notAttemptedCount}
              </p>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                {100 - attendanceRate}%
              </span>
            </div>
            <span className="text-[11px] font-bold text-amber-600/80 dark:text-amber-400/80 block">
              متبقي لأداء الامتحان
            </span>
          </div>

          {/* Card 4: Average Score */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-right space-y-1">
            <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400">
              <span className="text-xs font-black">متوسط الدرجات</span>
              <TrendingUp size={16} />
            </div>
            <p className="text-2xl font-black text-[#0077B6] dark:text-[#00A8E8]">
              {stats.averagePercentage}%
            </p>
            <span className="text-[11px] font-bold text-slate-400 block">
              متوسط نسبة الطلاب
            </span>
          </div>

          {/* Card 5: Highest Score */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-right space-y-1">
            <div className="flex items-center justify-between text-amber-500">
              <span className="text-xs font-black">أعلى درجة</span>
              <Award size={16} />
            </div>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.highestPercentage}%
            </p>
            <span className="text-[11px] font-bold text-slate-400 block">الدرجة النهائية أو الأعلى</span>
          </div>

          {/* Card 6: Passed count */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-right space-y-1">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-xs font-black">الناجحون (≥50%)</span>
              <CheckCircle2 size={16} />
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
              {stats.passedCount}
            </p>
            <span className="text-[11px] font-bold text-slate-400 block">
              راسب: {stats.failedCount} طالب
            </span>
          </div>
        </div>
      )}

      {/* ═══ 3. SEARCH & FILTERS BAR ═══════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="بحث باسم الطالب، رقم الهاتف، هاتف ولي الأمر، كود الطالب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 pl-10 focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
            />
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Grade Selector */}
          {availableGrades.length > 0 && (
            <div className="w-full sm:w-auto flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">الصف:</span>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">جميع الصفوف الدراسية</option>
                {availableGrades.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: "all", label: `الكل (${reportData?.students?.length || 0})` },
            { id: "attempted", label: `أدوا الامتحان (${stats.attemptedCount})` },
            { id: "not_attempted", label: `لم يمتحنوا بعد (${stats.notAttemptedCount})` },
            { id: "top", label: `المتفوقون (≥85%)` },
            { id: "passed", label: `الناجحون (${stats.passedCount})` },
            { id: "failed", label: `دون 50% (${stats.failedCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black shrink-0 transition ${
                statusFilter === tab.id
                  ? "bg-[#0077B6] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 4. STUDENTS LIST TABLE ═══════════════════════════════════ */}
      {loadingReport ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center space-y-3">
          <RefreshCw size={28} className="animate-spin text-[#0077B6] mx-auto" />
          <p className="text-xs font-black text-slate-600 dark:text-slate-400">
            جاري تجميع كشف درجات ومحاولات الطلاب في هذا الامتحان...
          </p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-800 dark:text-rose-200 p-6 rounded-3xl text-center space-y-2">
          <AlertCircle size={24} className="mx-auto" />
          <p className="text-sm font-black">{error}</p>
          <button
            type="button"
            onClick={() => loadReport(selectedExamId)}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center space-y-2">
          <Users size={36} className="text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-sm font-black text-slate-700 dark:text-slate-300">
            لا يوجد طلاب يطابقون خيارات البحث الحالية
          </p>
          <p className="text-xs font-bold text-slate-400">
            جرّب تغيير قسم الفلترة أو مسح كلمة البحث لرؤية بقية الطلاب
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 dark:text-slate-400">
                  <th className="py-4 px-4">م</th>
                  <th className="py-4 px-4">الطالب</th>
                  <th className="py-4 px-4">أرقام التواصل</th>
                  <th className="py-4 px-4 text-center">حالة الامتحان</th>
                  <th className="py-4 px-4 text-center">الدرجة والنسبة</th>
                  <th className="py-4 px-4 text-center">الوقت المستغرق</th>
                  <th className="py-4 px-4 text-center">تاريخ التسليم</th>
                  <th className="py-4 px-4 text-center">كراسة الإجابة والتصحيح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold">
                {filteredStudents.map((student, idx) => {
                  const isCompleted = student.hasAttempted;
                  const pct = student.percentage ?? 0;
                  const isTop = pct >= 85;
                  const isPass = pct >= 50;

                  return (
                    <tr
                      key={student.studentId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Index */}
                      <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Student Info */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <p className="font-black text-slate-900 dark:text-white text-sm">
                            {student.fullName}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {student.studentCode && (
                              <span className="px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950 text-[#0077B6] dark:text-[#00A8E8] text-[10px] font-mono font-black border border-cyan-200 dark:border-cyan-800">
                                #{student.studentCode}
                              </span>
                            )}
                            {student.grade && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                                {student.grade}
                              </span>
                            )}
                            {student.center && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">
                                {student.center}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phones */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {student.phone ? (
                            <a
                              href={`https://wa.me/2${student.phone.replace(/^0+/, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 flex items-center gap-1"
                              title="مراسلة واتساب الطالب"
                            >
                              <Phone size={11} className="text-emerald-500" />
                              <span>{student.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}

                          {student.parentPhone && (
                            <a
                              href={`https://wa.me/2${student.parentPhone.replace(/^0+/, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-emerald-600 flex items-center gap-1"
                              title="مراسلة ولي الأمر"
                            >
                              <span className="text-slate-400">ولي الأمر:</span>
                              <span>{student.parentPhone}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Exam Status Badge */}
                      <td className="py-4 px-4 text-center">
                        {isCompleted ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-black border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle2 size={12} />
                              <span>تم الامتحان</span>
                            </span>
                            {student.pendingTeacherReviewCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black border border-amber-300 dark:border-amber-700">
                                <AlertCircle size={10} />
                                <span>مراجعة مقالي ({student.pendingTeacherReviewCount})</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-black border border-slate-200 dark:border-slate-700">
                            <Clock size={12} />
                            <span>لم يمتحن بعد</span>
                          </span>
                        )}
                      </td>

                      {/* Score & Percentage */}
                      <td className="py-4 px-4 text-center">
                        {isCompleted ? (
                          <div className="space-y-0.5">
                            <div className="font-black text-sm text-slate-900 dark:text-white">
                              {student.earnedPoints ?? 0}{" "}
                              <span className="text-xs text-slate-400">/ {student.totalPoints ?? reportData.totalPoints}</span>
                            </div>
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black ${
                                isTop
                                  ? "bg-emerald-500 text-white"
                                  : isPass
                                  ? "bg-[#0077B6] text-white"
                                  : "bg-rose-500 text-white"
                              }`}
                            >
                              {pct}% {isTop ? "⭐ ممتاز" : isPass ? "ناجح" : "راسب"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Time Spent */}
                      <td className="py-4 px-4 text-center text-slate-600 dark:text-slate-400 text-[11px] font-mono">
                        {isCompleted ? `${formatSeconds(student.timeSpentSeconds)} دقيقة` : "-"}
                      </td>

                      {/* Date Submitted */}
                      <td className="py-4 px-4 text-center text-slate-500 text-[11px]">
                        {isCompleted && student.submittedAt ? (
                          <span>
                            {new Date(student.submittedAt).toLocaleDateString("ar-EG", {
                              month: "short",
                              day: "numeric"
                            })}{" "}
                            {new Date(student.submittedAt).toLocaleTimeString("ar-EG", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true
                            })}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* Action: Open Question-by-Question Review */}
                      <td className="py-4 px-4 text-center">
                        {isCompleted ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAttemptDetail(student)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0077B6] to-[#00A8E8] hover:opacity-95 text-white text-xs font-black shadow-sm transition"
                          >
                            <Eye size={13} />
                            <span>كراسة الإجابة سؤال بسؤال</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-bold">لا توجد محاولة</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>عدد الطلاب المعروضين: {filteredStudents.length} طالب</span>
            <span>إجمالي درجات الامتحان: {reportData?.totalPoints} درجة</span>
          </div>
        </div>
      )}

      {/* ═══ 5. STUDENT QUESTION-BY-QUESTION ATTEMPT REVIEW MODAL ═══════ */}
      <AnimatePresence>
        {selectedAttemptId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-right"
              dir="rtl"
            >
              {/* Modal Top Bar */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-l from-slate-50 via-white to-cyan-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0077B6] to-[#00A8E8] text-white flex items-center justify-center shadow-md">
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        كراسة إجابات الطالب: {attemptDetail?.studentName || "جاري التحميل..."}
                      </h2>
                      {attemptDetail?.studentCode && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950 text-[#0077B6] dark:text-[#00A8E8] text-xs font-mono font-black">
                          #{attemptDetail.studentCode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-bold">
                      {attemptDetail?.examTitle} • وقت التسليم:{" "}
                      {attemptDetail?.submittedAt
                        ? new Date(attemptDetail.submittedAt).toLocaleString("ar-EG", { hour12: true })
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    title="طباعة كراسة الإجابة"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAttemptId(null);
                      setAttemptDetail(null);
                    }}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              {loadingAttemptDetail ? (
                <div className="p-20 text-center space-y-3">
                  <RefreshCw size={28} className="animate-spin text-[#0077B6] mx-auto" />
                  <p className="text-xs font-black text-slate-500">
                    جاري تحميل إجابات وأسئلة الطالب سؤالاً بسؤال...
                  </p>
                </div>
              ) : !attemptDetail ? (
                <div className="p-12 text-center text-rose-600 font-black text-sm">
                  تعذر عرض تفاصيل المحاولة.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                  {/* Score KPI Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">الدرجة النهائية</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        {attemptDetail.earnedPoints} / {attemptDetail.totalPoints}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">النسبة المئوية</span>
                      <span
                        className={`text-lg font-black ${
                          attemptDetail.percentage >= 50 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {attemptDetail.percentage}%
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">الوقت المستغرق</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                        {formatSeconds(attemptDetail.timeSpentSeconds)}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">عدد الأسئلة</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        {attemptDetail.questions.length} سؤال
                      </span>
                    </div>
                  </div>

                  {/* Essay AI Re-evaluation & Teacher Fast Tools */}
                  {attemptDetail.questions.some((q) => q.type === "essay") && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/40 dark:to-blue-950/40 border border-cyan-200 dark:border-cyan-800">
                      <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-[#0077B6] shrink-0" />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          يحتوي هذا الامتحان على أسئلة مقالية. يمكنك اعتماد درجات الـ AI أو تعديل درجات كل سؤال يدوياً من بالأسفل.
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={reEvaluatingAi || reviewSubmitting}
                        onClick={handleReEvaluateEssays}
                        className="px-4 py-2 rounded-xl bg-[#0077B6] hover:bg-[#005f92] text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 shrink-0"
                      >
                        <RefreshCw size={13} className={reEvaluatingAi ? "animate-spin" : ""} />
                        <span>{reEvaluatingAi ? "جاري إعادة التقييم بالـ AI..." : "🔄 إعادة تصحيح المقالي بالذكاء الاصطناعي"}</span>
                      </button>
                    </div>
                  )}

                  {/* Question Number Pills Navigation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300">
                      <span>انتقل مباشرة لأي سؤال:</span>
                      <span className="text-slate-400">
                        السؤال {activeQuestionIdx + 1} من {attemptDetail.questions.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {attemptDetail.questions.map((q, idx) => {
                        const isCurrent = idx === activeQuestionIdx;
                        const isCorrect = q.isCorrect;
                        const isEssay = q.type === "essay";

                        let badgeBg = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
                        if (isEssay) {
                          badgeBg = isCorrect
                            ? "bg-emerald-500 text-white"
                            : "bg-cyan-600 text-white";
                        } else {
                          badgeBg = isCorrect
                            ? "bg-emerald-500 text-white"
                            : "bg-rose-500 text-white";
                        }

                        return (
                          <button
                            key={q.questionId || idx}
                            type="button"
                            onClick={() => setActiveQuestionIdx(idx)}
                            className={`relative shrink-0 w-10 h-10 rounded-xl text-xs font-black transition flex items-center justify-center ${badgeBg} ${
                              isCurrent
                                ? "ring-4 ring-[#0077B6]/40 scale-110 shadow-lg"
                                : "opacity-90 hover:opacity-100"
                            }`}
                          >
                            <span>{idx + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Question Detail Card */}
                  {attemptDetail.questions[activeQuestionIdx] && (() => {
                    const q = attemptDetail.questions[activeQuestionIdx];
                    const isEssay = q.type === "essay";

                    return (
                      <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 space-y-6">
                        {/* Question Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-xl bg-[#0077B6] text-white text-xs font-black">
                              سؤال #{activeQuestionIdx + 1}
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black">
                              {isEssay ? "سؤال مقالي كتابي" : "اختيار من متعدد"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">الدرجة المحتسبة:</span>
                            <span
                              className={`px-3 py-1 rounded-xl text-xs font-black ${
                                q.isCorrect
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300"
                                  : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300"
                              }`}
                            >
                              {q.earnedPoints} من {q.points} درجة
                            </span>
                          </div>
                        </div>

                        {/* Question Prompt */}
                        <div className="space-y-3">
                          <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-relaxed">
                            {q.prompt}
                          </p>

                          {q.questionImageUrl && (
                            <div className="pt-2">
                              <img
                                src={q.questionImageUrl}
                                alt="صورة السؤال"
                                onClick={() => setPreviewImage(q.questionImageUrl)}
                                className="max-h-72 rounded-2xl border border-slate-200 dark:border-slate-700 object-contain cursor-zoom-in hover:opacity-95 shadow-sm"
                              />
                            </div>
                          )}
                        </div>

                        {/* MCQ Choices & Student Selection */}
                        {!isEssay && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-black text-slate-500">
                              خيارات الإجابة وإجابة الطالب:
                            </h4>

                            <div className="space-y-2">
                              {q.choices.map((choice, cIdx) => {
                                const isPicked = q.studentChoiceIndex === cIdx;
                                const isCorrect = q.correctIndex === cIdx;

                                let borderStyle = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900";
                                if (isCorrect) {
                                  borderStyle = "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/30";
                                }
                                if (isPicked && !isCorrect) {
                                  borderStyle = "border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 ring-2 ring-rose-500/30";
                                }

                                return (
                                  <div
                                    key={cIdx}
                                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold transition ${borderStyle}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-600 dark:text-slate-300 shrink-0">
                                        {["أ", "ب", "ج", "د", "هـ"][cIdx] || cIdx + 1}
                                      </span>
                                      <span className="leading-relaxed">{choice}</span>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-2">
                                      {isPicked && isCorrect && (
                                        <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-black flex items-center gap-1 shadow-sm">
                                          <Check size={12} />
                                          <span>إجابة الطالب (صحيحة)</span>
                                        </span>
                                      )}

                                      {isPicked && !isCorrect && (
                                        <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-black flex items-center gap-1 shadow-sm">
                                          <X size={12} />
                                          <span>إجابة الطالب (خاطئة)</span>
                                        </span>
                                      )}

                                      {!isPicked && isCorrect && (
                                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[11px] font-black border border-emerald-300">
                                          الإجابة الصحيحة النموذجية 🎯
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Essay Answer Review */}
                        {isEssay && (
                          <div className="space-y-4">
                            {/* Student Answer */}
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <FileText size={15} className="text-[#0077B6]" />
                                <span>إجابة الطالب المقدمة:</span>
                              </h4>

                              {q.studentTextAnswer ? (
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed whitespace-pre-wrap">
                                  {q.studentTextAnswer}
                                </p>
                              ) : !q.studentImageUrl ? (
                                <p className="text-xs text-slate-400 font-bold italic">
                                  لم يكتب الطالب إجابة لهذا السؤال.
                                </p>
                              ) : null}

                              {/* Student Uploaded Image (if any) */}
                              {q.studentImageUrl && (
                                <div className="space-y-1.5 pt-2">
                                  <span className="text-[11px] font-black text-slate-500 block">
                                    صورة إجابة الطالب المرفوعة من الكشكول / الورقة:
                                  </span>
                                  <img
                                    src={q.studentImageUrl}
                                    alt="إجابة الطالب المصورة"
                                    onClick={() => setPreviewImage(q.studentImageUrl)}
                                    className="max-h-80 rounded-2xl border border-slate-200 dark:border-slate-700 object-contain cursor-zoom-in hover:opacity-95 shadow-sm"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Model Answer */}
                            {q.modelAnswer && (
                              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                                <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                  <CheckCircle2 size={15} />
                                  <span>الإجابة النموذجية المعتمدة:</span>
                                </h4>
                                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 leading-relaxed whitespace-pre-wrap">
                                  {q.modelAnswer}
                                </p>
                              </div>
                            )}

                            {/* AI Evaluation / Feedback */}
                            {q.feedback && (
                              <div className="p-4 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 space-y-2">
                                <h4 className="text-xs font-black text-[#0077B6] dark:text-[#00A8E8] flex items-center gap-2">
                                  <Sparkles size={15} />
                                  <span>تقرير تصحيح الذكاء الاصطناعي (AI):</span>
                                  <span className="mr-auto px-2 py-0.5 rounded-lg bg-[#0077B6]/10 text-[#0077B6] dark:text-[#00A8E8] text-[11px] font-black">
                                    الدرجة المقترحة: {q.earnedPoints} / {q.points}
                                  </span>
                                </h4>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                                  {q.feedback}
                                </p>
                              </div>
                            )}

                            {/* Teacher Review & Grading Action Box */}
                            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/80 space-y-3 shadow-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
                                  <Award size={16} className="text-amber-600" />
                                  <span>حكم وقرار المعلم (د. مينا مريد):</span>
                                </h4>
                                {q.isTeacherReviewed ? (
                                  <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[11px] font-black flex items-center gap-1 border border-emerald-300 dark:border-emerald-700">
                                    <CheckCircle2 size={13} />
                                    <span>تم اعتماد الدرجة يدوياً ({q.earnedPoints} من {q.points})</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[11px] font-black flex items-center gap-1 border border-amber-300 dark:border-amber-700">
                                    <AlertCircle size={13} />
                                    <span>في انتظار قرار المعلم</span>
                                  </span>
                                )}
                              </div>

                              {/* Quick Action Buttons */}
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  disabled={reviewSubmitting}
                                  onClick={() => handleTeacherReviewSubmit(q.questionId, q.earnedPoints, null, true)}
                                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                  title="اعتماد تصحيح الـ AI كما هو دون تعديل"
                                >
                                  <CheckCircle2 size={14} />
                                  <span>✅ اعتماد تصحيح الـ AI ({q.earnedPoints} د)</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={reviewSubmitting}
                                  onClick={() => handleTeacherReviewSubmit(q.questionId, q.points, "إجابة صحيحة نموذجية معتمدة من المعلم.", false)}
                                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                  title="منح الطالب الدرجة كاملة"
                                >
                                  <Star size={14} className="fill-white" />
                                  <span>⭐ منح الدرجة كاملة ({q.points}/{q.points})</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={reviewSubmitting}
                                  onClick={() => handleTeacherReviewSubmit(q.questionId, 0, "إجابة غير صحيحة بعد مراجعة المعلم.", false)}
                                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-black transition flex items-center gap-1.5 disabled:opacity-50"
                                  title="احتساب خطأ 0 درجة"
                                >
                                  <XCircle size={14} />
                                  <span>منح 0 درجة</span>
                                </button>
                              </div>

                              {/* Custom Score Adjustment Form */}
                              <div className="pt-2.5 border-t border-amber-200 dark:border-amber-800/60 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                                <div className="md:col-span-3 space-y-1">
                                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                                    الدرجة المحددة (من {q.points}):
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={q.points}
                                    step="0.5"
                                    value={customScores[q.questionId] ?? q.earnedPoints ?? 0}
                                    onChange={(e) => setCustomScores({ ...customScores, [q.questionId]: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-black text-slate-900 dark:text-white"
                                  />
                                </div>

                                <div className="md:col-span-6 space-y-1">
                                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                                    ملاحظة المعلم للطالب (اختياري):
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="مثال: أحسنت، أو راجع المطلوب الثاني..."
                                    value={customFeedbacks[q.questionId] ?? (q.teacherFeedback || "")}
                                    onChange={(e) => setCustomFeedbacks({ ...customFeedbacks, [q.questionId]: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                                  />
                                </div>

                                <div className="md:col-span-3">
                                  <button
                                    type="button"
                                    disabled={reviewSubmitting}
                                    onClick={() => {
                                      const score = customScores[q.questionId] ?? q.earnedPoints ?? 0;
                                      const fb = customFeedbacks[q.questionId] || null;
                                      handleTeacherReviewSubmit(q.questionId, score, fb, false);
                                    }}
                                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                                  >
                                    <Save size={14} />
                                    <span>حفظ واعتماد</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Navigation Prev / Next */}
                        <div className="pt-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            disabled={activeQuestionIdx === 0}
                            onClick={() => setActiveQuestionIdx((prev) => Math.max(0, prev - 1))}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition flex items-center gap-1.5"
                          >
                            <ChevronRight size={16} />
                            <span>السؤال السابق</span>
                          </button>

                          <span className="text-xs font-black text-slate-400">
                            {activeQuestionIdx + 1} / {attemptDetail.questions.length}
                          </span>

                          <button
                            type="button"
                            disabled={activeQuestionIdx >= attemptDetail.questions.length - 1}
                            onClick={() => setActiveQuestionIdx((prev) => Math.min(attemptDetail.questions.length - 1, prev + 1))}
                            className="px-4 py-2 rounded-xl bg-[#0077B6] hover:bg-[#005f92] disabled:opacity-40 text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm"
                          >
                            <span>السؤال التالي</span>
                            <ChevronLeft size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  {attemptDetail ? `الطالب: ${attemptDetail.studentName}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAttemptId(null);
                    setAttemptDetail(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-black text-slate-800 dark:text-slate-200 transition"
                >
                  إغلاق كراسة الإجابة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ 6. FULL IMAGE PREVIEW MODAL ═══════════════════════════════ */}
      <AnimatePresence>
        {previewImage && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-2xl">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 left-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition"
              >
                <X size={20} />
              </button>
              <img
                src={previewImage}
                alt="معاينة الصورة بالحجم الكامل"
                className="max-h-[85vh] w-auto rounded-xl object-contain mx-auto"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
