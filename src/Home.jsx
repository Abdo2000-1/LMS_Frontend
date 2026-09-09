import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Star,
  Atom,
  Beaker,
  FlaskConical,
  TestTube,
  BookOpen,
  Award,
  MessageCircle,
  ClipboardCheck,
  Calendar,
  GraduationCap,
  Menu as MenuIcon,
  X as XIcon,
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
  Dna,
  Microscope,
  Radiation,
  Sparkles,
  Eraser,
} from "lucide-react";
import ThemeToggle from "./components/ThemeToggle.jsx";
import Footer from "./components/Footer.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { subscribeCourses, subscribeExams } from "./services/courseService.js";
import logoImage from "../images/1.jpeg";
import teacherHeroImage from "../images/2.png";
const BRAND_NAME = "Mena Mourid";
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const features = [
  {
    icon: Atom,
    title: "شرح تفاعلي للمفاهيم الكيميائية",
    desc: "نفهم الكيمياء صح بعيد عن الحفظ، من خلال أمثلة منظمة ورسومات توضيحية تخلي الدرس أسهل.",
  },
  {
    icon: Beaker,
    title: "تجارب عملية واضحة",
    desc: "شرح قريب من المعمل يخليك تشوف التفاعل وتفهم فكرته قبل ما تحفظ نتيجته.",
  },
  {
    icon: ClipboardCheck,
    title: "متابعة مستمرة",
    desc: "تقييمات وتدريبات تساعدك تعرف مستواك وتراجع النقط الضعيفة أول بأول.",
  },
  {
    icon: Award,
    title: "امتحانات بنفس النظام",
    desc: "أسئلة منظمة وتدريبات تقيس الفهم وتجهزك لشكل الامتحان الحقيقي.",
  },
  {
    icon: FlaskConical,
    title: "فيديوهات مركزة",
    desc: "كل فيديو له هدف واضح، من الفكرة الأساسية لحد تطبيقات الامتحان.",
  },
  {
    icon: MessageCircle,
    title: "تواصل ودعم",
    desc: "متابعة للأسئلة والاستفسارات عشان ما تسيبش نقطة واقفة في طريقك.",
  },
];
const navLinks = [
  { label: "الرئيسية", href: "#" },
  { label: "الكورسات", href: "#courses" },
  { label: "المميزات", href: "#features" },
];
const chemistryParticles = [
  { Icon: Atom, x: "9%", y: "17%", size: 28, delay: 0, dur: 7, opacity: 0.16 },
  { Icon: Dna, x: "83%", y: "19%", size: 36, delay: 0.5, dur: 9, opacity: 0.13 },
  { Icon: Beaker, x: "76%", y: "60%", size: 32, delay: 1, dur: 8, opacity: 0.13 },
  { Icon: Radiation, x: "20%", y: "72%", size: 24, delay: 1.5, dur: 6, opacity: 0.1 },
  { Icon: FlaskConical, x: "50%", y: "10%", size: 30, delay: 0.8, dur: 10, opacity: 0.12 },
  { Icon: TestTube, x: "91%", y: "80%", size: 26, delay: 2, dur: 7.5, opacity: 0.13 },
  { Icon: Microscope, x: "5%", y: "50%", size: 34, delay: 1.2, dur: 8.5, opacity: 0.1 },
  { Icon: Sparkles, x: "39%", y: "85%", size: 22, delay: 0.3, dur: 6.5, opacity: 0.12 },
];
function getCardsPerPage() {
  if (typeof window === "undefined") return 4;
  if (window.innerWidth < 640) return 1;
  if (window.innerWidth < 1024) return 2;
  return 4;
}
function formatPrice(price) {
  const value = Number(price || 0);
  return value === 0 ? "كورس مجاني" : `${value} جنيه`;
}
function getFinalPrice(course) {
  const base = Number(course?.price || 0);
  const discount = Number(course?.discountPercent || 0);
  if (discount <= 0) return base;
  return Math.max(0, Math.round(base * (1 - discount / 100)));
}
export default function Home() {
  const { isAuthenticated, user, getLandingRouteByRole } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const [liveCourses, setLiveCourses] = useState(() => {
    try {
      const cached = sessionStorage.getItem("lms_courses_cache");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(getCardsPerPage);
  const [coursePage, setCoursePage] = useState(0);
  const [liveExams, setLiveExams] = useState([]);
  const [examPage, setExamPage] = useState(0);
  const dashboardPath = getLandingRouteByRole(user?.role);
  const isTeacherUser = user?.role === "teacher" || user?.role === "developer";
  useEffect(() => {
    const unsub = subscribeCourses((newCourses) => {
      setLiveCourses(newCourses || []);
      try {
        sessionStorage.setItem("lms_courses_cache", JSON.stringify(newCourses || []));
      } catch {}
    });
    return unsub;
  }, []);
  useEffect(() => {
    const unsub = subscribeExams(setLiveExams);
    return unsub;
  }, []);
  useEffect(() => {
    function handleScroll() {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(maxScroll <= 0 ? 0 : Math.min(100, (window.scrollY / maxScroll) * 100));
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);
  useEffect(() => {
    function handleResize() {
      setCardsPerPage(getCardsPerPage());
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  useEffect(() => {
    if (searchOpen) {
      window.setTimeout(() => searchInputRef.current?.focus(), 80);
    }
  }, [searchOpen]);
  const visibleCourses = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return liveCourses
      .filter((course) => !course.isStandalone)
      .filter((course) => {
        if (!normalized) return true;
        return [course.title, course.description, course.grade].some((value) =>
          String(value || "").toLowerCase().includes(normalized)
        );
      });
  }, [liveCourses, searchTerm]);
  const pageCount = Math.max(1, Math.ceil(visibleCourses.length / cardsPerPage));
  const currentPage = Math.min(coursePage, pageCount - 1);
  const pagedCourses = visibleCourses.slice(currentPage * cardsPerPage, currentPage * cardsPerPage + cardsPerPage);
  const examPageCount = Math.max(1, Math.ceil(liveExams.length / cardsPerPage));
  const currentExamPage = Math.min(examPage, examPageCount - 1);
  const pagedExams = liveExams.slice(currentExamPage * cardsPerPage, currentExamPage * cardsPerPage + cardsPerPage);
  useEffect(() => {
    setCoursePage(0);
  }, [searchTerm, cardsPerPage]);
  function scrollToSection(href) {
    const sectionId = href === "#" ? "" : href.replace(/^#/, "");
    navigate("/", { replace: false });
    setMenuOpen(false);
    window.setTimeout(() => {
      if (!sectionId) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }
  function openSearch() {
    setSearchOpen(true);
    scrollToSection("#courses");
  }
  function goToCoursePage(direction) {
    setCoursePage((page) => {
      if (direction === "next") return page >= pageCount - 1 ? 0 : page + 1;
      return page <= 0 ? pageCount - 1 : page - 1;
    });
  }
  function goToExamPage(direction) {
    setExamPage((page) => {
      if (direction === "next") return page >= examPageCount - 1 ? 0 : page + 1;
      return page <= 0 ? examPageCount - 1 : page - 1;
    });
  }
  return (
    <div dir="rtl" className="min-h-screen">
      <div className="min-h-screen bg-chem-bg text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-['Cairo',_sans-serif] transition-colors duration-500 selection:bg-chem-light/30 selection:text-slate-900">
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          {chemistryParticles.map((p, i) => (
            <motion.div
              key={i}
              className="absolute text-chem-light"
              style={{ left: p.x, top: p.y }}
              animate={{
                y: [0, -30, 0, 20, 0],
                x: [0, 15, -10, 5, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: p.dur,
                repeat: Infinity,
                ease: "easeInOut",
                delay: p.delay,
              }}
            >
              <p.Icon size={p.size} opacity={p.opacity} strokeWidth={1.2} />
            </motion.div>
          ))}
        </div>
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-3">
          <nav className="relative w-[96%] max-w-[1500px] bg-chem-deep/60 dark:bg-slate-950/60 backdrop-blur-2xl rounded-2xl border border-white/20 dark:border-chem-light/20 shadow-xl shadow-chem-deep/20 dark:shadow-chem-light/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 transition-all duration-500" aria-label="القائمة الرئيسية">
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                aria-label="بحث في الكورسات"
                title="بحث"
                onClick={openSearch}
                className="group flex items-center justify-center w-10 h-10 rounded-full text-white/85 hover:bg-white/10 hover:text-white transition-all duration-300"
              >
                <Search size={18} className="group-hover:scale-110 transition-transform duration-300" />
              </button>
              {isAuthenticated ? (
                <Link
                  to={dashboardPath}
                  className="inline-flex items-center gap-2 bg-chem-deep text-white rounded-full px-5 py-2 text-sm font-bold shadow-sm hover:bg-chem-light hover:shadow-lg hover:shadow-chem-light/30 transition-all duration-300 active:scale-95"
                >
                  <LayoutDashboard size={16} />
                  لوحتي
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="border border-white/55 text-white rounded-full px-5 py-2 text-sm font-bold hover:bg-white/10 hover:border-white transition-all duration-300 active:scale-95"
                  >
                    تسجيل الدخول
                  </Link>
                  <Link
                    to="/register"
                    className="bg-chem-cta text-white rounded-full px-5 py-2 text-sm font-bold shadow-sm hover:bg-chem-cta/90 hover:shadow-lg hover:shadow-chem-cta/30 transition-all duration-300 active:scale-95"
                  >
                    حساب جديد
                  </Link>
                </>
              )}
            </div>
            <button
              type="button"
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              onClick={() => setMenuOpen((open) => !open)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full text-white/85 hover:bg-white/10 hover:text-white transition-colors duration-300"
            >
              {menuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
            </button>
            <div className="hidden lg:flex items-center gap-7">
              {navLinks.map((l) => (
                <button
                  key={l.label}
                  type="button"
                  onClick={() => scrollToSection(l.href)}
                  className="relative text-sm font-bold text-white/85 hover:text-white transition-colors duration-300 after:content-[''] after:absolute after:-bottom-1 after:right-0 after:h-0.5 after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full"
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                to="/"
                className="flex items-center gap-2 text-xl sm:text-2xl font-extrabold text-white tracking-normal transition-colors duration-500 drop-shadow-md"
              >
                <span>{BRAND_NAME}</span>
                <img src={logoImage} alt="Mena Mourid" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/30" />
              </Link>
            </div>
            <div className="absolute bottom-0 right-4 left-4 h-1 overflow-hidden rounded-full bg-white/20">
              <span
                className="block h-full rounded-full bg-chem-cta transition-[width] duration-150"
                style={{ width: `${scrollProgress}%` }}
                aria-hidden="true"
              />
            </div>
          </nav>
          {menuOpen && (
            <div className="absolute top-[72px] right-4 left-4 md:hidden rounded-2xl border border-white/20 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl shadow-xl p-3">
              <div className="flex flex-col gap-1">
                {navLinks.map((l) => (
                  <button
                    key={l.label}
                    type="button"
                    onClick={() => scrollToSection(l.href)}
                    className="px-3 py-2 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-chem-light/10 hover:text-chem-light transition-colors duration-200 text-right"
                  >
                    {l.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={openSearch}
                  className="px-3 py-2 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-chem-light/10 hover:text-chem-light transition-colors duration-200 text-right"
                >
                  بحث في الكورسات
                </button>
              </div>
            </div>
          )}
        </header>
        <main>
          <section className="relative overflow-hidden bg-gradient-to-br from-chem-deep via-chem-light/80 to-chem-bg dark:from-slate-950 dark:via-chem-deep/40 dark:to-slate-950 text-white transition-colors duration-500">
            <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background:radial-gradient(circle_at_20%_20%,white,transparent_42%)]" aria-hidden="true" />
            <motion.div
              initial="hidden"
              animate="show"
              variants={stagger}
              className="max-w-7xl mx-auto px-6 sm:px-10 pt-32 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative min-h-[690px]"
            >
              <motion.div
                variants={fadeUp}
                className="order-2 lg:order-1 text-center lg:text-right flex flex-col items-center lg:items-end gap-5"
              >
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-bold text-white/90 border border-white/10">
                  <Beaker size={16} />
                  منصة كيمياء تفاعلية
                </div>
                <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight text-white">
                  منصة الدكتور مينا موريد
                </h1>
                <p className="text-2xl sm:text-4xl font-extrabold leading-tight text-chem-cta">
                  كيمياء من غير وجع دماغ
                </p>
                <p className="text-lg sm:text-xl text-white/84 max-w-xl leading-relaxed">
                  تجارب عملية، متابعة مستمرة.. وتقفيل المادة من أول مرة!
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <Link
                    to={isAuthenticated ? dashboardPath : "/register"}
                    className="group bg-chem-cta text-white font-extrabold px-8 py-3 rounded-xl shadow-lg shadow-chem-cta/20 hover:bg-chem-cta/90 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-chem-cta/30 transition-all duration-300 active:translate-y-0 active:scale-95 inline-flex items-center gap-2"
                  >
                    {isAuthenticated ? "افتح لوحتك" : "ابدأ دلوقتي"}
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => scrollToSection("#courses")}
                    className="inline-flex items-center gap-2 border border-white/45 text-white font-extrabold px-8 py-3 rounded-xl hover:bg-white/10 transition-all duration-300 active:scale-95"
                  >
                    <BookOpen size={18} />
                    شوف الكورسات
                  </button>
                </div>
              </motion.div>
              <motion.div variants={fadeUp} className="order-1 lg:order-2 relative flex justify-center">
                <div className="relative w-[290px] h-[290px] sm:w-[430px] sm:h-[430px] lg:w-[500px] lg:h-[500px] flex items-center justify-center">
                  <motion.div
                    className="absolute inset-4 rounded-full border border-white/25"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                    aria-hidden="true"
                  />
                  <motion.div
                    className="absolute inset-10 rounded-full border border-chem-cta/30"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                    aria-hidden="true"
                  />
                  {[
                    { Icon: Atom, cls: "top-4 right-8 text-white", delay: 0 },
                    { Icon: FlaskConical, cls: "bottom-12 right-2 text-chem-cta", delay: 0.4 },
                    { Icon: TestTube, cls: "top-16 left-2 text-white", delay: 0.8 },
                    { Icon: Dna, cls: "bottom-8 left-10 text-chem-cta", delay: 1.2 },
                    { Icon: Sparkles, cls: "top-1/2 -left-3 text-white", delay: 1.6 },
                  ].map(({ Icon, cls, delay }, index) => (
                    <motion.div
                      key={index}
                      className={`absolute ${cls} drop-shadow-lg`}
                      animate={{ y: [0, -12, 0], scale: [1, 1.08, 1] }}
                      transition={{ duration: 4 + index * 0.35, repeat: Infinity, ease: "easeInOut", delay }}
                      aria-hidden="true"
                    >
                      <Icon size={index === 4 ? 34 : 46} strokeWidth={1.4} />
                    </motion.div>
                  ))}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative w-[260px] h-[260px] sm:w-[390px] sm:h-[390px] lg:w-[460px] lg:h-[460px] rounded-full bg-chem-light/20 shadow-2xl shadow-chem-light/30 overflow-visible"
                  >
                    <img
                      src={teacherHeroImage}
                      alt="الدكتور مينا موريد مدرس الكيمياء"
                      className="absolute inset-0 h-full w-full object-contain drop-shadow-2xl"
                    />
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </section>
          <section id="courses" className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 py-20" aria-labelledby="courses-title">
            <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
              <div className="inline-flex items-center gap-2 bg-chem-cta/10 text-chem-cta font-extrabold px-4 py-1.5 rounded-full text-xs border border-chem-cta/20">
                <GraduationCap size={16} />
                <span>المراحل الدراسية والكورسات لعام 2026/2027</span>
              </div>
              <h2 id="courses-title" className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white">
                اختر صفك الدراسي
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-bold">
                حدد مرحلتك الدراسية للوصول مباشرة إلى الكورسات والمحاضرات الخاصة بك
              </p>
            </div>

            {/* 3 Main Grade Cards */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
            >
              {[
                {
                  grade: "الصف الأول الثانوي",
                  shortName: "أولى ثانوي",
                  subtitle: "كيمياء 1 ثانوي",
                  description: "تأسيس شامل ومتين في مبادئ الكيمياء، الجدول الدوري، والتفاعلات الكيميائية بطرق تفاعلية مبسطة.",
                  icon: Atom,
                  gradient: "from-sky-500 to-cyan-600",
                  bgLight: "bg-sky-50 dark:bg-sky-950/30",
                  border: "border-sky-200 dark:border-sky-800",
                  textColor: "text-sky-600 dark:text-cyan-400",
                  buttonBg: "bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700",
                  count: liveCourses.filter((c) => !c.isStandalone && String(c.grade || "").includes("الأول")).length,
                },
                {
                  grade: "الصف الثاني الثانوي",
                  shortName: "تانية ثانوي",
                  subtitle: "كيمياء 2 ثانوي",
                  description: "شرح معمق للمنهج وحل تدريبات مكثفة على بنية الذرة والروابط الكيميائية تؤهلك مباشرة للثانوية العامة.",
                  icon: FlaskConical,
                  gradient: "from-[#FF6B35] to-orange-600",
                  bgLight: "bg-orange-50 dark:bg-orange-950/30",
                  border: "border-orange-200 dark:border-orange-800",
                  textColor: "text-[#FF6B35] dark:text-orange-400",
                  buttonBg: "bg-gradient-to-r from-[#FF6B35] to-orange-600 hover:from-[#f05e26] hover:to-orange-700",
                  count: liveCourses.filter((c) => !c.isStandalone && String(c.grade || "").includes("الثاني")).length,
                },
                {
                  grade: "الصف الثالث الثانوي",
                  shortName: "تالتة ثانوي",
                  subtitle: "دفعة التقفيل والدرجة النهائية",
                  description: "الرحلة الكاملة لتقفيل كيمياء الثانوية العامة: أقوى شرح، مراجعات أسبوعية، وبنك أسئلة النظام الحديث.",
                  icon: Sparkles,
                  gradient: "from-[#0077B6] to-indigo-600",
                  bgLight: "bg-blue-50 dark:bg-blue-950/30",
                  border: "border-blue-200 dark:border-blue-800",
                  textColor: "text-[#0077B6] dark:text-cyan-300",
                  buttonBg: "bg-gradient-to-r from-[#0077B6] to-indigo-600 hover:from-[#005f92] hover:to-indigo-700",
                  count: liveCourses.filter((c) => !c.isStandalone && String(c.grade || "").includes("الثالث")).length,
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={idx}
                    variants={fadeUp}
                    whileHover={{ y: -8 }}
                    className="relative group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-7 sm:p-8 shadow-sm hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 flex flex-col justify-between overflow-hidden text-right"
                  >
                    {/* Top decoration glow */}
                    <div className={`absolute top-0 right-0 left-0 h-2 bg-gradient-to-r ${item.gradient}`} />

                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div className={`w-14 h-14 rounded-2xl ${item.bgLight} ${item.textColor} flex items-center justify-center border ${item.border} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                          <Icon size={28} />
                        </div>
                        <span className={`text-xs font-black px-3 py-1 rounded-full ${item.bgLight} ${item.textColor} border ${item.border}`}>
                          {item.shortName}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 block mb-1">
                          {item.subtitle}
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-[#0077B6] dark:group-hover:text-cyan-400 transition-colors">
                          {item.grade}
                        </h3>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-bold min-h-14">
                        {item.description}
                      </p>

                      <div className="pt-3 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                        <span>المحتوى التعليمي المتاح:</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {item.count > 0 ? `${item.count} كورس متاح` : "متاح بالكامل"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-6 mt-4">
                      <Link
                        to={`/courses?grade=${encodeURIComponent(item.grade)}`}
                        className={`w-full py-3.5 px-6 rounded-2xl text-white font-extrabold text-sm shadow-md hover:shadow-xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${item.buttonBg}`}
                      >
                        <span>استعراض كورسات {item.shortName}</span>
                        <ArrowLeft size={16} />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Bottom link to view all */}
            <div className="mt-12 text-center">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 text-sm font-black text-slate-600 dark:text-slate-300 hover:text-chem-cta dark:hover:text-cyan-400 transition-colors py-2 px-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-chem-cta bg-white/60 dark:bg-slate-900/60 backdrop-blur"
              >
                <span>أو استعرض جميع الكورسات والمحاضرات العامة في المنصة</span>
                <ArrowLeft size={15} />
              </Link>
            </div>
          </section>

          {liveExams.length > 0 && (
            <section id="exams" className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pb-20" aria-labelledby="exams-title">
              <div className="mb-8 flex flex-col sm:flex-row-reverse items-center sm:items-start justify-between gap-4">
                <h2 id="exams-title" className="text-3xl sm:text-4xl font-extrabold text-center sm:text-right">
                  الامتحانات المتاحة
                </h2>
                <span className="inline-flex min-w-24 items-center justify-center bg-slate-950 text-white font-bold px-8 py-3 rounded-sm">
                  {liveExams.length} امتحان
                </span>
              </div>
              <div className="relative">
                {liveExams.length > cardsPerPage && (
                  <>
                    <button
                      type="button"
                      onClick={() => goToExamPage("prev")}
                      aria-label="الامتحانات السابقة"
                      className="absolute right-0 top-1/2 z-20 hidden sm:flex h-11 w-11 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-chem-cta/30 bg-white/85 text-chem-cta shadow-lg backdrop-blur hover:bg-chem-cta hover:text-white transition-all duration-300"
                    >
                      <ArrowRight size={22} />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToExamPage("next")}
                      aria-label="الامتحانات التالية"
                      className="absolute left-0 top-1/2 z-20 hidden sm:flex h-11 w-11 -translate-y-1/2 -translate-x-1/2 items-center justify-center rounded-full border border-chem-cta/30 bg-white/85 text-chem-cta shadow-lg backdrop-blur hover:bg-chem-cta hover:text-white transition-all duration-300"
                    >
                      <ArrowLeft size={22} />
                    </button>
                  </>
                )}
                <motion.div
                  key={`exams-${currentExamPage}-${cardsPerPage}`}
                  initial="hidden"
                  animate="show"
                  variants={stagger}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {pagedExams.map((exam) => (
                    <motion.article
                      key={exam.id}
                      variants={fadeUp}
                      whileHover={{ y: -5 }}
                      className="bg-white/90 dark:bg-slate-900/90 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-chem-light/10 transition-all duration-300 overflow-hidden flex flex-col"
                    >
                      <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        {exam.imageUrl ? (
                          <img src={exam.imageUrl} alt={exam.title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-chem-deep to-chem-light flex items-center justify-center text-white">
                            <ClipboardCheck size={48} strokeWidth={1.3} />
                          </div>
                        )}
                        <span className="absolute right-3 top-3 rounded-full bg-chem-cta px-3 py-1 text-xs font-extrabold text-white shadow">
                          {exam.questionsCount} سؤال
                        </span>
                      </div>
                      <div className="p-4 flex flex-1 flex-col gap-3 text-right">
                        <h3 className="min-h-11 text-sm font-extrabold leading-relaxed text-slate-950 dark:text-white">
                          {exam.title}
                        </h3>
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={13} />
                            {exam.minutes} دقيقة
                          </span>
                          <span className="font-extrabold text-chem-cta">{formatPrice(exam.price)}</span>
                        </div>
                        <p className="line-clamp-2 min-h-10 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {exam.description || exam.courseTitle || "امتحان تدريبي لقياس مستواك ومراجعة أهم أفكار الكيمياء."}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isAuthenticated) {
                              navigate("/login");
                            } else {
                              navigate(`/exam/${exam.id}`);
                            }
                          }}
                          className="mt-auto text-center border border-chem-cta text-chem-cta rounded-lg py-2 text-sm font-extrabold hover:bg-chem-cta hover:text-white transition-all duration-300 active:scale-[0.97]"
                        >
                          الدخول للامتحان
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </motion.div>
              </div>
              {liveExams.length > 0 && (
                <div className="mt-7 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => goToExamPage("prev")}
                    aria-label="السابق"
                    className="sm:hidden h-10 w-10 rounded-full border border-chem-cta/30 bg-white text-chem-cta flex items-center justify-center"
                  >
                    <ArrowRight size={20} />
                  </button>
                  <div className="flex items-center justify-center gap-2">
                    {Array.from({ length: examPageCount }).map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setExamPage(index)}
                        aria-label={`عرض صفحة الامتحانات ${index + 1}`}
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                          index === currentExamPage ? "w-6 bg-chem-cta" : "w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-chem-cta/60"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => goToExamPage("next")}
                    aria-label="التالي"
                    className="sm:hidden h-10 w-10 rounded-full border border-chem-cta/30 bg-white text-chem-cta flex items-center justify-center"
                  >
                    <ArrowLeft size={20} />
                  </button>
                </div>
              )}
            </section>
          )}

          {/* --- Grade Category Navigation Section (اختر صفك الدراسي) --- */}
          <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 py-16 border-t border-slate-100 dark:border-slate-800">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
                <GraduationCap className="text-[#0077B6] dark:text-[#00A8E8]" size={28} />
                <span>اختر صفك الدراسي</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-bold">
                انقر على الصف الدراسي الخاص بك لاستعراض جميع الكورسات المتاحة والمناهج الدراسية
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { title: "الصف الأول الثانوي", sub: "علوم متكاملة وكيمياء", count: liveCourses.filter(c => String(c.grade || '').includes("الأول الثانوي")).length },
                { title: "الصف الثاني الثانوي", sub: "منهج الكيمياء كاملاً", count: liveCourses.filter(c => String(c.grade || '').includes("الثاني الثانوي")).length },
                { title: "الصف الثالث الثانوي", sub: "كيمياء الثانوية العامة", count: liveCourses.filter(c => String(c.grade || '').includes("الثالث الثانوي")).length },
                { title: "الصف الثاني بكالوريا", sub: "كيمياء البكالوريا", count: liveCourses.filter(c => String(c.grade || '').includes("الثاني بكالوريا")).length },
                { title: "الصف الثالث البكالوريا", sub: "منهج البكالوريا الكامل", count: liveCourses.filter(c => String(c.grade || '').includes("الثالث البكالوريا")).length },
              ].map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => navigate(`/courses?grade=${encodeURIComponent(item.title)}`)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#0077B6] dark:hover:border-[#00A8E8] rounded-3xl p-5 text-right transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between space-y-3 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-slate-800 text-[#0077B6] dark:text-[#00A8E8] flex items-center justify-center group-hover:bg-[#0077B6] group-hover:text-white transition">
                      <BookOpen size={20} />
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {item.count > 0 ? `${item.count} كورس` : "قريباً"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#0077B6] dark:group-hover:text-[#00A8E8] transition">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-bold">
                      {item.sub}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#0077B6] dark:text-[#00A8E8] pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>استعرض الكورسات</span>
                    <ArrowLeft size={12} />
                  </div>
                </button>
              ))}
            </div>
          </section>
          <section
            id="features"
            className="relative z-10 bg-chem-bg-alt dark:bg-slate-900/60 py-20 border-y border-chem-light/20 dark:border-chem-light/10 transition-colors duration-500"
            aria-labelledby="features-title"
          >
            <div className="max-w-7xl mx-auto px-6 sm:px-10 text-center">
              <motion.h2
                id="features-title"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                className="text-3xl font-extrabold mb-14"
              >
                إيه اللي هتلاقيه على المنصة؟
              </motion.h2>
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.1 }}
                variants={stagger}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-right"
              >
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <motion.article
                      key={feature.title}
                      variants={fadeUp}
                      whileHover={{ y: -4 }}
                      className="group bg-white dark:bg-slate-900 rounded-lg p-6 flex flex-col gap-3 items-end hover:shadow-xl hover:shadow-chem-light/10 dark:hover:shadow-chem-light/5 transition-all duration-300 ring-1 ring-transparent hover:ring-chem-light/30"
                    >
                      <div className="w-12 h-12 rounded-lg bg-chem-light/10 text-chem-light flex items-center justify-center group-hover:scale-110 group-hover:bg-chem-light group-hover:text-white transition-all duration-300">
                        <Icon size={24} />
                      </div>
                      <h3 className="font-extrabold text-lg">{feature.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                    </motion.article>
                  );
                })}
              </motion.div>
            </div>
          </section>
          <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 py-20" aria-label="دعوة للتسجيل">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={stagger}
              className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
            >
              <motion.div variants={fadeUp} className="order-2 lg:order-1 text-center lg:text-right space-y-4">
                <h2 className="text-3xl font-extrabold leading-relaxed">
                  انضم لأوائل الكيمياء
                  <br />وابدأ مرحلة جديدة في مذاكرتك
                </h2>
                <Link
                  to={isAuthenticated ? dashboardPath : "/register"}
                  className="group bg-chem-cta text-white font-extrabold px-8 py-3 rounded-xl hover:bg-chem-cta/90 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-chem-cta/30 transition-all duration-300 active:translate-y-0 active:scale-95 inline-flex items-center gap-2"
                >
                  {isAuthenticated ? "افتح لوحتك" : "انشئ حسابك الآن"}
                  <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
                </Link>
              </motion.div>
              <motion.div variants={fadeUp} className="order-1 lg:order-2 relative flex items-center justify-center h-64">
                <div className="w-40 h-32 bg-gradient-to-br from-chem-deep to-chem-light rounded-t-2xl relative flex items-center justify-center shadow-xl">
                  <div className="w-16 h-2 bg-chem-cta absolute -top-1 rounded-full" />
                  <Atom size={70} className="text-white" />
                </div>
                {[
                  { Icon: Beaker, cls: "top-2 left-10 text-chem-light", dur: 4 },
                  { Icon: TestTube, cls: "top-6 right-6 text-chem-deep", dur: 5 },
                  { Icon: Award, cls: "bottom-4 left-2 text-chem-cta", dur: 4.5 },
                  { Icon: FlaskConical, cls: "bottom-2 right-10 text-chem-light", dur: 5.5 },
                  { Icon: GraduationCap, cls: "top-0 right-24 text-chem-deep", dur: 4 },
                ].map(({ Icon, cls, dur }, index) => (
                  <motion.div
                    key={index}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
                    className={`absolute ${cls}`}
                    aria-hidden="true"
                  >
                    <Icon size={index === 2 || index === 3 ? 40 : 36} strokeWidth={1.2} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
