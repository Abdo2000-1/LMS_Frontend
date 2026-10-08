import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Languages,
  ArrowLeft,
  ArrowRight,
  Loader2,
  GraduationCap,
  Phone,
  Building2,
  Globe2,
  CheckCircle2,
  Send,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  QrCode,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { GOVERNORATE_OPTIONS, STUDENT_GRADES, normalizeDigits, normalizePhone } from "../lib/authService.js";

function MoleculeCluster() {
  return (
    <svg viewBox="0 0 400 500" className="w-full h-full opacity-40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="animate-molecule-float" style={{ animationDelay: "0s" }}>
        <circle cx="100" cy="80" r="28" className="fill-cyan-400/20" />
        <circle cx="100" cy="80" r="10" className="fill-cyan-300" />
        <circle cx="145" cy="60" r="22" className="fill-blue-500/20" />
        <circle cx="145" cy="60" r="8" className="fill-blue-400" />
        <line x1="125" y1="72" x2="138" y2="64" className="stroke-cyan-300/40" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${4 + Math.random() * 6}px`,
            height: `${4 + Math.random() * 6}px`,
            background: i % 2 === 0 ? "rgba(6, 182, 212, 0.25)" : "rgba(59, 130, 246, 0.25)",
            animationDuration: `${3 + Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
}

const STEPS = [
  { id: 1, title: "البيانات الشخصية", subtitle: "الاسم والنوع والصف الدراسي", icon: User, percent: 25 },
  { id: 2, title: "أرقام التواصل", subtitle: "رقم الطالب ورقم ولي الأمر", icon: Phone, percent: 50 },
  { id: 3, title: "نظام الدراسة", subtitle: "أونلاين أم في السنتر", icon: Building2, percent: 75 },
  { id: 4, title: "بيانات الدخول", subtitle: "الإيميل وكلمة المرور لتأكيد الحساب", icon: Lock, percent: 100 },
];

export default function Register() {
  const { initTelegramRegister, confirmTelegramRegister, getTelegramStatus } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  // Form Fields
  const [form, setForm] = useState({
    firstName: "",
    secondName: "",
    lastName: "",
    gender: "ذكر",
    grade: STUDENT_GRADES[2],
    governorate: GOVERNORATE_OPTIONS[0],
    phone: "",
    parentPhone: "",
    attendanceType: "online",
    centerName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
    telegramPhoneOrUsername: "",
  });

  const [errors, setErrors] = useState({});

  // Telegram Session State
  const [telegramSession, setTelegramSession] = useState(null); // { sessionToken, telegramBotUsername, telegramBotUrl, devCode, expiresAt }
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [autoVerifyChecking, setAutoVerifyChecking] = useState(false);

  // ─── Step Validations ────────────────────────────────────────────────

  function validateStep1() {
    const errs = {};
    const arabicRegex = /^[\u0600-\u06FF\s]+$/;

    if (!form.firstName.trim()) errs.firstName = "اكتب الاسم الأول";
    else if (form.firstName.trim().length < 2) errs.firstName = "الاسم قصيرة جداً";
    else if (!arabicRegex.test(form.firstName.trim())) errs.firstName = "اكتب باللغة العربية فقط";

    if (!form.secondName.trim()) errs.secondName = "اكتب اسم الأب (الثاني)";
    else if (form.secondName.trim().length < 2) errs.secondName = "الاسم قصير جداً";
    else if (!arabicRegex.test(form.secondName.trim())) errs.secondName = "اكتب باللغة العربية فقط";

    if (!form.lastName.trim()) errs.lastName = "اكتب اللقب / العائلة";
    else if (form.lastName.trim().length < 2) errs.lastName = "اللقب قصير جداً";
    else if (!arabicRegex.test(form.lastName.trim())) errs.lastName = "اكتب باللغة العربية فقط";

    if (!form.gender) errs.gender = "اختر الجنس";
    if (!form.grade) errs.grade = "اختر الصف الدراسي";
    if (!form.governorate) errs.governorate = "اختر المحافظة";

    return errs;
  }

  function validateStep2() {
    const errs = {};
    const egPhoneRegex = /^01[0125][0-9]{8}$/;
    const phoneDigits = normalizePhone(form.phone);
    const parentPhoneDigits = normalizePhone(form.parentPhone);

    if (!phoneDigits) {
      errs.phone = "اكتب رقم هاتف الطالب";
    } else if (!egPhoneRegex.test(phoneDigits)) {
      errs.phone = "يجب أن يتكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015";
    }

    if (!parentPhoneDigits) {
      errs.parentPhone = "رقم ولي الأمر إجباري";
    } else if (!egPhoneRegex.test(parentPhoneDigits)) {
      errs.parentPhone = "رقم ولي الأمر يجب أن يكون 11 رقماً ويبدأ بـ 010/011/012/015";
    } else if (parentPhoneDigits === phoneDigits) {
      errs.parentPhone = "رقم ولي الأمر يجب أن يكون مختلفاً تماماً عن رقم هاتفك الخاص!";
    }

    return errs;
  }

  function validateStep3() {
    const errs = {};
    if (!form.attendanceType) {
      errs.attendanceType = "اختر نظام الحضور";
    } else if (form.attendanceType === "center" && !form.centerName.trim()) {
      errs.centerName = "اكتب اسم السنتر الذي تحضر به بالتحديد";
    }
    return errs;
  }

  function validateStep4() {
    const errs = {};
    if (!form.email.trim()) {
      errs.email = "اكتب البريد الإلكتروني الخاص بك";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "صيغة البريد الإلكتروني غير صحيحة";
    }

    if (!form.password) {
      errs.password = "اكتب كلمة المرور";
    } else if (form.password.length < 8) {
      errs.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    }

    if (!form.confirmPassword) {
      errs.confirmPassword = "أكد كلمة المرور";
    } else if (form.confirmPassword !== form.password) {
      errs.confirmPassword = "كلمة المرور غير متطابقة";
    }

    if (!form.acceptedTerms) {
      errs.acceptedTerms = "يجب الموافقة على الشروط والأحكام للمتابعة";
    }

    return errs;
  }

  function handleNextStep() {
    setServerError("");
    let errs = {};
    if (currentStep === 1) errs = validateStep1();
    else if (currentStep === 2) errs = validateStep2();
    else if (currentStep === 3) errs = validateStep3();

    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  }

  function handlePrevStep() {
    setServerError("");
    setErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    let nextValue = type === "checkbox" ? checked : value;
    if (name === "phone" || name === "parentPhone") {
      nextValue = normalizeDigits(value);
    }
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (serverError) setServerError("");
  }

  // Submit Step 4: Direct Registration
  async function handleRegister(e) {
    if (e) e.preventDefault();
    const errs = validateStep4();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    setServerError("");

    try {
      const fullName = `${form.firstName.trim()} ${form.secondName.trim()} ${form.lastName.trim()}`;
      const finalCenter = form.attendanceType === "online" ? "أونلاين" : form.centerName.trim();

      await register({
        name: fullName,
        email: form.email.trim(),
        phone: normalizePhone(form.phone),
        parentPhone: normalizePhone(form.parentPhone),
        center: finalCenter,
        grade: form.grade,
        governorate: form.governorate,
        gender: form.gender,
        password: form.password.trim(),
      });

      navigate("/login", { replace: true, state: { registered: true, phone: normalizePhone(form.phone) } });
    } catch (err) {
      setServerError(err.message || "حدث خطأ أثناء إكمال التسجيل.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Submit Step 5: Confirm Telegram Code
  async function handleConfirmCode(e, codeToSubmit) {
    if (e) e.preventDefault();
    const targetCode = codeToSubmit || verificationCode;

    if (!telegramSession?.sessionToken) {
      setServerError("جلسة التحقق غير صالحة، يرجى إعادة محاولة التسجيل.");
      return;
    }

    if (!targetCode || targetCode.length < 6) {
      setErrors({ verificationCode: "رمز التحقق يجب أن يكون 6 أرقام" });
      return;
    }

    setIsVerifyingCode(true);
    setServerError("");

    try {
      await confirmTelegramRegister({
        sessionToken: telegramSession.sessionToken,
        code: targetCode.trim(),
      });

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(err.message || "رمز التحقق غير صحيح أو انتهت صلاحيته.");
    } finally {
      setIsVerifyingCode(false);
    }
  }

  // Polling for Telegram Bot auto-acceptance
  useEffect(() => {
    if (currentStep !== 5 || !telegramSession?.sessionToken) return;

    const interval = setInterval(async () => {
      try {
        setAutoVerifyChecking(true);
        const res = await getTelegramStatus(telegramSession.sessionToken);
        if (res.isVerified) {
          clearInterval(interval);
          handleConfirmCode(null, telegramSession.devCode || "AUTOVERIFIED");
        }
      } catch {
        // silent catch during polling
      } finally {
        setAutoVerifyChecking(false);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [currentStep, telegramSession?.sessionToken]);

  const activeProgress = STEPS.find((s) => s.id === currentStep)?.percent || 25;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',_sans-serif]">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 backdrop-blur z-20">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft size={16} />
          <span>لديك حساب بالفعل؟ تسجيل الدخول</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Main Content Area */}
        <div className="w-full lg:w-[60%] xl:w-[58%] p-5 sm:p-8 lg:p-12 flex flex-col justify-center">
          <div className="max-w-2xl w-full mx-auto space-y-6">
            {/* Header Badge & Title */}
            <div>
              <span className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-xs font-black mb-3">
                <Sparkles size={14} /> منظومة التسجيل الذكية والمباشرة
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white">إنشاء حساب طالب جديد</h1>
              <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1">
                منصة دكتور مينا موريد - الكيمياء للثانوية العامة
              </p>
            </div>

            {/* Step Progress Indicator Bar */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-cyan-400 flex items-center gap-1.5">
                  الخطوة {currentStep} من 4: {STEPS[currentStep - 1].title}
                </span>
                <span className="bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full font-mono text-[11px]">
                  {activeProgress}% مكتمل
                </span>
              </div>

              {/* Progress Line */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${activeProgress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>

              {/* Steps Pills */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {STEPS.map((s) => {
                  const Icon = s.icon;
                  const isDone = s.id < currentStep;
                  const isCurrent = s.id === currentStep;
                  return (
                    <div
                      key={s.id}
                      className={`flex flex-col items-center p-2 rounded-xl border text-[11px] font-black transition ${
                        isCurrent
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/20"
                          : isDone
                          ? "bg-slate-800/80 border-slate-700 text-emerald-400"
                          : "bg-slate-900/40 border-slate-800 text-slate-500"
                      }`}
                    >
                      <Icon size={14} className="mb-0.5" />
                      <span className="hidden sm:inline text-[10px] truncate max-w-full">{s.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Server Error Alert */}
            {serverError && (
              <div className="p-4 rounded-2xl bg-red-950/70 border border-red-800 text-red-300 text-xs font-bold flex items-start gap-2.5 animate-shake">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
                <div className="leading-relaxed">{serverError}</div>
              </div>
            )}

            {/* Multi-Step Forms */}
            <AnimatePresence mode="wait">
              {/* STEP 1: Personal Info */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
                    <label className="block text-xs font-black text-slate-300">
                      الاسم ثلاثي باللغة العربية <span className="text-red-400">*</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <input
                          type="text"
                          name="firstName"
                          value={form.firstName}
                          onChange={handleChange}
                          placeholder="الاسم الأول (بالعربي) *"
                          className={`w-full rounded-xl border bg-slate-900 px-4 py-3 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                            errors.firstName ? "border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"
                          }`}
                        />
                        {errors.firstName && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.firstName}</p>}
                      </div>

                      <div>
                        <input
                          type="text"
                          name="secondName"
                          value={form.secondName}
                          onChange={handleChange}
                          placeholder="اسم الأب (الثاني) *"
                          className={`w-full rounded-xl border bg-slate-900 px-4 py-3 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                            errors.secondName ? "border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"
                          }`}
                        />
                        {errors.secondName && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.secondName}</p>}
                      </div>

                      <div>
                        <input
                          type="text"
                          name="lastName"
                          value={form.lastName}
                          onChange={handleChange}
                          placeholder="اللقب / العائلة *"
                          className={`w-full rounded-xl border bg-slate-900 px-4 py-3 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                            errors.lastName ? "border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"
                          }`}
                        />
                        {errors.lastName && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.lastName}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Gender Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-300">
                      الجنس <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, gender: "ذكر" }))}
                        className={`p-3.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition ${
                          form.gender === "ذكر"
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-2 ring-cyan-500/30"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        <span>👨 ذكر (طالب)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, gender: "أنثى" }))}
                        className={`p-3.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition ${
                          form.gender === "أنثى"
                            ? "bg-pink-500/20 border-pink-400 text-pink-300 ring-2 ring-pink-500/30"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        <span>👩 أنثى (طالبة)</span>
                      </button>
                    </div>
                  </div>

                  {/* Grade & Governorate */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-300 mb-1.5">الصف الدراسي *</label>
                      <select
                        name="grade"
                        value={form.grade}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-bold text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                      >
                        {STUDENT_GRADES.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-300 mb-1.5">المحافظة *</label>
                      <select
                        name="governorate"
                        value={form.governorate}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-bold text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                      >
                        {GOVERNORATE_OPTIONS.map((gov) => (
                          <option key={gov} value={gov}>
                            {gov}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Step 1 Actions */}
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-black hover:opacity-95 transition shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2"
                  >
                    <span>التالي: أرقام التواصل</span>
                    <ArrowLeft size={16} />
                  </button>
                </motion.div>
              )}

              {/* STEP 2: Phones & Verification numbers */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs font-bold flex items-start gap-2">
                    <ShieldCheck size={18} className="shrink-0 text-amber-400 mt-0.5" />
                    <span>
                      تنبيه هام: يجب أن يكون رقم ولي الأمر مختلفاً تماماً عن رقم هاتف الطالب لضمان إرسال التقارير الدورية والإشعارات الخاصة بالنتائج.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>رقم هاتف الطالب *</span>
                        <span className="text-[10px] text-slate-400">11 رقماً</span>
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="tel"
                          dir="ltr"
                          name="phone"
                          value={form.phone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                            setForm((prev) => ({ ...prev, phone: val }));
                            if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                          }}
                          placeholder="01XXXXXXXXX"
                          className={`w-full rounded-xl border bg-slate-900 pr-11 pl-4 py-3 text-xs font-bold font-mono text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                            errors.phone ? "border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"
                          }`}
                        />
                      </div>
                      {errors.phone && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>رقم هاتف ولي الأمر *</span>
                        <span className="text-[10px] text-amber-400 font-bold">إلزامي ومختلف</span>
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-400" />
                        <input
                          type="tel"
                          dir="ltr"
                          name="parentPhone"
                          value={form.parentPhone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                            setForm((prev) => ({ ...prev, parentPhone: val }));
                            if (errors.parentPhone) setErrors((prev) => ({ ...prev, parentPhone: undefined }));
                          }}
                          placeholder="01XXXXXXXXX"
                          className={`w-full rounded-xl border bg-slate-900 pr-11 pl-4 py-3 text-xs font-bold font-mono text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                            errors.parentPhone ? "border-red-500 focus:ring-red-500/20" : "border-amber-500/70 focus:border-amber-400 focus:ring-amber-500/20"
                          }`}
                        />
                      </div>
                      {errors.parentPhone && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.parentPhone}</p>}
                    </div>
                  </div>

                  {/* Step 2 Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-5 py-3.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 text-xs font-bold hover:bg-slate-800 transition"
                    >
                      السابق
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-black hover:opacity-95 transition shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2"
                    >
                      <span>التالي: نظام الدراسة</span>
                      <ArrowLeft size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Study Mode / Center */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <label className="block text-xs font-black text-slate-300">
                      اختر نظام الحضور والدراسة <span className="text-red-400">*</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, attendanceType: "online", centerName: "" }))}
                        className={`p-4 rounded-xl border text-xs font-bold text-right transition flex items-start gap-3 ${
                          form.attendanceType === "online"
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/20"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        <Globe2 size={22} className="shrink-0 text-cyan-400 mt-0.5" />
                        <div>
                          <p className="font-black text-white text-sm">أونلاين (عبر المنصة)</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">دراسة عبر المنصة فقط دون حضور سنتر خارجي</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, attendanceType: "center" }))}
                        className={`p-4 rounded-xl border text-xs font-bold text-right transition flex items-start gap-3 ${
                          form.attendanceType === "center"
                            ? "bg-amber-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-500/20"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        <Building2 size={22} className="shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <p className="font-black text-white text-sm">حضور في سنتر</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">احضر مع دكتور مينا موريد في سنتر خارجي</p>
                        </div>
                      </button>
                    </div>

                    {form.attendanceType === "center" && (
                      <div className="pt-3">
                        <label className="block text-[11px] font-black text-amber-300 mb-1.5">
                          اسم السنتر المقيد به بالتحديد <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="centerName"
                          value={form.centerName}
                          onChange={handleChange}
                          placeholder="اكتب اسم السنتر (مثال: سنتر رويال / سنتر الأوائل...)"
                          className={`w-full rounded-xl border bg-slate-950 px-4 py-3 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                            errors.centerName ? "border-red-500 focus:ring-red-500/20" : "border-amber-500/60 focus:border-amber-400 focus:ring-amber-500/20"
                          }`}
                        />
                        {errors.centerName && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.centerName}</p>}
                      </div>
                    )}
                  </div>

                  {/* Step 3 Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-5 py-3.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 text-xs font-bold hover:bg-slate-800 transition"
                    >
                      السابق
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-black hover:opacity-95 transition shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2"
                    >
                      <span>التالي: بيانات الدخول</span>
                      <ArrowLeft size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Login Credentials & Terms */}
              {currentStep === 4 && (
                <motion.form
                  key="step4"
                  onSubmit={handleRegister}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-black text-slate-300 mb-1.5">البريد الإلكتروني *</label>
                    <div className="relative">
                      <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="student@example.com"
                        className={`w-full rounded-xl border bg-slate-900 pr-11 pl-4 py-3 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                          errors.email ? "border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"
                        }`}
                      />
                    </div>
                    {errors.email && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.email}</p>}
                  </div>

                  {/* Password & Confirm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-300 mb-1.5">كلمة المرور *</label>
                      <div className="relative">
                        <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={form.password}
                          onChange={handleChange}
                          placeholder="8 أحرف على الأقل"
                          className={`w-full rounded-xl border bg-slate-900 pr-11 pl-10 py-3 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                            errors.password ? "border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {errors.password && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.password}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-300 mb-1.5">تأكيد كلمة المرور *</label>
                      <div className="relative">
                        <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={form.confirmPassword}
                          onChange={handleChange}
                          placeholder="أعد كتابة كلمة المرور"
                          className={`w-full rounded-xl border bg-slate-900 pr-11 pl-4 py-3 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                            errors.confirmPassword ? "border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"
                          }`}
                        />
                      </div>
                      {errors.confirmPassword && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.confirmPassword}</p>}
                    </div>
                  </div>

                  {/* Terms */}
                  <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <input
                      type="checkbox"
                      name="acceptedTerms"
                      checked={form.acceptedTerms}
                      onChange={handleChange}
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20"
                    />
                    <span className="text-xs text-slate-300 font-bold leading-relaxed">
                      أوافق على جميع الشروط والأحكام وسياسة الاستخدام الخاصة بمنصة دكتور مينا موريد.
                    </span>
                  </label>
                  {errors.acceptedTerms && <p className="text-[11px] text-red-400 font-bold">{errors.acceptedTerms}</p>}

                  {/* Step 4 Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-5 py-3.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 text-xs font-bold hover:bg-slate-800 transition"
                    >
                      السابق
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-600 text-white text-xs font-black hover:opacity-95 transition shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>جاري إنشاء الحساب...</span>
                        </>
                      ) : (
                        <>
                          <span>إنشاء الحساب والتسجيل الآن</span>
                          <CheckCircle2 size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Art Panel */}
        <div className="hidden lg:flex lg:w-[40%] xl:w-[42%] relative bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-950 items-center justify-center p-12 overflow-hidden text-center text-white border-r border-slate-800">
          <ParticleBackground />
          <MoleculeCluster />
          <div className="relative z-10 space-y-6 max-w-sm">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 backdrop-blur border border-cyan-500/20 flex items-center justify-center mx-auto shadow-2xl text-cyan-400">
              <GraduationCap size={40} />
            </div>
            <h2 className="text-2xl font-black leading-tight text-white">منصة الكيمياء الأولى للثانوية العامة</h2>
            <p className="text-xs text-slate-300 font-bold leading-relaxed">
              تفعيل فوري وآمن عبر تيليجرام، امتحانات تفاعلية، تقارير درجات دورية تصل لولي الأمر، وشرح متكامل لمنهج الكيمياء مع دكتور مينا موريد.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
