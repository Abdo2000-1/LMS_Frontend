import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileEdit,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Eye,
  Save,
  RotateCcw,
  Search,
  BookOpen,
  Clock,
  Award,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Upload,
  AlertTriangle,
  HelpCircle,
  FileText,
  Lock,
  Unlock,
  Globe,
  EyeOff
} from "lucide-react";
import {
  subscribeExams,
  updateExam,
  deleteExam,
  updateExamRetake,
  uploadExamAnswerImage,
  getCourseGrades
} from "../services/courseService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import apiClient from "../lib/apiClient.js";

export default function EditExamsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast?.() || {
    showSuccess: (msg) => alert(msg),
    showError: (msg) => alert(msg)
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const initialExamId = searchParams.get("id");

  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, published, drafts

  // Editing state
  const [editingExamId, setEditingExamId] = useState(initialExamId || null);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImageFor, setUploadingImageFor] = useState(null); // 'thumbnail' or question index

  // Load all exams and courses
  useEffect(() => {
    let unsub = () => {};
    const fetchAll = async () => {
      try {
        setIsLoading(true);
        // Load courses for the dropdown
        const { data: coursesData } = await apiClient.get("/api/courses?includeUnpublished=true");
        setCourses(Array.isArray(coursesData) ? coursesData : []);

        // Subscribe to all exams (including unpublished)
        unsub = subscribeExams((list) => {
          setExams(list);
          setIsLoading(false);
        }, true);
      } catch (err) {
        console.error("Error loading exams/courses:", err);
        setIsLoading(false);
      }
    };

    fetchAll();
    return () => unsub();
  }, []);

  // When editingExamId changes, initialize editForm
  useEffect(() => {
    if (!editingExamId) {
      setEditForm(null);
      return;
    }

    const target = exams.find((e) => String(e.id) === String(editingExamId));
    if (target) {
      setEditForm({
        id: target.id,
        title: target.title || "",
        description: target.description || "",
        courseId: target.courseId || "",
        imageUrl: target.imageUrl || "",
        price: target.price || 0,
        isFree: Boolean(target.isFree),
        isPublished: target.isPublished !== false,
        allowRetake: target.allowRetake !== false,
        minutes: Number(target.minutes || 30),
        questions: (target.questions || []).map((q, idx) => ({
          questionId: q.questionId || `q_${idx + 1}`,
          type: String(q.type || "").toLowerCase() === "essay" ? "essay" : "mcq",
          prompt: q.prompt || "",
          questionImageUrl: q.questionImageUrl || "",
          choices: Array.isArray(q.choices) && q.choices.length > 0 ? [...q.choices] : ["", "", "", ""],
          correctIndex: Number(q.correctIndex || 0),
          points: Number(q.points || 1),
          modelAnswer: q.modelAnswer || "",
          gradingRubric: q.gradingRubric || ""
        }))
      });
    }
  }, [editingExamId, exams]);

  // Filtered exams list
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      const matchSearch =
        !searchQuery.trim() ||
        (e.title && e.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.courseTitle && e.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;
      if (filterStatus === "published") return e.isPublished;
      if (filterStatus === "drafts") return !e.isPublished;
      return true;
    });
  }, [exams, searchQuery, filterStatus]);

  // Actions on exam list
  const handleToggleRetake = async (exam) => {
    try {
      const nextVal = !exam.allowRetake;
      await updateExamRetake(exam.id, nextVal);
      setExams((prev) =>
        prev.map((e) => (e.id === exam.id ? { ...e, allowRetake: nextVal } : e))
      );
      showSuccess(nextVal ? "تم السماح بإعادة الامتحان للطلاب." : "تم قفل إعادة الامتحان (محاولة واحدة فقط).");
    } catch (err) {
      showError(err.message || "حدث خطأ أثناء تعديل إعداد الإعادة.");
    }
  };

  const handleTogglePublish = async (exam) => {
    try {
      const nextVal = !exam.isPublished;
      await updateExam(exam.id, {
        ...exam,
        isPublished: nextVal
      });
      setExams((prev) =>
        prev.map((e) => (e.id === exam.id ? { ...e, isPublished: nextVal } : e))
      );
      showSuccess(nextVal ? "تم نشر الامتحان وأصبح متاحاً للطلاب." : "تم إلغاء نشر الامتحان ونقله للمسودات.");
    } catch (err) {
      showError(err.message || "حدث خطأ أثناء تحديث حالة النشر.");
    }
  };

  const handleDeleteExam = async (exam) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف امتحان "${exam.title}" نهائياً؟`)) {
      return;
    }
    try {
      await deleteExam(exam.id);
      setExams((prev) => prev.filter((e) => e.id !== exam.id));
      if (editingExamId === exam.id) {
        setEditingExamId(null);
      }
      showSuccess("تم حذف الامتحان بنجاح.");
    } catch (err) {
      showError(err.message || "حدث خطأ أثناء حذف الامتحان.");
    }
  };

  // Question editing helpers
  const handleAddQuestion = (type = "mcq") => {
    if (!editForm) return;
    const newQ = {
      questionId: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: type,
      prompt: "",
      questionImageUrl: "",
      choices: type === "essay" ? [] : ["", "", "", ""],
      correctIndex: 0,
      points: type === "essay" ? 3 : 1,
      modelAnswer: "",
      gradingRubric: ""
    };
    setEditForm((prev) => ({
      ...prev,
      questions: [...prev.questions, newQ]
    }));
  };

  const handleRemoveQuestion = (idx) => {
    if (!editForm) return;
    if (editForm.questions.length <= 1) {
      showError("يجب أن يحتوي الامتحان على سؤال واحد على الأقل.");
      return;
    }
    setEditForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx)
    }));
  };

  const handleMoveQuestion = (idx, direction) => {
    if (!editForm) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= editForm.questions.length) return;

    setEditForm((prev) => {
      const copy = [...prev.questions];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return { ...prev, questions: copy };
    });
  };

  const handleQuestionChange = (idx, field, val) => {
    setEditForm((prev) => {
      const copy = [...prev.questions];
      copy[idx] = { ...copy[idx], [field]: val };
      return { ...prev, questions: copy };
    });
  };

  const handleChoiceChange = (qIdx, cIdx, val) => {
    setEditForm((prev) => {
      const copy = [...prev.questions];
      const choices = [...copy[qIdx].choices];
      choices[cIdx] = val;
      copy[qIdx] = { ...copy[qIdx], choices };
      return { ...prev, questions: copy };
    });
  };

  const handleAddChoice = (qIdx) => {
    setEditForm((prev) => {
      const copy = [...prev.questions];
      const choices = [...copy[qIdx].choices, ""];
      copy[qIdx] = { ...copy[qIdx], choices };
      return { ...prev, questions: copy };
    });
  };

  const handleRemoveChoice = (qIdx, cIdx) => {
    setEditForm((prev) => {
      const copy = [...prev.questions];
      if (copy[qIdx].choices.length <= 2) {
        showError("يجب أن يتوفر خياران على الأقل لسؤال الاختيار من متعدد.");
        return prev;
      }
      const choices = copy[qIdx].choices.filter((_, i) => i !== cIdx);
      let correct = copy[qIdx].correctIndex;
      if (correct >= choices.length) correct = 0;
      copy[qIdx] = { ...copy[qIdx], choices, correctIndex: correct };
      return { ...prev, questions: copy };
    });
  };

  const handleUploadQuestionImage = async (e, qIdx) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImageFor(qIdx);
      const url = await uploadExamAnswerImage(file);
      handleQuestionChange(qIdx, "questionImageUrl", url);
      showSuccess("تم رفع صورة السؤال بنجاح!");
    } catch (err) {
      showError(err.message || "فشل رفع الصورة.");
    } finally {
      setUploadingImageFor(null);
      e.target.value = "";
    }
  };

  const handleUploadCoverImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImageFor("thumbnail");
      const url = await uploadExamAnswerImage(file);
      setEditForm((prev) => ({ ...prev, imageUrl: url }));
      showSuccess("تم رفع صورة غلاف الامتحان بنجاح!");
    } catch (err) {
      showError(err.message || "فشل رفع غلاف الامتحان.");
    } finally {
      setUploadingImageFor(null);
      e.target.value = "";
    }
  };

  // Save the full updated exam
  const handleSaveExam = async (e) => {
    if (e) e.preventDefault();
    if (!editForm) return;

    if (!editForm.title.trim()) {
      showError("عنوان الامتحان مطلوب.");
      return;
    }

    if (!editForm.questions || editForm.questions.length === 0) {
      showError("يجب إضافة سؤال واحد على الأقل.");
      return;
    }

    // Validate questions
    for (let i = 0; i < editForm.questions.length; i++) {
      const q = editForm.questions[i];
      if (!q.prompt.trim()) {
        showError(`نص السؤال رقم ${i + 1} مطلوب ولا يمكن تركه فارغاً.`);
        return;
      }
      if (q.type === "mcq") {
        const validChoices = (q.choices || []).filter((c) => c.trim().length > 0);
        if (validChoices.length < 2) {
          showError(`السؤال رقم ${i + 1} يتطلب خيارين على الأقل.`);
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      const updated = await updateExam(editForm.id, editForm);
      setExams((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      showSuccess("تم حفظ جميع تعديلات الامتحان بنجاح! 🎉");
      setEditingExamId(null);
      setEditForm(null);
    } catch (err) {
      showError(err.message || "حدث خطأ أثناء حفظ التعديلات.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalPoints = useMemo(() => {
    if (!editForm) return 0;
    return editForm.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
  }, [editForm]);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 font-['Cairo',sans-serif] text-slate-800 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-100 dark:bg-cyan-950/70 text-[#0077B6] dark:text-[#00A8E8] text-xs font-black">
              <FileEdit size={14} />
              <span>لوحة تحكم المعلم • تعديل الامتحانات</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              تعديل وإدارة الامتحانات
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
              يمكنك هنا التحكم الكامل في جميع الامتحانات وتعديل أي سؤال أو خيار أو صورة أو درجات في أي وقت.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/teacher/add-exam"
              className="px-5 py-2.5 rounded-2xl bg-[#0077B6] hover:bg-[#005f92] text-white text-xs font-black transition flex items-center gap-2 shadow-md shadow-cyan-500/10"
            >
              <Plus size={16} />
              <span>إضافة امتحان جديد</span>
            </Link>
            <Link
              to="/teacher/dashboard"
              className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-black transition text-slate-700 dark:text-slate-300"
            >
              العودة للوحة التحكم
            </Link>
          </div>
        </div>

        {/* If in Edit Form Mode */}
        {editForm ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Form Top Navigation Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between sticky top-4 z-30">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("هل تريد إلغاء التعديل والعودة لقائمة الامتحانات؟")) {
                      setEditingExamId(null);
                      setEditForm(null);
                    }
                  }}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="العودة للقائمة"
                >
                  <ChevronRight size={18} />
                </button>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>تعديل: {editForm.title || "امتحان بدون عنوان"}</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-bold">
                    {editForm.questions.length} سؤال • إجمالي {totalPoints} درجة • {editForm.minutes} دقيقة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingExamId(null);
                    setEditForm(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveExam}
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black transition flex items-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  <Save size={16} />
                  <span>{isSaving ? "جاري الحفظ..." : "حفظ جميع التعديلات"}</span>
                </button>
              </div>
            </div>

            {/* General Exam Settings */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <FileText size={18} className="text-[#0077B6]" />
                <span>البيانات الأساسية للامتحان</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    عنوان الامتحان <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                    placeholder="مثال: امتحان العناصر الانتقالية 1"
                  />
                </div>

                {/* Course Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    الكورس المرتبط به
                  </label>
                  <select
                    value={editForm.courseId || ""}
                    onChange={(e) => setEditForm({ ...editForm, courseId: e.target.value || null })}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                  >
                    <option value="">امتحان عام مستقل (غير مرتبط بكورس محدد)</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    مدة الامتحان (بالدقائق)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.minutes}
                    onChange={(e) => setEditForm({ ...editForm, minutes: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    وصف أو تعليمات الامتحان للطلاب
                  </label>
                  <textarea
                    rows="2"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                    placeholder="اكتب أي تعليمات تظهر للطالب قبل بدء الامتحان..."
                  />
                </div>

                {/* Cover Image */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    صورة غلاف الامتحان (اختياري)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editForm.imageUrl}
                      onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                      placeholder="رابط الصورة أو ارفع صورة مباشرة..."
                      className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                    />
                    <label className="cursor-pointer px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-2 transition">
                      <Upload size={14} />
                      <span>{uploadingImageFor === "thumbnail" ? "جاري الرفع..." : "رفع غلاف"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadCoverImage}
                        disabled={uploadingImageFor === "thumbnail"}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Switches: Published, AllowRetake, Free/Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {/* Published Switch */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">نشر الامتحان</p>
                    <p className="text-[11px] text-slate-400 font-bold">ظهوره للطلاب على المنصة</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, isPublished: !editForm.isPublished })}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      editForm.isPublished ? "bg-emerald-500 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>

                {/* Allow Retake Switch */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">إتاحة إعادة المحاولة</p>
                    <p className="text-[11px] text-slate-400 font-bold">السماح للطالب بإعادة حل الامتحان</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, allowRetake: !editForm.allowRetake })}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      editForm.allowRetake ? "bg-cyan-500 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>

                {/* Free / Paid Switch */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">امتحان مجاني</p>
                    <p className="text-[11px] text-slate-400 font-bold">متاح للجميع دون اشتراك</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, isFree: !editForm.isFree })}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      editForm.isFree ? "bg-amber-500 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>
              </div>
            </div>

            {/* Questions Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles size={20} className="text-[#0077B6]" />
                    <span>أسئلة الامتحان ({editForm.questions.length} سؤال)</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    يمكنك تعديل أي سؤال، تبديل نوعه (اختياري/مقالي)، إضافة صور أو مخططات، وتعديل الخيارات والإجابات النموذجية.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion("mcq")}
                    className="px-4 py-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-[#0077B6] dark:text-[#00A8E8] border border-cyan-200 dark:border-cyan-800 text-xs font-black hover:bg-cyan-100 transition flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>سؤال اختياري (MCQ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion("essay")}
                    className="px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-xs font-black hover:bg-purple-100 transition flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>سؤال مقالي (Essay)</span>
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {editForm.questions.map((q, idx) => {
                  const isEssay = q.type === "essay";

                  return (
                    <motion.div
                      key={q.questionId || idx}
                      layout
                      className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                    >
                      {/* Question Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-[#0077B6] text-white flex items-center justify-center text-xs font-black">
                            {idx + 1}
                          </span>
                          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => handleQuestionChange(idx, "type", "mcq")}
                              className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                                !isEssay
                                  ? "bg-white dark:bg-slate-900 text-[#0077B6] shadow-sm"
                                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              اختيار من متعدد
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuestionChange(idx, "type", "essay")}
                              className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                                isEssay
                                  ? "bg-purple-600 text-white shadow-sm"
                                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              سؤال مقالي
                            </button>
                          </div>
                        </div>

                        {/* Reorder and Delete controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, -1)}
                            disabled={idx === 0}
                            title="نقل لأعلى"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, 1)}
                            disabled={idx === editForm.questions.length - 1}
                            title="نقل لأسفل"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            title="حذف السؤال"
                            className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Prompt and Points Row */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-10 space-y-1">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            نص السؤال <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            rows={3}
                            value={q.prompt}
                            onChange={(e) => handleQuestionChange(idx, "prompt", e.target.value)}
                            placeholder="اكتب نص السؤال هنا بالتفصيل..."
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-1">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            الدرجات
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={q.points || 1}
                            onChange={(e) => handleQuestionChange(idx, "points", Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-black text-center"
                          />
                        </div>
                      </div>

                      {/* Question Image (Diagram / Figure / Table) */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300">
                            <ImageIcon size={15} className="text-[#0077B6]" />
                            <span>صورة أو رسم بياني / مخطط للسؤال (اختياري)</span>
                          </div>

                          <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 shadow-sm">
                            <Upload size={13} />
                            <span>{uploadingImageFor === idx ? "جاري الرفع..." : "رفع صورة من جهازك"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleUploadQuestionImage(e, idx)}
                              disabled={uploadingImageFor === idx}
                            />
                          </label>
                        </div>

                        {/* Image Preview or URL input */}
                        {q.questionImageUrl ? (
                          <div className="flex flex-col sm:flex-row items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                            <img
                              src={q.questionImageUrl}
                              alt="صورة السؤال"
                              className="max-h-36 w-auto rounded-lg border border-slate-100 dark:border-slate-800 object-contain"
                            />
                            <div className="flex-1 space-y-1 text-xs">
                              <p className="font-bold text-slate-500 truncate max-w-md">{q.questionImageUrl}</p>
                              <button
                                type="button"
                                onClick={() => handleQuestionChange(idx, "questionImageUrl", "")}
                                className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                              >
                                <Trash2 size={13} />
                                <span>حذف الصورة</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={q.questionImageUrl || ""}
                            onChange={(e) => handleQuestionChange(idx, "questionImageUrl", e.target.value)}
                            placeholder="أو الصق رابط صورة السؤال مباشرة هنا (مثال: /exam-images/q7_diagram.png)..."
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                          />
                        )}
                      </div>

                      {/* Content specific to MCQ vs Essay */}
                      {!isEssay ? (
                        /* MCQ Choices */
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300">
                            <span>خيارات السؤال (حدد الدائرة بجانب الإجابة الصحيحة):</span>
                            <button
                              type="button"
                              onClick={() => handleAddChoice(idx)}
                              className="text-[#0077B6] dark:text-[#00A8E8] hover:underline font-bold flex items-center gap-1"
                            >
                              <Plus size={13} />
                              <span>إضافة خيار إضافي</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {(q.choices || []).map((choice, cIdx) => {
                              const isCorrect = q.correctIndex === cIdx;
                              const letters = ["أ", "ب", "ج", "د", "هـ", "و"];

                              return (
                                <div
                                  key={cIdx}
                                  className={`flex items-center gap-2 p-2 rounded-2xl border transition ${
                                    isCorrect
                                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400"
                                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleQuestionChange(idx, "correctIndex", cIdx)}
                                    title="تحديد كإجابة صحيحة"
                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition ${
                                      isCorrect
                                        ? "bg-emerald-500 text-white"
                                        : "border border-slate-300 dark:border-slate-700 text-slate-400 hover:border-emerald-400"
                                    }`}
                                  >
                                    {letters[cIdx] || cIdx + 1}
                                  </button>

                                  <input
                                    type="text"
                                    value={choice}
                                    onChange={(e) => handleChoiceChange(idx, cIdx, e.target.value)}
                                    placeholder={`نص الاختيار (${letters[cIdx] || cIdx + 1})...`}
                                    className="flex-1 bg-transparent text-xs font-bold focus:outline-none"
                                  />

                                  {q.choices.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveChoice(idx, cIdx)}
                                      className="text-slate-400 hover:text-red-500 p-1"
                                      title="حذف هذا الخيار"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* Essay Model Answer and Rubric */
                        <div className="space-y-3 pt-2">
                          <div className="space-y-1">
                            <label className="text-xs font-black text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                              <span>الإجابة النموذجية الكاملة (تظهر للطالب بعد التصحيح أو التسليم)</span>
                            </label>
                            <textarea
                              rows={3}
                              value={q.modelAnswer || ""}
                              onChange={(e) => handleQuestionChange(idx, "modelAnswer", e.target.value)}
                              placeholder="اكتب الإجابة النموذجية بالتفصيل، المعادلات، التوزيع الإلكتروني..."
                              className="w-full px-4 py-2.5 rounded-2xl border border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              معايير التصحيح وتوزيع الدرجات (Rubric)
                            </label>
                            <input
                              type="text"
                              value={q.gradingRubric || ""}
                              onChange={(e) => handleQuestionChange(idx, "gradingRubric", e.target.value)}
                              placeholder="مثال: درجة واحدة لكل فقرة (1، 2، 3) بإجمالي 3 درجات."
                              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Bottom Add Question Button */}
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => handleAddQuestion("mcq")}
                  className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-[#0077B6] text-[#0077B6] dark:text-[#00A8E8] text-xs font-black hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span>إضافة سؤال اختيار من متعدد</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion("essay")}
                  className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-purple-500 text-purple-600 dark:text-purple-400 text-xs font-black hover:bg-purple-50 dark:hover:bg-purple-950/40 transition flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span>إضافة سؤال مقالي</span>
                </button>
              </div>

              {/* Sticky bottom save bar */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    جاهز لحفظ التعديلات؟
                  </p>
                  <p className="text-xs text-slate-400 font-bold">
                    سيتم تطبيق التعديلات فوراً على المنصة وقاعدة البيانات.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("إلغاء التعديلات؟")) {
                        setEditingExamId(null);
                        setEditForm(null);
                      }
                    }}
                    className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-black hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveExam}
                    disabled={isSaving}
                    className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black transition flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                  >
                    <Save size={18} />
                    <span>{isSaving ? "جاري الحفظ الآن..." : "حفظ التعديلات الآن"}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Exams List Table / Cards */
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الامتحان أو الكورس..."
                  className="w-full pr-11 pl-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                />
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                    filterStatus === "all"
                      ? "bg-[#0077B6] text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  الكل ({exams.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("published")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                    filterStatus === "published"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  منشور ({exams.filter((e) => e.isPublished).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("drafts")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                    filterStatus === "drafts"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  مسودات ({exams.filter((e) => !e.isPublished).length})
                </button>
              </div>
            </div>

            {/* List Content */}
            {isLoading ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 border-4 border-[#0077B6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-black text-slate-500">جاري تحميل قائمة الامتحانات...</p>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
                <FileText size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
                <h3 className="text-base font-black text-slate-700 dark:text-slate-300">
                  لا توجد امتحانات مطابقة للبحث
                </h3>
                <p className="text-xs text-slate-400 font-bold">
                  يمكنك إضافة امتحان جديد أو تغيير معايير البحث أعلاه.
                </p>
                <Link
                  to="/teacher/add-exam"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0077B6] text-white text-xs font-black"
                >
                  <Plus size={16} />
                  <span>إضافة أول امتحان الآن</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredExams.map((exam) => {
                  const essayCount = (exam.questions || []).filter((q) => q.type === "essay").length;
                  const mcqCount = (exam.questions || []).filter((q) => q.type !== "essay").length;

                  return (
                    <motion.div
                      key={exam.id}
                      layout
                      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div className="p-5 sm:p-6 space-y-3">
                        {/* Status badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-black flex items-center gap-1 ${
                              exam.isPublished
                                ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {exam.isPublished ? <Globe size={12} /> : <EyeOff size={12} />}
                            <span>{exam.isPublished ? "منشور للطلاب" : "مسودة (مخفي)"}</span>
                          </span>

                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-black flex items-center gap-1 ${
                              exam.allowRetake
                                ? "bg-cyan-100 dark:bg-cyan-950/70 text-[#0077B6] dark:text-[#00A8E8]"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {exam.allowRetake ? <Unlock size={12} /> : <Lock size={12} />}
                            <span>{exam.allowRetake ? "إعادة الحل متاحة" : "محاولة واحدة"}</span>
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-2 leading-relaxed">
                          {exam.title}
                        </h3>

                        {/* Course Name */}
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <BookOpen size={14} className="text-[#0077B6]" />
                          <span className="truncate">{exam.courseTitle || "امتحان مستقل (غير مرتبط بكورس)"}</span>
                        </div>

                        {/* Stats Info */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950">
                            <p className="font-black text-slate-800 dark:text-slate-200">
                              {exam.questionsCount || (exam.questions || []).length}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">سؤال</p>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950">
                            <p className="font-black text-slate-800 dark:text-slate-200">
                              {exam.minutes || 30} د
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">المدة</p>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950">
                            <p className="font-black text-emerald-600 dark:text-emerald-400">
                              {exam.isFree ? "مجاني" : `${exam.price} ج.م`}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">السعر</p>
                          </div>
                        </div>

                        {/* Question Breakdown */}
                        <p className="text-[11px] text-slate-400 font-bold text-center">
                          {mcqCount} اختيار من متعدد • {essayCount} سؤال مقالي
                        </p>
                      </div>

                      {/* Card Action Footer */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingExamId(exam.id)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#0077B6] hover:bg-[#005f92] text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <FileEdit size={14} />
                          <span>تعديل الامتحان</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleRetake(exam)}
                          title={exam.allowRetake ? "إغلاق إعادة الحل" : "فتح إعادة الحل"}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                        >
                          {exam.allowRetake ? <Lock size={15} /> : <Unlock size={15} />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTogglePublish(exam)}
                          title={exam.isPublished ? "إلغاء النشر (مسودة)" : "نشر للطلاب"}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                        >
                          {exam.isPublished ? <EyeOff size={15} /> : <Globe size={15} />}
                        </button>

                        <Link
                          to={`/exam/${exam.id}`}
                          target="_blank"
                          title="معاينة / دخول الامتحان"
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                        >
                          <Eye size={15} />
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDeleteExam(exam)}
                          title="حذف الامتحان"
                          className="p-2 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
