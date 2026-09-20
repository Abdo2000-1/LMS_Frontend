import { useState } from "react";
import { Sparkles, KeyRound, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Crown } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { claimAccessCode } from "../services/accessCodeService.js";
import MinaMouridWelcomeModal from "./MinaMouridWelcomeModal.jsx";
import { Link } from "react-router-dom";

export default function StudentPromoCodeCard({ className = "" }) {
  const { user, refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Check if student already has 2nd secondary promo active
  const isSecondSecStudent = user?.role === "student" && (
    String(user?.grade || "").includes("الثاني") ||
    String(user?.grade || "").includes("ثانية")
  );

  const hasMinaPromoActive = Array.isArray(user?.enrolledCourses) && (
    user.enrolledCourses.some((c) => String(c || "").toUpperCase() === "PROMO_MINAMOURID100%")
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setError("يرجى إدخال الكود أولاً.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessData(null);

    try {
      const result = await claimAccessCode({ code: cleanCode });
      setSuccessData(result);
      setCode("");
      await refreshProfile();

      if (cleanCode.toUpperCase() === "MINAMOURID100%") {
        setShowWelcomeModal(true);
      }
    } catch (err) {
      setError(err.message || "تعذر تفعيل الكود. يرجى التأكد من كتابة الكود بشكل صحيح.");
    } finally {
      setLoading(false);
    }
  }

  // Only render for logged-in students
  if (user && user.role !== "student") return null;

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-[2rem] border-2 border-amber-300 dark:border-amber-500/40 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/30 p-6 sm:p-7 shadow-lg shadow-amber-500/5 ${className}`}
        dir="rtl"
      >
        {/* Decorative corner light */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

        {hasMinaPromoActive && isSecondSecStudent ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                <Crown size={26} />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-300 text-[11px] font-black mb-1">
                  <Sparkles size={12} className="text-amber-600 dark:text-amber-400" />
                  <span>اشتراك ذهبي فعال (Full Access)</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  كود MINAMOURID100% مفعّل بحسابك بنجاح!
                </h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  جميع كورسات ومحاضرات الصف الثاني الثانوي متاحة ومفتوحة لك بالكامل دون أي رسوم.
                </p>
              </div>
            </div>
            <Link
              to="/courses?grade=الصف+الثاني+الثانوي"
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 text-xs font-black shadow-md transition-all active:scale-95 shrink-0"
            >
              <span>كورسات الصف الثاني</span>
              <ArrowLeft size={15} />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>خانة إدخال كود التفعيل والاشتراك</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      خاص بالطلاب
                    </span>
                  </h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    أدخل كود المنصة الترويجي أو كود التفعيل المطبوع لفتح الكورسات فوراً في حسابك الشخصي.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2.5">
                <AlertCircle size={17} className="shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {successData && !showWelcomeModal && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5">
                <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
                <span>تم تفعيل الكود بنجاح: {successData.courseTitle}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="اكتب كود التفعيل هنا (مثال: MINAMOURID100%)..."
                  className="w-full rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-black font-mono tracking-wider outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 transition-all text-right uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-md shadow-amber-500/20 active:scale-97 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>جارٍ التحقق والتفعيل...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>تفعيل الكود</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      <MinaMouridWelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />
    </>
  );
}
