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
  Building2,
  Globe2,
  Users,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { GOVERNORATE_OPTIONS, STUDENT_GRADES } from "../lib/authService.js";

function MoleculeCluster() {
  return (
    <svg viewBox="0 0 400 500" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      <g className="animate-molecule-float" style={{ animationDelay: "1.5s" }}>
        <circle cx="300" cy="160" r="32" className="fill-chem-light/15" />
        <circle cx="300" cy="160" r="12" className="fill-chem-light" />
        <circle cx="350" cy="140" r="24" className="fill-chem-cta/15" />
        <circle cx="350" cy="140" r="9" className="fill-chem-cta" />
        <line x1="325" y1="151" x2="342" y2="144" className="stroke-chem-light/40" strokeWidth="2.5" />
        <circle cx="270" cy="130" r="20" className="fill-chem-deep/15" />
        <circle cx="270" cy="130" r="7" className="fill-chem-deep" />
        <line x1="282" y1="138" x2="293" y2="147" className="stroke-chem-light/40" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-reaction-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${4 + Math.random() * 6}px`,
            height: `${4 + Math.random() * 6}px`,
            background: i % 2 === 0 ? "rgba(0, 168, 232, 0.2)" : "rgba(255, 107, 53, 0.2)",
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${3 + Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    secondName: "",
    lastName: "",
    email: "",
    phone: "",
    parentPhone: "",
    attendanceType: "online", // "online" | "center"
    centerName: "",
    gender: "ذكر", // "ذكر" | "أنثى"
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

    // 1. Name validation
    if (!values.firstName.trim()) errs.firstName = "اكتب الاسم الأول";
    else if (values.firstName.trim().length < 2) errs.firstName = "الاسم قصير";

    if (!values.secondName.trim()) errs.secondName = "اكتب اسم الأب";
    else if (values.secondName.trim().length < 2) errs.secondName = "اسم الأب قصير";

    if (!values.lastName.trim()) errs.lastName = "اكتب اللقب / العائلة";
    else if (values.lastName.trim().length < 2) errs.lastName = "اللقب قصير";

    // 2. Email validation
    if (!values.email.trim()) errs.email = "من فضلك اكتب بريدك الإلكتروني";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      errs.email = "صيغة البريد الإلكتروني غير صحيحة";

    // 3. Phone validation
    const egPhoneRegex = /^01[0125][0-9]{8}$/;
    const phoneDigits = values.phone.replace(/\D/g, "");
    const parentPhoneDigits = (values.parentPhone || "").replace(/\D/g, "");

    if (!phoneDigits) {
      errs.phone = "اكتب رقم الهاتف الخاص بك";
    } else if (!egPhoneRegex.test(phoneDigits)) {
      errs.phone = "يجب أن يتكون من 11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015";
    }

    // 4. Parent phone validation (mandatory & distinct)
    if (!parentPhoneDigits) {
      errs.parentPhone = "رقم ولي الأمر إجباري";
    } else if (!egPhoneRegex.test(parentPhoneDigits)) {
      errs.parentPhone = "رقم ولي الأمر يجب أن يتكون من 11 رقم يبدأ بـ 010/011/012/015";
    } else if (parentPhoneDigits === phoneDigits) {
      errs.parentPhone = "رقم ولي الأمر لا يمكن أن يكون نفس رقم هاتفك الخاص";
    }

    // 5. Attendance & Center validation
    if (!values.attendanceType) {
      errs.attendanceType = "اختر نظام الحضور (أونلاين أو سنتر)";
    } else if (values.attendanceType === "center" && !values.centerName.trim()) {
      errs.centerName = "من فضلك اكتب اسم السنتر الذي تحضر به";
    }

    // 6. Gender validation
    if (!values.gender) {
      errs.gender = "اختر الجنس (ذكر أو أنثى)";
    }

    // 7. Grade & Governorate
    if (!values.grade) errs.grade = "اختر الصف الدراسي";
    if (!values.governorate) errs.governorate = "اختر المحافظة";

    // 8. Password
    if (!values.password) errs.password = "اكتب كلمة المرور";
    else if (values.password.length < 8) errs.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";

    if (!values.confirmPassword) errs.confirmPassword = "أكد كلمة المرور";
    else if (values.confirmPassword !== values.password)
      errs.confirmPassword = "كلمة المرور غير متطابقة";

    if (!values.acceptedTerms) errs.acceptedTerms = "يجب الموافقة على الشروط للمتابعة";

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
    if (Object.keys(validationErrors).length > 0) {
      // Scroll to top of form if errors
      window.scrollTo({ top: 150, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    setServerError("");
    try {
      const fullName = `${form.firstName.trim()} ${form.secondName.trim()} ${form.lastName.trim()}`;
      const finalCenter = form.attendanceType === "online" ? "أونلاين" : form.centerName.trim();

      await register({
        name: fullName,
        email: form.email.trim(),
        phone: form.phone.trim(),
        parentPhone: form.parentPhone.trim(),
        center: finalCenter,
        gender: form.gender,
        grade: form.grade,
        governorate: form.governorate,
        password: form.password,
      });

      navigate("/login", { replace: true, state: { registered: true } });
    } catch (err) {
      setServerError(err.message || "حدث خطأ أثناء التسجيل، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-['Cairo',_sans-serif]">
      {/* Top Bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur z-20">
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
        {/* Left Form Container */}
        <div className="w-full lg:w-[60%] xl:w-[55%] p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="max-w-2xl w-full mx-auto space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-[#0077B6]/20 text-cyan-400 px-3 py-1 rounded-full text-xs font-black mb-3">
                <Languages size={14} /> منصة دكتور مينا موريد التعليمية
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white">إنشاء حساب طالب جديد</h1>
              <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1">
                املأ بياناتك بدقة لتفعيل حسابك ومتابعة درجاتك وتقاريرك أولاً بأول
              </p>
            </div>

            {serverError && (
              <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-bold">
                ⚠️ {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* 1. Name Section: 3-Parts */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-300">
                  الاسم ثلاثي <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="الاسم الأول *"
                      className={`w-full rounded-xl border bg-slate-800/90 px-4 py-3 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
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
                      className={`w-full rounded-xl border bg-slate-800/90 px-4 py-3 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
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
                      placeholder="اسم العائلة (اللقب) *"
                      className={`w-full rounded-xl border bg-slate-800/90 px-4 py-3 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                        errors.lastName ? "border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"
                      }`}
                    />
                    {errors.lastName && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.lastName}</p>}
                  </div>
                </div>
              </div>

              {/* 2. Gender Selection (Mandatory) */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-300">
                  الجنس <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, gender: "ذكر" }));
                      if (errors.gender) setErrors((prev) => ({ ...prev, gender: undefined }));
                    }}
                    className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition ${
                      form.gender === "ذكر"
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-2 ring-cyan-500/30 shadow-sm"
                        : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <span>👨 ذكر (طالب)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, gender: "أنثى" }));
                      if (errors.gender) setErrors((prev) => ({ ...prev, gender: undefined }));
                    }}
                    className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition ${
                      form.gender === "أنثى"
                        ? "bg-pink-500/20 border-pink-400 text-pink-300 ring-2 ring-pink-500/30 shadow-sm"
                        : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <span>👩 أنثى (طالبة)</span>
                  </button>
                </div>
                {errors.gender && <p className="text-[11px] text-red-400 font-bold">{errors.gender}</p>}
              </div>

              {/* 3. Phones Row (Student Phone + Mandatory Parent Phone) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>رقم هاتف الطالب *</span>
                    <span className="text-[10px] text-slate-400">11 رقم</span>
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
                      className={`w-full rounded-xl border bg-slate-800/90 pr-11 pl-4 py-3 text-xs font-bold font-mono text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
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
                      className={`w-full rounded-xl border bg-slate-800/90 pr-11 pl-4 py-3 text-xs font-bold font-mono text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                        errors.parentPhone ? "border-red-500 focus:ring-red-500/20" : "border-amber-500/70 focus:border-amber-400 focus:ring-amber-500/20"
                      }`}
                    />
                  </div>
                  {errors.parentPhone && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.parentPhone}</p>}
                </div>
              </div>

              {/* 4. Attendance Type & Mandatory Center Selection */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/80">
                <label className="block text-xs font-black text-slate-300">
                  نظام الحضور والدراسة <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, attendanceType: "online", centerName: "" }));
                      if (errors.attendanceType || errors.centerName) {
                        setErrors((prev) => ({ ...prev, attendanceType: undefined, centerName: undefined }));
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-xs font-bold text-right transition flex items-start gap-3 ${
                      form.attendanceType === "online"
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/20"
                        : "bg-slate-900/60 border-slate-700 text-slate-400 hover:bg-slate-900"
                    }`}
                  >
                    <Globe2 size={20} className="shrink-0 mt-0.5 text-cyan-400" />
                    <div>
                      <p className="font-black text-white">أونلاين (عبر المنصة فقط)</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">لا أحضر في سنتر خارجي</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, attendanceType: "center" }));
                      if (errors.attendanceType) {
                        setErrors((prev) => ({ ...prev, attendanceType: undefined }));
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-xs font-bold text-right transition flex items-start gap-3 ${
                      form.attendanceType === "center"
                        ? "bg-amber-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-500/20"
                        : "bg-slate-900/60 border-slate-700 text-slate-400 hover:bg-slate-900"
                    }`}
                  >
                    <Building2 size={20} className="shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <p className="font-black text-white">حضور في سنتر</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">احضر مع دكتور مينا في سنتر</p>
                    </div>
                  </button>
                </div>

                {/* If Center is chosen: Must specify Center Name */}
                {form.attendanceType === "center" && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-black text-amber-300 mb-1">
                      اسم السنتر المقيد به <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="centerName"
                      value={form.centerName}
                      onChange={handleChange}
                      placeholder="اكتب اسم السنتر بالتحديد (مثال: سنتر الأوائل / سنتر رويال...)"
                      className={`w-full rounded-xl border bg-slate-900 px-4 py-2.5 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                        errors.centerName ? "border-red-500 focus:ring-red-500/20" : "border-amber-400/60 focus:border-amber-400 focus:ring-amber-500/20"
                      }`}
                    />
                    {errors.centerName && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.centerName}</p>}
                  </div>
                )}
              </div>

              {/* 5. Email */}
              <div>
                <label className="block text-xs font-black text-slate-300 mb-1.5">
                  البريد الإلكتروني <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="example@email.com"
                    className={`w-full rounded-xl border bg-slate-800/90 pr-11 pl-4 py-3 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                      errors.email ? "border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"
                    }`}
                  />
                </div>
                {errors.email && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.email}</p>}
              </div>

              {/* 6. Grade & Governorate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-300 mb-1.5">
                    الصف الدراسي <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="grade"
                    value={form.grade}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-xs font-bold text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  >
                    {STUDENT_GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 mb-1.5">
                    المحافظة <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="governorate"
                    value={form.governorate}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-xs font-bold text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  >
                    {GOVERNORATE_OPTIONS.map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 7. Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-300 mb-1.5">
                    كلمة المرور *
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="8 أحرف على الأقل"
                      className={`w-full rounded-xl border bg-slate-800/90 pr-11 pl-10 py-3 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
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
                  <label className="block text-xs font-black text-slate-300 mb-1.5">
                    تأكيد كلمة المرور *
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="أعد كتابة كلمة المرور"
                      className={`w-full rounded-xl border bg-slate-800/90 pr-11 pl-4 py-3 text-xs font-bold text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                        errors.confirmPassword ? "border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"
                      }`}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-[11px] text-red-400 font-bold mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="acceptedTerms"
                  checked={form.acceptedTerms}
                  onChange={handleChange}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20"
                />
                <span className="text-xs text-slate-400 font-bold leading-relaxed">
                  أوافق على جميع الشروط والأحكام وسياسة الاستخدام الخاصة بمنصة دكتور مينا موريد.
                </span>
              </label>
              {errors.acceptedTerms && <p className="text-[11px] text-red-400 font-bold">{errors.acceptedTerms}</p>}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white text-sm font-black hover:opacity-95 transition shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>جارٍ إنشاء الحساب...</span>
                  </>
                ) : (
                  <span>إنشاء الحساب الآن ✓</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Art Panel */}
        <div className="hidden lg:flex lg:w-[40%] xl:w-[45%] relative bg-gradient-to-br from-[#003f6b] via-[#0077B6] to-cyan-700 items-center justify-center p-12 overflow-hidden text-center text-white">
          <ParticleBackground />
          <div className="relative z-10 space-y-6 max-w-sm">
            <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mx-auto shadow-2xl">
              <GraduationCap size={48} className="text-cyan-200" />
            </div>
            <h2 className="text-3xl font-black leading-tight">منصة الكيمياء الأولى للثانوية العامة</h2>
            <p className="text-xs text-white/80 font-bold leading-relaxed">
              شرح مبسط، متابعة دورية مع ولي الأمر، امتحانات إلكترونية بنماذج إجابات فورية وتقارير مستمرة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
