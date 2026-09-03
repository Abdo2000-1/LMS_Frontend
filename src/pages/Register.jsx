import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Languages,
  ArrowLeft,
  Loader2,
  GraduationCap,
  Phone,
  MapPinned,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { GOVERNORATE_OPTIONS, STUDENT_GRADES } from "../lib/authService.js";

/* ── Inline SVG components for the chemistry right panel ── */

function MoleculeCluster() {
  return (
    <svg
      viewBox="0 0 400 500"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Molecule 1 – floating top-left */}
      <g className="animate-molecule-float" style={{ animationDelay: "0s" }}>
        <circle cx="100" cy="80" r="28" className="fill-chem-light/20" />
        <circle cx="100" cy="80" r="10" className="fill-chem-light" />
        <circle cx="145" cy="60" r="22" className="fill-chem-cta/20" />
        <circle cx="145" cy="60" r="8" className="fill-chem-cta" />
        <line x1="125" y1="72" x2="138" y2="64" className="stroke-chem-light/40" strokeWidth="2.5" />
        <circle cx="60" cy="65" r="18" className="fill-chem-deep/20" />
        <circle cx="60" cy="65" r="6" className="fill-chem-deep" />
        <line x1="78" y1="70" x2="94" y2="76" className="stroke-chem-light/40" strokeWidth="2.5" />
      </g>

      {/* Molecule 2 – floating center-right */}
      <g className="animate-molecule-float" style={{ animationDelay: "1.5s" }}>
        <circle cx="300" cy="160" r="32" className="fill-chem-light/15" />
        <circle cx="300" cy="160" r="12" className="fill-chem-light" />
        <circle cx="350" cy="140" r="24" className="fill-chem-cta/15" />
        <circle cx="350" cy="140" r="9" className="fill-chem-cta" />
        <line x1="325" y1="151" x2="342" y2="144" className="stroke-chem-light/40" strokeWidth="2.5" />
        <circle cx="270" cy="130" r="20" className="fill-chem-deep/15" />
        <circle cx="270" cy="130" r="7" className="fill-chem-deep" />
        <line x1="282" y1="138" x2="293" y2="147" className="stroke-chem-light/40" strokeWidth="2.5" />
        <circle cx="330" cy="190" r="16" className="fill-purple-400/15" />
        <circle cx="330" cy="190" r="6" className="fill-purple-400" />
        <line x1="308" y1="177" x2="318" y2="185" className="stroke-chem-light/40" strokeWidth="2.5" />
      </g>

      {/* Molecule 3 – bottom-left */}
      <g className="animate-molecule-float" style={{ animationDelay: "3s" }}>
        <circle cx="80" cy="280" r="26" className="fill-chem-cta/20" />
        <circle cx="80" cy="280" r="10" className="fill-chem-cta" />
        <circle cx="130" cy="260" r="20" className="fill-chem-light/20" />
        <circle cx="130" cy="260" r="7" className="fill-chem-light" />
        <line x1="105" y1="272" x2="122" y2="264" className="stroke-chem-cta/40" strokeWidth="2.5" />
        <circle cx="50" cy="310" r="14" className="fill-chem-deep/20" />
        <circle cx="50" cy="310" r="5" className="fill-chem-deep" />
        <line x1="64" y1="299" x2="73" y2="290" className="stroke-chem-cta/40" strokeWidth="2.5" />
      </g>

      {/* Molecule 4 – bottom-right */}
      <g className="animate-molecule-float" style={{ animationDelay: "4.5s" }}>
        <circle cx="280" cy="380" r="30" className="fill-chem-deep/20" />
        <circle cx="280" cy="380" r="11" className="fill-chem-deep" />
        <circle cx="330" cy="360" r="22" className="fill-chem-light/20" />
        <circle cx="330" cy="360" r="8" className="fill-chem-light" />
        <line x1="305" y1="372" x2="322" y2="364" className="stroke-chem-deep/40" strokeWidth="2.5" />
        <circle cx="250" cy="350" r="18" className="fill-chem-cta/20" />
        <circle cx="250" cy="350" r="6" className="fill-chem-cta" />
        <line x1="262" y1="358" x2="273" y2="367" className="stroke-chem-deep/40" strokeWidth="2.5" />
      </g>

      {/* Bond lines between molecules */}
      <line x1="115" y1="105" x2="135" y2="125" className="stroke-chem-light/10" strokeWidth="1.5" />
      <line x1="135" y1="125" x2="200" y2="150" className="stroke-chem-light/10" strokeWidth="1.5" />
      <line x1="200" y1="150" x2="280" y2="170" className="stroke-chem-light/10" strokeWidth="1.5" />
      <line x1="200" y1="150" x2="180" y2="220" className="stroke-chem-light/10" strokeWidth="1.5" />
      <line x1="180" y1="220" x2="160" y2="280" className="stroke-chem-cta/10" strokeWidth="1.5" />
      <line x1="200" y1="150" x2="250" y2="300" className="stroke-chem-light/10" strokeWidth="1.5" />
      <line x1="250" y1="300" x2="260" y2="350" className="stroke-chem-deep/10" strokeWidth="1.5" />

      {/* Hexagonal structure – benzene ring */}
      <g
        className="animate-molecule-float"
        style={{ animationDelay: "2s", transformOrigin: "200px 220px" }}
      >
        <polygon
          points="200,190 230,207 230,240 200,257 170,240 170,207"
          className="stroke-chem-light/20"
          strokeWidth="2"
          fill="none"
        />
        <circle cx="200" cy="223.5" r="4" className="fill-chem-light/30" />
        <circle cx="200" cy="190" r="6" className="fill-chem-cta/20" />
        <circle cx="200" cy="190" r="2.5" className="fill-chem-cta" />
        <circle cx="230" cy="207" r="5" className="fill-chem-light/20" />
        <circle cx="230" cy="207" r="2" className="fill-chem-light" />
        <circle cx="230" cy="240" r="5" className="fill-chem-deep/20" />
        <circle cx="230" cy="240" r="2" className="fill-chem-deep" />
        <circle cx="200" cy="257" r="5" className="fill-chem-cta/20" />
        <circle cx="200" cy="257" r="2" className="fill-chem-cta" />
        <circle cx="170" cy="240" r="5" className="fill-chem-light/20" />
        <circle cx="170" cy="240" r="2" className="fill-chem-light" />
        <circle cx="170" cy="207" r="5" className="fill-chem-deep/20" />
        <circle cx="170" cy="207" r="2" className="fill-chem-deep" />
      </g>

      {/* Small particles */}
      <circle cx="50" cy="50" r="3" className="fill-chem-light/30 animate-reaction-pulse" />
      <circle cx="350" cy="50" r="4" className="fill-chem-cta/30 animate-reaction-pulse" style={{ animationDelay: "1s" }} />
      <circle cx="50" cy="400" r="3" className="fill-chem-deep/30 animate-reaction-pulse" style={{ animationDelay: "2s" }} />
      <circle cx="370" cy="300" r="4" className="fill-chem-light/30 animate-reaction-pulse" style={{ animationDelay: "0.7s" }} />
      <circle cx="150" cy="450" r="3" className="fill-chem-cta/30 animate-reaction-pulse" style={{ animationDelay: "1.8s" }} />
      <circle cx="320" cy="450" r="3.5" className="fill-chem-deep/30 animate-reaction-pulse" style={{ animationDelay: "2.5s" }} />
    </svg>
  );
}

/* ── Floating particle background behind the right panel ── */

function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-reaction-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${4 + Math.random() * 8}px`,
            height: `${4 + Math.random() * 8}px`,
            background:
              i % 3 === 0
                ? "rgba(0, 168, 232, 0.25)"
                : i % 3 === 1
                  ? "rgba(0, 119, 182, 0.25)"
                  : "rgba(255, 107, 53, 0.25)",
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${3 + Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main component ── */

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    parentPhone: "",
    center: "",
    grade: STUDENT_GRADES[2],
    governorate: GOVERNORATE_OPTIONS[0],
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(values) {
    const errs = {};
    const phoneDigits = values.phone.replace(/\D/g, "");
    const parentPhoneDigits = (values.parentPhone || "").replace(/\D/g, "");

    if (!values.name.trim()) errs.name = "من فضلك اكتب اسمك بالكامل";
    else if (values.name.trim().length < 3) errs.name = "الاسم قصير جدًا";

    if (!values.email.trim()) errs.email = "من فضلك اكتب بريدك الإلكتروني";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      errs.email = "صيغة البريد الإلكتروني غير صحيحة";

    const egPhoneRegex = /^01[0125][0-9]{8}$/;

    if (!phoneDigits) {
      errs.phone = "من فضلك اكتب رقم الموبايل";
    } else if (!egPhoneRegex.test(phoneDigits)) {
      errs.phone = "رقم الموبايل يجب أن يكون رقم مصري صحيح (11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015)";
    }

    if (!parentPhoneDigits) {
      errs.parentPhone = "من فضلك اكتب رقم ولي الأمر";
    } else if (!egPhoneRegex.test(parentPhoneDigits)) {
      errs.parentPhone = "رقم ولي الأمر يجب أن يكون رقم مصري صحيح (11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015)";
    } else if (parentPhoneDigits === phoneDigits) {
      errs.parentPhone = "رقم ولي الأمر يجب أن يكون مختلفاً تماماً عن رقم هاتف الطالب";
    }

    if (!values.grade) errs.grade = "من فضلك اختار الصف الدراسي";
    if (!values.governorate) errs.governorate = "من فضلك اختار المحافظة";

    if (!values.password) errs.password = "من فضلك اختار كلمة مرور";
    else if (values.password.length < 8) errs.password = "كلمة المرور لازم تكون ٨ أحرف على الأقل";

    if (!values.confirmPassword) errs.confirmPassword = "من فضلك أكد كلمة المرور";
    else if (values.confirmPassword !== values.password)
      errs.confirmPassword = "كلمة المرور غير متطابقة";

    if (!values.acceptedTerms) errs.acceptedTerms = "لازم توافق على الشروط والأحكام عشان تكمل";

    return errs;
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    const nextValue = type === "checkbox" ? checked : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
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
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        parentPhone: form.parentPhone.trim(),
        center: form.center.trim(),
        grade: form.grade,
        governorate: form.governorate,
        password: form.password,
      });
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (err) {
      setServerError(err.message || "حصل خطأ أثناء إنشاء الحساب، حاول تاني.");
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Shared input classes ── */

  function inputClasses(fieldName) {
    const hasError = Boolean(errors[fieldName]);
    return `w-full rounded-xl border bg-white/10 dark:bg-slate-800/60 backdrop-blur pr-11 pl-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 ${
      hasError
        ? "border-chem-cta/60 focus:ring-chem-cta/40"
        : "border-white/20 dark:border-slate-700/60 focus:ring-chem-light/40 focus:border-chem-light"
    }`;
  }

  function selectClasses(fieldName) {
    const hasError = Boolean(errors[fieldName]);
    return `w-full rounded-xl border bg-white/10 dark:bg-slate-800/60 backdrop-blur pr-11 pl-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 ${
      hasError
        ? "border-chem-cta/60 focus:ring-chem-cta/40"
        : "border-white/20 dark:border-slate-700/60 focus:ring-chem-light/40 focus:border-chem-light"
    }`;
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col font-['Cairo',_sans-serif]">
      {/* ── Split layout parent ── */}
      <div className="flex flex-1 flex-col lg:flex-row min-h-screen">
        {/* ====== LEFT PANEL – Form ====== */}
        <div className="relative flex-1 flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-chem-deep/30 text-slate-100">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 sm:px-10 py-5 relative z-10">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-chem-light transition-colors duration-300"
            >
              <ArrowLeft size={16} className="rotate-180" />
              الرجوع للرئيسية
            </Link>
            <ThemeToggle />
          </div>

          {/* Form area */}
          <div className="flex-1 flex items-center justify-center px-4 pb-16 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full max-w-lg"
            >
              {/* Glassmorphism card */}
              <div className="rounded-3xl border border-white/10 dark:border-chem-light/15 bg-white/5 dark:bg-slate-900/50 backdrop-blur-2xl shadow-2xl shadow-chem-deep/20 p-8 sm:p-10">
                {/* Header */}
                <div className="flex flex-col items-center gap-2 mb-7 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-chem-light to-chem-deep text-white flex items-center justify-center shadow-lg shadow-chem-light/30 mb-2">
                    <Languages size={28} />
                  </div>
                  <p className="text-sm text-slate-400">
                    ابدأ رحلتك الدراسية وسجّل بياناتك كاملة
                  </p>
                </div>

                {/* Server error */}
                {serverError && (
                  <div
                    role="alert"
                    className="mb-5 text-sm bg-chem-cta/10 text-chem-cta border border-chem-cta/30 rounded-xl px-4 py-3 text-right"
                  >
                    {serverError}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-bold mb-1.5 text-slate-300">
                      الاسم بالكامل <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="مثال: محمد أحمد"
                        aria-invalid={Boolean(errors.name)}
                        className={inputClasses("name")}
                      />
                    </div>
                    {errors.name && (
                      <p className="mt-1.5 text-xs text-chem-cta">{errors.name}</p>
                    )}
                  </div>

                  {/* Phone + Parent Phone row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-bold mb-1.5 text-slate-300">
                        رقم الموبايل <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="01XXXXXXXXX"
                          aria-invalid={Boolean(errors.phone)}
                          className={inputClasses("phone")}
                        />
                      </div>
                      {errors.phone && (
                        <p className="mt-1.5 text-xs text-chem-cta">{errors.phone}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="parentPhone" className="block text-sm font-bold mb-1.5 text-slate-300">
                        رقم ولي الأمر <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          id="parentPhone"
                          name="parentPhone"
                          type="tel"
                          value={form.parentPhone}
                          onChange={handleChange}
                          placeholder="01XXXXXXXXX"
                          aria-invalid={Boolean(errors.parentPhone)}
                          className={inputClasses("parentPhone")}
                        />
                      </div>
                      {errors.parentPhone && (
                        <p className="mt-1.5 text-xs text-chem-cta">{errors.parentPhone}</p>
                      )}
                    </div>
                  </div>

                  {/* Email + Center row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="email" className="block text-sm font-bold mb-1.5 text-slate-300">
                        البريد الإلكتروني <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="example@gmail.com"
                          aria-invalid={Boolean(errors.email)}
                          className={inputClasses("email")}
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1.5 text-xs text-chem-cta">{errors.email}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="center" className="block text-sm font-bold mb-1.5 text-slate-300">
                        السنتر (اختياري)
                      </label>
                      <div className="relative">
                        <GraduationCap size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          id="center"
                          name="center"
                          type="text"
                          value={form.center}
                          onChange={handleChange}
                          placeholder="اسم السنتر المقيد به إن وجد"
                          className={inputClasses("center")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grade + Governorate row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="grade" className="block text-sm font-bold mb-1.5 text-slate-300">
                        الصف الدراسي <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <GraduationCap size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          id="grade"
                          name="grade"
                          value={form.grade}
                          onChange={handleChange}
                          className={selectClasses("grade")}
                        >
                          {STUDENT_GRADES.map((g) => (
                            <option key={g} value={g} className="bg-slate-800 text-slate-100">
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.grade && (
                        <p className="mt-1.5 text-xs text-chem-cta">{errors.grade}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="governorate" className="block text-sm font-bold mb-1.5 text-slate-300">
                        المحافظة <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPinned size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          id="governorate"
                          name="governorate"
                          value={form.governorate}
                          onChange={handleChange}
                          className={selectClasses("governorate")}
                        >
                          {GOVERNORATE_OPTIONS.map((g) => (
                            <option key={g} value={g} className="bg-slate-800 text-slate-100">
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.governorate && (
                        <p className="mt-1.5 text-xs text-chem-cta">{errors.governorate}</p>
                      )}
                    </div>
                  </div>

                  {/* Password + Confirm row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="password" className="block text-sm font-bold mb-1.5 text-slate-300">
                        كلمة المرور <span className="text-red-500">*</span>
                      </label>                  {errors.governorate && (
                        <p className="mt-1.5 text-xs text-chem-cta">{errors.governorate}</p>
                      )}
                    </div>
                  </div>

                  {/* Password + Confirm row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="password" className="block text-sm font-bold mb-1.5 text-slate-300">
                        كلمة المرور
                      </label>
                      <div className="relative">
                        <Lock size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={form.password}
                          onChange={handleChange}
                          placeholder="٨ أحرف أو أكثر"
                          aria-invalid={Boolean(errors.password)}
                          className={`${inputClasses("password")} pl-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-chem-light transition-colors duration-200"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1.5 text-xs text-chem-cta">{errors.password}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-bold mb-1.5 text-slate-300">
                        تأكيد كلمة المرور
                      </label>
                      <div className="relative">
                        <Lock size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={form.confirmPassword}
                          onChange={handleChange}
                          placeholder="••••••••"
                          aria-invalid={Boolean(errors.confirmPassword)}
                          className={inputClasses("confirmPassword")}
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1.5 text-xs text-chem-cta">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  {/* Terms checkbox */}
                  <div>
                    <label className="flex items-start gap-2.5 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        name="acceptedTerms"
                        checked={form.acceptedTerms}
                        onChange={handleChange}
                        className="mt-1 w-4 h-4 rounded border-slate-500/60 bg-white/10 text-chem-light focus:ring-chem-light/40"
                      />
                      <span>موافق على الشروط والأحكام وسياسة الخصوصية الخاصة بالمنصة</span>
                    </label>
                    {errors.acceptedTerms && (
                      <p className="mt-1.5 text-xs text-chem-cta">{errors.acceptedTerms}</p>
                    )}
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-l from-chem-cta to-chem-cta/80 text-white font-extrabold rounded-xl py-3.5 hover:from-chem-cta hover:to-chem-cta/90 hover:shadow-lg hover:shadow-chem-cta/30 transition-all duration-300 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                    {isSubmitting ? "بيتم إنشاء الحساب..." : "إنشاء الحساب"}
                  </button>
                </form>

                {/* Login link */}
                <p className="text-center text-sm text-slate-400 mt-7">
                  عندك حساب بالفعل؟{" "}
                  <Link to="/login" className="text-chem-light font-bold hover:underline hover:text-chem-cta transition-colors duration-200">
                    سجّل الدخول
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ====== RIGHT PANEL – Chemistry visual ====== */}
        <div className="relative hidden lg:flex flex-1 flex-col items-center justify-center bg-gradient-to-bl from-slate-950 via-chem-deep/20 to-slate-900 overflow-hidden">
          <ParticleBackground />

          {/* Decorative gradient overlays */}
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-chem-light/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-chem-cta/10 blur-[120px]" />
          <div className="absolute top-[40%] right-[30%] w-[30%] h-[30%] rounded-full bg-chem-deep/15 blur-[100px]" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-10 max-w-lg">
            <div className="w-full max-w-sm mb-8">
              <MoleculeCluster />
            </div>

            <h2 className="text-3xl font-extrabold text-white mb-3">
              الكيميا<span className="text-chem-light">وية</span>
            </h2>
            <p className="text-slate-300 leading-relaxed">
              انضم إلى منصتنا التعليمية وابدأ رحلة التعلم التفاعلي. 
              دروس مشوقة، تجارب افتراضية، ومحتوى علمي مبسط.
            </p>

            {/* Feature badges */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {["دروس تفاعلية", "تجارب افتراضية", "محتوى مبسط", "متابعة تقدم"].map(
                (feat, i) => (
                  <span
                    key={feat}
                    className="px-4 py-1.5 rounded-full text-xs font-bold border backdrop-blur-sm"
                    style={{
                      borderColor: i % 2 === 0 ? "rgba(0,168,232,0.3)" : "rgba(255,107,53,0.3)",
                      background: i % 2 === 0 ? "rgba(0,168,232,0.08)" : "rgba(255,107,53,0.08)",
                      color: i % 2 === 0 ? "#00A8E8" : "#FF6B35",
                    }}
                  >
                    {feat}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}