import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Award, BookOpen, ClipboardCheck, Flame, PlayCircle, TrendingUp, TimerReset, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { subscribeCourses } from "../services/courseService.js";
import DashboardLayout from "../components/DashboardLayout.jsx";

function formatNumber(value) {
  return new Intl.NumberFormat("ar-EG").format(Number(value || 0));
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);

  useEffect(() => subscribeCourses(setCourses), []);

  const enrolledCourses = useMemo(() => {
    const enrolledIds = new Set(user?.enrolledCourses || []);
    return courses.filter((course) => enrolledIds.has(course.id));
  }, [courses, user?.enrolledCourses]);

  const orderedProgressEntries = useMemo(() => {
    return enrolledCourses
      .map((course) => ({
        course,
        progress: Number(user?.progress?.[course.id]?.percentage || 0),
        watchedLessons: user?.progress?.[course.id]?.watchedLessons || [],
      }))
      .sort((a, b) => b.progress - a.progress);
  }, [enrolledCourses, user?.progress]);

  const totalProgress = useMemo(() => {
    if (!orderedProgressEntries.length) return 0;
    const total = orderedProgressEntries.reduce((sum, item) => sum + item.progress, 0);
    return Math.round(total / orderedProgressEntries.length);
  }, [orderedProgressEntries]);

  const completedLessons = useMemo(() => {
    return Object.values(user?.progress || {}).reduce((sum, item) => sum + (item?.watchedLessons?.length || 0), 0);
  }, [user?.progress]);

  const recentQuizResults = useMemo(() => {
    const entries = Object.entries(user?.quizResults || {}).flatMap(([courseId, quizzes]) =>
      Object.entries(quizzes || {}).map(([quizId, result]) => ({
        courseId,
        quizId,
        result,
      }))
    );

    return entries
      .filter((item) => item.result)
      .sort((a, b) => new Date(b.result.updatedAt || 0) - new Date(a.result.updatedAt || 0));
  }, [user?.quizResults]);

  const nextCourse = useMemo(() => {
    return orderedProgressEntries.find((item) => item.progress < 100)?.course || orderedProgressEntries[0]?.course || null;
  }, [orderedProgressEntries]);

  const stats = [
    { label: "الكورسات المسجلة", value: formatNumber(enrolledCourses.length), icon: BookOpen, color: "from-[#0077B6] to-[#00A8E8]" },
    { label: "الدروس المكتملة", value: formatNumber(completedLessons), icon: ClipboardCheck, color: "from-[#FF6B35] to-[#ff8a5f]" },
    { label: "متوسط التقدم", value: `${totalProgress}%`, icon: TrendingUp, color: "from-[#12B981] to-[#38D9C8]" },
    { label: "مستوى الالتزام", value: totalProgress > 70 ? "ممتاز" : totalProgress > 40 ? "جيد" : "ابدأ الآن", icon: Flame, color: "from-[#F59E0B] to-[#F97316]" },
  ];

  return (
    <DashboardLayout active="/dashboard">
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950">
          <div className="grid gap-0 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="relative bg-gradient-to-l from-[#0077B6] via-[#00A8E8] to-[#38D9C8] p-6 sm:p-8 text-white">
              <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-[#FF6B35]/15 blur-3xl" />
              <div className="relative z-10 space-y-4 text-right">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold backdrop-blur">
                  <Sparkles size={15} />
                  لوحة الطالب
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
                  أهلاً بيك، {user?.name?.split(" ")[0] || "طالب"}.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-white/90 sm:text-base">
                  تابع تقدمك، افتح الدروس بالترتيب، وادخل الامتحانات صفحة صفحة بنفس أسلوب المنصة الحقيقي.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link
                    to="/courses"
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-[#0077B6] transition hover:scale-[1.01]"
                  >
                    استعرض الكورسات
                  </Link>
                  <Link
                    to={nextCourse ? `/courses/${nextCourse.id}` : "/courses"}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15"
                  >
                    {nextCourse ? "كمل الكورس" : "ابدأ من الكورسات"}
                    <PlayCircle size={16} />
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-3 bg-slate-50 p-6 dark:bg-slate-900">
              <div className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">التقدم العام</p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-extrabold text-[#0077B6] dark:text-[#00A8E8]">{totalProgress}%</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">متوسط رحلتك التعليمية</p>
                  </div>
                  <div className="rounded-2xl bg-[#0077B6]/10 p-3 text-[#0077B6] dark:bg-[#00A8E8]/10 dark:text-[#00A8E8]">
                    <Award size={28} />
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">الدرس الحالي</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{nextCourse?.title || "لا يوجد كورس بعد"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">ابدأ خطوة بخطوة</p>
                  </div>
                  <div className="rounded-2xl bg-[#FF6B35]/10 p-3 text-[#FF6B35]">
                    <TimerReset size={22} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className={`inline-flex rounded-2xl bg-gradient-to-l ${item.color} p-3 text-white`}>
                  <Icon size={18} />
                </div>
                <p className="mt-4 text-2xl font-extrabold">{item.value}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
              </motion.div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="text-right">
                <h2 className="text-xl font-extrabold">استكمل رحلتك</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">الكورسات التي التحقت بها تظهر هنا بالترتيب.</p>
              </div>
              <Link to="/courses" className="text-sm font-bold text-[#0077B6] hover:underline dark:text-[#00A8E8]">
                كل الكورسات
              </Link>
            </div>

            {orderedProgressEntries.length > 0 ? (
              <div className="grid gap-4">
                {orderedProgressEntries.map(({ course, progress, watchedLessons }) => (
                  <div key={course.id} className="rounded-[1.5rem] border border-slate-200 bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1 text-right">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{course.grade || "الصف الدراسي"}</p>
                        <h3 className="mt-1 truncate text-lg font-extrabold">{course.title}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {course.description || "كورس تفاعلي مع فيديوهات وكويزات وملفات."}
                        </p>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-gradient-to-l from-[#0077B6] to-[#00A8E8]" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {progress}% · {watchedLessons.length} درس مكتمل
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <Link
                          to={`/courses/${course.id}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#0077B6] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#FF6B35]"
                        >
                          فتح الكورس
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
                لسه ما اشتركتش في أي كورس. ادخل على صفحة الكورسات واختار أول كورس يناسبك.
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-xl font-extrabold">أحدث نتائجك</h2>
              <div className="mt-4 space-y-3">
                {recentQuizResults.length > 0 ? (
                  recentQuizResults.slice(0, 5).map(({ courseId: itemCourseId, quizId, result }) => {
                    const course = courses.find((entry) => entry.id === itemCourseId);
                    return (
                      <div key={`${itemCourseId}-${quizId}`} className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-sm font-extrabold">{course?.title || "كورس"}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">نتيجة الكويز {quizId}</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="rounded-full bg-[#0077B6]/10 px-3 py-1 text-xs font-bold text-[#0077B6] dark:bg-[#00A8E8]/10 dark:text-[#00A8E8]">
                            {result.percentage}%
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                            <span className="block text-[10px] font-bold">الزمن</span>
                            <span dir="ltr" className="mt-1 block font-black text-slate-800 dark:text-slate-100">{formatDuration(result.timeSpentSeconds)}</span>
                          </div>
                          <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                            <span className="block text-[10px] font-bold">التاريخ</span>
                            <span className="mt-1 block font-black text-slate-800 dark:text-slate-100">
                              {new Date(result.updatedAt || Date.now()).toLocaleDateString("ar-EG")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    لسه ما حلّيتش أي كويز.
                  </p>
                )}
              </div>
            </div>

          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
