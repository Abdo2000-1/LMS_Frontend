import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Plus,
  Trash2,
  Image,
  HelpCircle,
  Clock,
  DollarSign,
  CheckCircle2,
  FileImage,
  BookOpen,
  Upload,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { createExam, deleteExam, subscribeCourses, subscribeExams } from "../services/courseService.js";
import { uploadImageToStorage } from "../services/storageService.js";
import { useEffect } from "react";

const emptyQuestion = () => ({
  type: "mcq",
  prompt: "",
  questionImageUrl: "",
  choices: ["", "", "", ""],
  correctIndex: 0,
  points: 1,
  modelAnswer: "",
  gradingRubric: "",
});

export default function AddExamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.role === "teacher";

  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [isPublished, setIsPublished] = useState(true);
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState("0");
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [isBusy, setIsBusy] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  useEffect(() => {
    const unsub = subscribeCourses(setCourses, true);
    const unsubExams = subscribeExams(setExams, true);
    return () => {
      unsub();
      unsubExams();
    };
  }, []);

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
    setActiveQuestionIndex(questions.length);
  }

  function removeQuestion(idx) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    setActiveQuestionIndex(Math.max(0, idx - 1));
  }

  function updateQuestion(idx, field, value) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  }

  async function uploadQuestionImage(index, file) {
    if (!file) return;
    const url = await uploadImageToStorage(file);
    updateQuestion(index, "questionImageUrl", url);
  }

  function updateChoice(qIdx, cIdx, value) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, choices: q.choices.map((c, ci) => (ci === cIdx ? value : c)) }
          : q
      )
    );
  }

  function addChoice(qIdx) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, choices: [...q.choices, ""] } : q
      )
    );
  }

  function removeChoice(qIdx, cIdx) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx && q.choices.length > 2
          ? {
              ...q,
              choices: q.choices.filter((_, ci) => ci !== cIdx),
              correctIndex:
                q.correctIndex === cIdx
                  ? 0
                  : q.correctIndex > cIdx
                  ? q.correctIndex - 1
                  : q.correctIndex,
            }
          : q
      )
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!title.trim()) return setError("اكتب عنوان الامتحان.");
    if (questions.some((q) => !q.prompt.trim())) return setError("اكتب نص كل الأسئلة.");
    if (questions.some((q) => q.type !== "essay" && q.choices.some((c) => !c.trim()))) return setError("اكتب كل خيارات الإجابة للأسئلة الاختيارية.");

    setIsBusy(true);
    try {
      await createExam({
        courseId: selectedCourseId || null,
        title: title.trim(),
        minutes: Number(minutes || 30),
        imageUrl: thumbnailUrl.trim(),
        price: isFree ? 0 : Number(price || 0),
        isFree,
        isPublished,
        questions: questions.map((q, idx) => ({
          questionId: `q${Date.now()}_${idx}`,
          type: q.type || "mcq",
          prompt: q.prompt.trim(),
          questionImageUrl: q.questionImageUrl || "",
          choices: q.type === "essay" ? [] : q.choices.map((c) => c.trim()).filter(Boolean),
          correctIndex: q.type === "essay" ? 0 : q.correctIndex,
          points: Number(q.points || 1),
          modelAnswer: q.type === "essay" ? (q.modelAnswer || "").trim() : null,
          gradingRubric: q.type === "essay" ? (q.gradingRubric || "").trim() : null,
        })),
      });
      setNotice(`✅ تم إضافة الامتحان "${title}" بنجاح! (${questions.length} سؤال)`);
      setTitle("");
      setThumbnailUrl("");
      setMinutes("30");
      setIsPublished(true);
      setIsFree(false);
      setPrice("0");
      setQuestions([emptyQuestion()]);
      setActiveQuestionIndex(0);
      setSelectedCourseId("");
    } catch (err) {
      const isMissingEndpoint = /404|not found/i.test(String(err.message || ""));
      setError(isMissingEndpoint
        ? "مسار حفظ الامتحانات غير موجود في نسخة الباكند المشغلة حاليًا. أعد تشغيل/نشر الباكند بعد آخر تحديث ثم جرّب مرة أخرى."
        : (err.message || "تعذر إضافة الامتحان."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleExamImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    setError("");
    setNotice("");
    try {
      const url = await uploadImageToStorage(file);
      setThumbnailUrl(url);
      setNotice("تم رفع صورة الامتحان بنجاح.");
    } catch (err) {
      setError(err.message || "تعذر رفع صورة الامتحان.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <DashboardLayout active="/teacher/dashboard">
      <div dir="rtl" className="font-['Cairo',sans-serif] space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-l from-[#0077B6] to-[#00A8E8] text-white p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => navigate("/teacher/dashboard")}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
            >
              <ArrowRight size={18} />
            </button>
            <h1 className="text-2xl font-black">إضافة امتحان جديد</h1>
          </div>
          <p className="text-white/70 text-sm pr-11">
            أضف امتحاناً كاملاً مع صورة وعدد غير محدود من الأسئلة
          </p>
        </div>

        {/* Alert */}
        {(error || notice) && (
          <div
            className={`rounded-2xl px-5 py-4 border text-sm font-bold ${
              error
                ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
            }`}
          >
            {error || notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Exam Info Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-5 shadow-sm">
            <h2 className="font-black text-lg text-[#0077B6] dark:text-[#00A8E8] flex items-center gap-2">
              <BookOpen size={20} />
              بيانات الامتحان
            </h2>

            {/* Course select */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الكورس (اختياري)
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6] text-slate-900 dark:text-slate-100"
              >
                <option value="">امتحان عام بدون كورس</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                عنوان الامتحان *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: امتحان الاتزان الكيميائي - الباب الثالث"
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6] text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                <FileImage size={15} />
                رابط صورة الامتحان (اختياري)
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6] text-slate-900 dark:text-slate-100"
              />
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-extrabold text-slate-600 transition hover:border-[#0077B6] hover:text-[#0077B6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Image size={16} />
                {isUploadingImage ? "جاري رفع الصورة..." : "أو ارفع صورة من الجهاز"}
                <input type="file" accept="image/*" onChange={handleExamImageUpload} className="hidden" />
              </label>
              {thumbnailUrl && (
                <img
                  src={thumbnailUrl}
                  alt="معاينة"
                  className="mt-3 h-32 w-full object-cover rounded-2xl border border-slate-200 dark:border-slate-700"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              )}
            </div>

            {/* Time & Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                  <Clock size={15} />
                  وقت الامتحان (دقيقة)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6] text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                  <DollarSign size={15} />
                  {isFree ? "مجاني" : `سعر الامتحان (ج.م)`}
                </label>
                <input
                  type="number"
                  min="0"
                  value={isFree ? "0" : price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isFree}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6] text-slate-900 dark:text-slate-100 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setIsPublished(!isPublished)}
                  className={`w-12 h-6 rounded-full transition-colors duration-300 relative cursor-pointer ${isPublished ? "bg-[#0077B6]" : "bg-slate-300 dark:bg-slate-600"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${isPublished ? "left-7" : "left-1"}`} />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">ظاهر للطلاب في الصفحة الرئيسية</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setIsFree(!isFree)}
                  className={`w-12 h-6 rounded-full transition-colors duration-300 relative cursor-pointer ${isFree ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${isFree ? "left-7" : "left-1"}`} />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">مجاني للجميع</span>
              </label>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-lg text-[#0077B6] dark:text-[#00A8E8] flex items-center gap-2">
                <HelpCircle size={20} />
                الأسئلة ({questions.length})
              </h2>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-2 bg-[#0077B6] text-white px-4 py-2 rounded-2xl text-sm font-extrabold hover:bg-[#005f8e] transition-colors"
              >
                <Plus size={16} />
                إضافة سؤال
              </button>
            </div>

            {/* Question tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-5">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveQuestionIndex(idx)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    activeQuestionIndex === idx
                      ? "bg-[#0077B6] text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  س {idx + 1}
                </button>
              ))}
            </div>

            {/* Active question */}
            {questions[activeQuestionIndex] && (
              <div className="space-y-4 bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100">
                    السؤال {activeQuestionIndex + 1}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الدرجة:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={questions[activeQuestionIndex].points}
                        onChange={(e) => updateQuestion(activeQuestionIndex, "points", Number(e.target.value))}
                        className="w-14 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#0077B6] text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(activeQuestionIndex)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Type Selector */}
                <div className="flex items-center gap-4 bg-white dark:bg-slate-700 p-3 rounded-2xl border border-slate-200 dark:border-slate-600">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">نوع السؤال:</span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                    <input
                      type="radio"
                      name={`q_type_${activeQuestionIndex}`}
                      value="mcq"
                      checked={questions[activeQuestionIndex].type === "mcq" || !questions[activeQuestionIndex].type}
                      onChange={() => updateQuestion(activeQuestionIndex, "type", "mcq")}
                      className="accent-[#0077B6]"
                    />
                    اختيار من متعدد (MCQ)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                    <input
                      type="radio"
                      name={`q_type_${activeQuestionIndex}`}
                      value="essay"
                      checked={questions[activeQuestionIndex].type === "essay"}
                      onChange={() => updateQuestion(activeQuestionIndex, "type", "essay")}
                      className="accent-[#0077B6]"
                    />
                    مقالي (Essay)
                  </label>
                </div>

                {/* Question text */}
                <textarea
                  value={questions[activeQuestionIndex].prompt}
                  onChange={(e) => updateQuestion(activeQuestionIndex, "prompt", e.target.value)}
                  placeholder="اكتب نص السؤال هنا..."
                  rows={3}
                  required
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6] resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />

                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <label className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">صورة السؤال (اختياري)</span>
                    <input
                      type="url"
                      value={questions[activeQuestionIndex].questionImageUrl}
                      onChange={(e) => updateQuestion(activeQuestionIndex, "questionImageUrl", e.target.value)}
                      placeholder="رابط الصورة..."
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6] text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </label>
                  <label className="mt-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-extrabold text-slate-600 transition hover:border-[#0077B6] hover:text-[#0077B6] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <Upload size={15} />
                    رفع صورة
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadQuestionImage(activeQuestionIndex, e.target.files?.[0])}
                    />
                  </label>
                </div>

                {questions[activeQuestionIndex].questionImageUrl && (
                  <img
                    src={questions[activeQuestionIndex].questionImageUrl}
                    alt="معاينة صورة السؤال"
                    className="max-h-56 w-full rounded-2xl border border-slate-200 dark:border-slate-600 object-contain bg-white dark:bg-slate-900 p-2"
                  />
                )}

                {/* Conditional Fields based on Question Type */}
                {questions[activeQuestionIndex].type === "essay" ? (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        الإجابة النموذجية (Model Answer)
                      </label>
                      <textarea
                        value={questions[activeQuestionIndex].modelAnswer || ""}
                        onChange={(e) => updateQuestion(activeQuestionIndex, "modelAnswer", e.target.value)}
                        placeholder="اكتب الإجابة النموذجية التفصيلية التي سيعتمد عليها التصحيح..."
                        rows={3}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6] resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        معيار التصحيح وتوزيع الدرجات (Grading Rubric)
                      </label>
                      <textarea
                        value={questions[activeQuestionIndex].gradingRubric || ""}
                        onChange={(e) => updateQuestion(activeQuestionIndex, "gradingRubric", e.target.value)}
                        placeholder="مثال: النقطة الأولى = 2 درجات، النقطة الثانية = 3 درجات..."
                        rows={2}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6] resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">الخيارات (اضغط على الزر الدائري لتحديد الإجابة الصحيحة)</p>
                      <button
                        type="button"
                        onClick={() => addChoice(activeQuestionIndex)}
                        className="text-[#0077B6] dark:text-[#00A8E8] text-xs font-extrabold flex items-center gap-1 hover:underline"
                      >
                        <Plus size={12} /> خيار جديد
                      </button>
                    </div>
                    <div className="space-y-2">
                      {questions[activeQuestionIndex].choices.map((choice, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuestion(activeQuestionIndex, "correctIndex", cIdx)}
                            className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              questions[activeQuestionIndex].correctIndex === cIdx
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {questions[activeQuestionIndex].correctIndex === cIdx && (
                              <CheckCircle2 size={14} className="text-white" />
                            )}
                          </button>
                          <input
                            type="text"
                            value={choice}
                            onChange={(e) => updateChoice(activeQuestionIndex, cIdx, e.target.value)}
                            placeholder={`الخيار ${cIdx + 1}`}
                            required
                            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0077B6] text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                          />
                          {questions[activeQuestionIndex].choices.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeChoice(activeQuestionIndex, cIdx)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span className="font-bold">
                إجمالي الدرجات:{" "}
                <strong className="text-[#0077B6]">
                  {questions.reduce((s, q) => s + Number(q.points || 1), 0)}
                </strong>
              </span>
              <span className="font-bold">{questions.length} سؤال</span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isBusy}
              className="flex-1 bg-gradient-to-l from-[#0077B6] to-[#00A8E8] text-white font-extrabold py-4 rounded-2xl hover:opacity-90 disabled:opacity-60 transition-all shadow-lg text-base"
            >
              {isBusy ? "جارٍ الحفظ..." : `💾 حفظ الامتحان (${questions.length} سؤال)`}
            </button>
            <button
              type="button"
              onClick={() => navigate("/teacher/dashboard")}
              className="px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-extrabold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <h2 className="font-black text-lg text-[#0077B6] flex items-center gap-2">
            <BookOpen size={18} />
            الامتحانات الحالية
          </h2>
          <div className="space-y-3">
            {exams.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد امتحانات مضافة بعد.</p>
            ) : exams.map((exam) => (
              <div key={exam.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{exam.title}</p>
                  <p className="text-[11px] text-slate-500">{exam.questionsCount} سؤال · {exam.minutes} دقيقة</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("هل تريد حذف هذا الامتحان نهائياً؟")) return;
                    await deleteExam(exam.id);
                    setExams((prev) => prev.filter((item) => item.id !== exam.id));
                  }}
                  className={`${isTeacher ? "" : "hidden "}rounded-xl p-2 text-red-600 hover:bg-red-50 transition`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
