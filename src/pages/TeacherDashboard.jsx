import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeDollarSign,
  Ban,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  HelpCircle,
  NotebookText,
  PlusCircle,
  Search,
  Trash2,
  Unlock,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardLayout from "../components/DashboardLayout.jsx";
import {
  addQuizToCourse,
  addResourceToCourse,
  blockStudent,
  buildCourseContent,
  createCourse,
  deleteCourse,
  getTenantStudents,
  subscribeCourses,
  subscribeQuizAttempts,
  unblockStudent,
} from "../services/courseService.js";
import { subscribePayments } from "../services/paymentService.js";
import { uploadFileToStorage, uploadImageToStorage } from "../services/storageService.js";

const tabs = [
  { id: "courses", label: "الكورسات", icon: BookOpen },
  { id: "files", label: "الملفات", icon: FileText },
  { id: "quizzes", label: "الكويزات", icon: HelpCircle },
  { id: "students", label: "الطلاب", icon: Users },
  { id: "reports", label: "الدفع والدرجات", icon: Wallet },
];

function formatDate(value) {
  if (!value) return "-";
  const date = value?.toDate ? value.toDate() : new Date(value);
  return date.toLocaleString("ar-EG", { hour12: true });
}

const emptyQuestion = () => ({
  prompt: "",
  choices: ["", "", "", ""],
  correctIndex: 0,
  points: 1,
});

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("courses");
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    grade: "الصف الثالث الثانوي",
    price: "",
    discountPercent: "",
    thumbnailUrl: "",
    units: [{ title: "", youtubeVideoId: "", order: 1, isFree: false }],
    resources: [],
  });

  const [fileForm, setFileForm] = useState({
    courseId: "",
    title: "",
    fileUrl: "",
    fileName: "",
    fileType: "",
    order: "",
    isFree: false,
  });

  const [quizForm, setQuizForm] = useState({
    courseId: "",
    title: "",
    minutes: "15",
    order: "",
    questions: [emptyQuestion()],
  });

  useEffect(() => {
    const unsubCourses = subscribeCourses(setCourses);
    const unsubPayments = subscribePayments(setPayments);
    const unsubAttempts = subscribeQuizAttempts(setAttempts);
    getTenantStudents().then(setStudents).catch(() => setError("تعذر تحميل قائمة الطلاب."));
    return () => {
      unsubCourses();
      unsubPayments();
      unsubAttempts();
    };
  }, []);

  useEffect(() => {
    if (!fileForm.courseId && courses.length) setFileForm((prev) => ({ ...prev, courseId: courses[0].id }));
    if (!quizForm.courseId && courses.length) setQuizForm((prev) => ({ ...prev, courseId: courses[0].id }));
    if (!selectedStudentId && students.length) setSelectedStudentId(students[0].uid);
  }, [courses, fileForm.courseId, quizForm.courseId, selectedStudentId, students]);

  const summary = useMemo(
    () => ({
      totalCourses: courses.length,
      activeStudents: students.filter((student) => !student.isBlocked).length,
      paidPayments: payments.filter((payment) => payment.status === "paid").length,
      pendingPayments: payments.filter((payment) => payment.status === "pending").length,
    }),
    [courses, payments, students]
  );

  const selectedStudent = students.find((student) => student.uid === selectedStudentId);
  const filteredStudents = students.filter((student) => {
    const term = studentSearch.trim().toLowerCase();
    if (!term) return true;
    return [student.name, student.phone, student.email, student.grade].some((value) =>
      String(value || "").toLowerCase().includes(term)
    );
  });

  function setErrorMessage(message) {
    setNotice("");
    setError(message);
  }

  async function refreshStudents() {
    const refreshed = await getTenantStudents();
    setStudents(refreshed);
  }

  async function submitCourse(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsBusy(true);
    try {
      await createCourse({ teacherId: user.uid, payload: courseForm });
      setNotice("تم حفظ الكورس بنجاح.");
      setCourseForm({
        title: "",
        description: "",
        grade: "الصف الثالث الثانوي",
        price: "",
        discountPercent: "",
        thumbnailUrl: "",
        units: [{ title: "", youtubeVideoId: "", order: 1, isFree: false }],
        resources: [],
      });
    } catch (saveError) {
      setErrorMessage(saveError.message || "تعذر حفظ الكورس.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const url = await uploadImageToStorage(file);
      setCourseForm((prev) => ({ ...prev, thumbnailUrl: url }));
    } catch (uploadError) {
      setErrorMessage(uploadError.message || "فشل رفع الصورة.");
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingFile(true);
    try {
      const url = await uploadFileToStorage(file);
      setFileForm((prev) => ({
        ...prev,
        fileUrl: url,
        fileName: file.name,
        fileType: file.type || file.name.split(".").pop(),
      }));
    } catch (uploadError) {
      setErrorMessage(uploadError.message || "فشل رفع الملف.");
    } finally {
      setIsUploadingFile(false);
      event.target.value = "";
    }
  }

  function updateUnit(index, field, value) {
    setCourseForm((prev) => {
      const units = [...prev.units];
      units[index] = { ...units[index], [field]: value };
      return { ...prev, units };
    });
  }

  function updateQuestion(index, field, value) {
    setQuizForm((prev) => {
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], [field]: value };
      return { ...prev, questions };
    });
  }

  function updateChoice(questionIndex, choiceIndex, value) {
    setQuizForm((prev) => {
      const questions = [...prev.questions];
      const choices = [...questions[questionIndex].choices];
      choices[choiceIndex] = value;
      questions[questionIndex] = { ...questions[questionIndex], choices };
      return { ...prev, questions };
    });
  }

  async function submitFile(event) {
    event.preventDefault();
    if (!fileForm.courseId) return;
    setError("");
    setNotice("");
    setIsBusy(true);
    try {
      await addResourceToCourse(fileForm.courseId, fileForm);
      setNotice("تمت إضافة الملف للكورس.");
      setFileForm((prev) => ({
        ...prev,
        title: "",
        fileUrl: "",
        fileName: "",
        fileType: "",
        order: "",
        isFree: false,
      }));
    } catch (fileError) {
      setErrorMessage(fileError.message || "تعذر إضافة الملف.");
    } finally {
      setIsBusy(false);
    }
  }

  async function submitQuiz(event) {
    event.preventDefault();
    if (!quizForm.courseId) return;
    setError("");
    setNotice("");
    setIsBusy(true);
    try {
      await addQuizToCourse(quizForm.courseId, quizForm);
      setNotice("تمت إضافة الكويز وتصحيحاته.");
      setQuizForm((prev) => ({
        ...prev,
        title: "",
        minutes: "15",
        order: "",
        questions: [emptyQuestion()],
      }));
    } catch (quizError) {
      setErrorMessage(quizError.message || "تعذر إضافة الكويز.");
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleStudentBlock(student) {
    setError("");
    setNotice("");
    try {
      if (student.isBlocked) {
        await unblockStudent(student.uid);
        setNotice("تم السماح للطالب بالدخول مرة أخرى.");
      } else {
        await blockStudent(student.uid);
        setNotice("تم طرد الطالب ومنعه من الدخول.");
      }
      await refreshStudents();
    } catch (blockError) {
      setErrorMessage(blockError.message || "تعذر تحديث حالة الطالب.");
    }
  }

  return (
    <DashboardLayout active="/teacher/dashboard">
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-right">
          <h1 className="text-3xl font-extrabold">لوحة تحكم المدرّس</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            إدارة الكورسات، الدروس، الملفات، الكويزات، الطلاب، المدفوعات والدرجات.
          </p>
        </motion.div>

        {(error || notice) && (
          <div
            className={`text-sm rounded-xl px-4 py-3 text-right border ${
              error
                ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/40"
                : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40"
            }`}
          >
            {error || notice}
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "عدد الكورسات", value: summary.totalCourses, icon: NotebookText },
            { label: "الطلاب النشطين", value: summary.activeStudents, icon: Users },
            { label: "مدفوعات مكتملة", value: summary.paidPayments, icon: Wallet },
            { label: "طلبات معلقة", value: summary.pendingPayments, icon: Clock3 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-white dark:bg-slate-900 rounded-2xl p-5 ring-1 ring-black/5 dark:ring-white/10">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-amber-400 flex items-center justify-center mb-3">
                  <Icon size={20} />
                </div>
                <p className="text-2xl font-extrabold">{item.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
              </div>
            );
          })}
        </section>

        <div className="flex gap-2 overflow-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  activeTab === tab.id
                    ? "bg-red-800 text-white dark:bg-amber-400 dark:text-slate-950"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "courses" && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <form onSubmit={submitCourse} className="bg-white dark:bg-slate-900 rounded-2xl p-6 ring-1 ring-black/5 dark:ring-white/10 space-y-4">
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <PlusCircle size={20} />
                إضافة كورس جديد
              </h2>
              <input name="title" value={courseForm.title} onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))} placeholder="اسم الكورس" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
              <textarea name="description" value={courseForm.description} onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))} placeholder="وصف الكورس" rows={3} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={courseForm.grade} onChange={(e) => setCourseForm((p) => ({ ...p, grade: e.target.value }))} placeholder="الصف الدراسي" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
                <input type="number" min="0" value={courseForm.price} onChange={(e) => setCourseForm((p) => ({ ...p, price: e.target.value }))} placeholder="السعر" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
                <input type="number" min="0" max="100" value={courseForm.discountPercent} onChange={(e) => setCourseForm((p) => ({ ...p, discountPercent: e.target.value }))} placeholder="الخصم %" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
              <label className="flex items-center justify-center gap-2 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 rounded-xl px-4 py-4 bg-slate-50 dark:bg-slate-950 hover:border-amber-400 transition-colors">
                <Upload size={16} />
                <span className="text-sm">{isUploadingImage ? "جاري رفع الصورة..." : "اختر صورة الكورس"}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {courseForm.thumbnailUrl && <img src={courseForm.thumbnailUrl} alt="صورة الكورس" className="w-full h-36 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />}

              <div className="space-y-3">
                <h3 className="font-bold">الدروس الفيديو</h3>
                {courseForm.units.map((unit, index) => (
                  <div key={`unit-${index}`} className="grid grid-cols-1 sm:grid-cols-12 gap-2 rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-700">
                    <input value={unit.title} onChange={(e) => updateUnit(index, "title", e.target.value)} placeholder={`عنوان الدرس ${index + 1}`} className="sm:col-span-4 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none" />
                    <input value={unit.youtubeVideoId} onChange={(e) => updateUnit(index, "youtubeVideoId", e.target.value)} placeholder="YouTube link أو Video ID" className="sm:col-span-5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none" />
                    <input type="number" min="1" value={unit.order} onChange={(e) => updateUnit(index, "order", Number(e.target.value))} placeholder="الترتيب" className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none" />
                    <button type="button" onClick={() => setCourseForm((p) => ({ ...p, units: p.units.filter((_, i) => i !== index) }))} className="rounded-lg text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setCourseForm((p) => ({ ...p, units: [...p.units, { title: "", youtubeVideoId: "", order: p.units.length + 1, isFree: false }] }))} className="text-sm font-bold text-red-800 dark:text-amber-400">
                  + إضافة درس فيديو
                </button>
              </div>
              <button type="submit" disabled={isBusy} className="w-full bg-red-800 text-white font-extrabold rounded-xl py-3 hover:bg-red-900 disabled:opacity-60">
                {isBusy ? "جاري الحفظ..." : "حفظ الكورس"}
              </button>
            </form>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 ring-1 ring-black/5 dark:ring-white/10">
              <h2 className="text-xl font-extrabold mb-4">الكورسات الحالية</h2>
              <div className="space-y-3 max-h-[42rem] overflow-auto">
                {courses.map((course) => (
                  <div key={course.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{course.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <BadgeDollarSign size={12} className="inline ml-1" />
                          {course.price || 0} ج.م · خصم {course.discountPercent || 0}%
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          المحتوى: {buildCourseContent(course).length} عنصر
                        </p>
                      </div>
                      <button type="button" onClick={() => deleteCourse(course.id)} className="text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg p-2">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "files" && (
          <form onSubmit={submitFile} className="bg-white dark:bg-slate-900 rounded-2xl p-6 ring-1 ring-black/5 dark:ring-white/10 space-y-4">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <FileText size={20} />
              إضافة PDF أو PowerPoint داخل ترتيب الكورس
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={fileForm.courseId} onChange={(e) => setFileForm((p) => ({ ...p, courseId: e.target.value }))} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300">
                {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
              <input value={fileForm.title} onChange={(e) => setFileForm((p) => ({ ...p, title: e.target.value }))} placeholder="عنوان الملف" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
              <input type="number" min="1" value={fileForm.order} onChange={(e) => setFileForm((p) => ({ ...p, order: e.target.value }))} placeholder="مكانه في الترتيب" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
            <label className="flex items-center justify-center gap-2 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 rounded-xl px-4 py-6 bg-slate-50 dark:bg-slate-950 hover:border-amber-400 transition-colors">
              <Upload size={16} />
              <span className="text-sm">{isUploadingFile ? "جاري رفع الملف..." : fileForm.fileName || "اختر PDF أو PowerPoint"}</span>
              <input type="file" accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={handleFileUpload} className="hidden" />
            </label>
            <button type="submit" disabled={isBusy || !fileForm.fileUrl} className="w-full bg-red-800 text-white font-extrabold rounded-xl py-3 hover:bg-red-900 disabled:opacity-60">
              إضافة الملف
            </button>
          </form>
        )}

        {activeTab === "quizzes" && (
          <form onSubmit={submitQuiz} className="bg-white dark:bg-slate-900 rounded-2xl p-6 ring-1 ring-black/5 dark:ring-white/10 space-y-4">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <HelpCircle size={20} />
              إضافة كويز MCQ في ترتيب محدد
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select value={quizForm.courseId} onChange={(e) => setQuizForm((p) => ({ ...p, courseId: e.target.value }))} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300">
                {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
              <input value={quizForm.title} onChange={(e) => setQuizForm((p) => ({ ...p, title: e.target.value }))} placeholder="عنوان الكويز" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
              <input type="number" min="1" value={quizForm.minutes} onChange={(e) => setQuizForm((p) => ({ ...p, minutes: e.target.value }))} placeholder="الوقت بالدقائق" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
              <input type="number" min="1" value={quizForm.order} onChange={(e) => setQuizForm((p) => ({ ...p, order: e.target.value }))} placeholder="مكانه في الترتيب" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
            <div className="space-y-4">
              {quizForm.questions.map((question, questionIndex) => (
                <div key={`question-${questionIndex}`} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
                  <input value={question.prompt} onChange={(e) => updateQuestion(questionIndex, "prompt", e.target.value)} placeholder={`نص السؤال ${questionIndex + 1}`} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {question.choices.map((choice, choiceIndex) => (
                      <label key={choiceIndex} className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-700">
                        <input type="radio" name={`correct-${questionIndex}`} checked={Number(question.correctIndex) === choiceIndex} onChange={() => updateQuestion(questionIndex, "correctIndex", choiceIndex)} />
                        <input value={choice} onChange={(e) => updateChoice(questionIndex, choiceIndex, e.target.value)} placeholder={`اختيار ${choiceIndex + 1}`} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                      </label>
                    ))}
                  </div>
                  <button type="button" onClick={() => setQuizForm((p) => ({ ...p, questions: p.questions.filter((_, i) => i !== questionIndex) }))} className="text-xs font-bold text-red-700">
                    حذف السؤال
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setQuizForm((p) => ({ ...p, questions: [...p.questions, emptyQuestion()] }))} className="text-sm font-bold text-red-800 dark:text-amber-400">
              + إضافة سؤال
            </button>
            <button type="submit" disabled={isBusy} className="w-full bg-red-800 text-white font-extrabold rounded-xl py-3 hover:bg-red-900 disabled:opacity-60">
              حفظ الكويز
            </button>
          </form>
        )}

        {activeTab === "students" && (
          <section className="grid grid-cols-1 xl:grid-cols-[22rem_minmax(0,1fr)] gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 ring-1 ring-black/5 dark:ring-white/10">
              <div className="relative mb-4">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="بحث عن طالب..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pr-10 pl-3 py-2.5 text-sm outline-none" />
              </div>
              <div className="space-y-2 max-h-[34rem] overflow-auto">
                {filteredStudents.map((student) => (
                  <button key={student.uid} type="button" onClick={() => setSelectedStudentId(student.uid)} className={`w-full rounded-xl border p-3 text-right transition-colors ${selectedStudentId === student.uid ? "border-red-800 bg-red-50 dark:border-amber-400 dark:bg-amber-400/10" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"}`}>
                    <p className="font-bold">{student.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{student.phone}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 ring-1 ring-black/5 dark:ring-white/10">
              {selectedStudent ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold">{selectedStudent.name}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{selectedStudent.email}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{selectedStudent.phone} · {selectedStudent.grade} · {selectedStudent.governorate}</p>
                    </div>
                    <button type="button" onClick={() => toggleStudentBlock(selectedStudent)} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${selectedStudent.isBlocked ? "bg-emerald-600 text-white" : "bg-red-700 text-white"}`}>
                      {selectedStudent.isBlocked ? <Unlock size={16} /> : <Ban size={16} />}
                      {selectedStudent.isBlocked ? "إلغاء الطرد" : "طرد الطالب"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">الكورسات</p>
                      <p className="text-2xl font-extrabold">{selectedStudent.enrolledCourses?.length || 0}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">الدروس المكتملة</p>
                      <p className="text-2xl font-extrabold">{Object.values(selectedStudent.progress || {}).reduce((sum, item) => sum + (item?.watchedLessons?.length || 0), 0)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">الحالة</p>
                      <p className={`text-lg font-extrabold ${selectedStudent.isBlocked ? "text-red-600" : "text-emerald-600"}`}>{selectedStudent.isBlocked ? "مطرود" : "نشط"}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-extrabold mb-3">درجات الكويزات</h3>
                    <div className="space-y-2">
                      {attempts.filter((attempt) => attempt.uid === selectedStudent.uid).map((attempt) => (
                        <div key={attempt.id} className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-bold">{attempt.quizTitle}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(attempt.createdAt)}</p>
                          </div>
                          <span className="font-extrabold text-red-800 dark:text-amber-400">{attempt.percentage}%</span>
                        </div>
                      ))}
                      {attempts.filter((attempt) => attempt.uid === selectedStudent.uid).length === 0 && <p className="text-sm text-slate-500">لا توجد درجات حتى الآن.</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">اختر طالبًا لعرض التفاصيل.</p>
              )}
            </div>
          </section>
        )}

        {activeTab === "reports" && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 ring-1 ring-black/5 dark:ring-white/10">
              <h2 className="text-xl font-extrabold mb-4">سجل المدفوعات</h2>
              <div className="space-y-2 max-h-[32rem] overflow-auto">
                {payments.map((payment) => (
                  <div key={payment.id} className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{payment.studentName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{payment.courseTitle}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{payment.amount} ج.م</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{payment.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 ring-1 ring-black/5 dark:ring-white/10">
              <h2 className="text-xl font-extrabold mb-4">آخر درجات الكويزات</h2>
              <div className="space-y-2 max-h-[32rem] overflow-auto">
                {attempts.map((attempt) => (
                  <div key={attempt.id} className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{attempt.quizTitle}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{attempt.uid}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-extrabold">{attempt.earnedPoints}/{attempt.totalPoints}</p>
                      <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} />{attempt.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
