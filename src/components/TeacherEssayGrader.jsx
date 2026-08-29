import { useState, useEffect } from "react";
import { FileEdit, CheckCircle2, Sparkles, AlertCircle, User, BookOpen } from "lucide-react";
import { getPendingEssays, gradeEssayByTeacher } from "../services/essayService.js";

export default function TeacherEssayGrader() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradingId, setGradingId] = useState(null);
  const [scores, setScores] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    setLoading(true);
    try {
      const data = await getPendingEssays();
      setSubmissions(data || []);
      const initialScores = {};
      const initialFeedbacks = {};
      (data || []).forEach((s) => {
        initialScores[s.id] = s.aiSuggestedScore ?? s.maxScore;
        initialFeedbacks[s.id] = s.aiFeedback ?? "";
      });
      setScores(initialScores);
      setFeedbacks(initialFeedbacks);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleGrade(submissionId) {
    const finalScore = scores[submissionId];
    const teacherFeedback = feedbacks[submissionId];

    if (finalScore === undefined || finalScore === null || finalScore < 0) {
      setMessage({ type: "error", text: "رجاءً ادخل درجة صالحة." });
      return;
    }

    setGradingId(submissionId);
    setMessage({ type: "", text: "" });
    try {
      await gradeEssayByTeacher(submissionId, { finalScore, teacherFeedback });
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      setMessage({ type: "success", text: "تم حفظ واعتماد درجة السؤال المقالي بنجاح." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setGradingId(null);
    }
  }

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileEdit className="text-[#0077B6]" size={24} /> تصحيح الأسئلة المقالية (مساعد الذكاء الاصطناعي)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            يتم تقديم تقييم مبدئي مقترح بواسطة AI، والمعلم صاحب السلطة النهائية لاعتماد أو تعديل الدرجة والملاحظات.
          </p>
        </div>
        <span className="px-4 py-2 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-[#0077B6] font-bold text-xs">
          قيد المراجعة: {submissions.length}
        </span>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            message.type === "error"
              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200"
          }`}
        >
          {message.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500 text-xs font-bold">جارٍ تحميل إجابات الطلاب المقالية...</div>
      ) : submissions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500" />
          <p className="font-bold text-sm">لا توجد إجابات مقالية معلقة في انتظار التصحيح حالياً.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
            >
              {/* Submission Meta */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-950 text-[#0077B6] flex items-center justify-center font-bold">
                    <User size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">{sub.studentName}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <BookOpen size={12} /> {sub.courseTitle}
                    </p>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-400">
                  {new Date(sub.createdAt).toLocaleString("ar-EG")}
                </div>
              </div>

              {/* Question & Student Answer */}
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">نص السؤال المقالي:</span>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100 mt-1 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                    {sub.prompt}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجابة الطالب:</span>
                  <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {sub.studentAnswer}
                  </div>
                </div>

                {sub.modelAnswer && (
                  <div>
                    <span className="text-xs font-bold text-[#0077B6]">الإجابة النموذجية (مرجع):</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl mt-1">
                      {sub.modelAnswer}
                    </p>
                  </div>
                )}
              </div>

              {/* AI Suggestion Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-l from-indigo-50/70 to-cyan-50/70 dark:from-indigo-950/30 dark:to-cyan-950/30 border border-indigo-200/60 dark:border-indigo-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" /> اقتراح الذكاء الاصطناعي (AI)
                  </span>
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-3 py-1 rounded-full shadow-sm">
                    الدرجة المقترحة: {sub.aiSuggestedScore ?? "—"} / {sub.maxScore}
                  </span>
                </div>

                {sub.aiFeedback && (
                  <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed font-bold">
                    {sub.aiFeedback}
                  </p>
                )}

                {sub.aiStrengths?.length > 0 && (
                  <div className="text-xs text-emerald-800 dark:text-emerald-300">
                    <span className="font-bold">نقاط القوة:</span> {sub.aiStrengths.join(" • ")}
                  </div>
                )}

                {sub.aiMissingPoints?.length > 0 && (
                  <div className="text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-bold">نقاط مفقودة:</span> {sub.aiMissingPoints.join(" • ")}
                  </div>
                )}
              </div>

              {/* Teacher Decision Input */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                <h5 className="text-xs font-black text-slate-900 dark:text-slate-100">درجة المعلم النهائية:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">الدرجة النهائية (من {sub.maxScore}):</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={sub.maxScore}
                      value={scores[sub.id] ?? ""}
                      onChange={(e) => setScores({ ...scores, [sub.id]: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-[#0077B6]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظات المعلم للطالب:</label>
                    <input
                      type="text"
                      value={feedbacks[sub.id] ?? ""}
                      onChange={(e) => setFeedbacks({ ...feedbacks, [sub.id]: e.target.value })}
                      placeholder="مثال: إجابة ممتازة ومكتملة"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[#0077B6]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={gradingId === sub.id}
                  onClick={() => handleGrade(sub.id)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {gradingId === sub.id ? "جارٍ الحفظ..." : "اعتماد وحفظ الدرجة النهائية"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
