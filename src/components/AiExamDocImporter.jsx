import { useState, useRef, useEffect } from "react";
import { Sparkles, FileText, Upload, CheckCircle2, AlertCircle, Loader2, X, Check, Edit3 } from "lucide-react";
import { parseExamDocument, parseExamText } from "../services/courseService.js";

export default function AiExamDocImporter({ onExtracted }) {
  const [activeTab, setActiveTab] = useState("file"); // "file" | "paste"
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Progress states
  const [uploadPercent, setUploadPercent] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [aiStage, setAiStage] = useState(""); // "uploading" | "reading" | "extracting" | "formatting" | "done"
  const [aiPercent, setAiPercent] = useState(0);

  const fileInputRef = useRef(null);
  const aiProgressInterval = useRef(null);

  useEffect(() => {
    return () => {
      if (aiProgressInterval.current) clearInterval(aiProgressInterval.current);
    };
  }, []);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "docx", "doc", "txt", "md"].includes(ext)) {
      setError("صيغة الملف غير مدعومة. الصيغ المدعومة هي: Markdown (.md), PDF (.pdf), Word (.docx), Text (.txt).");
      setSelectedFile(null);
      return;
    }

    if (file.size > 35 * 1024 * 1024) {
      setError("حجم الملف كبير جداً (الحد الأقصى 35 ميجابايت).");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError("");
    setSuccessMessage("");
    setUploadPercent(0);
    setAiPercent(0);
    setAiStage("");
  }

  function startAiProgressSimulation() {
    setAiPercent(10);
    setAiStage("reading");

    if (aiProgressInterval.current) clearInterval(aiProgressInterval.current);

    aiProgressInterval.current = setInterval(() => {
      setAiPercent((prev) => {
        if (prev < 35) {
          setAiStage("reading");
          return prev + Math.floor(Math.random() * 8) + 4;
        } else if (prev < 75) {
          setAiStage("extracting");
          return prev + Math.floor(Math.random() * 6) + 3;
        } else if (prev < 94) {
          setAiStage("formatting");
          return prev + Math.floor(Math.random() * 4) + 1;
        }
        return 95;
      });
    }, 800);
  }

  async function handleStartExtraction() {
    if (activeTab === "file" && !selectedFile) return;
    if (activeTab === "paste" && !pastedText.trim()) {
      setError("يرجى لصق نص الامتحان أولاً في المربع أدناه.");
      return;
    }

    setIsParsing(true);
    setError("");
    setSuccessMessage("");

    try {
      let data = null;

      if (activeTab === "paste") {
        setUploadPercent(100);
        setIsUploading(false);
        startAiProgressSimulation();
        data = await parseExamText(pastedText.trim());
      } else {
        setIsUploading(true);
        setUploadPercent(0);
        setAiStage("uploading");
        data = await parseExamDocument(selectedFile, (percent) => {
          setUploadPercent(percent);
          if (percent >= 100) {
            setIsUploading(false);
            startAiProgressSimulation();
          }
        });
      }

      if (aiProgressInterval.current) clearInterval(aiProgressInterval.current);

      if (!data || !data.questions || data.questions.length === 0) {
        throw new Error("لم يتم العثور على أي أسئلة صالحة داخل المستند. تأكد من وضوح الأسئلة والاختيارات.");
      }

      setAiPercent(100);
      setAiStage("done");
      setSuccessMessage(`🎉 اكتملت العملية بنسبة 100%! تم استخراج ${data.questions.length} سؤالاً بنجاح، وهي معروضة للمراجعة بالأسفل.`);

      if (onExtracted) {
        onExtracted({
          title: data.title || (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, "") : "امتحان كيمياء"),
          questions: data.questions,
        });
      }
    } catch (err) {
      if (aiProgressInterval.current) clearInterval(aiProgressInterval.current);
      const isTimeout = /timeout/i.test(String(err.message || ""));
      setError(
        isTimeout
          ? "استغرقت معالجة الملف وقتاً أطول من المتوقع نظراً لكبر حجم الملف أو ضغط السيرفر. ننصح بنسخ نص الامتحان ولصقه في تبويب 'لصق نص الامتحان' لسرعة فورية (خلال 5 ثوانٍ)."
          : (err.message || "حدث خطأ أثناء استخراج الأسئلة بالذكاء الاصطناعي.")
      );
      setAiStage("");
    } finally {
      setIsParsing(false);
      setIsUploading(false);
    }
  }

  function handleRemoveFile() {
    if (aiProgressInterval.current) clearInterval(aiProgressInterval.current);
    setSelectedFile(null);
    setError("");
    setSuccessMessage("");
    setUploadPercent(0);
    setAiPercent(0);
    setAiStage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function getAiStageText() {
    switch (aiStage) {
      case "uploading":
        return `المرحلة 1: جارٍ رفع الملف إلى السيرفر... (${uploadPercent}%)`;
      case "reading":
        return `المرحلة 2: تم الرفع بنجاح (100%). جارٍ قراءة مستند الامتحان بالذكاء الاصطناعي...`;
      case "extracting":
        return `المرحلة 3: الـ AI يقوم الآن بتحليل وتقسيم الأسئلة والاختيارات والمعادلات...`;
      case "formatting":
        return `المرحلة 4: تجهيز ونقل كروت الأسئلة داخل الـ Exam Builder للمراجعة...`;
      case "done":
        return `اكتملت العملية بنجاح 100%!`;
      default:
        return "";
    }
  }

  return (
    <div className="rounded-3xl border-2 border-dashed border-cyan-300 dark:border-cyan-700/80 bg-gradient-to-br from-cyan-50/70 via-blue-50/50 to-indigo-50/60 dark:from-slate-900/90 dark:to-slate-800/80 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Title & Description */}
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#0077B6] to-[#00A8E8] text-white shadow-md shadow-cyan-500/20">
              <Sparkles size={19} />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              استيراد وتوليد الامتحان بالذكاء الاصطناعي (ملفات أو نص مباشر)
            </h3>
            <span className="text-[11px] bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-extrabold px-2.5 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800">
              ميزة ذكية 🧪
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            ارفع ملف الامتحان (Markdown .md أو Word أو PDF أو Text)، أو الصق نص الامتحان مباشرة، وسيقوم الذكاء الاصطناعي بقراءة الامتحان وتقسيم كل سؤال مع اختياراته ونقلها مباشرة للـ Builder لمراجعتها وتعديلها بالكامل.
          </p>
        </div>
      </div>

      {/* Tabs Switcher: Upload File vs Paste Text */}
      <div className="mt-4 flex items-center gap-2 border-b border-cyan-200/80 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => { setActiveTab("file"); setError(""); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${
            activeTab === "file"
              ? "bg-[#0077B6] text-white shadow-sm"
              : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
          }`}
        >
          <Upload size={14} />
          <span>📁 رفع ملف (PDF, Word, Markdown, Text)</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("paste"); setError(""); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${
            activeTab === "paste"
              ? "bg-[#0077B6] text-white shadow-sm"
              : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
          }`}
        >
          <Edit3 size={14} />
          <span>📝 لصق نص الامتحان مباشرة (الأسرع فورياً ⚡)</span>
        </button>
      </div>

      {/* TAB 1: FILE UPLOAD */}
      {activeTab === "file" && (
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md"
            onChange={handleFileChange}
            className="hidden"
            id="ai-exam-doc-upload"
            disabled={isParsing}
          />

          {!selectedFile ? (
            <label
              htmlFor="ai-exam-doc-upload"
              className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-cyan-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-slate-700/60 transition shadow-sm"
            >
              <Upload size={16} className="text-[#0077B6] dark:text-cyan-400" />
              <span>اختر ملف الامتحان (.md / .docx / .pdf / .txt)</span>
            </label>
          ) : (
            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-cyan-200 dark:border-slate-700 shadow-sm">
              <FileText size={18} className="text-[#0077B6] dark:text-cyan-400 shrink-0" />
              <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[220px]">
                {selectedFile.name}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
              {!isParsing && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition mr-1"
                  title="إلغاء الملف"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          )}

          {selectedFile && (
            <button
              type="button"
              onClick={handleStartExtraction}
              disabled={isParsing}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white text-xs font-black hover:opacity-95 disabled:opacity-50 transition shadow-md shadow-cyan-500/20"
            >
              {isParsing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جارٍ المعالجة ({isUploading ? `${uploadPercent}%` : `${aiPercent}%`})...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>استخراج الأسئلة بالذكاء الاصطناعي</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* TAB 2: DIRECT PASTE TEXT */}
      {activeTab === "paste" && (
        <div className="mt-4 space-y-3">
          <textarea
            rows={6}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            disabled={isParsing}
            placeholder="الصق نص الامتحان هنا مباشرة (الأسئلة والاختيارات من وورد أو PDF أو ملف Markdown أو أي مصدر)..."
            className="w-full rounded-2xl border border-cyan-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 p-4 text-xs font-bold leading-relaxed text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20 transition"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleStartExtraction}
              disabled={isParsing || !pastedText.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white text-xs font-black hover:opacity-95 disabled:opacity-50 transition shadow-md shadow-cyan-500/20"
            >
              {isParsing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جارٍ تحليل النص وتقسيم الأسئلة ({aiPercent}%)...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>استخراج الأسئلة من النص بالذكاء الاصطناعي ⚡</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* --- DETAILED PROGRESS SECTION --- */}
      {isParsing && (
        <div className="mt-4 p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-cyan-200 dark:border-cyan-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-100">
              <Loader2 size={15} className="animate-spin text-[#0077B6] dark:text-cyan-400 shrink-0" />
              <span>{getAiStageText()}</span>
            </div>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-[#0077B6] dark:text-cyan-300 font-mono">
              {isUploading ? `${uploadPercent}%` : `${aiPercent}%`}
            </span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-[#0077B6] via-cyan-400 to-[#00A8E8] h-full rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${isUploading ? uploadPercent : aiPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-bold">
            <div className={`flex items-center gap-1.5 ${uploadPercent >= 100 ? "text-emerald-600 dark:text-emerald-400" : isUploading ? "text-[#0077B6] font-black" : "text-slate-400"}`}>
              {uploadPercent >= 100 ? <Check size={13} className="shrink-0" /> : <span className="w-2 h-2 rounded-full bg-current shrink-0" />}
              <span>1. رفع البيانات ({uploadPercent}%)</span>
            </div>
            <div className={`flex items-center gap-1.5 ${aiPercent >= 35 ? "text-emerald-600 dark:text-emerald-400" : aiStage === "reading" ? "text-[#0077B6] font-black animate-pulse" : "text-slate-400"}`}>
              {aiPercent >= 35 ? <Check size={13} className="shrink-0" /> : <span className="w-2 h-2 rounded-full bg-current shrink-0" />}
              <span>2. قراءة المستند</span>
            </div>
            <div className={`flex items-center gap-1.5 ${aiPercent >= 70 ? "text-emerald-600 dark:text-emerald-400" : aiStage === "extracting" ? "text-[#0077B6] font-black animate-pulse" : "text-slate-400"}`}>
              {aiPercent >= 70 ? <Check size={13} className="shrink-0" /> : <span className="w-2 h-2 rounded-full bg-current shrink-0" />}
              <span>3. تقسيم الأسئلة</span>
            </div>
            <div className={`flex items-center gap-1.5 ${aiPercent >= 100 ? "text-emerald-600 dark:text-emerald-400" : aiStage === "formatting" ? "text-[#0077B6] font-black animate-pulse" : "text-slate-400"}`}>
              {aiPercent >= 100 ? <Check size={13} className="shrink-0" /> : <span className="w-2 h-2 rounded-full bg-current shrink-0" />}
              <span>4. النقل للـ Builder</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle size={17} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Alert with 100% confirmation */}
      {successMessage && (
        <div className="mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p>{successMessage}</p>
          </div>
          <span className="bg-emerald-200 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black">
            100% مكتمل
          </span>
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-bold">
        🛡️ <span className="text-slate-700 dark:text-slate-300">أمان ومراجعة كاملة:</span> لن يتم حفظ أو نشر الامتحان تلقائياً. ستظهر جميع الأسئلة المستخرجة في لوحة المراجعة بالأسفل لتعديل نصوصها أو اختياراتها وحذف/إضافة أي سؤال وتحديد الإجابات الصحيحة قبل الحفظ.
      </p>
    </div>
  );
}
