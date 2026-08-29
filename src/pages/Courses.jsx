import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, PlayCircle, Search, Filter, Video, Edit3, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { subscribeCourses, getCourseGrades } from "../services/courseService.js";
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

export default function Courses() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialGradeParam = searchParams.get("grade") || "الكل";

  const [courses, setCourses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState(initialGradeParam);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => subscribeCourses(setCourses), []);

  useEffect(() => {
    getCourseGrades().then((data) => setGrades(data || []));
  }, []);

  const enrolledSet = useMemo(() => new Set(user?.enrolledCourses || []), [user?.enrolledCourses]);
  const isTeacher = ["teacher", "admin", "developer"].includes(String(user?.role || "").toLowerCase());

  const activeCategories = useMemo(() => {
    const required = [
      "الكل",
      "الصف الأول الثانوي",
      "الصف الثاني الثانوي",
      "الصف الثالث الثانوي",
      "الصف الثاني بكالوريا",
      "الصف الثالث البكالوريا"
    ];
    const fromCourses = courses
      .flatMap((c) => String(c.grade || "").split(new RegExp("[,;|]")))
      .map((g) => g.trim())
      .filter(Boolean);

    return Array.from(new Set([...required, ...grades, ...fromCourses]));
  }, [courses, grades]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const courseGradeStr = String(course.grade || "");
      const matchesGrade =
        selectedGrade === "الكل" ||
        courseGradeStr === selectedGrade ||
        courseGradeStr.includes(selectedGrade);
      const normalized = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !normalized ||
        [course.title, course.description, course.grade].some((value) =>
          String(value || "").toLowerCase().includes(normalized)
        );
      return matchesGrade && matchesSearch;
    });
  }, [courses, selectedGrade, searchTerm]);

  const fullCourses = useMemo(() => filteredCourses.filter((c) => !c.isStandalone), [filteredCourses]);
  const standaloneLectures = useMemo(() => filteredCourses.filter((c) => c.isStandalone), [filteredCourses]);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Cairo',_sans-serif] transition-colors duration-500"
    >
      <AppHeader active="/courses" />

      <main className="max-w-7xl mx-auto px-6 sm:px-10 py-10 space-y-12">
        {/* Page Title */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-6 text-right">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BookOpen className="text-[#0077B6]" />
            الكورسات والمحاضرات التعليمية
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-bold">
            استعرض الكورسات الشاملة والمحاضرات المستقلة المتاحة لصفك الدراسي.
          </p>
        </div>

        {/* Grade Category Tabs */}
        {activeCategories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <Filter size={16} className="text-slate-400 shrink-0 ml-1" />
            {activeCategories.map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => setSelectedGrade(grade)}
                className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${
                  selectedGrade === grade
                    ? "bg-[#0077B6] text-white shadow-md shadow-blue-500/20"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ابحث عن كورس، محاضرة، صف دراسي، أو وصف..."
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pr-12 pl-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-[#0077B6] font-bold"
          />
        </div>

        {/* ═══ SECTION 1: STANDALONE LECTURES (المحاضرات المتاحة - تظهر فقط عند اختيار صف دراسي محدد) ═══ */}
        {selectedGrade !== "الكل" && standaloneLectures.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-cyan-100 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-black text-[#0077B6] dark:text-[#00A8E8] flex items-center gap-2">
                <Video className="text-[#FF6B35]" />
                المحاضرات المتاحة المستقلة
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-[#0077B6] dark:bg-slate-800 dark:text-cyan-300">
                  {standaloneLectures.length} محاضرة
                </span>
              </h2>
            </div>

            <motion.div initial="hidden" animate="show" variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {standaloneLectures.map((lecture) => {
                const enrolled = enrolledSet.has(lecture.id);
                const finalPrice = getFinalPrice(lecture);
                return (
                  <motion.div
                    key={lecture.id}
                    variants={fadeUp}
                    whileHover={{ y: -6 }}
                    className="group bg-white dark:bg-slate-900 rounded-3xl border-2 border-cyan-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    <div className="h-44 w-full overflow-hidden relative">
                      {lecture.thumbnailUrl ? (
                        <img
                          src={lecture.thumbnailUrl}
                          alt={lecture.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center text-white">
                          <Video size={44} />
                        </div>
                      )}
                      <span className="absolute top-3 right-3 text-xs font-black text-white bg-[#FF6B35] px-3 py-1 rounded-xl shadow-md flex items-center gap-1">
                        <Video size={12} />
                        محاضرة مستقلة
                      </span>
                      {Number(lecture.discountPercent || 0) > 0 && (
                        <span className="absolute top-3 left-3 text-xs font-black text-white bg-red-600 px-2 py-0.5 rounded-lg shadow-md">
                          خصم {lecture.discountPercent}%
                        </span>
                      )}
                    </div>

                    <div className="p-5 flex flex-col gap-3 flex-1 text-right">
                      <h3 className="font-black text-base leading-snug flex-1 group-hover:text-[#0077B6] dark:group-hover:text-cyan-400 transition-colors duration-300">
                        {lecture.title}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-8 font-bold">
                        {lecture.description || "محاضرة مستقلة غنية بالشرح، الملفات، وتدريبات الكويز التفاعلية."}
                      </p>

                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {lecture.grade || "عام"}
                        </span>
                        <div className="flex items-center gap-2">
                          {Number(lecture.discountPercent || 0) > 0 && (
                            <span className="line-through text-slate-400">{lecture.price || 0} ج.م</span>
                          )}
                          <span className="font-black text-[#0077B6] dark:text-cyan-400 text-sm">
                            {finalPrice === 0 ? "مجانية" : `${finalPrice} ج.م`}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-2">
                        <Link
                          to={`/courses/${lecture.id}`}
                          className="text-center border border-[#0077B6] text-[#0077B6] dark:border-cyan-400 dark:text-cyan-400 rounded-2xl py-2.5 text-xs font-black hover:bg-[#0077B6] hover:text-white dark:hover:bg-cyan-400 dark:hover:text-slate-950 transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-1.5"
                        >
                          <PlayCircle size={16} />
                          {enrolled || finalPrice === 0 || isTeacher ? "الدخول للمحاضرة" : "معاينة المحاضرة"}
                        </Link>

                        {isTeacher && (
                          <Link
                            to={`/teacher/dashboard?tab=add-standalone-lecture&edit=${lecture.id}`}
                            className="text-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl py-2 text-xs font-black transition-all flex items-center justify-center gap-1"
                          >
                            <Edit3 size={14} />
                            تعديل المحاضرة
                          </Link>
                        )}

                        {!isTeacher && (enrolled || finalPrice === 0 ? (
                          <span className="text-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-2xl py-2 text-xs font-extrabold border border-emerald-200 dark:border-emerald-800/60">
                            {finalPrice === 0 ? "محاضرة مجانية" : "مفعلة بحسابك"}
                          </span>
                        ) : (
                          <Link
                            to={`/courses/${lecture.id}/payment`}
                            className="text-center bg-gradient-to-r from-[#FF6B35] to-[#f75216] text-white rounded-2xl py-2 text-xs font-black hover:shadow-md transition-all duration-300 active:scale-[0.97]"
                          >
                            الاشتراك في المحاضرة
                          </Link>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>
        )}

        {/* ═══ SECTION 2: FULL COURSES (الكورسات التعليمية) ═══ */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="text-[#0077B6]" />
              الكورسات التعليمية الشاملة
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {fullCourses.length} كورس
              </span>
            </h2>
          </div>

          <motion.div initial="hidden" animate="show" variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {fullCourses.map((course) => {
              const enrolled = enrolledSet.has(course.id);
              const finalPrice = getFinalPrice(course);
              return (
                <motion.div
                  key={course.id}
                  variants={fadeUp}
                  whileHover={{ y: -6 }}
                  className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-slate-300/50 dark:hover:shadow-black/40 transition-all duration-300 overflow-hidden flex flex-col"
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
                      <span className="absolute top-3 right-3 text-xs font-black text-white bg-red-600 px-2.5 py-1 rounded-xl shadow-md">
                        خصم {course.discountPercent}%
                      </span>
                    )}
                  </div>

                  <div className="p-5 flex flex-col gap-3 flex-1 text-right">
                    <h3 className="font-black text-base leading-snug flex-1 group-hover:text-[#0077B6] dark:group-hover:text-cyan-400 transition-colors duration-300">
                      {course.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-8 font-bold">
                      {course.description || "كورس تعليمي شامل يغطي المنهج الدراسي بالفيديوهات والتدريبات."}
                    </p>

                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {course.grade || "عام"}
                      </span>
                      <div className="flex items-center gap-2">
                        {Number(course.discountPercent || 0) > 0 && (
                          <span className="line-through text-slate-400">{course.price || 0} ج.م</span>
                        )}
                        <span className="font-black text-[#0077B6] dark:text-cyan-400 text-sm">
                          {finalPrice === 0 ? "مجاني" : `${finalPrice} ج.م`}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <Link
                        to={`/courses/${course.id}`}
                        className="text-center border border-[#0077B6] text-[#0077B6] dark:border-cyan-400 dark:text-cyan-400 rounded-2xl py-2.5 text-xs font-black hover:bg-[#0077B6] hover:text-white dark:hover:bg-cyan-400 dark:hover:text-slate-950 transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-1.5"
                      >
                        <PlayCircle size={16} />
                        {enrolled || finalPrice === 0 || isTeacher ? "الدخول للكورس" : "معاينة المحتوى والدروس"}
                      </Link>

                      {enrolled || isTeacher || finalPrice === 0 ? (
                        <span className="text-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-2xl py-2 text-xs font-extrabold border border-emerald-200 dark:border-emerald-800/60">
                          {finalPrice === 0 ? "كورس مجاني" : "مشترك بالفعل"}
                        </span>
                      ) : (
                        <Link
                          to={`/courses/${course.id}/payment`}
                          className="text-center bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white rounded-2xl py-2 text-xs font-black hover:shadow-md transition-all duration-300 active:scale-[0.97]"
                        >
                          شراء الكورس الكامل
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {filteredCourses.length === 0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400">
            <BookOpen size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
            <p className="font-bold text-base text-[#0077B6] dark:text-[#00A8E8]">سيتم إضافة كورسات ومحاضرات قريباً</p>
            <p className="text-xs text-slate-400 mt-1">لا توجد عناصر متاحة حالياً في هذا الصف الدراسي.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
