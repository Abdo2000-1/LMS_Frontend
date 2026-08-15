import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, GraduationCap, LogOut, Check, Phone, MapPinned } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AppHeader from "../components/AppHeader.jsx";
import Footer from "../components/Footer.jsx";

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) {
      setServerError("الاسم لا يمكن يكون فاضي.");
      return;
    }

    setIsSaving(true);
    setSaved(false);
    setServerError("");
    try {
      await updateProfile({ name: name.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setServerError(error.message || "حصل خطأ أثناء حفظ التعديلات.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Cairo',_sans-serif] transition-colors duration-500"
    >
      <AppHeader active="/profile" />

      <main className="max-w-3xl mx-auto px-6 sm:px-10 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 sm:p-10 ring-1 ring-black/5 dark:ring-white/10"
        >
          <div className="flex flex-col items-center gap-3 mb-8 text-center">
            <div className="w-20 h-20 rounded-full bg-chem-deep dark:bg-chem-light text-white dark:text-slate-950 flex items-center justify-center text-2xl font-extrabold">
              {user?.name?.charAt(0) || "؟"}
            </div>
            <div>
              <h1 className="text-xl font-extrabold">{user?.name}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {user?.role === "teacher"
                  ? "مدرّس"
                  : user?.role === "developer"
                    ? "مطور"
                    : `طالب — ${user?.grade || ""}`}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {serverError && (
              <div
                role="alert"
                className="text-sm bg-chem-deep/10 dark:bg-chem-deep/20 text-chem-deep dark:text-chem-light border border-chem-deep/20 dark:border-chem-deep/40 rounded-xl px-4 py-3 text-right"
              >
                {serverError}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-bold mb-1.5">
                الاسم
              </label>
              <div className="relative">
                <User size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (serverError) setServerError("");
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pr-11 pl-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-chem-light focus:border-chem-cta"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5">رقم الموبايل</label>
              <div className="relative">
                <Phone size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={user?.phone || ""}
                  disabled
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 pr-11 pl-4 py-3 text-sm outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={user?.email || ""}
                  disabled
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 pr-11 pl-4 py-3 text-sm outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {user?.role === "student" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold mb-1.5">الصف الدراسي</label>
                  <div className="relative">
                    <GraduationCap size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={user?.grade || ""}
                      disabled
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 pr-11 pl-4 py-3 text-sm outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1.5">المحافظة</label>
                  <div className="relative">
                    <MapPinned size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={user?.governorate || ""}
                      disabled
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 pr-11 pl-4 py-3 text-sm outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-chem-deep text-white font-extrabold rounded-xl py-3 hover:bg-chem-deep/90 hover:shadow-lg hover:shadow-chem-deep/30 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {saved && <Check size={18} />}
                {isSaving ? "جاري الحفظ..." : saved ? "اتحفظ بنجاح" : "حفظ التعديلات"}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl py-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                تسجيل الخروج
              </button>
            </div>
          </form>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
