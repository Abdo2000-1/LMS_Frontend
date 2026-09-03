import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Phone, Check, X, ShieldAlert, UserCheck, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function ParentPhoneAlertModal({ autoPrompt = false }) {
  const { user, updateProfile, refreshProfile } = useAuth();

  // ONLY show for students who do NOT have a parent phone registered
  const isStudent = user?.role === "student";
  const hasParentPhone = Boolean(user?.parentPhone && user.parentPhone.trim().length >= 10);

  const [isOpen, setIsOpen] = useState(autoPrompt);
  const [parentPhone, setParentPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // If not a student or already has parent phone, render NOTHING at all
  if (!user || !isStudent || hasParentPhone) {
    return null;
  }

  function validate(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length !== 11) {
      return "رقم ولي الأمر يجب أن يتكون من 11 رقماً.";
    }
    if (!["010", "011", "012", "015"].some((prefix) => digits.startsWith(prefix))) {
      return "رقم الهاتف غير صحيح، يجب أن يبدأ بـ (010 أو 011 أو 012 أو 015).";
    }
    const studentDigits = String(user?.phone || "").replace(/\D/g, "");
    if (studentDigits && digits === studentDigits) {
      return "رقم ولي الأمر لا يمكن أن يكون نفس رقم هاتفك الخاص.";
    }
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate(parentPhone);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const cleanDigits = parentPhone.replace(/\D/g, "");
      await updateProfile({ parentPhone: cleanDigits });
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 1800);
    } catch (err) {
      setError(err.message || "حدث خطأ أثناء حفظ رقم ولي الأمر.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {/* ═══ PROMINENT BANNER (Only for students without parent phone) ════ */}
      <div className="mb-6 rounded-2xl bg-gradient-to-l from-amber-500 via-orange-500 to-amber-600 p-4 sm:p-5 text-white shadow-lg shadow-amber-500/15 border border-amber-400/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <AlertTriangle size={22} className="text-white" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-black flex items-center gap-2">
                <span>تنبيه هام: مطلوب تسجيل رقم هاتف ولي الأمر</span>
                <span className="text-[10px] bg-white/25 px-2 py-0.5 rounded-full font-bold">إلزامي</span>
              </h4>
              <p className="text-xs text-white/90 font-medium mt-0.5 leading-relaxed">
                لم يتم تسجيل رقم ولي أمرك حتى الآن. يرجى تعديل بياناتك وإضافة الرقم لضمان متابعة مستواك الدراسي والتواصل المستمر.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setError("");
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-amber-700 hover:bg-amber-50 text-xs font-black transition shadow-md shrink-0 flex items-center justify-center gap-2 active:scale-95"
          >
            <span>تعديل البيانات وإضافة الرقم 📝</span>
          </button>
        </div>
      </div>

      {/* ═══ MODAL DIALOG (تعديل البيانات) ═══════════════════════════════ */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 text-right font-['Cairo',sans-serif]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Phone size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      تعديل البيانات: تسجيل رقم ولي الأمر
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold">مطلوب لمرة واحدة فقط</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Student info summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">اسم الطالب:</span>
                  <span className="text-slate-900 dark:text-white font-black">{user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">رقم هاتف الطالب:</span>
                  <span dir="ltr" className="font-mono text-slate-900 dark:text-white font-black">{user?.phone || "غير مسجل"}</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم هاتف ولي الأمر (11 رقم) *
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      dir="ltr"
                      value={parentPhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                        setParentPhone(val);
                        if (error) setError("");
                      }}
                      placeholder="010XXXXXXXX"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pr-11 pl-4 py-3 text-sm font-bold font-mono text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 font-bold">
                    يجب أن يبدأ بـ (010 أو 011 أو 012 أو 015) ويكون مختلفاً عن رقمك الشخصي.
                  </p>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <ShieldAlert size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Success Banner */}
                {success && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <Check size={16} className="shrink-0" />
                    <span>🎉 تم حفظ رقم ولي الأمر بنجاح وتحديث بياناتك!</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving || success || parentPhone.length !== 11}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black hover:opacity-95 disabled:opacity-50 transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>جارٍ الحفظ...</span>
                      </>
                    ) : success ? (
                      <>
                        <Check size={16} />
                        <span>تم الحفظ</span>
                      </>
                    ) : (
                      <>
                        <UserCheck size={16} />
                        <span>حفظ رقم ولي الأمر ✓</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isSaving}
                    className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
