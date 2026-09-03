import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  GraduationCap,
  MapPinned,
  Mail,
  Phone,
  AlertTriangle,
  FileSpreadsheet,
  MessageCircle,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardLayout from "../components/DashboardLayout.jsx";
import {
  addQuizToCourse,
  addResourceToCourse,
  blockStudent,
  buildCourseContent,
  createCourse,
  deleteCourse,
  deleteLesson,
  deleteQuizFromCourse,
  deleteResourceFromCourse,
  getCourseById,
  getTenantStudents,
  updateCourse,
  subscribeCourses,
  subscribeQuizAttempts,
  unblockStudent,
  addLessonToModule
} from "../services/courseService.js";
import { approvePaymentRequest, subscribePaymentRequests, subscribePayments } from "../services/paymentService.js";
import { uploadFileToStorage, uploadImageToStorage } from "../services/storageService.js";
import apiClient from "../lib/apiClient.js";
import AccessCodeManager from "../components/AccessCodeManager.jsx";
import TeacherEssayGrader from "../components/TeacherEssayGrader.jsx";
import StandaloneLectureForm from "../components/StandaloneLectureForm.jsx";
import { KeyRound, FileEdit, Video } from "lucide-react";

const tabs = [
  { id: "courses", label: "الكورسات الحالية", icon: BookOpen },
  { id: "access-codes", label: "أكواد التفعيل (12 رقم)", icon: KeyRound },
  { id: "essay-grading", label: "تصحيح الأسئلة المقالية", icon: FileEdit },
  { id: "students", label: "بيانات الطلاب", icon: Users },
  { id: "student-details", label: "تتبع وتفاصيل الطلاب", icon: NotebookText },
  { id: "incoming-requests", label: "الطلبات الواردة", icon: Wallet },
  { id: "add-course", label: "إضافة كورس جديد", icon: PlusCircle },
  { id: "add-standalone-lecture", label: "إضافة محاضرة مستقلة", icon: Video },
  { id: "add-exam", label: "إضافة امتحان جديد", icon: HelpCircle },
];

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ar-EG", { hour12: true });
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

const emptyQuestion = () => ({
  prompt: "",
  choices: ["", "", "", ""],
  correctIndex: 0,
  points: 1,
});

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const isTeacher = user?.role === "teacher";
  const [activeTab, setActiveTab] = useState(urlTab || "courses");

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentGovernorateFilter, setStudentGovernorateFilter] = useState("");
  const [banSearch, setBanSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Filter helper to exclude placeholder code-only accounts
  const isCodeStudent = (s) => {
    if (!s) return false;
    const name = String(s.name || s.fullName || "").trim();
    const email = String(s.email || "").trim().toLowerCase();
    return name.includes("كود") || name.startsWith("طالب (كود") || email.startsWith("code_") || email.endsWith("@student.lms");
  };

  // Stats / Dashboard calculations
  const summary = useMemo(() => {
    return {
      totalCourses: courses.length,
      activeStudents: students.filter((student) => !student.isBlocked && !isCodeStudent(student)).length,
      paidPayments: payments.filter((payment) => payment.status === "paid").length,
      pendingRequests: paymentRequests.filter((request) => request.status === "pending").length,
    };
  }, [courses, payments, paymentRequests, students]);

  // Fetch top 3 governorates dynamically (excluding code students)
  const topGovernorates = useMemo(() => {
    const counts = {};
    students.filter(s => !isCodeStudent(s)).forEach((s) => {
      const gov = (s.governorate || "غير محدد").trim();
      counts[gov] = (counts[gov] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [students]);

  const governorateOptions = useMemo(() => {
    return [...new Set(students.filter(s => !isCodeStudent(s)).map((student) => student.governorate).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), "ar"));
  }, [students]);

  // Subscriptions
  useEffect(() => {
    const unsubCourses = subscribeCourses(setCourses, true);
    const unsubPayments = subscribePayments(setPayments);
    const unsubPaymentRequests = subscribePaymentRequests(setPaymentRequests);
    const unsubAttempts = subscribeQuizAttempts(setAttempts);
    getTenantStudents()
      .then((list) => setStudents(list.filter(s => !isCodeStudent(s))))
      .catch(() => setError("تعذر تحميل قائمة الطلاب."));
    return () => {
      unsubCourses();
      unsubPayments();
      unsubPaymentRequests();
      unsubAttempts();
    };
  }, []);

  // Fetch selected student detailed data
  useEffect(() => {
    if (selectedStudentId && (activeTab === "students" || activeTab === "student-details")) {
      setLoadingDetail(true);
      apiClient.get(`/api/users/students/${selectedStudentId}`)
        .then(({ data }) => {
          setSelectedStudentDetail(data);
          setLoadingDetail(false);
        })
        .catch(() => {
          setSelectedStudentDetail(null);
          setLoadingDetail(false);
        });
    }
  }, [selectedStudentId, activeTab]);

  // Automatically select first items on load
  useEffect(() => {
    if (!selectedStudentId && students.length) {
      setSelectedStudentId(students[0].uid);
    }
  }, [students, selectedStudentId]);

  // 1. ADD COURSE FORM STATE
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    grade: "الصف الثالث الثانوي",
    price: "",
    discountPercent: "",
    thumbnailUrl: "",
    isFree: false,
    isPublished: true,
  });
  const [editingCourseId, setEditingCourseId] = useState("");

  // State to append lessons, resources, or quizzes to an EXISTING course dynamically
  const [selectedCourseForItems, setSelectedCourseForItems] = useState("");
  const currentSelectedCourseObj = useMemo(() => {
    return courses.find(c => c.id === selectedCourseForItems) || courses[0] || null;
  }, [courses, selectedCourseForItems]);
  const editingCourseObj = useMemo(() => {
    return editingCourseId ? courses.find((course) => course.id === editingCourseId) || null : null;
  }, [courses, editingCourseId]);
  const currentSelectedCourseContent = useMemo(() => {
    return currentSelectedCourseObj ? buildCourseContent(currentSelectedCourseObj) : [];
  }, [currentSelectedCourseObj]);

  useEffect(() => {
    if (courses.length && !selectedCourseForItems) {
      setSelectedCourseForItems(courses[0].id);
    }
  }, [courses, selectedCourseForItems]);

  // Helper to calculate the next FIFO order index
  const nextItemOrder = useMemo(() => {
    if (!currentSelectedCourseObj) return 1;
    const content = buildCourseContent(currentSelectedCourseObj);
    if (content.length === 0) return 1;
    const maxOrder = Math.max(...content.map(item => item.sortOrder || item.order || 0));
    return maxOrder + 1;
  }, [currentSelectedCourseObj]);

  // Forms for adding content sequentially
  const [lessonForm, setLessonForm] = useState({ title: "", videoUrl: "", isPreview: false });
  const [fileForm, setFileForm] = useState({ title: "", fileUrl: "", fileName: "", fileType: "", isFree: false });
  const [quizForm, setQuizForm] = useState({ title: "", minutes: "15", isMandatory: false, questions: [emptyQuestion()] });
  const [fileInputMode, setFileInputMode] = useState("url"); // "url" | "device"
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [videoInputMode, setVideoInputMode] = useState("upload"); // "upload" | "url"
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);

  // 2. EXAM FORM STATE
  const [examForm, setExamForm] = useState({
    courseId: "",
    title: "",
    price: "",
    isFree: false,
    questionsCount: 5,
    questions: Array.from({ length: 5 }, () => emptyQuestion()),
  });

  useEffect(() => {
    if (courses.length && !examForm.courseId) {
      setExamForm(prev => ({ ...prev, courseId: courses[0].id }));
    }
  }, [courses, examForm.courseId]);

  function setErrorMessage(message) {
    setNotice("");
    setError(message);
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    setError("");
    try {
      const url = await uploadImageToStorage(file);
      setCourseForm((prev) => ({ ...prev, thumbnailUrl: url }));
      setNotice("تم رفع صورة الغلاف بنجاح!");
    } catch (uploadError) {
      setErrorMessage("فشل رفع الصورة: " + uploadError.message);
    } finally {
      setIsUploadingImage(false);
    }
  }

  // FIFO sequential additions to courses
  async function handleAddLesson(e) {
    e.preventDefault();
    if (!currentSelectedCourseObj || !lessonForm.title) return;
    setIsBusy(true);
    setError("");
    setNotice("");
    try {
      // Find the module or create one
      let moduleId = currentSelectedCourseObj.modules?.[0]?.id;
      if (!moduleId) {
        const updatedCourse = await apiClient.post(`/api/courses/${currentSelectedCourseObj.id}/modules`, {
          title: "المحاضرات الرئيسية",
          sortOrder: 1
        });
        moduleId = updatedCourse.data.modules[0].id;
      }
      
      await addLessonToModule(moduleId, {
        title: lessonForm.title,
        videoUrl: lessonForm.videoUrl, // can be Drive File ID or YT link
        sortOrder: nextItemOrder,
        isPreview: lessonForm.isPreview
      });

      setNotice("تمت إضافة المحاضرة بالترتيب FIFO بنجاح!");
      setLessonForm({ title: "", videoUrl: "", isPreview: false });
    } catch (err) {
      setErrorMessage(err.message || "تعذر إضافة الدرس");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAddFile(e) {
    e.preventDefault();
    if (!currentSelectedCourseObj || !fileForm.title || !fileForm.fileUrl) return;
    setIsBusy(true);
    setError("");
    setNotice("");
    try {
      await addResourceToCourse(currentSelectedCourseObj.id, {
        title: fileForm.title,
        fileUrl: fileForm.fileUrl,
        fileName: fileForm.fileName || "ملزمة كيمياء.pdf",
        fileType: "pdf",
        order: nextItemOrder,
        isFree: fileForm.isFree
      });
      setNotice("تمت إضافة الملزمة/الملف بالترتيب FIFO بنجاح!");
      setFileForm({ title: "", fileUrl: "", fileName: "", fileType: "", isFree: false });
    } catch (err) {
      setErrorMessage(err.message || "تعذر إضافة الملف");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAddQuiz(e) {
    e.preventDefault();
    if (!currentSelectedCourseObj || !quizForm.title) return;
    setIsBusy(true);
    setError("");
    setNotice("");
    try {
      await addQuizToCourse(currentSelectedCourseObj.id, {
        title: quizForm.title,
        minutes: Number(quizForm.minutes),
        order: nextItemOrder,
        isMandatory: quizForm.isMandatory,
        questions: quizForm.questions
      });
      setNotice("تمت إضافة الكويز بالترتيب FIFO بنجاح!");
      setQuizForm({ title: "", minutes: "15", isMandatory: false, questions: [emptyQuestion()] });
    } catch (err) {
      setErrorMessage(err.message || "تعذر إضافة الكويز");
    } finally {
      setIsBusy(false);
    }
  }

  // Create Course
  async function submitCourse(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsBusy(true);
    try {
      const payload = {
        title: courseForm.title,
        description: courseForm.description,
        grade: courseForm.grade,
        price: courseForm.isFree ? 0 : Number(courseForm.price || 0),
        discountPercent: Number(courseForm.discountPercent || 0),
        thumbnailUrl: courseForm.thumbnailUrl,
        isPublished: courseForm.isPublished,
        slug: courseForm.slug || "",
        units: editingCourseObj?.units || [],
        resources: editingCourseObj?.resources || [],
        quizzes: editingCourseObj?.quizzes || [],
      };

      if (editingCourseId) {
        const updatedCourse = await updateCourse(editingCourseId, payload);
        await refreshCourseCard(updatedCourse);
        setNotice("تم تحديث بيانات الكورس بنجاح.");
      } else {
        const createdCourse = await createCourse({
          teacherId: user.uid,
          payload: {
            ...payload,
            units: [],
            resources: [],
            quizzes: [],
          }
        });
        setCourses((prev) => [createdCourse, ...prev.filter((course) => course.id !== createdCourse.id)]);
        setNotice("تم إنشاء الكورس الجديد بنجاح! يمكنك الآن إضافة محتويات إليه.");
      }
      setCourseForm({
        title: "",
        description: "",
        grade: "الصف الثالث الثانوي",
        price: "",
        discountPercent: "",
        thumbnailUrl: "",
        isFree: false,
        isPublished: true,
      });
      setEditingCourseId("");
    } catch (err) {
      setErrorMessage(err.message || "تعذر حفظ الكورس.");
    } finally {
      setIsBusy(false);
    }
  }

  function startEditCourse(course) {
    setEditingCourseId(course.id);
    setCourseForm({
      title: course.title || "",
      description: course.description || "",
      grade: course.grade || "الصف الثالث الثانوي",
      price: String(course.price || ""),
      discountPercent: String(course.discountPercent || ""),
      thumbnailUrl: course.thumbnailUrl || "",
      isFree: Number(course.price || 0) <= 0,
      isPublished: course.isPublished !== false,
    });
    setActiveTab("add-course");
  }

  async function refreshCourseCard(updatedCourse) {
    setCourses((prev) => prev.map((course) => (course.id === updatedCourse.id ? updatedCourse : course)));
  }

  async function removeLessonItem(lessonId) {
    if (!currentSelectedCourseObj) return;
    await deleteLesson(lessonId);
    const refreshed = await getCourseById(currentSelectedCourseObj.id, { includeUnpublished: true });
    await refreshCourseCard(refreshed);
  }

  async function removeResourceItem(resourceId) {
    if (!currentSelectedCourseObj) return;
    const refreshed = await deleteResourceFromCourse(currentSelectedCourseObj.id, resourceId);
    await refreshCourseCard(refreshed);
  }

  async function removeQuizItem(quizId) {
    if (!currentSelectedCourseObj) return;
    const refreshed = await deleteQuizFromCourse(currentSelectedCourseObj.id, quizId);
    await refreshCourseCard(refreshed);
  }

  function openWhatsAppParent(parentPhone, studentName, studentId) {
    if (!parentPhone || parentPhone === "غير مسجل") {
      alert("رقم ولي الأمر غير مسجل لهذا الطالب.");
      return;
    }
    let cleanPhone = String(parentPhone).replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "20" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("20") && cleanPhone.length === 10) {
      cleanPhone = "20" + cleanPhone;
    }
    const message = `مساء الخير يا فندم، معاك تيم متابعة دكتور مينا موريد بخصوص الطالب: ${studentName || ""} (كود الطالب: ${studentId || "---"}). نحب نطمن حضرتك على مستواه ومتابعته للكيمياء على المنصة.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function openWhatsAppStudent(studentPhone, studentName, studentId) {
    if (!studentPhone || studentPhone === "غير مسجل") {
      alert("رقم الطالب غير متوفر.");
      return;
    }
    let cleanPhone = String(studentPhone).replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "20" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("20") && cleanPhone.length === 10) {
      cleanPhone = "20" + cleanPhone;
    }
    const message = `أهلاً بك يا ${studentName || "بطل"}، معاك تيم متابعة دكتور مينا موريد (منصة الكيمياء). نتمنى لك التوفيق دائماً!`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function exportStudentsToExcel() {
    const realStudents = (students || []).filter(s => !isCodeStudent(s));
    if (realStudents.length === 0) {
      alert("لا يوجد طلاب مسجلين لتصديرهم.");
      return;
    }

    const dataToExport = realStudents.map((s, index) => ({
      "م": index + 1,
      "اسم الطالب": s.name || "",
      "معرّف الطالب (ID)": s.studentId || "عشوائي",
      "رقم هاتف الطالب": s.phone || "",
      "رقم هاتف ولي الأمر": s.parentPhone || "غير مسجل",
      "المحافظة": s.governorate || "",
      "السنتر / أونلاين": s.center ? `سنتر ${s.center}` : "أونلاين",
      "الصف الدراسي": s.grade || "",
      "البريد الإلكتروني": s.email || "",
      "حالة الحساب": s.isBlocked ? "مطرود من المنصة" : "نشط ومفعل",
      "عدد الكورسات": s.enrolledCourses ? s.enrolledCourses.length : 0,
      "تاريخ التسجيل": s.createdAt ? new Date(s.createdAt).toLocaleDateString("ar-EG") : ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet["!cols"] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 16 },
      { wch: 18 },
      { wch: 20 },
      { wch: 15 },
      { wch: 16 },
      { wch: 18 },
      { wch: 28 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "بيانات الطلاب");
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `شيت_بيانات_الطلاب_${dateStr}.xlsx`);
  }

  // Create Exam Form MCQ Questions helper
  function updateExamQuestion(qIdx, field, val) {
    setExamForm(prev => {
      const questions = [...prev.questions];
      questions[qIdx] = { ...questions[qIdx], [field]: val };
      return { ...prev, questions };
    });
  }

  function updateExamChoice(qIdx, cIdx, val) {
    setExamForm(prev => {
      const questions = [...prev.questions];
      const choices = [...questions[qIdx].choices];
      choices[cIdx] = val;
      questions[qIdx] = { ...questions[qIdx], choices };
      return { ...prev, questions };
    });
  }

  // Save the exam as an obligatory (isMandatory = true) MCQ quiz in the selected course
  async function submitExam(e) {
    e.preventDefault();
    if (!examForm.courseId || !examForm.title) return;
    setIsBusy(true);
    setError("");
    setNotice("");
    try {
      await addQuizToCourse(examForm.courseId, {
        title: examForm.title,
        minutes: 30, // 30 mins standard exam length
        order: 99, // exams sit at the end
        isMandatory: true, // Exams are mandatory and block next modules
        questions: examForm.questions
      });
      setNotice("تم إنشاء الامتحان وإضافته كاختبار إجباري بنجاح!");
      setExamForm(prev => ({
        ...prev,
        title: "",
        questions: Array.from({ length: prev.questionsCount }, () => emptyQuestion())
      }));
    } catch (err) {
      setErrorMessage(err.message || "فشل إنشاء الامتحان");
    } finally {
      setIsBusy(false);
    }
  }

  async function approveRequest(requestId) {
    setError("");
    setNotice("");
    setIsBusy(true);
    try {
      await approvePaymentRequest(requestId);
      setPaymentRequests((items) =>
        items.map((item) => item.id === requestId ? { ...item, status: "approved" } : item)
      );
      setNotice("تم تفعيل الكورس للطالب فوراً وإرسال تأكيد التفعيل.");
    } catch (err) {
      setErrorMessage(err.message || "فشل اعتماد الطلب.");
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleStudentBlock(studentObj) {
    setError("");
    setNotice("");
    try {
      if (studentObj.isBlocked) {
        await unblockStudent(studentObj.uid);
        setNotice("تم إلغاء طرد الطالب والسماح له بالدخول.");
      } else {
        await blockStudent(studentObj.uid);
        setNotice("تم طرد الطالب ومنعه من دخول المنصة.");
      }
      const refreshed = await getTenantStudents();
      setStudents(refreshed);
    } catch (err) {
      setErrorMessage(err.message || "فشل تحديث حالة الطالب.");
    }
  }

  // Search filter for students tab (excluding code-only students)
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (isCodeStudent(s)) return false;
      const term = studentSearch.trim().toLowerCase();
      const matchesGovernorate = !studentGovernorateFilter || s.governorate === studentGovernorateFilter;
      if (!matchesGovernorate) return false;
      if (!term) return true;
      return [s.name, s.phone, s.studentId, s.email, s.governorate].some(val =>
        String(val || "").toLowerCase().includes(term)
      );
    });
  }, [students, studentSearch, studentGovernorateFilter]);

  const banFoundStudent = useMemo(() => {
    const term = banSearch.trim().toLowerCase();
    if (!term) return null;
    return students.find(s =>
      String(s.name).toLowerCase().includes(term) || String(s.phone).includes(term)
    );
  }, [students, banSearch]);

  return (
    <DashboardLayout
      active="/teacher/dashboard"
      activeTab={activeTab}
      onTabChange={handleTabChange}
      badges={{ pendingRequests: summary.pendingRequests }}
    >
      <div className="space-y-8 font-['Cairo',_sans-serif] text-slate-800" dir="rtl">
        
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-l from-[#0077B6] to-[#00A8E8] text-white p-6 rounded-3xl shadow-xl">
          <div>
            <h1 className="text-3xl font-black">لوحة تحكم المعلم</h1>
            <p className="text-xs opacity-90 mt-1">الدكتور مينا موريد · Dr. MENA MOURID Chemistry LMS</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl backdrop-blur">
            <GraduationCap />
            <span className="font-extrabold text-sm">كيمياء الكبار</span>
          </div>
        </div>

        {/* Global Alert Notification Banner */}
        {(error || notice) && (
          <div
            className={`text-sm rounded-2xl px-5 py-4 border ${
              error
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {error || notice}
          </div>
        )}

        {/* Quick Analytics Summary */}
        {activeTab === "students" && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "إجمالي الكورسات المرفوعة", value: summary.totalCourses, icon: BookOpen },
            { label: "الطلاب المسجلين بالمنصة", value: summary.activeStudents, icon: Users },
            { label: "عمليات الشراء المعتمدة", value: summary.paidPayments, icon: CheckCircle2 },
            { label: "طلبات انتظار التفعيل", value: summary.pendingRequests, icon: Clock3, highlight: summary.pendingRequests > 0 },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className={`bg-white rounded-3xl p-5 border border-cyan-100 shadow-sm ${
                item.highlight ? "border-[#FF6B35] bg-orange-50/20" : ""
              }`}>
                <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-[#0077B6] flex items-center justify-center mb-3">
                  <Icon size={20} />
                </div>
                <p className="text-3xl font-black text-slate-900">{item.value}</p>
                <p className="text-xs text-slate-500 mt-1 font-bold">{item.label}</p>
              </div>
            );
          })}
        </section>
        )}

        {/* Mobile-only tab strip (hidden on desktop — sidebar handles navigation) */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            const badgeCount = tab.id === "incoming-requests" ? summary.pendingRequests : 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative shrink-0 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-all duration-200 border ${
                  isTabActive
                    ? "bg-[#0077B6] text-white border-[#0077B6] shadow-md"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-cyan-50"
                }`}
              >
                <Icon size={15} />
                {tab.label}
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center px-1 animate-pulse">
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* --- TAB: ACCESS CODES --- */}
        {activeTab === "access-codes" && (
          <AccessCodeManager courses={courses} />
        )}

        {/* --- TAB: ESSAY GRADING --- */}
        {activeTab === "essay-grading" && (
          <TeacherEssayGrader />
        )}

        {/* --- TAB 1: CURRENT COURSES LIST (GRID view) --- */}
        {activeTab === "courses" && (
          <section className="bg-white border border-cyan-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-black text-[#0077B6] mb-5">جميع الكورسات الحالية المرفوعة</h2>
            {courses.length === 0 ? (
              <p className="text-slate-500 text-center py-10 font-bold">لا توجد كورسات مرفوعة حتى الآن.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {courses.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col justify-between">
                    <div className="relative h-44 bg-slate-100">
                      {c.thumbnailUrl ? (
                        <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <BookOpen size={48} />
                        </div>
                      )}
                      <span className="absolute top-3 left-3 bg-[#0077B6] text-white text-xs font-bold px-3 py-1 rounded-full">
                        {c.grade}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-black text-lg text-slate-900 leading-tight">{c.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{c.description || "لا يوجد وصف."}</p>
                      
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-sm font-black text-[#FF6B35]">
                          {c.price === 0 ? "مجاني" : `${c.price} ج.م`}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          المشتركين: {c.studentsCount} طالب
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditCourse(c)}
                          className="text-[#0077B6] hover:text-[#005f92] px-2 py-1 rounded-lg hover:bg-cyan-50 text-[11px] font-extrabold transition"
                        >
                          تعديل الكورس
                        </button>
                        <span className="text-[11px] text-slate-400 font-bold">
                          تحديث: {formatDate(c.updatedAt)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm("هل تريد حذف هذا الكورس نهائياً؟")) {
                            await deleteCourse(c.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* --- TAB 2: STUDENTS DATA PANEL (Governorates & Search list + Block screen) --- */}
        {activeTab === "students" && (
          <section className="grid grid-cols-1 xl:grid-cols-[1fr_24rem] gap-6">
            
            {/* Right student panel */}
            <div className="bg-white border border-cyan-100 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Stats and Top Governorates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-cyan-50/50 p-4 border border-cyan-100">
                  <p className="text-xs text-slate-500 font-bold">إجمالي المسجلين بالمنصة</p>
                  <p className="text-3xl font-black text-[#0077B6] mt-2">{students.filter(s => !isCodeStudent(s)).length} طالب</p>
                </div>
                <div className="rounded-2xl bg-cyan-50/50 p-4 border border-cyan-100 text-right space-y-1">
                  <p className="text-xs text-slate-500 font-bold">أكثر المحافظات تواجداً</p>
                  <div className="text-xs font-black space-y-1 mt-1 text-slate-800">
                    {topGovernorates.map((gov, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{gov[1]} طلاب</span>
                        <span>{i + 1}. {gov[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scrollable stack of student cards */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">سجل الطلاب بالكامل</h3>
                    <p className="text-[11px] text-slate-400 font-bold">إجمالي الطلاب: {students.length} طالب</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={exportStudentsToExcel}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-sm transition"
                      title="تحميل شيت إكسيل يحتوي على جميع بيانات الطلاب وأولياء أمورهم"
                    >
                      <Download size={14} />
                      استخراج شيت إكسيل لبيانات الطلاب
                    </button>
                    <div className="relative w-full sm:w-44">
                      <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="بحث بالاسم أو ID..."
                        className="w-full text-xs rounded-xl border border-slate-200 pr-8 pl-3 py-2 outline-none focus:border-[#0077B6] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <select
                      value={studentGovernorateFilter}
                      onChange={(e) => setStudentGovernorateFilter(e.target.value)}
                      className="w-full sm:w-36 text-xs rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#0077B6] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="">كل المحافظات</option>
                      {governorateOptions.map((governorate) => (
                        <option key={governorate} value={governorate}>{governorate}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-1">
                  {filteredStudents.map((s) => {
                    const enrolledBefore = s.enrolledCourses && s.enrolledCourses.length > 0;
                    return (
                      <div
                        key={s.uid}
                        className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition ${
                          selectedStudentId === s.uid ? "border-[#0077B6] bg-blue-50/20" : "border-slate-100 bg-slate-50/40"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-950">{s.name}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                              ID: {s.studentId || "عشوائي"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 font-bold">
                            {s.phone ? (
                              <button
                                type="button"
                                onClick={() => openWhatsAppStudent(s.phone, s.name, s.studentId)}
                                className="text-cyan-700 hover:text-cyan-900 hover:underline flex items-center gap-1 font-extrabold"
                                title="مراسلة الطالب على واتساب فوراً"
                              >
                                <MessageCircle size={13} className="text-emerald-500" />
                                الطالب: {s.phone}
                              </button>
                            ) : (
                              <span>الطالب: غير مسجل</span>
                            )}
                            {s.parentPhone && s.parentPhone !== "غير مسجل" && (
                              <button
                                type="button"
                                onClick={() => openWhatsAppParent(s.parentPhone, s.name, s.studentId)}
                                className="text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 font-black"
                                title="مراسلة ولي الأمر على واتساب فوراً"
                              >
                                <MessageCircle size={13} className="text-emerald-500" />
                                الولي: {s.parentPhone}
                              </button>
                            )}
                            <span>· {s.governorate} · {s.grade}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            حالة الكورسات السابقة:{" "}
                            <span className={enrolledBefore ? "text-emerald-600 font-black" : "text-slate-400 font-bold"}>
                              {enrolledBefore ? "مشترك في كورس سابق" : "لا يوجد اشتراكات"}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentId(s.uid)}
                            className="text-xs bg-[#0077B6] text-white font-extrabold px-3 py-1.5 rounded-xl hover:bg-[#005f92] transition"
                          >
                            تحديد
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(s.uid);
                              setBanSearch(s.phone);
                            }}
                            className="text-xs bg-[#FF6B35]/10 text-[#FF6B35] font-extrabold px-3 py-1.5 rounded-xl hover:bg-[#FF6B35]/20 transition"
                          >
                            تعديل الحظر
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredStudents.length === 0 && <p className="text-sm text-slate-500 text-center py-6">لا يوجد نتائج تطابق البحث.</p>}
                </div>
              </div>

            </div>

            {/* Left ban/unban dashboard panel (تعديل) */}
            <div className="bg-white border border-cyan-100 rounded-3xl p-6 shadow-sm space-y-4 h-max text-right">
              <h3 className="text-lg font-black text-[#FF6B35] border-b border-slate-100 pb-2 flex items-center gap-2">
                <Ban size={18} />
                تعديل حالة حظر الطالب
              </h3>
              
              <div className="relative">
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={banSearch}
                  onChange={(e) => setBanSearch(e.target.value)}
                  placeholder="ابحث برقم التليفون أو الاسم لطرد الطالب..."
                  className="w-full text-sm rounded-xl border border-slate-200 pr-10 pl-3 py-3 outline-none focus:border-[#FF6B35]"
                />
              </div>

              {banFoundStudent ? (
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3.5 mt-4 bg-slate-50/50">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{banFoundStudent.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{banFoundStudent.phone} · {banFoundStudent.governorate}</p>
                    <p className="text-xs text-slate-400 mt-1">حالة الحظر: {banFoundStudent.isBlocked ? "مطرود من المنصة" : "نشط"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStudentBlock(banFoundStudent)}
                    className={`w-full py-2.5 rounded-xl font-extrabold text-white text-sm shadow transition-all ${
                      banFoundStudent.isBlocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {banFoundStudent.isBlocked ? "إلغاء الطرد والسماح له بالدخول" : "طرد الطالب وحظره فوراً"}
                  </button>
                </div>
              ) : banSearch ? (
                <p className="text-xs text-red-500 font-bold mt-2">لا يوجد طالب مسجل بهذا الاسم أو الرقم.</p>
              ) : (
                <p className="text-xs text-slate-400">برجاء كتابة اسم أو هاتف الطالب للبحث والتحكم في حظر الدخول.</p>
              )}
            </div>

          </section>
        )}

        {/* --- TAB 3: DETAILED STUDENT TRACKING AND PROGRESS REPORT --- */}
        {activeTab === "student-details" && (
          <section className="bg-white border border-cyan-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div>
                <h2 className="text-xl font-black text-[#0077B6]">بيانات الطلاب والتتبع الدراسي التفصيلي</h2>
                <p className="text-xs text-slate-400 mt-0.5">متابعة دقيقة لمستوى الطالب وكورساته والامتحانات</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={exportStudentsToExcel}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-sm transition"
                  title="تحميل شيت إكسيل يحتوي على جميع بيانات الطلاب وأولياء أمورهم"
                >
                  <Download size={14} />
                  استخراج شيت إكسيل لبيانات الطلاب
                </button>

                {/* Select student to review */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">الطالب:</span>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold outline-none bg-slate-50 focus:border-[#0077B6]"
                  >
                    {students.filter(s => !isCodeStudent(s)).map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.phone})</option>)}
                  </select>
                </div>
              </div>
            </div>

            {loadingDetail ? (
              <p className="text-slate-500 font-bold text-center py-10">جارٍ جلب تفاصيل الطالب ودرجاته...</p>
            ) : selectedStudentDetail ? (
              <div className="space-y-6 text-right">
                
                {/* Profile card summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold">اسم الطالب</span>
                    <p className="text-base font-black text-slate-900 mt-1">{selectedStudentDetail.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold">معرّف الطالب (7 أرقام)</span>
                    <p className="text-base font-black text-[#0077B6] mt-1">{selectedStudentDetail.studentId || "عشوائي"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold">موبايل الطالب والولي</span>
                    {selectedStudentDetail.phone ? (
                      <button
                        type="button"
                        onClick={() => openWhatsAppStudent(selectedStudentDetail.phone, selectedStudentDetail.name, selectedStudentDetail.studentId)}
                        title="مراسلة الطالب على واتساب فوراً"
                        className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-700 hover:text-cyan-800 hover:underline mt-1 bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-200 transition"
                      >
                        <MessageCircle size={13} className="text-emerald-500 shrink-0" />
                        الطالب: {selectedStudentDetail.phone} (واتساب)
                      </button>
                    ) : (
                      <p className="text-xs font-bold text-slate-800 mt-1">الطالب: غير مسجل</p>
                    )}
                    {selectedStudentDetail.parentPhone && selectedStudentDetail.parentPhone !== "غير مسجل" ? (
                      <button
                        type="button"
                        onClick={() => openWhatsAppParent(selectedStudentDetail.parentPhone, selectedStudentDetail.name, selectedStudentDetail.studentId)}
                        title="مراسلة ولي الأمر على واتساب فوراً"
                        className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 hover:text-emerald-700 hover:underline mt-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 transition"
                      >
                        <MessageCircle size={13} className="text-emerald-500 shrink-0" />
                        الولي: {selectedStudentDetail.parentPhone} (واتساب)
                      </button>
                    ) : (
                      <p className="text-xs font-extrabold text-slate-400 mt-1">الولي: غير مسجل</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold">السنتر والمحافظة</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">{selectedStudentDetail.center ? `سنتر: ${selectedStudentDetail.center}` : "أونلاين"}</p>
                    <p className="text-xs font-medium text-slate-500">{selectedStudentDetail.governorate}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold">الحساب</span>
                    <p className={`text-sm font-black mt-1 ${selectedStudentDetail.isBlocked ? "text-red-600" : "text-emerald-600"}`}>
                      {selectedStudentDetail.isBlocked ? "مطرود" : "نشط ومفعل"}
                    </p>
                  </div>
                </div>

                {/* Poor Performance Warning Notification */}
                {selectedStudentDetail.weakPerformanceWarning && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="shrink-0 text-red-600" />
                    <div>
                      <h4 className="font-extrabold text-sm text-red-950">تنبيه: ضعف مستوى الطالب الدراسي!</h4>
                      <p className="text-xs text-red-800 mt-1 font-bold">
                        أحرز هذا الطالب نسبة أقل من 50% في أحد امتحاناته الأخيرة. يرجى من فريق الدعم الفني والمتابعة الاتصال بالطالب لتنبيهه بضرورة المذاكرة وقول: "لازم تشد حيلك يا بطل".
                      </p>
                    </div>
                  </div>
                )}

                {/* Purchased Courses Tracker */}
                <div>
                  <h3 className="font-black text-base text-slate-900 mb-3">نسبة مشاهدة الكورسات وتتبع الدروس</h3>
                  <div className="space-y-3">
                    {selectedStudentDetail.courseProgress && selectedStudentDetail.courseProgress.map((cp) => (
                      <div key={cp.courseId} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                        <div className="flex justify-between items-center text-sm font-extrabold">
                          <span className="text-slate-900">{cp.courseTitle}</span>
                          <span className="text-[#0077B6]">{cp.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3">
                          <div className="bg-[#00A8E8] h-3 rounded-full" style={{ width: `${cp.percentage}%` }} />
                        </div>
                        <p className="text-xs text-slate-400 font-bold">عدد الفيديوهات التي شاهدها: {cp.watchedLessonsCount} درس</p>
                      </div>
                    ))}
                    {(!selectedStudentDetail.courseProgress || selectedStudentDetail.courseProgress.length === 0) && (
                      <p className="text-xs text-slate-500">الطالب غير مشترك في أي كورسات حتى الآن.</p>
                    )}
                  </div>
                </div>

                {/* Exam Result records */}
                <div>
                  <h3 className="font-black text-base text-slate-900 mb-3">سجل درجات الطالب في الامتحانات</h3>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-extrabold">الامتحان</th>
                          <th className="px-4 py-3 font-extrabold">الزمن</th>
                          <th className="px-4 py-3 font-extrabold">الدرجة</th>
                          <th className="px-4 py-3 font-extrabold">النسبة</th>
                          <th className="px-4 py-3 font-extrabold">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudentDetail.examResults && selectedStudentDetail.examResults.map((e, index) => (
                          <tr key={index} className={e.percentage < 50 ? "bg-red-50/40" : "bg-white"}>
                            <td className="px-4 py-4 font-bold text-slate-900">{e.quizTitle}</td>
                            <td className="px-4 py-4">
                              <span dir="ltr" className="inline-flex items-center gap-1 font-black text-slate-700">
                                {formatDuration(e.timeSpentSeconds)}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-black text-slate-900">
                              {e.earnedPoints} / {e.totalPoints}
                            </td>
                            <td className={`px-4 py-4 font-black ${e.percentage < 50 ? "text-red-600" : "text-emerald-600"}`}>
                              {e.percentage}%
                            </td>
                            <td className="px-4 py-4 text-slate-500">{formatDate(e.takenAt)}</td>
                          </tr>
                        ))}
                        {(!selectedStudentDetail.examResults || selectedStudentDetail.examResults.length === 0) && (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-500">
                              لا توجد محاولات امتحانات مسجلة للطالب.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <p className="text-slate-500 text-center py-6">برجاء اختيار طالب من القائمة لعرض تفاصيله الدراسية.</p>
            )}
          </section>
        )}

        {/* --- TAB 4: INCOMING PAYMENTS REQUESTS LIST (الطلبات الواردة) --- */}
        {activeTab === "incoming-requests" && (
          <section className="bg-white border border-cyan-100 rounded-3xl p-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-5">
              <h2 className="text-xl font-black text-[#0077B6]">الطلبات الواردة (تفعيل اشتراكات الطلاب الكيميائية)</h2>
              <p className="text-xs text-slate-400 mt-1">قم بمراجعة إثبات التحويل المرفوع من الطالب وتفعيل الكورس فوراً.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[36rem] overflow-y-auto pr-1">
              {paymentRequests.filter(r => r.status === "pending").map((request) => (
                <div key={request.id} className="rounded-2xl border border-cyan-100 bg-cyan-50/20 p-5 flex flex-col justify-between space-y-4">
                  <div className="flex gap-4">
                    <a href={request.proofImageUrl} target="_blank" rel="noreferrer" className="shrink-0 relative group">
                      <img src={request.proofImageUrl} alt="إثبات الدفع" className="h-28 w-28 rounded-2xl object-cover border border-slate-200 hover:scale-105 transition" />
                      <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold">
                        تكبير الصورة
                      </div>
                    </a>
                    <div className="min-w-0 flex-1 space-y-1 text-right">
                      <p className="font-black text-slate-900 text-base">{request.studentName}</p>
                      <p className="text-xs text-slate-500 font-bold">موبايل: {request.studentPhone}</p>
                      <p className="text-sm font-extrabold text-[#0077B6] pt-1">{request.courseTitle}</p>
                      <p className="text-xs text-slate-500 font-bold">القيمة: {request.totalPrice} ج.م · الوسيلة: {request.walletChannel}</p>
                      <p className="text-[10px] text-slate-400">تاريخ الطلب: {formatDate(request.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full">
                      معلق - بانتظار الاعتماد
                    </span>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => approveRequest(request.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
                    >
                      اعتماد وتفعيل الكورس للطالب
                    </button>
                  </div>
                </div>
              ))}
              {paymentRequests.filter(r => r.status === "pending").length === 0 && (
                <p className="text-sm text-slate-500 text-center py-10 col-span-2 font-bold">
                  لا توجد طلبات معلقة بانتظار المراجعة والتفعيل الآن.
                </p>
              )}
            </div>
          </section>
        )}

        {/* --- TAB 5.1: DEDICATED STANDALONE LECTURE CREATOR --- */}
        {activeTab === "add-standalone-lecture" && (
          <StandaloneLectureForm
            onSaved={() => {
              subscribeCourses(setCourses);
              setActiveTab("courses");
            }}
            onCancel={() => setActiveTab("courses")}
          />
        )}

        {/* --- TAB 5.2: ADD COURSE FORM (Sequential FIFO builder) --- */}
        {activeTab === "add-course" && (
          <section className="grid grid-cols-1 xl:grid-cols-[1fr_24rem] gap-6">
            
            {/* Create course settings form */}
            <div className="bg-white border border-cyan-100 rounded-3xl p-6 shadow-sm space-y-5 text-right">
              <h3 className="text-lg font-black text-[#0077B6] border-b border-slate-100 pb-2">
                {editingCourseId ? "تعديل بيانات الكورس" : "خطوة 1: تهيئة الكورس الأساسي"}
              </h3>
              <form onSubmit={submitCourse} className="space-y-4">
                <input
                  required
                  value={courseForm.title}
                  onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="اسم الكورس التعليمي (مثال: الباب الأول في الكيمياء)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#0077B6]"
                />
                
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="وصف مبسط للكورس ومحتوياته..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#0077B6]"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">الصف الدراسي</label>
                    <select
                      value={courseForm.grade}
                      onChange={(e) => setCourseForm((p) => ({ ...p, grade: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs outline-none focus:border-[#0077B6] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option>الصف الأول الثانوي</option>
                      <option>الصف الثاني الثانوي</option>
                      <option>الصف الثالث الثانوي</option>
                      <option>الصف الثاني بكالوريا</option>
                      <option>الصف الثالث البكالوريا</option>
                      <option>الصف الثالث الثانوي, الصف الثالث البكالوريا</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">السعر (ج.م)</label>
                    <input
                      disabled={courseForm.isFree}
                      type="number"
                      min="0"
                      value={courseForm.price}
                      onChange={(e) => setCourseForm((p) => ({ ...p, price: e.target.value }))}
                      placeholder="السعر بالجنيه"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs outline-none focus:border-[#0077B6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">الخصم (%)</label>
                    <input
                      disabled={courseForm.isFree}
                      type="number"
                      min="0"
                      max="100"
                      value={courseForm.discountPercent}
                      onChange={(e) => setCourseForm((p) => ({ ...p, discountPercent: e.target.value }))}
                      placeholder="خصم الكورس"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs outline-none focus:border-[#0077B6]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-5 py-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={courseForm.isFree}
                      onChange={(e) => setCourseForm(p => ({ ...p, isFree: e.target.checked, price: e.target.checked ? "0" : "" }))}
                      className="w-4 h-4 text-[#0077B6]"
                    />
                    هذا الكورس مجاني بالكامل
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={courseForm.isPublished}
                      onChange={(e) => setCourseForm(p => ({ ...p, isPublished: e.target.checked }))}
                      className="w-4 h-4 text-[#0077B6]"
                    />
                    نشر الكورس مباشرة للطلاب
                  </label>
                </div>

                {editingCourseId && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
                    أنت الآن في وضع تعديل الكورس الحالي. عند الحفظ سيتم تحديثه مباشرة.
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500">غلاف الكورس:</label>
                  <label className="flex items-center justify-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-xl px-4 py-4 bg-slate-50 hover:border-[#0077B6] transition">
                    <Upload size={16} />
                    <span className="text-xs font-bold">{isUploadingImage ? "جاري رفع الغلاف..." : "اختر صورة الغلاف"}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                <button type="submit" disabled={isBusy} className="w-full bg-[#FF6B35] hover:bg-orange-600 text-white font-extrabold rounded-xl py-3 text-sm shadow-md transition">
                  {isBusy ? "جاري الحفظ..." : editingCourseId ? "حفظ التعديلات" : "حفظ الكورس وفتح خيارات إضافة المحتوى"}
                </button>
              </form>
            </div>

            {/* Left side sequential additions (FIFO Order) */}
            <div className="bg-white border border-cyan-100 rounded-3xl p-6 shadow-sm space-y-6 text-right">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-black text-[#0077B6]">خطوة 2: إضافة دروس بالترتيب FIFO</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">تضاف العناصر بالترتيب الذي تختاره للمنهج، الأحدث تحت والأقدم فوق.</p>
              </div>

              {/* Course Selector to receive contents */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500">الكورس المراد إضافة المحاضرة إليه:</label>
                <select
                  value={selectedCourseForItems}
                  onChange={(e) => setSelectedCourseForItems(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-extrabold outline-none bg-slate-50 focus:border-[#0077B6]"
                >
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              {currentSelectedCourseObj ? (
                <div className="space-y-6">
                  
                  {/* Part 1: Add Video Lesson (1-Click Upload or URL) */}
                  <form onSubmit={handleAddLesson} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 space-y-3">
                    <h4 className="font-extrabold text-xs text-[#0077B6] flex items-center gap-1.5">
                      <BookOpen size={14} /> إضافة محاضرة فيديو جديدة
                    </h4>
                    <input
                      required
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="عنوان محاضرة الفيديو..."
                      className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none"
                    />

                    {/* Toggle: Direct Upload vs Link */}
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setVideoInputMode('upload')}
                        className={`flex-1 py-1.5 text-xs font-bold transition ${videoInputMode === 'upload' ? 'bg-[#0077B6] text-white' : 'bg-white text-slate-500'}`}
                      >
                        رفع MP4 مباشر
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoInputMode('url')}
                        className={`flex-1 py-1.5 text-xs font-bold transition ${videoInputMode === 'url' ? 'bg-[#0077B6] text-white' : 'bg-white text-slate-500'}`}
                      >
                        من رابط MP4 / YouTube
                      </button>
                    </div>

                    {videoInputMode === 'upload' ? (
                      <div className="space-y-3">
                        {lessonForm.videoUrl && (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-700">✓ تم تجهيز الفيديو بنجاح</span>
                          </div>
                        )}

                        {isUploadingVideo && (
                          <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 space-y-2">
                            <div className="flex justify-between items-center text-xs font-extrabold text-[#0077B6]">
                              <span>
                                {`📤 جارٍ رفع الفيديو إلى السيرفر... (${videoUploadProgress}%)`}
                              </span>
                              <span>{videoUploadProgress}%</span>
                            </div>
                            <div className="w-full h-3 bg-cyan-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-[#0077B6] to-[#00A8E8] transition-all duration-300 rounded-full"
                                style={{ width: `${Math.max(videoUploadProgress, 5)}%` }}
                              />
                            </div>
                              <p className="text-[10px] text-slate-500 text-center font-medium">
                              سيتم تأكيد النجاح فقط بعد اكتمال رفع الملف واستجابة الخادم
                            </p>
                          </div>
                        )}

                        <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-[#0077B6]/30 hover:border-[#0077B6] rounded-xl px-4 py-5 bg-white transition ${isUploadingVideo ? 'opacity-50 pointer-events-none' : ''}`}>
                          <Upload size={24} className="text-[#0077B6]" />
                          <span className="text-xs font-extrabold text-slate-700">
                            {isUploadingVideo ? '⏳ جارٍ الرفع...' : 'اختر ملف MP4 من جهازك'}
                          </span>
                          <span className="text-[10px] text-slate-400">سيتم رفع الملف مباشرة إلى Archive.org بعد اكتمال النقل</span>
                          <input
                            type="file"
                            accept="video/mp4,.mp4"
                            disabled={isUploadingVideo}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploadingVideo(true);
                              setVideoUploadProgress(0);
                              setError('');
                              try {
                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('title', lessonForm.title || file.name);
                                if (currentSelectedCourseObj?.id) {
                                  formData.append('courseId', currentSelectedCourseObj.id);
                                }

                                const { data } = await apiClient.post('/api/v1/videos/upload', formData, {
                                  timeout: 600000, // 10 minutes — processing takes time
                                  headers: { 'Content-Type': 'multipart/form-data' },
                                  onUploadProgress: (progressEvent) => {
                                    if (progressEvent.total) {
                                      const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                                      setVideoUploadProgress(percent);
                                    }
                                  },
                                });

                                setLessonForm(prev => ({
                                  ...prev,
                                  videoUrl: data.directUrl || data.videoUrl || data.url || "",
                                  title: prev.title || data.title
                                }));
                                setNotice('✓ تم رفع الفيديو المباشر بنجاح!');
                              } catch (err) {
                                const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err?.response?.data?.details || err?.message || 'فشل رفع الفيديو.';
                                setErrorMessage(errorMsg);
                              } finally {
                                setIsUploadingVideo(false);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                        <input
                          required={videoInputMode === 'url'}
                          value={lessonForm.videoUrl}
                          onChange={(e) => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                        placeholder="رابط MP4 مباشر أو YouTube..."
                          className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none"
                        />
                    )}

                    <button
                      type="submit"
                      disabled={isBusy || isUploadingVideo || !lessonForm.videoUrl}
                      className="w-full py-2 bg-[#0077B6] text-white font-extrabold text-xs rounded-lg transition hover:bg-[#005f92] disabled:opacity-50"
                    >
                      إضافة الدرس للمنهج (FIFO ترتيب: {nextItemOrder})
                    </button>
                  </form>

                  {/* Part 2: Add PDF resource */}
                  <form onSubmit={handleAddFile} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 space-y-3">
                    <h4 className="font-extrabold text-xs text-[#0077B6] flex items-center gap-1.5">
                      <FileText size={14} /> إضافة ملخص/ملف PDF
                    </h4>
                    <input
                      required
                      value={fileForm.title}
                      onChange={(e) => setFileForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="عنوان الملزمة أو الواجب..."
                      className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none"
                    />

                    {/* Toggle source: URL or Device */}
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setFileInputMode('url')}
                        className={`flex-1 py-1.5 text-xs font-bold transition ${fileInputMode === 'url' ? 'bg-[#0077B6] text-white' : 'bg-white text-slate-500'}`}
                      >
                        من رابط
                      </button>
                      <button
                        type="button"
                        onClick={() => setFileInputMode('device')}
                        className={`flex-1 py-1.5 text-xs font-bold transition ${fileInputMode === 'device' ? 'bg-[#0077B6] text-white' : 'bg-white text-slate-500'}`}
                      >
                        من الجهاز
                      </button>
                    </div>

                    {fileInputMode === 'url' ? (
                      <input
                        required={fileInputMode === 'url'}
                        value={fileForm.fileUrl}
                        onChange={(e) => setFileForm(prev => ({ ...prev, fileUrl: e.target.value }))}
                        placeholder="رابط ملف الـ PDF (رابط ويب)"
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none"
                      />
                    ) : (
                      <div className="space-y-2">
                        {fileForm.fileUrl && (
                          <p className="text-[10px] text-emerald-600 font-bold">✓ تم رفع الملف بنجاح</p>
                        )}
                        <label className="flex items-center justify-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg px-4 py-3 bg-white hover:border-[#0077B6] transition">
                          <Upload size={14} />
                          <span className="text-xs font-bold">
                            {isUploadingFile ? 'جارٍ الرفع...' : 'اختر ملف PDF من جهازك'}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            disabled={isUploadingFile}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploadingFile(true);
                              try {
                                const url = await uploadFileToStorage(file);
                                setFileForm(prev => ({ ...prev, fileUrl: url, fileName: file.name, fileType: 'pdf' }));
                                setNotice('تم رفع ملف PDF بنجاح!');
                              } catch {
                                setErrorMessage('فشل رفع الملف. تأكد من الاتصال وحاول مرة أخرى.');
                              } finally {
                                setIsUploadingFile(false);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isBusy || isUploadingFile || !fileForm.fileUrl}
                      className="w-full py-2 bg-[#0077B6] text-white font-extrabold text-xs rounded-lg transition hover:bg-[#005f92] disabled:opacity-50"
                    >
                      إضافة الملزمة للمنهج (FIFO ترتيب: {nextItemOrder})
                    </button>
                  </form>

                  {/* Part 3: Add Quiz - Button only, details on dedicated page */}
                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 space-y-3">
                    <h4 className="font-extrabold text-xs text-[#0077B6] flex items-center gap-1.5">
                      <HelpCircle size={14} /> إضافة كويز MCQ
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-5">
                      لإضافة كويز بأسئلة متكاملة، افتح صفحة الإضافة التفصيلية واملأ الأسئلة والإجابات والوقت.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/teacher/add-quiz?courseId=${currentSelectedCourseObj?.id || ''}`)}
                      className="w-full py-2.5 bg-[#0077B6] text-white font-extrabold text-xs rounded-lg transition hover:bg-[#005f92]"
                    >
                      فتح صفحة إضافة الكويز التفصيلية
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-100 bg-white space-y-3">
                    <h4 className="font-extrabold text-xs text-[#0077B6] flex items-center gap-1.5">
                      <FileSpreadsheet size={14} /> إدارة محتوى الكورس
                    </h4>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {currentSelectedCourseContent.length === 0 ? (
                        <p className="text-[11px] text-slate-400">لا يوجد محتوى مضاف بعد.</p>
                      ) : currentSelectedCourseContent.map((item) => (
                        <div key={`${item.type}-${item.lessonId || item.resourceId || item.quizId}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-slate-800 truncate">{item.title}</p>
                            <p className="text-[10px] text-slate-400">
                              {item.type === "video" ? "محاضرة" : item.type === "resource" ? "PDF" : "كويز"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm("هل تريد حذف هذا العنصر نهائياً؟")) return;
                              setIsBusy(true);
                              try {
                                if (item.type === "video") {
                                  await removeLessonItem(item.lessonId);
                                } else if (item.type === "resource") {
                                  await removeResourceItem(item.resourceId);
                                } else if (item.type === "quiz") {
                                  await removeQuizItem(item.quizId);
                                }
                                setNotice("تم حذف العنصر بنجاح.");
                              } catch (err) {
                                setErrorMessage(err.message || "تعذر حذف العنصر.");
                              } finally {
                                setIsBusy(false);
                              }
                            }}
                            className={`${isTeacher ? "" : "hidden "}rounded-lg p-2 text-red-600 hover:bg-red-50 transition`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <p className="text-xs text-red-500 font-bold">برجاء إنشاء كورس أولاً لإضافة المكونات إليه.</p>
              )}
            </div>

          </section>
        )}

        {/* --- TAB 6: ADD EXAM ENTRY --- */}
        {activeTab === "add-exam" && (
          <section className="bg-white dark:bg-slate-900 border border-cyan-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 text-right">
            <div className="rounded-3xl bg-gradient-to-l from-[#0077B6] to-[#00A8E8] p-6 text-white">
              <h2 className="text-2xl font-black">إضافة امتحان جديد</h2>
              <p className="mt-2 text-sm text-white/75">
                الامتحانات الآن صفحة مستقلة: صورة اختيارية، كورس اختياري، وعدد أسئلة مفتوح بالكامل.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/teacher/add-exam")}
              className="w-full rounded-2xl bg-[#FF6B35] px-5 py-4 text-sm font-black text-white shadow-lg transition hover:bg-orange-600"
            >
              فتح صفحة إضافة الامتحان التفصيلية
            </button>
          </section>
        )}

        {/* Legacy inline exam builder kept disabled after moving exams to a standalone page. */}
        {false && activeTab === "add-exam" && (
          <section className="bg-white border border-cyan-100 rounded-3xl p-6 shadow-sm space-y-6 text-right">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-xl font-black text-[#0077B6]">إضافة امتحان جديد بالكامل (MCQ Exam Generator)</h2>
              <p className="text-xs text-slate-400 mt-1">اكتب أسئلة الامتحان وحدد درجاتها وإجاباتها النموذجية ليتم تصحيحها تلقائياً.</p>
            </div>

            <form onSubmit={submitExam} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">اضافه إلى الكورس:</label>
                  <select
                    value={examForm.courseId}
                    onChange={(e) => setExamForm(p => ({ ...p, courseId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none bg-slate-50 focus:border-[#0077B6]"
                  >
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">اسم الامتحان:</label>
                  <input
                    required
                    value={examForm.title}
                    onChange={(e) => setExamForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="مثال: امتحان شامل الباب الأول كيمياء"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none bg-slate-50 focus:border-[#0077B6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">عدد أسئلة الامتحان:</label>
                  <select
                    value={examForm.questionsCount}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setExamForm(p => ({
                        ...p,
                        questionsCount: count,
                        questions: Array.from({ length: count }, (_, i) => p.questions[i] || emptyQuestion())
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none bg-slate-50 focus:border-[#0077B6]"
                  >
                    {[3, 5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n} أسئلة</option>)}
                  </select>
                </div>
              </div>

              {/* Questions Sheet list */}
              <div className="space-y-6 pt-4">
                <h3 className="font-extrabold text-sm text-[#0077B6] border-b border-slate-50 pb-2">تفاصيل ورقة الأسئلة MCQ:</h3>
                
                {examForm.questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-700">السؤال رقم {qIdx + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">نقاط السؤال:</span>
                        <input
                          type="number"
                          min="1"
                          value={q.points}
                          onChange={(e) => updateExamQuestion(qIdx, "points", Number(e.target.value))}
                          className="w-12 text-center rounded border border-slate-300 py-1 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <input
                      required
                      value={q.prompt}
                      onChange={(e) => updateExamQuestion(qIdx, "prompt", e.target.value)}
                      placeholder="اكتب نص السؤال هنا..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-[#0077B6]"
                    />

                    {/* MCQ Options with radio correction */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.choices.map((choice, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-200">
                          <input
                            type="radio"
                            name={`correct_choice_${qIdx}`}
                            checked={q.correctIndex === cIdx}
                            onChange={() => updateExamQuestion(qIdx, "correctIndex", cIdx)}
                          />
                          <span className="text-xs font-bold text-slate-400">
                            {["أ", "ب", "ج", "د"][cIdx]} :
                          </span>
                          <input
                            required
                            value={choice}
                            onChange={(e) => updateExamChoice(qIdx, cIdx, e.target.value)}
                            placeholder={`الخيار ${["أ", "ب", "ج", "د"][cIdx]}`}
                            className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full bg-[#FF6B35] hover:bg-orange-600 text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition"
              >
                {isBusy ? "جاري الحفظ..." : "حفظ وإنشاء الامتحان الشامل"}
              </button>

            </form>
          </section>
        )}

      </div>
    </DashboardLayout>
  );
}
