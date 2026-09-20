import { useState } from "react";
import { KeyRound, CheckCircle2, AlertCircle, X, Sparkles, Crown, BookOpen, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { claimAccessCode } from "../services/accessCodeService.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function RedeemCodeModal({ isOpen, onClose, onSuccess }) {
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [isMinaPromoSuccess, setIsMinaPromoSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setError("يرجى إدخال الكود أولاً.");
      return;
    }

    const isPromo = cleanCode.toUpperCase() === "MINAMOURID100%";
    if (!isPromo && (cleanCode.length !== 12 || !/^\d+$/.test(cleanCode))) {
      setError("كود التفعيل يجب أن يتكون من 12 رقمًا أو برومو كود معتمد.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessData(null);
    setIsMinaPromoSuccess(false);

    try {
      const result = await claimAccessCode({ code: cleanCode });
      setSuccessData(result);
      if (isPromo) {
        setIsMinaPromoSuccess(true);
      }
      await refreshProfile();
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setError(err.message || "تعذر تفعيل الكود. تأكد من صحة الكود المدخل.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setCode("");
    setError("");
    setSuccessData(null);
    setIsMinaPromoSuccess(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-['Cairo',sans-serif]" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden text-center">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 left-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={20} />
        </button>

        {isMinaPromoSuccess ? (
          <div className="py-2 space-y-4">
            <div className="w-18 h-18 w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
              <Crown size={34} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-300 text-xs font-black">
              <Sparkles size={13} className="text-amber-600 dark:text-amber-400 animate-pulse" />
              <span>Full Access 100% — الصف الثاني الثانوي</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              مرحباً بك في منصة الأستاذ مينا موريد! 🎓
            </h3>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-slate-800/80 border border-amber-200 dark:border-slate-700 text-right space-y-1.5">
              <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={16} />
                تم فتح جميع كورسات الصف الثاني الثانوي بحسابك!
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                أهلاً بك يا بطل. تم تفعيل وصولك الكامل لجميع الشروحات، الفيديوهات، والامتحانات مجاناً.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link
                to="/courses?grade=الصف+الثاني+الثانوي"
                onClick={handleClose}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <BookOpen size={16} />
                <span>تصفح كورساتك الآن</span>
                <ArrowLeft size={15} />
              </Link>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : successData ? (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">تم التفعيل بنجاح!</h3>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-right space-y-2">
              <p className="text-xs font-bold text-slate-500">الكورس المفعل:</p>
              <p className="text-sm font-black text-emerald-900 dark:text-emerald-200">{successData.courseTitle}</p>
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-200/60 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold mt-1">
                {successData.accessType === "FullCourse"
                  ? "وصول كامل للكورس"
                  : `محاضرات محددة (${successData.allowedLectureIds?.length || 0})`}
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-all shadow-lg active:scale-98"
            >
              تصفح المحتوى الآن
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2">
                <KeyRound size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">تفعيل كود الوصول</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                أدخل كود التفعيل المكون من 12 رقماً أو كود المنصة الترويجي (Promo Code).
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                كود التفعيل / البرومو كود:
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError("");
                }}
                placeholder="مثال: MINAMOURID100% أو 12 رقم"
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3.5 text-center font-mono text-base font-black tracking-widest outline-none focus:ring-2 focus:ring-amber-500 uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-lg active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                "جارٍ التفعيل..."
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>تفعيل الكود</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
