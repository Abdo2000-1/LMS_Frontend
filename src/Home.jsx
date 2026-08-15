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
import QuizRunner from "./components/QuizRunner.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { subscribeCourses, subscribeExams, submitExamAttempt } from "./services/courseService.js";
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
  const [activeExam, setActiveExam] = useState(null);
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
    return liveCourses.filter((course) => {
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
            <div className="flex flex-col gap-6 mb-8">
              <div className="flex flex-col sm:flex-row-reverse items-center sm:items-start justify-between gap-4">
                <h2 id="courses-title" className="text-3xl sm:text-4xl font-extrabold text-center sm:text-right">
                  كورساتنا المتاحة للعام 2026/2027
                </h2>
                <Link
                  to="/courses"
                  className="inline-flex min-w-24 items-center justify-center bg-slate-950 text-white font-bold px-8 py-3 rounded-sm hover:bg-chem-deep transition-all duration-300 active:scale-95"
                >
                  الكل
                </Link>
              </div>
              {searchOpen && (
                <div className="rounded-2xl border border-chem-light/20 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-3 shadow-lg shadow-chem-light/10">
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1">
                      <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={searchInputRef}
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") scrollToSection("#courses");
                        }}
                        placeholder="ابحث باسم الكورس أو الصف..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/85 dark:bg-slate-950/70 pr-11 pl-4 py-3 text-sm outline-none focus:border-chem-light focus:ring-2 focus:ring-chem-light/30"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2">
                        {visibleCourses.length} نتيجة
                      </span>
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-bold hover:border-chem-cta hover:text-chem-cta transition-colors duration-200"
                        >
                          <Eraser size={16} />
                          مسح
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSearchOpen(false)}
                        aria-label="إغلاق البحث"
                        className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-chem-light hover:text-chem-light transition-colors duration-200"
                      >
                        <XIcon size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              {visibleCourses.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => goToCoursePage("prev")}
                    aria-label="الكورسات السابقة"
                    className="absolute right-0 top-1/2 z-20 hidden sm:flex h-11 w-11 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-chem-cta/30 bg-white/85 text-chem-cta shadow-lg backdrop-blur hover:bg-chem-cta hover:text-white transition-all duration-300"
                  >
                    <ArrowRight size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToCoursePage("next")}
                    aria-label="الكورسات التالية"
                    className="absolute left-0 top-1/2 z-20 hidden sm:flex h-11 w-11 -translate-y-1/2 -translate-x-1/2 items-center justify-center rounded-full border border-chem-cta/30 bg-white/85 text-chem-cta shadow-lg backdrop-blur hover:bg-chem-cta hover:text-white transition-all duration-300"
                  >
                    <ArrowLeft size={22} />
                  </button>
                </>
              )}
              <motion.div
                key={`${currentPage}-${cardsPerPage}-${searchTerm}`}
                initial="hidden"
                animate="show"
                variants={stagger}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {pagedCourses.map((course) => {
                  const finalPrice = getFinalPrice(course);
                  return (
                  <motion.article
                    key={course.id}
                    variants={fadeUp}
                    whileHover={{ y: -5 }}
                    className="bg-white/90 dark:bg-slate-900/90 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-chem-light/10 transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-chem-deep to-chem-light flex items-center justify-center text-white">
                          <FlaskConical size={48} strokeWidth={1.3} />
                        </div>
                      )}
                      {Number(course.discountPercent || 0) > 0 && (
                        <span className="absolute right-3 top-3 rounded-full bg-chem-cta px-3 py-1 text-xs font-extrabold text-white shadow">
                          خصم {course.discountPercent}%
                        </span>
                      )}
                    </div>
                    <div className="p-4 flex flex-1 flex-col gap-3 text-right">
                      <h3 className="min-h-11 text-sm font-extrabold leading-relaxed text-slate-950 dark:text-white">
                        {course.title}
                      </h3>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={13} />
                          متاح الآن
                        </span>
                        <span className="font-extrabold text-chem-cta">{formatPrice(course.price)}</span>
                      </div>
                      <p className="line-clamp-2 min-h-10 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {course.description || course.grade || "ابدأ الكورس وتابع تقدمك خطوة بخطوة."}
                      </p>
                      <div className="mt-auto flex flex-col gap-2 pt-1">
                        <Link
                          to={isAuthenticated ? `/courses/${course.id}` : "/login"}
                          className="text-center border border-chem-cta text-chem-cta rounded-lg py-2 text-sm font-extrabold hover:bg-chem-cta hover:text-white transition-all duration-300 active:scale-[0.97]"
                        >
                          الدخول للكورس
                        </Link>
                        {!isTeacherUser && (
                          <Link
                            to={finalPrice === 0 ? (isAuthenticated ? `/courses/${course.id}` : "/register") : (isAuthenticated ? `/courses/${course.id}/payment` : "/register")}
                            className="text-center bg-chem-cta text-white rounded-lg py-2 text-sm font-extrabold hover:bg-chem-cta/90 hover:shadow-md hover:shadow-chem-cta/30 transition-all duration-300 active:scale-[0.97]"
                          >
                            {finalPrice === 0 ? "كورس مجاني" : "الإشتراك في الكورس"}
                          </Link>
                        )}
                      </div>
                    </div>
                  </motion.article>
                  );
                })}
              </motion.div>
              {visibleCourses.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400">
                  لا توجد كورسات مطابقة للبحث حاليًا.
                </div>
              )}
            </div>
            {visibleCourses.length > 0 && (
              <div className="mt-7 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => goToCoursePage("prev")}
                  aria-label="السابق"
                  className="sm:hidden h-10 w-10 rounded-full border border-chem-cta/30 bg-white text-chem-cta flex items-center justify-center"
                >
                  <ArrowRight size={20} />
                </button>
                <div className="flex items-center justify-center gap-2">
                  {Array.from({ length: pageCount }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCoursePage(index)}
                      aria-label={`عرض صفحة الكورسات ${index + 1}`}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        index === currentPage ? "w-6 bg-chem-cta" : "w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-chem-cta/60"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => goToCoursePage("next")}
                  aria-label="التالي"
                  className="sm:hidden h-10 w-10 rounded-full border border-chem-cta/30 bg-white text-chem-cta flex items-center justify-center"
                >
                  <ArrowLeft size={20} />
                </button>
              </div>
            )}
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
                              setActiveExam(exam);
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
        
        {activeExam && (
          <QuizRunner
            quiz={{
              ...activeExam,
              quizId: activeExam.id,
              isMandatory: false,
            }}
            onExit={() => setActiveExam(null)}
            onSubmit={async (answers, timeSpentSeconds) => {
              return await submitExamAttempt({ examId: activeExam.id, answers, timeSpentSeconds });
            }}
          />
        )}
      </div>
    </div>
  );
}
