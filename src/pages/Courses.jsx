import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, PlayCircle, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { subscribeCourses } from "../services/courseService.js";
import AppHeader from "../components/AppHeader.jsx";
import Footer from "../components/Footer.jsx";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function getFinalPrice(course) {
  const base = Number(course.price || 0);
  const discount = Number(course.discountPercent || 0);
  if (discount <= 0) return base;
  return Math.max(0, Math.round(base * (1 - discount / 100)));
}

function getCourseCta(course, finalPrice, isTeacher, enrolled) {
  if (isTeacher) return { label: "دخول الكورس", to: `/courses/${course.id}` };
  if (finalPrice === 0) return { label: "دخول الكورس", to: `/courses/${course.id}` };
  if (enrolled) return { label: "الدخول للكورس", to: `/courses/${course.id}` };
  return { label: "الدخول للكورس", to: `/courses/${course.id}/payment` };
}

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => subscribeCourses(setCourses), []);

  const enrolledSet = useMemo(() => new Set(user?.enrolledCourses || []), [user?.enrolledCourses]);
  const isTeacher = user?.role === "teacher" || user?.role === "developer";
  const filteredCourses = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) =>
      [course.title, course.description, course.grade].some((value) => String(value || "").toLowerCase().includes(normalized))
    );
  }, [courses, searchTerm]);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Cairo',_sans-serif] transition-colors duration-500"
    >
      <AppHeader active="/courses" />

      <main className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
        <div className="mb-10 text-center sm:text-right">
          <h1 className="text-2xl sm:text-3xl font-extrabold">الكورسات</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            الكورسات مرتبة حسب خطة LMS: ادخل الكورس ثم ابدأ الدروس والكويزات بالترتيب.
          </p>
        </div>

        <div className="relative mb-8">
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ابحث عن كورس، صف، أو وصف..."
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pr-12 pl-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <motion.div initial="hidden" animate="show" variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const enrolled = enrolledSet.has(course.id);
            const finalPrice = getFinalPrice(course);
            return (
              <motion.div
                key={course.id}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-slate-300/50 dark:hover:shadow-black/40 transition-all duration-300 overflow-hidden flex flex-col"
              >
                <div className="h-44 w-full overflow-hidden relative">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white">
                      <BookOpen size={40} />
                    </div>
                  )}
                  {Number(course.discountPercent || 0) > 0 && (
                    <span className="absolute top-2 right-2 text-xs font-bold text-white bg-red-700 px-2 py-1 rounded-md shadow-sm">
                      خصم {course.discountPercent}%
                    </span>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-3 flex-1 text-right">
                  <h3 className="font-bold text-sm leading-snug flex-1 group-hover:text-red-800 dark:group-hover:text-amber-400 transition-colors duration-300">
                    {course.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-8">
                    {course.description || "كورس شامل مع فيديوهات وكويزات منظمة."}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{course.grade || "ثانوي"}</span>
                    <div className="flex items-center gap-2">
                      {Number(course.discountPercent || 0) > 0 && (
                        <span className="line-through text-slate-400">{course.price || 0} ج.م</span>
                      )}
                      <span className="font-bold text-red-800 dark:text-amber-400">
                        {finalPrice === 0 ? "مجاني" : `${finalPrice} ج.م`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Link
                      to={`/courses/${course.id}`}
                      className="text-center border border-red-800 dark:border-amber-400 text-red-800 dark:text-amber-400 rounded-lg py-2 text-sm font-bold hover:bg-red-800 hover:text-white dark:hover:bg-amber-400 dark:hover:text-slate-950 transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-1"
                    >
                      <PlayCircle size={16} />
                      {enrolled || finalPrice === 0 || isTeacher ? "الدخول للكورس" : "معاينة المحتوى"}
                    </Link>

                    {enrolled || isTeacher || finalPrice === 0 ? (
                      <span className="text-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg py-2 text-sm font-bold">
                        {finalPrice === 0 ? "كورس مجاني" : "مشترك بالفعل"}
                      </span>
                    ) : (
                      <Link
                        to={finalPrice === 0 ? `/courses/${course.id}` : `/courses/${course.id}/payment`}
                        className="text-center bg-red-700 text-white rounded-lg py-2 text-sm font-bold hover:bg-red-800 hover:shadow-md hover:shadow-red-700/30 transition-all duration-300 active:scale-[0.97]"
                      >
                        {finalPrice === 0 ? "كورس مجاني" : "الدخول للكورس"}
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {filteredCourses.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400">
            لا توجد كورسات مطابقة للبحث.
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
