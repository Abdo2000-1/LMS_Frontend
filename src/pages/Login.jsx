import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Lock, Eye, EyeOff, Languages, ArrowLeft, Loader2, CheckCircle2, FlaskConical, Atom, Beaker, Dna } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

const molecules = [
  { Icon: FlaskConical, top: "15%", left: "10%", size: 28, delay: 0, duration: 7 },
  { Icon: Atom, top: "30%", left: "75%", size: 36, delay: 1.2, duration: 8 },
  { Icon: Beaker, top: "55%", left: "15%", size: 32, delay: 0.6, duration: 6 },
  { Icon: Dna, top: "70%", left: "80%", size: 30, delay: 1.8, duration: 7 },
  { Icon: FlaskConical, top: "85%", left: "60%", size: 24, delay: 0.3, duration: 5 },
  { Icon: Atom, top: "10%", left: "55%", size: 20, delay: 2.1, duration: 9 },
  { Icon: Beaker, top: "45%", left: "40%", size: 26, delay: 0.9, duration: 6.5 },
];

const floatingBubbles = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  size: Math.random() * 60 + 20,
  delay: Math.random() * 5,
  duration: Math.random() * 4 + 4,
}));

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Login() {
  const { login, getLandingRouteByRole, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const registeredFromSignup = Boolean(location.state?.registered);

  const [form, setForm] = useState({ phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTarget, setSuccessTarget] = useState("");
  const [signupToastVisible, setSignupToastVisible] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !successTarget) {
      navigate(getLandingRouteByRole(user?.role), { replace: true });
    }
  }, [getLandingRouteByRole, isAuthenticated, navigate, successTarget, user?.role]);

  useEffect(() => {
    if (!registeredFromSignup) return undefined;
    setSignupToastVisible(true);
    const timer = window.setTimeout(() => setSignupToastVisible(false), 2600);
    return () => window.clearTimeout(timer);
  }, [registeredFromSignup]);

  function validate(values) {
    const errs = {};
    const digits = values.phone.replace(/\D/g, "");

    if (!digits) errs.phone = "من فضلك اكتب رقم الموبايل";
    else if (digits.length < 11) errs.phone = "رقم الموبايل غير صحيح";

    if (!values.password) errs.password = "من فضلك اكتب كلمة المرور";
    else if (values.password.length < 8) errs.password = "كلمة المرور لازم تكون ٨ أحرف على الأقل";

    return errs;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (serverError) setServerError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setServerError("");
    try {
      const userObj = await login({ phone: form.phone, password: form.password });
      const roleHome = getLandingRouteByRole(userObj?.role);
      const fromPath = location.state?.from?.pathname;
      const target = fromPath && fromPath !== "/login" ? fromPath : roleHome;
      setSuccessTarget(target);
      window.setTimeout(() => navigate(target, { replace: true }), 1300);
    } catch (err) {
      const errMsg = err.message || "";
      if (errMsg.includes("Network Error") || errMsg.includes("Network")) {
        setServerError("عذراً، يتعذر الاتصال بالسيرفر حالياً. تأكد من تشغيل السيرفر المحلي.");
      } else {
        setServerError(errMsg || "حصل خطأ أثناء تسجيل الدخول، تأكد من رقم الموبايل وكلمة المرور.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-chem-bg text-slate-900 font-['Cairo',_sans-serif] flex flex-col relative overflow-hidden"
    >
      {signupToastVisible && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="fixed left-1/2 top-6 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-3xl border border-emerald-200 bg-white/95 px-5 py-4 text-center shadow-2xl shadow-emerald-900/10 backdrop-blur-xl"
        >
          <p className="text-lg font-extrabold text-emerald-700">تم التسجيل بنجاح</p>
          <p className="mt-1 text-sm text-slate-600">سجّل الدخول الآن للدخول إلى المنصة مباشرة.</p>
        </motion.div>
      )}

      {/* ===== Success Popup ===== */}
      {successTarget && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-chem-deep/50 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20, rotateZ: -5 }}
            animate={{ scale: 1, y: 0, rotateZ: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="rounded-3xl bg-white/95 backdrop-blur-xl px-12 py-10 text-center shadow-2xl shadow-chem-deep/20 border border-chem-light/20"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-chem-light to-chem-deep flex items-center justify-center shadow-lg shadow-chem-light/30">
              <CheckCircle2 className="text-white" size={48} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">تم تسجيل الدخول بنجاح</h2>
            <p className="mt-1 text-sm text-slate-500">جاهزين نبدأ رحلة الكيمياء</p>
          </motion.div>
        </motion.div>
      )}

      {/* ===== Split Layout ===== */}
      <div className="flex flex-1">
        {/* ===== LEFT: Chemistry Art / Animation ===== */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-chem-deep via-chem-deep/90 to-chem-light/60 items-center justify-center overflow-hidden">
          {/* Background bubbles */}
          {floatingBubbles.map((b) => (
            <div
              key={b.id}
              className="absolute rounded-full bg-white/5 animate-reaction-pulse"
              style={{
                top: b.top,
                left: b.left,
                width: b.size,
                height: b.size,
                animationDelay: `${b.delay}s`,
                animationDuration: `${b.duration}s`,
              }}
            />
          ))}

          {/* Floating molecules */}
          {molecules.map((m, i) => (
            <motion.div
              key={i}
              className="absolute text-white/20 animate-molecule-float"
              style={{
                top: m.top,
                left: m.left,
                animationDelay: `${m.delay}s`,
                animationDuration: `${m.duration}s`,
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: m.delay, duration: 1 }}
            >
              <m.Icon size={m.size} />
            </motion.div>
          ))}

          {/* Central chemistry illustration */}
          <motion.div
            className="relative z-10 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <div className="relative inline-flex">
              <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-2xl">
                <FlaskConical size={64} className="text-white/90" />
              </div>
              <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-chem-cta/80 flex items-center justify-center animate-molecule-float">
                <Atom size={20} className="text-white" />
              </div>
              <div className="absolute -bottom-2 -left-4 w-10 h-10 rounded-full bg-chem-light/70 flex items-center justify-center animate-molecule-float" style={{ animationDelay: "1.5s" }}>
                <Beaker size={18} className="text-white" />
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-white">مرحباً بك في</h2>
            <p className="text-4xl font-black text-chem-cta mt-1 tracking-tight">منصة الكيمياء</p>
            <p className="mt-3 text-white/60 text-sm max-w-xs mx-auto leading-relaxed">
              ابدأ رحلتك في عالم العلوم — تسجيل الدخول يفتح لك أبواب المعرفة
            </p>
          </motion.div>

          {/* Bottom gradient overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-chem-deep to-transparent" />
        </div>

        {/* ===== RIGHT: Glassmorphism Form ===== */}
        <div className="flex-1 flex items-center justify-center relative bg-gradient-to-br from-chem-bg via-chem-bg-alt to-chem-bg dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 sm:px-10 py-5 z-10">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-chem-deep dark:hover:text-chem-light transition-colors duration-300"
            >
              <ArrowLeft size={16} className="rotate-180" />
              الرجوع للرئيسية
            </Link>
            <ThemeToggle />
          </div>

          {/* Decorative background elements */}
          <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-chem-light/5 dark:bg-chem-light/5 blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-chem-cta/5 blur-3xl" />

          {/* Small floating molecules for mobile */}
          <div className="lg:hidden absolute top-24 right-8 text-chem-light/10 animate-molecule-float">
            <FlaskConical size={24} />
          </div>
          <div className="lg:hidden absolute bottom-32 left-8 text-chem-cta/10 animate-molecule-float" style={{ animationDelay: "2s" }}>
            <Atom size={20} />
          </div>

          {/* Form card */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-10 w-full max-w-md mx-4"
          >
            <motion.div
              variants={itemVariants}
              className="relative backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 rounded-3xl shadow-2xl shadow-chem-deep/10 dark:shadow-black/40 border border-white/30 dark:border-white/5 p-8 sm:p-10"
            >
              {/* Glass reflection */}
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-chem-light/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-chem-cta/10 blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="flex flex-col items-center gap-2 mb-7 text-center relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-chem-deep to-chem-light text-white flex items-center justify-center shadow-lg shadow-chem-deep/30 mb-2">
                  <Languages size={28} />
                </div>
                <h1 className="text-2xl font-extrabold">تسجيل الدخول</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  تسجيل الدخول يتم برقم الهاتف وكلمة المرور فقط
                </p>
              </div>

              {/* Server Error */}
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="mb-5 text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40 rounded-xl px-4 py-3 text-right"
                >
                  {serverError}
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-5 relative z-10">
                <div>
                  <label htmlFor="phone" className="block text-sm font-bold mb-1.5">
                    رقم الموبايل
                  </label>
                  <div className="relative">
                    <Phone
                      size={18}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="01XXXXXXXXX"
                      aria-invalid={Boolean(errors.phone)}
                      className={`w-full rounded-xl border bg-white/60 dark:bg-slate-800/60 pr-11 pl-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 backdrop-blur-sm ${
                        errors.phone
                          ? "border-red-400 focus:ring-red-300"
                          : "border-slate-200 dark:border-slate-700 focus:ring-chem-light/40 focus:border-chem-light"
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-bold mb-1.5">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      aria-invalid={Boolean(errors.password)}
                      className={`w-full rounded-xl border bg-white/60 dark:bg-slate-800/60 pr-11 pl-11 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 backdrop-blur-sm ${
                        errors.password
                          ? "border-red-400 focus:ring-red-300"
                          : "border-slate-200 dark:border-slate-700 focus:ring-chem-light/40 focus:border-chem-light"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {errors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-l from-chem-deep to-chem-light text-white font-extrabold rounded-xl py-3.5 hover:shadow-lg hover:shadow-chem-deep/30 hover:brightness-110 transition-all duration-300 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                  {isSubmitting ? "بيتم الدخول..." : "تسجيل الدخول"}
                </button>
              </form>

              {/* Register link */}
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-7 relative z-10">
                لسه معملتش حساب؟{" "}
                <Link
                  to="/register"
                  className="text-chem-deep dark:text-chem-light font-bold hover:underline"
                >
                  اعمل حساب جديد
                </Link>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
