import { useState } from "react";
import {
  Video,
  Upload,
  FileText,
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Layers,
  DollarSign
} from "lucide-react";
import apiClient from "../lib/apiClient.js";
import { uploadImageToStorage, uploadFileToStorage } from "../services/storageService.js";
import { createCourse, updateCourse } from "../services/courseService.js";

const emptyQuestion = () => ({
  id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
  type: "mcq",
  prompt: "",
  choices: ["", "", "", ""],
  correctIndex: 0,
  points: 1,
  modelAnswer: "",
  gradingRubric: ""
});

export default function StandaloneLectureForm({ initialLecture = null, onSaved, onCancel }) {
  const [title, setTitle] = useState(initialLecture?.title || "");
  const [description, setDescription] = useState(initialLecture?.description || "");
  const [grade, setGrade] = useState(initialLecture?.grade || "الصف الثالث الثانوي");
  const [price, setPrice] = useState(initialLecture ? String(initialLecture.price || 0) : "50");
  const [discountPercent, setDiscountPercent] = useState(initialLecture ? String(initialLecture.discountPercent || 0) : "0");
  const [isFree, setIsFree] = useState(Boolean(initialLecture ? initialLecture.price === 0 : false));
  const [isPublished, setIsPublished] = useState(initialLecture ? Boolean(initialLecture.isPublished) : true);
  const [thumbnailUrl, setThumbnailUrl] = useState(initialLecture?.thumbnailUrl || "");

  // Video
  const [videoTitle, setVideoTitle] = useState(initialLecture?.units?.[0]?.title || initialLecture?.modules?.[0]?.lessons?.[0]?.title || "");
  const [videoUrl, setVideoUrl] = useState(initialLecture?.units?.[0]?.youtubeVideoId || initialLecture?.modules?.[0]?.lessons?.[0]?.videoUrl || "");
  const [videoInputMode, setVideoInputMode] = useState("upload");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);

  // PDF
  const [hasPdf, setHasPdf] = useState(Boolean(initialLecture?.resources?.length));
  const [pdfTitle, setPdfTitle] = useState(initialLecture?.resources?.[0]?.title || "");
  const [pdfUrl, setPdfUrl] = useState(initialLecture?.resources?.[0]?.fileUrl || "");
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // Quiz
  const [hasQuiz, setHasQuiz] = useState(Boolean(initialLecture?.quizzes?.length));
  const [quizTitle, setQuizTitle] = useState(initialLecture?.quizzes?.[0]?.title || "كويز على المحاضرة");
  const [quizMinutes, setQuizMinutes] = useState(initialLecture?.quizzes?.[0]?.minutes || 15);
  const [questions, setQuestions] = useState(
    initialLecture?.quizzes?.[0]?.questions?.length
      ? initialLecture.quizzes[0].questions.map((q) => ({
          ...emptyQuestion(),
          ...q,
          choices: q.choices && q.choices.length ? q.choices : ["", "", "", ""]
        }))
      : [emptyQuestion()]
  );

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const gradesList = [
    "الصف الأول الثانوي",
    "الصف الثاني الثانوي",
    "الصف الثالث الثانوي",
    "الصف الثاني بكالوريا",
    "الصف الثالث البكالوريا",
    "الصف الثاني الثانوي, الصف الثاني بكالوريا",
    "الصف الثالث الثانوي, الصف الثالث البكالوريا"
  ];

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    setError("");
    try {
      const url = await uploadImageToStorage(file);
      setThumbnailUrl(url);
    } catch (err) {
      setError(err?.message || "فشل رفع صورة الغلاف.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleVideoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingVideo(true);
    setVideoUploadProgress(0);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", videoTitle || file.name);

      const { data } = await apiClient.post("/api/v1/videos/upload", formData, {
        timeout: 600000,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setVideoUploadProgress(percent);
          }
        }
      });

      setVideoUrl(data.directUrl || data.videoUrl || data.url || "");
      if (!videoTitle) setVideoTitle(title || data.title || file.name);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "فشل رفع الفيديو.");
    } finally {
      setIsUploadingVideo(false);
    }
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPdf(true);
    setError("");
    try {
      const url = await uploadFileToStorage(file);
      setPdfUrl(url);
      if (!pdfTitle) setPdfTitle(file.name);
    } catch (err) {
      setError(err?.message || "فشل رفع ملف PDF.");
    } finally {
      setIsUploadingPdf(false);
    }
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(index) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuestion(index, field, value) {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function updateChoice(qIndex, cIndex, value) {
    setQuestions((prev) => {
      const next = [...prev];
      const choices = [...(next[qIndex].choices || ["", "", "", ""])];
      choices[cIndex] = value;
      next[qIndex] = { ...next[qIndex], choices };
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("من فضلك اكتب عنوان المحاضرة.");
      return;
    }
    if (!videoUrl.trim()) {
      setError("من فضلك أضف فيديو للمحاضرة (رفع مباشر أو رابط).");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Build units
      const units = [
        {
          unitId: initialLecture?.units?.[0]?.unitId || `unit_${Date.now()}`,
          title: (videoTitle || title).trim(),
          youtubeVideoId: videoUrl.trim(),
          isFree: isFree,
          driveFileId: ""
        }
      ];

      // Build resources
      const resources = hasPdf && pdfUrl.trim()
        ? [
            {
              resourceId: initialLecture?.resources?.[0]?.resourceId || `res_${Date.now()}`,
              title: (pdfTitle || "ملف المحاضرة PDF").trim(),
              fileUrl: pdfUrl.trim(),
              fileName: (pdfTitle || "Lecture.pdf").trim(),
              fileType: "pdf",
              isFree: isFree
            }
          ]
        : [];

      // Build quizzes
      const quizzes = hasQuiz
        ? [
            {
              quizId: initialLecture?.quizzes?.[0]?.quizId || `quiz_${Date.now()}`,
              title: (quizTitle || "كويز المحاضرة").trim(),
              minutes: Number(quizMinutes || 15),
              questionsCount: questions.filter((q) => q.prompt.trim()).length,
              isMandatory: false,
              questions: questions
                .filter((q) => q.prompt.trim())
                .map((q, idx) => ({
                  questionId: q.questionId || `q_${Date.now()}_${idx}`,
                  type: q.type || "mcq",
                  prompt: q.prompt.trim(),
                  choices: q.type === "essay" ? [] : (q.choices || []).filter((c) => c.trim()),
                  correctIndex: Number(q.correctIndex || 0),
                  points: Number(q.points || 1),
                  modelAnswer: q.modelAnswer?.trim() || null,
                  gradingRubric: q.gradingRubric?.trim() || null
                }))
            }
          ]
        : [];

      const payload = {
        title: title.trim(),
        description: description.trim(),
        grade: grade.trim(),
        price: isFree ? 0 : Number(price || 0),
        discountPercent: isFree ? 0 : Number(discountPercent || 0),
        thumbnailUrl: thumbnailUrl.trim(),
        isPublished: Boolean(isPublished),
        isStandalone: true,
        units,
        resources,
        quizzes
      };

      if (initialLecture?.id) {
        await updateCourse(initialLecture.id, payload);
      } else {
        await createCourse(payload);
      }

      setSuccess("✓ تم حفظ ونشر المحاضرة المستقلة بنجاح!");
      onSaved?.();
    } catch (err) {
      console.error(err);
      setError(err?.message || "تعذر حفظ المحاضرة المستقلة.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-cyan-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 text-right font-['Cairo',_sans-serif]">
      {/* Header */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0077B6] dark:text-[#00A8E8] flex items-center gap-2">
            <Video className="text-[#FF6B35]" />
            {initialLecture ? "تعديل المحاضرة المستقلة" : "إضافة محاضرة مستقلة جديدة"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            أنشئ محاضرة فيديو فردية متكاملة تحتوي على فيديو، ملف PDF، وكويز، مخصصة لصف دراسي محدد أو مدمجة.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            إلغاء
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 border-r-4 border-[#0077B6] pr-2">
            ١. بيانات المحاضرة والصف الدراسي
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                عنوان المحاضرة المستقلة: *
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: محاضرة قوانين فاراداي والتحليل الكهربي"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm outline-none focus:border-[#0077B6] font-bold dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                وصف المحاضرة:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="تفاصيل ما سيتعلمه الطالب في هذه المحاضرة..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs outline-none focus:border-[#0077B6] font-bold dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                الصف الدراسي / الدمج بين الصفوف: *
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-3 text-xs outline-none focus:border-[#0077B6] font-bold dark:text-white"
              >
                {gradesList.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                غلاف المحاضرة:
              </label>
              <label className="flex items-center justify-center gap-2 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:border-[#0077B6] transition text-xs font-bold">
                <Upload size={16} />
                <span>{isUploadingImage ? "جاري رفع الغلاف..." : thumbnailUrl ? "✓ تم اختيار الغلاف" : "اختر صورة الغلاف"}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Pricing & Free Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                سعر المحاضرة (ج.م):
              </label>
              <input
                type="number"
                disabled={isFree}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="50"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs outline-none focus:border-[#0077B6] font-bold dark:text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                نسبة الخصم (%):
              </label>
              <input
                type="number"
                min="0"
                max="100"
                disabled={isFree}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs outline-none focus:border-[#0077B6] font-bold dark:text-white disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => {
                    setIsFree(e.target.checked);
                    if (e.target.checked) setPrice("0");
                  }}
                  className="w-4 h-4 text-[#0077B6]"
                />
                هذه المحاضرة مجانية بالكامل
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 text-[#0077B6]"
                />
                نشر المحاضرة مباشرة للطلاب
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Video Content */}
        <div className="space-y-4 rounded-2xl border border-cyan-100 dark:border-slate-800 bg-cyan-50/20 dark:bg-slate-800/40 p-5">
          <h3 className="text-sm font-black text-[#0077B6] dark:text-[#00A8E8] flex items-center gap-2">
            <Video size={16} />
            ٢. فيديو المحاضرة *
          </h3>

          <div className="space-y-3">
            <input
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="عنوان الفيديو (مثال: الجزء الأول - الشرح التفصيلي)..."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-white dark:bg-slate-900 outline-none font-bold dark:text-white"
            />

            {/* Toggle Mode */}
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden max-w-xs">
              <button
                type="button"
                onClick={() => setVideoInputMode("upload")}
                className={`flex-1 py-2 text-xs font-bold transition ${
                  videoInputMode === "upload" ? "bg-[#0077B6] text-white" : "bg-white dark:bg-slate-900 text-slate-500"
                }`}
              >
                رفع MP4 مباشر
              </button>
              <button
                type="button"
                onClick={() => setVideoInputMode("url")}
                className={`flex-1 py-2 text-xs font-bold transition ${
                  videoInputMode === "url" ? "bg-[#0077B6] text-white" : "bg-white dark:bg-slate-900 text-slate-500"
                }`}
              >
                رابط MP4 / YouTube
              </button>
            </div>

            {videoInputMode === "upload" ? (
              <div className="space-y-3">
                {videoUrl && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    <CheckCircle2 size={16} />
                    <span>✓ تم تجهيز الفيديو بنجاح</span>
                  </div>
                )}

                {isUploadingVideo && (
                  <div className="p-4 rounded-xl bg-cyan-50 dark:bg-slate-800 border border-cyan-200 dark:border-cyan-800 space-y-2">
                    <div className="flex justify-between items-center text-xs font-extrabold text-[#0077B6]">
                      <span>جارٍ رفع الفيديو (${videoUploadProgress}%)...</span>
                      <span>${videoUploadProgress}%</span>
                    </div>
                    <div className="w-full h-3 bg-cyan-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#0077B6] to-[#00A8E8] transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(videoUploadProgress, 5)}%` }}
                      />
                    </div>
                  </div>
                )}

                <label className="flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-[#0077B6]/30 hover:border-[#0077B6] rounded-xl px-4 py-6 bg-white dark:bg-slate-900 transition">
                  <Upload size={24} className="text-[#0077B6]" />
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                    {isUploadingVideo ? "⏳ جارٍ الرفع..." : "اختر ملف فيديو MP4 من جهازك"}
                  </span>
                  <input type="file" accept="video/mp4,.mp4" disabled={isUploadingVideo} onChange={handleVideoUpload} className="hidden" />
                </label>
              </div>
            ) : (
              <input
                required={videoInputMode === "url"}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="رابط MP4 مباشر أو YouTube..."
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-white dark:bg-slate-900 outline-none font-bold dark:text-white"
              />
            )}
          </div>
        </div>

        {/* Section 3: PDF Attachment */}
        <div className="space-y-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText size={16} className="text-[#0077B6]" />
              ٣. ملخص / مذكرة المحاضرة (PDF)
            </h3>
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={hasPdf}
                onChange={(e) => setHasPdf(e.target.checked)}
                className="w-4 h-4 text-[#0077B6]"
              />
              إرفاق ملف PDF
            </label>
          </div>

          {hasPdf && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <input
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                placeholder="عنوان المذكرة أو الواجب (PDF)..."
                className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-white dark:bg-slate-900 outline-none font-bold dark:text-white"
              />
              <label className="flex items-center justify-center gap-2 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900 hover:border-[#0077B6] transition text-xs font-bold">
                <Upload size={14} />
                <span>{isUploadingPdf ? "جاري الرفع..." : pdfUrl ? "✓ تم اختيار الملف" : "اختر ملف PDF من الجهاز"}</span>
                <input type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Section 4: Quiz */}
        <div className="space-y-4 rounded-2xl border border-amber-100 dark:border-slate-800 bg-amber-50/20 dark:bg-slate-800/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <HelpCircle size={16} />
              ٤. كويز وتدريب المحاضرة
            </h3>
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={hasQuiz}
                onChange={(e) => setHasQuiz(e.target.checked)}
                className="w-4 h-4 text-[#0077B6]"
              />
              إضافة كويز لهذه المحاضرة
            </label>
          </div>

          {hasQuiz && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="عنوان الكويز..."
                  className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-white dark:bg-slate-900 outline-none font-bold dark:text-white"
                />
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={quizMinutes}
                  onChange={(e) => setQuizMinutes(Number(e.target.value))}
                  placeholder="مدة الكويز بالدقائق (مثال: 15)"
                  className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-white dark:bg-slate-900 outline-none font-bold dark:text-white"
                />
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                    الأسئلة ({questions.length})
                  </span>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="inline-flex items-center gap-1 bg-[#0077B6] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#005f92] transition"
                  >
                    <Plus size={14} />
                    إضافة سؤال
                  </button>
                </div>

                {questions.map((q, qIndex) => (
                  <div
                    key={q.id || qIndex}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#0077B6]">سؤال {qIndex + 1}:</span>
                        <select
                          value={q.type || "mcq"}
                          onChange={(e) => updateQuestion(qIndex, "type", e.target.value)}
                          className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 bg-slate-50 dark:bg-slate-800 font-bold"
                        >
                          <option value="mcq">اختيار من متعدد (MCQ)</option>
                          <option value="essay">سؤال مقالي (Essay AI)</option>
                        </select>
                      </div>

                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <textarea
                      value={q.prompt}
                      onChange={(e) => updateQuestion(qIndex, "prompt", e.target.value)}
                      placeholder="نص السؤال..."
                      rows={2}
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 bg-slate-50 dark:bg-slate-800 outline-none font-bold dark:text-white"
                    />

                    {q.type === "essay" ? (
                      <div className="space-y-2 p-3 rounded-xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-100 dark:border-blue-900">
                        <input
                          value={q.modelAnswer || ""}
                          onChange={(e) => updateQuestion(qIndex, "modelAnswer", e.target.value)}
                          placeholder="الإجابة النموذجية المعتمدة..."
                          className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-900 outline-none font-bold dark:text-white"
                        />
                        <input
                          value={q.gradingRubric || ""}
                          onChange={(e) => updateQuestion(qIndex, "gradingRubric", e.target.value)}
                          placeholder="معايير التصحيح للذكاء الاصطناعي (Rubric)..."
                          className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-900 outline-none font-bold dark:text-white"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.choices.map((choice, cIndex) => (
                          <div key={cIndex} className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name={`correct_${q.id || qIndex}`}
                              checked={q.correctIndex === cIndex}
                              onChange={() => updateQuestion(qIndex, "correctIndex", cIndex)}
                              className="w-4 h-4 text-emerald-600"
                            />
                            <input
                              value={choice}
                              onChange={(e) => updateChoice(qIndex, cIndex, e.target.value)}
                              placeholder={`الخيار ${["أ", "ب", "ج", "د"][cIndex]}...`}
                              className="flex-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 outline-none font-bold dark:text-white"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || isUploadingVideo}
          className="w-full py-4 bg-gradient-to-r from-[#FF6B35] to-[#f75216] hover:from-orange-600 hover:to-orange-700 text-white font-black text-base rounded-2xl shadow-xl shadow-orange-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Sparkles size={20} />
          {isSubmitting ? "جارٍ حفظ ونشر المحاضرة..." : initialLecture ? "حفظ تعديلات المحاضرة المستقلة" : "حفظ ونشر المحاضرة المستقلة الآن 🚀"}
        </button>
      </form>
    </div>
  );
}
