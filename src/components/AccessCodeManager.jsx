import { useState, useEffect, useMemo } from "react";
import {
  KeyRound,
  PlusCircle,
  Printer,
  Ban,
  CheckCircle2,
  Lock,
  Search,
  BookOpen,
  Layers,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import {
  generateAccessCodes,
  getAccessCodesForCourse,
  revokeAccessCode,
  revokeAllAccessCodes,
} from "../services/accessCodeService.js";
import { buildCourseContent } from "../services/courseService.js";

export default function AccessCodeManager({ courses = [] }) {
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "");
  const [accessType, setAccessType] = useState("FullCourse");
  const [selectedLectureIds, setSelectedLectureIds] = useState([]);
  const [quantity, setQuantity] = useState(10);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");

  const activeCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || courses[0] || null,
    [courses, selectedCourseId]
  );

  const courseItems = useMemo(() => {
    if (!activeCourse) return [];
    return buildCourseContent(activeCourse).map((item, idx) => ({
      ...item,
      uniqueId: item.id || item.unitId || item.lessonId || item.resourceId || item.quizId || `item_${idx}`,
    }));
  }, [activeCourse]);

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourseId) return;
    setLoading(true);
    getAccessCodesForCourse(selectedCourseId)
      .then((res) => setCodes(res?.items || []))
      .catch((err) => setMessage({ type: "error", text: err.message }))
      .finally(() => setLoading(false));
  }, [selectedCourseId]);

  function handleItemToggle(id) {
    setSelectedLectureIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleSelectAllItems() {
    if (selectedLectureIds.length === courseItems.length) {
      setSelectedLectureIds([]);
    } else {
      setSelectedLectureIds(courseItems.map((l) => l.uniqueId));
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    const courseIdToUse = selectedCourseId || courses[0]?.id;
    if (!courseIdToUse || courseIdToUse.length < 30) {
      setMessage({ type: "error", text: "رجاءً اختر كورس صحيح من القائمة." });
      return;
    }

    const qty = Math.max(1, Math.min(500, Number(quantity) || 10));

    if (accessType === "SelectedLectures" && selectedLectureIds.length === 0) {
      setMessage({ type: "error", text: "رجاءً اختر درس واحد على الأقل لكود المحاضرات المحددة." });
      return;
    }

    setGenerating(true);
    setMessage({ type: "", text: "" });
    try {
      const generated = await generateAccessCodes({
        courseId: courseIdToUse,
        accessType: accessType === "SelectedLectures" ? "SelectedLectures" : "FullCourse",
        allowedLectureIds: accessType === "SelectedLectures" ? selectedLectureIds : [],
        quantity: qty,
      });

      setCodes((prev) => [...(Array.isArray(generated) ? generated : []), ...prev]);
      setMessage({ type: "success", text: `تم إنشاء ${generated.length || qty} كود تفعيل عشوائي (12 رقم) بنجاح.` });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(codeId) {
    if (!window.confirm("هل أنت متأكد من مسح كود التفعيل هذا؟")) return;
    try {
      await revokeAccessCode(codeId);
      setCodes((prev) => prev.filter((c) => c.id !== codeId));
      setMessage({ type: "success", text: "تم مسح الكود بنجاح." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleRevokeAll() {
    if (!selectedCourseId) return;
    const deletableCount = codes.filter((c) => c.status === "Unused" || c.status === "Revoked").length;
    if (deletableCount === 0) {
      setMessage({ type: "error", text: "لا توجد أكواد غير مستخدمة أو ملغاة لمسحها." });
      return;
    }
    if (!window.confirm(`هل أنت متأكد من مسح جميع الأكواد غير المستخدمة والملغاة نهائياً (${deletableCount} كود)؟ هذا الإجراء لا يمكن التراجع عنه!`)) return;
    
    setLoading(true);
    try {
      await revokeAllAccessCodes(selectedCourseId);
      setCodes((prev) => prev.filter((c) => c.status !== "Unused" && c.status !== "Revoked"));
      setMessage({ type: "success", text: `تم مسح ${deletableCount} كود بنجاح.` });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(""), 2000);
  }

  const filteredCodes = useMemo(() => {
    const term = searchTerm.trim();
    if (!term) return codes;
    return codes.filter(
      (c) =>
        c.code.includes(term) ||
        (c.claimedByStudentName || "").toLowerCase().includes(term.toLowerCase())
    );
  }, [codes, searchTerm]);

  return (
    <div className="space-y-8 font-['Cairo',sans-serif]" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-gradient-to-l from-slate-900 via-sky-950 to-cyan-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mb-3 border border-cyan-400/20">
              <KeyRound size={14} /> نظام أكواد التفعيل 12 رقمًا
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">توليد وإدارة كروت الشحن / الأكواد</h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              يمكنك توليد أكواد تفعيل عشوائية مكونة من 12 رقمًا لبيع الكورس بالكامل أو محاضرات محددة، وطباعتها وتوزيعها على الطلاب.
            </p>
          </div>
          {codes.length > 0 && (
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 px-5 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 text-sm"
            >
              <Printer size={18} />
              <span>معاينة وطباعة الكروت ({codes.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {message.text && (
        <div
          className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-2 ${
            message.type === "error"
              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
          }`}
        >
          {message.type === "error" ? <Ban size={18} /> : <CheckCircle2 size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Generator Form */}
      <form
        onSubmit={handleGenerate}
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
      >
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <PlusCircle className="text-[#0077B6]" size={20} />
          <span>توليد أكواد جديدة</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Select Course */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              اختر الكورس المستهدف:
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                setSelectedLectureIds([]);
              }}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} ({course.grade || "عام"})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              عدد الأكواد المطلوبة:
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
            />
          </div>
        </div>

        {/* Access Type Radio Buttons */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
            صلاحية الكود (نوع الوصول):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                accessType === "FullCourse"
                  ? "border-[#0077B6] bg-cyan-50/50 dark:bg-cyan-950/20 ring-2 ring-[#0077B6]/30"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
              }`}
            >
              <input
                type="radio"
                name="accessType"
                value="FullCourse"
                checked={accessType === "FullCourse"}
                onChange={() => setAccessType("FullCourse")}
                className="mt-1 accent-[#0077B6]"
              />
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <BookOpen size={16} className="text-[#0077B6]" /> وصول كامل للكورس
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  يمنح الطالب إمكانية فتح الكورس بالكامل بجميع دروسه وفيديوهاته الحالية والمستقبلية.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                accessType === "SelectedLectures"
                  ? "border-[#0077B6] bg-cyan-50/50 dark:bg-cyan-950/20 ring-2 ring-[#0077B6]/30"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
              }`}
            >
              <input
                type="radio"
                name="accessType"
                value="SelectedLectures"
                checked={accessType === "SelectedLectures"}
                onChange={() => setAccessType("SelectedLectures")}
                className="mt-1 accent-[#0077B6]"
              />
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Layers size={16} className="text-amber-500" /> محاضرات / ملفات / كويزات محددة
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  يسمح للطالب بفتح محاضرات أو ملفات PDF أو كويزات معينة فقط يختارها المدرس.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Course Items Selection List (If SelectedLectures) */}
        {accessType === "SelectedLectures" && (
          <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                حدد المحتويات التي يفتحها هذا الكود: ({selectedLectureIds.length} عنصر محدد)
              </span>
              <button
                type="button"
                onClick={handleSelectAllItems}
                className="text-xs font-bold text-[#0077B6] hover:underline"
              >
                {selectedLectureIds.length === courseItems.length ? "إلغاء تحديد الكل" : "تحديد كل محتويات الكورس"}
              </button>
            </div>

            {courseItems.length === 0 ? (
              <p className="text-xs text-slate-500">لا توجد محتويات أو دروس مضافة في هذا الكورس بعد.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
                {courseItems.map((item) => {
                  const isChecked = selectedLectureIds.includes(item.uniqueId);
                  const isVideo = item.type === "video";
                  const isResource = item.type === "resource";
                  const isQuiz = item.type === "quiz";
                  return (
                    <label
                      key={item.uniqueId}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        isChecked
                          ? "border-amber-400 bg-amber-100/60 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleItemToggle(item.uniqueId)}
                        className="accent-amber-500 rounded shrink-0"
                      />
                      <span className="shrink-0">
                        {isVideo && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-black">فيديو</span>}
                        {isResource && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">PDF</span>}
                        {isQuiz && <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-black">كويز</span>}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={generating}
          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#0077B6] to-[#00A8E8] hover:from-[#005f93] hover:to-[#0090c9] text-white font-black text-sm shadow-md active:scale-98 transition-all disabled:opacity-50"
        >
          {generating ? "جارٍ توليد الأكواد العشوائية..." : `توليد ${quantity} كود تفعيل`}
        </button>
      </form>

      {/* Generated Codes Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">أكواد التفعيل المنيّأة</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي الأكواد: {codes.length}</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {codes.some(c => c.status === "Unused" || c.status === "Revoked") && (
              <button
                type="button"
                onClick={handleRevokeAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40 rounded-xl text-xs font-bold transition-colors border border-red-200 dark:border-red-800/30 whitespace-nowrap"
              >
                <Trash2 size={14} /> مسح كل الأكواد
              </button>
            )}
            <div className="relative flex-1 sm:w-64">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالكود أو الطالب..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pr-9 pl-3 py-2 text-xs outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 text-center py-8">جارٍ تحميل الأكواد...</p>
        ) : filteredCodes.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">لا توجد أكواد تفعيل مطابقة.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                  <th className="py-3 px-4">كود التفعيل (12 رقم)</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">نوع الوصول</th>
                  <th className="py-3 px-4">المستفيد / الطالب</th>
                  <th className="py-3 px-4">تاريخ الإنشاء</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                {filteredCodes.map((item) => {
                  const isUsed = item.status === "Used";
                  const isRevoked = item.status === "Revoked";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-sm tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{item.code}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.code)}
                          className="text-slate-400 hover:text-cyan-600 transition-colors"
                          title="نسخ الكود"
                        >
                          {copiedCode === item.code ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {isUsed ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-full text-[11px]">
                            <CheckCircle2 size={12} /> مستخدم
                          </span>
                        ) : isRevoked ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 px-2.5 py-1 rounded-full text-[11px]">
                            <Ban size={12} /> ملغى
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 px-2.5 py-1 rounded-full text-[11px]">
                            <Lock size={12} /> متاح (غير مستخدم)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.accessType === "FullCourse" ? (
                          <span className="text-[#0077B6]">كورس كامل</span>
                        ) : (
                          <span className="text-amber-600 font-bold">
                            محاضرات محددة ({item.allowedLectureIds?.length || 0})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {item.claimedByStudentName || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!isUsed && !isRevoked && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(item.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 font-bold hover:underline"
                          >
                            مسح الكود
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Preview Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto text-right">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Printer size={20} className="text-[#0077B6]" /> معاينة كروت الشحن للطباعة
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-[#0077B6] hover:bg-[#005f93] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  طباعة الآن
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-bold"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Printable Area Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4 print:p-0">
              {filteredCodes
                .filter((c) => c.status === "Unused")
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col justify-between gap-3 text-center print:border-black print:bg-white print:text-black"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest print:text-black">
                        LMS EDUCATIONAL CENTER
                      </p>
                      <h4 className="text-base font-black text-[#0077B6] print:text-black mt-1">
                        {item.courseTitle}
                      </h4>
                      <p className="text-xs font-bold text-amber-600 print:text-black mt-0.5">
                        {item.accessType === "FullCourse"
                          ? "كورس كامل"
                          : `محاضرات محددة (${item.allowedLectureIds?.length || 0})`}
                      </p>
                    </div>

                    <div className="py-3 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl print:border-black print:bg-white">
                      <span className="text-xs font-bold text-slate-400 block mb-1">كود التفعيل (12 رقم)</span>
                      <span className="font-mono text-xl font-black text-slate-900 dark:text-slate-100 tracking-widest print:text-black">
                        {item.code.replace(/(\d{4})(\d{4})(\d{4})/, "$1 - $2 - $3")}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 print:text-black">
                      ادخل الكود في المنصة لشحن الرصيد والوصول للمحتوى
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
