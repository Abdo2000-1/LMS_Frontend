import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Crown, CheckCircle2, BookOpen, ArrowLeft, X } from "lucide-react";
import { Link } from "react-router-dom";

export default function MinaMouridWelcomeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-3xl border-2 border-amber-400/60 dark:border-amber-500/40 p-6 sm:p-8 shadow-2xl shadow-amber-500/20 text-center font-['Cairo',sans-serif]"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>

          {/* Decorative background lights */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Golden Crown Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}
            className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 ring-4 ring-amber-300/30"
          >
            <Crown size={40} className="drop-shadow-sm" />
          </motion.div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-300 text-xs font-black mb-3">
            <Sparkles size={14} className="text-amber-600 dark:text-amber-400 animate-pulse" />
            <span>كود الهدية الذهبي (MINAMOURID100%)</span>
          </div>

          {/* Main Title */}
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-2">
            مرحباً بك في منصة الأستاذ مينا موريد! 🎓
          </h2>

          <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-4">
            تم تفعيل الاشتراك الكامل والشامل (Full Access 100%)
          </p>

          {/* Detailed Message Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/70 to-cyan-50/70 dark:from-slate-800/80 dark:to-slate-800/40 border border-amber-200/80 dark:border-slate-700 text-right space-y-2 mb-6">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-black text-sm">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>جميع كورسات ومحاضرات الصف الثاني الثانوي مفتوحة بحسابك!</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-bold">
              أهلاً بك يا بطل في منصتنا التعليمية. تم فتح كافة الفيديوهات، الشروحات، مذكرات الـ PDF، والامتحانات التفاعلية الخاصة بمنهج الكيمياء للصف الثاني الثانوي مجاناً دون الحاجة لشراء أي كورس.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/courses?grade=الصف+الثاني+الثانوي"
              onClick={onClose}
              className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-sm shadow-lg shadow-amber-500/25 transition-all duration-300 active:scale-98 flex items-center justify-center gap-2"
            >
              <BookOpen size={18} />
              <span>تصفح كورساتك الآن</span>
              <ArrowLeft size={16} />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-sm transition-all duration-300 active:scale-98"
            >
              حسناً، فهمت
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
