import { Popover, Transition } from "@headlessui/react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Search,
  Star,
  GraduationCap,
  Feather,
  ScrollText,
  BookMarked,
  Calendar,
  BookOpen,
  Award,
  MessageCircle,
  ClipboardCheck,
  Menu as MenuIcon,
  X as XIcon,
  ArrowLeft,
  Languages,
  LayoutDashboard,
} from "lucide-react";
import ThemeToggle from "./components/ThemeToggle.jsx";
import Footer from "./components/Footer.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useBranding } from "./context/BrandingContext.jsx";
import { subscribeCourses } from "./services/courseService.js";

/**
 * Home.jsx — منصة "الأستاذ" لتدريس اللغة العربية
 * React + Tailwind CSS + Headless UI + Framer Motion
 *
 * تشغيل: npm install
 * الوضع الليلي: يعمل بتبديل class="dark" على أعلى عنصر (Tailwind darkMode: "class")
 * الخط المستخدم: Cairo — مضاف بالفعل في index.html
 */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const grades = [
  { id: "٣", name: "الصف الثالث الثانوي", gradient: "from-amber-700 to-amber-950" },
  { id: "٢", name: "الصف الثاني الثانوي", gradient: "from-cyan-700 to-cyan-950" },
  { id: "١", name: "الصف الأول الثانوي", gradient: "from-stone-600 to-stone-900" },
];

const features = [
  {
    icon: ClipboardCheck,
    title: "متابعة دورية وتقييم مستمر",
    desc: "بيتابعك أسبوعيًا، وبيقدملك توصيات بناءً على احتياجك ومتابعة أول بأول.",
  },
  {
    icon: Award,
    title: "نماذج امتحانات بنفس النظام",
    desc: "امتحانات تفاعلية بنفس شكل امتحانات الثانوية العامة عشان تعيش جو الامتحان على المنصة.",
  },
  {
    icon: MessageCircle,
    title: "شرح مبسط ومركز",
    desc: "شرح القواعد والمفاهيم زي ما تفهمها في حياتك اليومية، بعيد عن التعقيد الأكاديمي.",
  },
  {
    icon: Calendar,
    title: "فيديوهات مراجعة مركزة ليالي الامتحان",
    desc: "فيديوهات مراجعة قصيرة على أهم النقاط اللي محتاج تذاكرها قبل ما تدخل قاعة الامتحان.",
  },
  {
    icon: MessageCircle,
    title: "تفاعل مباشر مع فريق المدرسين",
    desc: "أي استفسار أو نقطة مش واضحة تسأل عنها، وإحنا هنرد عليها بشكل فوري وكده مش هتحس إنك لوحدك.",
  },
  {
    icon: GraduationCap,
    title: "خطة مذاكرة منظمة",
    desc: "المنصة بتدّيك جدول مذاكرة جاهز حسب وقتك ومستواك عشان تذاكر بتركيز وراحة.",
  },
];

const testimonials = [
  { text: "كنت بكره النحو... دلوقتي بقى المادة اللي بدأ مذاكرتي بيها كل يوم.", name: "أحمد من القاهرة" },
  { text: "الشرح بسيط وفعلاً بحس إني فاهم مش بحفظ وخلاص.", name: "سما من المنوفية" },
  { text: "بعد ما انضميت لعيلة الأستاذ، بقيت أفهم الدرس من أول مرة.", name: "يوسف من القاهرة" },
];

const navLinks = [
  { label: "الرئيسية", href: "#" },
  { label: "الكورسات", href: "#courses" },
  { label: "السنوات الدراسية", href: "#grades" },
  { label: "آراء الطلاب", href: "#testimonials" },
];

export default function Home() {
  const { isAuthenticated, user, getLandingRouteByRole } = useAuth();
  const { teacherDisplayName } = useBranding();
  const [liveCourses, setLiveCourses] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dashboardPath = getLandingRouteByRole(user?.role);
  const visibleCourses = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return liveCourses
      .filter((course) => {
        if (!normalized) return true;
        return [course.title, course.description, course.grade].some((value) =>
          String(value || "").toLowerCase().includes(normalized)
        );
      });
  }, [liveCourses, searchTerm]);

  useEffect(() => subscribeCourses(setLiveCourses), []);

  return (
    <div dir="rtl" className="min-h-screen">
      <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-['Cairo',_sans-serif] transition-colors duration-500 selection:bg-amber-300 selection:text-slate-900">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-amber-400/70 dark:border-amber-500/30 shadow-sm shadow-black/[0.03] transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
            {/* Left cluster: auth buttons + search */}
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                aria-label="بحث في الكورسات"
                title="بحث"
                onClick={() => setSearchOpen((open) => !open)}
                className="group flex items-center justify-center w-10 h-10 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-800 dark:hover:text-amber-400 transition-all duration-300"
              >
                <Search size={18} className="group-hover:scale-110 transition-transform duration-300" />
              </button>
              {isAuthenticated ? (
                <Link
                  to={dashboardPath}
                  className="inline-flex items-center gap-2 bg-red-800 text-white rounded-full px-5 py-2 text-sm font-bold shadow-sm hover:bg-red-900 hover:shadow-lg hover:shadow-red-800/30 dark:hover:shadow-red-900/40 transition-all duration-300 active:scale-95"
                >
                  <LayoutDashboard size={16} />
                  لوحتي
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="border border-red-800 text-red-800 dark:border-amber-400 dark:text-amber-400 rounded-full px-5 py-2 text-sm font-bold hover:bg-red-800 hover:text-white dark:hover:bg-amber-400 dark:hover:text-slate-950 transition-all duration-300 active:scale-95"
                  >
                    تسجيل الدخول
                  </Link>
                  <Link
                    to="/register"
                    className="bg-red-800 text-white rounded-full px-5 py-2 text-sm font-bold shadow-sm hover:bg-red-900 hover:shadow-lg hover:shadow-red-800/30 dark:hover:shadow-red-900/40 transition-all duration-300 active:scale-95"
                  >
                    حساب جديد
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <Popover className="md:hidden relative">
              {({ open }) => (
                <>
                  <Popover.Button
                    aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
                    className="flex items-center justify-center w-10 h-10 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-300"
                  >
                    {open ? <XIcon size={20} /> : <MenuIcon size={20} />}
                  </Popover.Button>
                  <Transition
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 -translate-y-2"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 -translate-y-2"
                  >
                    <Popover.Panel className="absolute right-0 mt-3 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-xl ring-1 ring-black/5 dark:ring-white/10 p-3 flex flex-col gap-1 z-50">
                      {navLinks.map((l) => (
                        <a
                          key={l.label}
                          href={l.href}
                          className="px-3 py-2 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-slate-800 hover:text-red-800 dark:hover:text-amber-400 transition-colors duration-200"
                        >
                          {l.label}
                        </a>
                      ))}
                      <hr className="my-1 border-slate-100 dark:border-slate-800" />
                      {isAuthenticated ? (
                        <Link
                          to={dashboardPath}
                          className="px-3 py-2 rounded-lg text-sm font-bold bg-red-800 text-white hover:bg-red-900 transition-colors duration-200 text-right"
                        >
                          لوحتي
                        </Link>
                      ) : (
                        <>
                          <Link
                            to="/login"
                            className="px-3 py-2 rounded-lg text-sm font-bold text-red-800 dark:text-amber-400 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors duration-200 text-right"
                          >
                            تسجيل الدخول
                          </Link>
                          <Link
                            to="/register"
                            className="px-3 py-2 rounded-lg text-sm font-bold bg-red-800 text-white hover:bg-red-900 transition-colors duration-200 text-right"
                          >
                            حساب جديد
                          </Link>
                        </>
                      )}
                    </Popover.Panel>
                  </Transition>
                </>
              )}
            </Popover>

            {/* Center nav (desktop) */}
            <nav className="hidden lg:flex items-center gap-6">
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="relative text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-red-800 dark:hover:text-amber-400 transition-colors duration-300 after:content-[''] after:absolute after:-bottom-1 after:right-0 after:h-0.5 after:w-0 after:bg-red-800 dark:after:bg-amber-400 after:transition-all after:duration-300 hover:after:w-full"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            {/* Right cluster: theme toggle + logo */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link
                to="/"
                className="flex items-center gap-1.5 text-2xl font-extrabold text-red-800 dark:text-amber-400 tracking-tight transition-colors duration-500"
              >
                {teacherDisplayName}
                <Languages size={22} strokeWidth={2} />
              </Link>
            </div>
          </div>
          {searchOpen && (
            <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-3">
              <input
                autoFocus
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ابحث باسم الكورس أو الصف..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
          )}
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-red-950 via-red-900 to-red-800 dark:from-slate-950 dark:via-red-950 dark:to-red-900 text-white transition-colors duration-500">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background:radial-gradient(circle_at_20%_20%,white,transparent_40%)]" />

          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="max-w-7xl mx-auto px-6 sm:px-10 pt-14 pb-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative"
          >
            <motion.div
              variants={fadeUp}
              className="order-2 lg:order-1 text-center lg:text-right flex flex-col items-center lg:items-end gap-4"
            >
              <h2 className="text-3xl sm:text-4xl font-extrabold text-amber-300">منصة {teacherDisplayName}</h2>
              <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
                مستقبلك في إيدك...
                <br />
                هتعمل تغيير كبير
              </h1>
            </motion.div>

            <motion.div variants={fadeUp} className="order-1 lg:order-2 relative flex justify-center">
              <div className="relative w-72 h-72 sm:w-96 sm:h-96 rounded-[2.5rem] bg-white/5 backdrop-blur-sm ring-1 ring-white/10 flex items-end justify-center">
                <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-br from-slate-100 to-slate-400 flex items-center justify-center text-red-900 shadow-2xl shadow-black/30">
                  <GraduationCap size={90} strokeWidth={1.2} />
                </div>
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-6 right-4 text-cyan-300"
                >
                  <Feather size={56} strokeWidth={1.2} />
                </motion.div>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-8 left-2 text-pink-300"
                >
                  <ScrollText size={48} strokeWidth={1.2} />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="max-w-7xl mx-auto px-6 sm:px-10 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative"
          >
            <motion.div variants={fadeUp} className="order-2 lg:order-1 text-center lg:text-right space-y-5">
              <p className="text-lg font-bold text-amber-50/90">
                خطة منظمة، شرح سهل، ومتابعة مستمرة لحد ما توصل
                <br />
                لأعلى الدرجات في الثانوي العام
              </p>
              <Link
                to={isAuthenticated ? dashboardPath : "/register"}
                className="group bg-white text-red-800 font-extrabold px-8 py-3 rounded-xl shadow-lg shadow-black/20 hover:bg-amber-300 hover:text-red-950 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 active:translate-y-0 active:scale-95 inline-flex items-center gap-2"
              >
                {isAuthenticated ? "افتح لوحتك" : "انشئ حسابك الآن"}
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="order-1 lg:order-2 relative flex flex-col items-center lg:items-start gap-4">
              <BookMarked size={110} strokeWidth={1} className="text-white/90 drop-shadow-lg" />
              <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-5 max-w-sm text-center lg:text-right shadow-2xl shadow-black/30 ring-1 ring-black/5 dark:ring-white/10 transition-colors duration-500">
                <h3 className="font-extrabold text-lg mb-2">ليه تختار منصة {teacherDisplayName}؟</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  شرح بسيط.. ومضمون توصل بيه لأعلى الدرجات. نخبة من أفضل مدرسين اللغة العربية
                  بيساعدوا طلبة كتير يحققوا حلمهم في الكليات اللي نفسهم فيها. المنصة هتلاقي فيها
                  كل اللي محتاجه، شرح، مذاكرة، مراجعة خطوة بخطوة.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Courses */}
        <section id="courses" className="max-w-7xl mx-auto px-6 sm:px-10 py-20">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="flex flex-col sm:flex-row-reverse items-center sm:items-start justify-between gap-4 mb-10"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-extrabold text-center sm:text-right">
              الكورسات
              <br />
              <span className="text-red-800 dark:text-amber-400 transition-colors duration-500">المُقترحة</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-500 dark:text-slate-400 text-sm text-center sm:text-right max-w-xs">
              تقدر تختار من أفضل الكورسات المقترحة من منصة {teacherDisplayName}
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link
                to="/courses"
                className="inline-block bg-red-800 text-white font-bold px-6 py-2 rounded-full hover:bg-red-900 hover:shadow-lg hover:shadow-red-800/30 transition-all duration-300 active:scale-95"
              >
                الكل
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {visibleCourses.map((c) => (
              <motion.div
                key={c.id}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-slate-300/50 dark:hover:shadow-black/40 transition-all duration-300 overflow-hidden flex flex-col"
              >
                <div className="h-40 w-full flex items-center justify-center text-white relative bg-slate-900 overflow-hidden">
                  {c.thumbnailUrl ? (
                    <img
                      src={c.thumbnailUrl}
                      alt={c.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <BookOpen
                      size={40}
                      className="opacity-70 group-hover:scale-110 group-hover:opacity-90 transition-all duration-500"
                    />
                  )}
                  {Number(c.discountPercent || 0) > 0 && (
                    <span className="absolute top-2 right-2 text-xs font-bold text-white px-2 py-1 rounded-md bg-red-700 shadow-sm">
                      خصم {c.discountPercent}%
                    </span>
                  )}
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1 text-right">
                  <h3 className="font-bold text-sm leading-snug flex-1 group-hover:text-red-800 dark:group-hover:text-amber-400 transition-colors duration-300">
                    {c.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{c.grade || "ثانوي"}</span>
                    <span className="font-bold text-red-800 dark:text-amber-400">
                      {Number(c.price || 0) === 0 ? "مجاني" : `${c.price} ج.م`}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <Link
                      to={isAuthenticated ? `/courses/${c.id}` : "/login"}
                      className="text-center border border-red-800 dark:border-amber-400 text-red-800 dark:text-amber-400 rounded-lg py-2 text-sm font-bold hover:bg-red-800 hover:text-white dark:hover:bg-amber-400 dark:hover:text-slate-950 transition-all duration-300 active:scale-[0.97]"
                    >
                      الدخول للكورس
                    </Link>
                    <Link
                      to={isAuthenticated ? `/courses/${c.id}/payment` : "/register"}
                      className="text-center bg-red-700 text-white rounded-lg py-2 text-sm font-bold hover:bg-red-800 hover:shadow-md hover:shadow-red-700/30 transition-all duration-300 active:scale-[0.97]"
                    >
                      الإشتراك في الكورس!
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {visibleCourses.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400">
              لا توجد كورسات مضافة حاليًا.
            </div>
          )}

          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === 6 ? "w-6 bg-red-800 dark:bg-amber-400" : "w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        </section>

        {/* School years */}
        <section
          id="grades"
          className="bg-slate-50 dark:bg-slate-900/60 py-20 border-y border-amber-400/60 dark:border-amber-500/20 transition-colors duration-500"
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-3 gap-10 items-center">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              className="lg:col-span-1 text-center lg:text-right space-y-4 order-1 lg:order-2"
            >
              <h2 className="text-3xl font-extrabold">
                السنوات
                <br />
                الدراسية
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                احجز اشتراكك دلوقتي وابدأ مذاكرة اللغة العربية على موبايلك، التابلت أو اللابتوب
                الخاص بيك، المنصة متاحة على:
              </p>
              <Link
                to={isAuthenticated ? dashboardPath : "/register"}
                className="inline-block bg-red-800 text-white font-extrabold px-6 py-3 rounded-xl hover:bg-red-900 hover:shadow-lg hover:shadow-red-800/30 transition-all duration-300 active:scale-95"
              >
                {isAuthenticated ? "افتح لوحتك" : "انشئ حسابك الآن"}
              </Link>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              variants={stagger}
              className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6 order-2 lg:order-1"
            >
              {grades.map((g) => (
                <motion.div
                  key={g.id}
                  variants={fadeUp}
                  whileHover={{ y: -6 }}
                  className="group rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:shadow-slate-300/50 dark:hover:shadow-black/40 transition-all duration-300 cursor-pointer bg-white dark:bg-slate-900"
                >
                  <div className={`h-48 flex items-center justify-center text-white text-6xl font-extrabold bg-gradient-to-br ${g.gradient} group-hover:scale-105 transition-transform duration-500`}>
                    {g.id}
                  </div>
                  <div className="p-4 text-center space-y-1">
                    <p className="font-bold">{g.name}</p>
                    <Link
                      to="/courses"
                      className="text-red-800 dark:text-amber-400 text-sm font-bold hover:underline flex items-center justify-center gap-1 group/btn"
                    >
                      الدخول لجميع الكورسات
                      <ArrowLeft size={14} className="group-hover/btn:-translate-x-1 transition-transform duration-300" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* What you'll find */}
        <section className="max-w-7xl mx-auto px-6 sm:px-10 py-20 text-center">
          <motion.h2
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
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  className="group bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 flex flex-col gap-3 items-end hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-black/40 transition-all duration-300 ring-1 ring-transparent hover:ring-amber-300/60 dark:hover:ring-amber-500/30"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-red-800 group-hover:text-white dark:group-hover:bg-amber-400 dark:group-hover:text-slate-950 transition-all duration-300">
                    <Icon size={24} />
                  </div>
                  <h3 className="font-extrabold text-lg">{f.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* Testimonials */}
        <section
          id="testimonials"
          className="bg-slate-50 dark:bg-slate-900/60 py-20 border-t border-amber-400/60 dark:border-amber-500/20 transition-colors duration-500"
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-10 text-center">
            <motion.h2
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              className="text-3xl font-extrabold mb-12"
            >
              طلاب قالوا إيه عننا؟
            </motion.h2>
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              variants={stagger}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {testimonials.map((t, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-black/40 transition-all duration-300 text-right flex flex-col gap-4"
                >
                  <div className="flex gap-1 justify-end text-amber-400">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} size={14} fill="currentColor" strokeWidth={0} />
                    ))}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">"{t.text}"</p>
                  <span className="text-red-800 dark:text-amber-400 font-bold text-sm">- {t.name}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-6 sm:px-10 py-20">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
          >
            <motion.div variants={fadeUp} className="order-2 lg:order-1 text-center lg:text-right space-y-4">
              <h2 className="text-3xl font-extrabold leading-relaxed">
                انضم لأوائل اللغة العربية
                <br />و ابدأ مرحلة جديدة في حياتك
              </h2>
              <Link
                to={isAuthenticated ? dashboardPath : "/register"}
                className="group bg-red-800 text-white font-extrabold px-8 py-3 rounded-xl hover:bg-red-900 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-800/30 transition-all duration-300 active:translate-y-0 active:scale-95 inline-flex items-center gap-2"
              >
                {isAuthenticated ? "افتح لوحتك" : "انشئ حسابك الآن"}
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="order-1 lg:order-2 relative flex items-center justify-center h-64">
              <div className="w-40 h-32 bg-slate-800 dark:bg-slate-800 rounded-t-2xl relative flex items-center justify-center shadow-xl">
                <div className="w-16 h-2 bg-amber-400 absolute -top-1 rounded-full" />
                <GraduationCap size={70} className="text-amber-400" />
              </div>
              {[
                { Icon: Feather, cls: "top-2 left-10 text-slate-400", dur: 4 },
                { Icon: ScrollText, cls: "top-6 right-6 text-red-700 dark:text-red-500", dur: 5 },
                { Icon: Award, cls: "bottom-4 left-2 text-amber-400", dur: 4.5 },
                { Icon: BookOpen, cls: "bottom-2 right-10 text-amber-600", dur: 5.5 },
                { Icon: Calendar, cls: "top-0 right-24 text-red-400", dur: 4 },
              ].map(({ Icon, cls, dur }, i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                  className={`absolute ${cls}`}
                >
                  <Icon size={i === 2 || i === 3 ? 40 : 36} strokeWidth={1.2} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
