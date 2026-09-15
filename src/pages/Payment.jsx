import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CreditCard,
  FileImage,
  KeyRound,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Wallet,
  Clock,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getCourseById, checkUserHasAccess } from "../services/courseService.js";
import {
  createPaymentOrder,
  submitManualPaymentRequest,
  getMyPaymentRequests,
} from "../services/paymentService.js";
import { claimAccessCode } from "../services/accessCodeService.js";
import AppHeader from "../components/AppHeader.jsx";
import Footer from "../components/Footer.jsx";

function calculateFinalPrice(course) {
  const basePrice = Number(course?.price || 0);
  const discountPercent = Number(course?.discountPercent || 0);
  return Math.max(0, Math.round(basePrice * (1 - discountPercent / 100)));
}

export default function Payment() {
  const { courseId } = useParams();
  const { user, refreshProfile } = useAuth();
  const [course, setCourse] = useState(null);
  const [proofImage, setProofImage] = useState(null);
  const [walletChannel, setWalletChannel] = useState("vodafone-cash");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePaymentTab, setActivePaymentTab] = useState("code"); // "code" | "manual"
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [isClaimingCode, setIsClaimingCode] = useState(false);
  const [codeSuccessModal, setCodeSuccessModal] = useState(null);
  const [myRequests, setMyRequests] = useState([]);

  useEffect(() => {
    getCourseById(courseId)
      .then(setCourse)
      .catch(() => setError("تعذر تحميل بيانات الكورس."));
  }, [courseId]);

  useEffect(() => {
    if (user?.uid) {
      getMyPaymentRequests()
        .then((reqs) => setMyRequests(reqs.filter((r) => r.courseId === courseId)))
        .catch(() => {});
    }
  }, [user?.uid, courseId]);

  const finalPrice = useMemo(() => calculateFinalPrice(course), [course]);
  const alreadyEnrolled = useMemo(
    () => checkUserHasAccess(courseId, user),
    [user?.enrolledCourses, user?.allowedUnits, courseId]
  );

  if (course && finalPrice === 0) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#F4F9FF] text-slate-950 font-['Cairo',_sans-serif]">
        <AppHeader active="/courses" />
        <main className="mx-auto max-w-3xl px-5 py-16 text-center">
          <div className="rounded-[1.75rem] border border-emerald-200 bg-white p-8 shadow-xl shadow-cyan-900/10">
            <h1 className="text-3xl font-black text-emerald-600">الكورس مجاني</h1>
            <p className="mt-3 text-slate-600 font-bold">لا توجد أي خطوات دفع لهذا الكورس. يمكنك الدخول إليه مباشرة الآن.</p>
            <Link
              to={`/courses/${course.id}`}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#0077B6] px-6 py-3 text-white font-extrabold hover:bg-[#005f92] transition"
            >
              دخول الكورس
              <ArrowLeft size={16} />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  async function handleClaimCode(e) {
    if (e) e.preventDefault();
    const cleanCode = accessCodeInput.replace(/\D/g, "").trim();
    if (cleanCode.length !== 12) {
      setError("كود التفعيل يجب أن يتكون من 12 رقماً بالضبط.");
      return;
    }
    setIsClaimingCode(true);
    setError("");
    setNotice("");
    try {
      const result = await claimAccessCode({ code: cleanCode });
      if (typeof refreshProfile === "function") {
        await refreshProfile();
      }
      setCodeSuccessModal({
        courseTitle: result.courseTitle || course?.title || "الكورس",
        accessType: result.accessType,
        allowedCount: result.allowedLectureIds?.length || 0,
      });
    } catch (err) {
      setError(err.message || "كود التفعيل غير صحيح أو تم استخدامه من قبل.");
    } finally {
      setIsClaimingCode(false);
    }
  }

  async function submitProof() {
    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      await submitManualPaymentRequest({ courseId, proofImage, walletChannel });
      setNotice("تم إرسال طلب الدفع بنجاح! سيتم فتح الكورس فور مراجعة واعتماد الإدارة.");
      // Refresh requests list
      getMyPaymentRequests()
        .then((reqs) => setMyRequests(reqs.filter((r) => r.courseId === courseId)))
        .catch(() => {});
    } catch (err) {
      setError(err.message || "تعذر إرسال إثبات الدفع.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!course) {
    return (
      <div dir="rtl" className="min-h-screen bg-white">
        <AppHeader active="/courses" />
        <main className="mx-auto max-w-3xl px-6 py-10 text-center text-slate-500">جار تحميل صفحة الدفع...</main>
      </div>
    );
  }

  const latestRequest = myRequests[0] || null;

  return (
    <div dir="rtl" className="min-h-screen bg-[#F4F9FF] text-slate-950 font-['Cairo',_sans-serif]">
      <AppHeader active="/courses" />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-white shadow-2xl shadow-cyan-900/10">
          {/* Header Banner */}
          <div className="bg-gradient-to-l from-[#0077B6] via-[#00A8E8] to-[#38D9C8] px-6 py-7 text-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold opacity-85">MENA MOURID Chemistry LMS</p>
                <h1 className="mt-1 text-3xl font-extrabold">شراء واشتراك الكورس</h1>
              </div>
              <div className="rounded-2xl bg-white/15 px-4 py-3 text-left backdrop-blur">
                <p className="text-xs opacity-80">الطالب</p>
                <p className="font-extrabold">{user?.name}</p>
                <p className="text-sm opacity-90">{user?.phone || user?.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            {/* Previous Request Status Notification */}
            {latestRequest && (
              <div
                className={`rounded-2xl border p-4 text-sm font-bold flex items-start gap-3 ${
                  latestRequest.status === "pending"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : latestRequest.status === "approved"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                {latestRequest.status === "pending" && <Clock className="shrink-0 text-amber-600 mt-0.5" size={18} />}
                {latestRequest.status === "approved" && <CheckCircle2 className="shrink-0 text-emerald-600 mt-0.5" size={18} />}
                {latestRequest.status === "rejected" && <XCircle className="shrink-0 text-red-600 mt-0.5" size={18} />}
                <div>
                  <p className="font-black text-base">
                    {latestRequest.status === "pending" && "طلب الدفع الخاص بك قيد المراجعة ⏳"}
                    {latestRequest.status === "approved" && "تم اعتماد وتفعيل الكورس الخاص بك بنجاح! ✅"}
                    {latestRequest.status === "rejected" && "تم رفض طلب الدفع السابق ❌"}
                  </p>
                  <p className="text-xs mt-1 opacity-85">
                    المبلغ: {latestRequest.totalPrice} ج.م · بتاريخ: {new Date(latestRequest.createdAt).toLocaleDateString("ar-EG")}
                    {latestRequest.status === "pending" && " - سيتم تفعيل المحتوى فور اعتماد المعلم."}
                    {latestRequest.status === "rejected" && " - يمكنك المحاولة برفع إثبات جديد أو التفعيل بكود السنتر."}
                  </p>
                </div>
              </div>
            )}

            {alreadyEnrolled ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-700 flex flex-col items-center text-center space-y-3">
                <CheckCircle2 size={40} className="text-emerald-600" />
                <p className="text-lg font-black">أنت مشترك بالفعل في هذا الكورس!</p>
                <p className="text-xs text-emerald-800 font-bold">يمكنك الدخول مباشرة الآن ومتابعة جميع الدروس المصرح لك بها.</p>
                <Link
                  to={`/courses/${course.id}`}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 transition shadow-md"
                >
                  الدخول لمشاهدة الكورس
                  <ArrowLeft size={16} />
                </Link>
              </div>
            ) : (
              <>
                {/* Course Summary Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-black">
                      <tr>
                        <th className="px-4 py-3">الكورس / المحاضرة</th>
                        <th className="px-4 py-3">النوع</th>
                        <th className="px-4 py-3">السعر الأصلي</th>
                        <th className="px-4 py-3">المطلوب سداده</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-200 font-bold">
                        <td className="px-4 py-4 text-slate-900">{course.title}</td>
                        <td className="px-4 py-4 text-slate-600">{course.isStandalone ? "محاضرة منفردة" : "كورس كامل"}</td>
                        <td className="px-4 py-4 text-slate-400 line-through">{course.price} EGP</td>
                        <td className="px-4 py-4 text-xl font-black text-[#0077B6]">{finalPrice} EGP</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-bold flex items-center gap-2">
                    <XCircle size={16} className="shrink-0" />
                    {error}
                  </div>
                )}
                {notice && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-bold flex items-center gap-2">
                    <Check size={16} className="shrink-0" />
                    {notice}
                  </div>
                )}

                {/* Purchase Tabs: 1) Buy with Code, 2) Manual Transfer */}
                <div className="space-y-4">
                  <h3 className="text-base font-black text-slate-900">اختر طريقة الشراء والتفعيل:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePaymentTab("code");
                        setError("");
                        setNotice("");
                      }}
                      className={`rounded-2xl border p-4 text-right transition flex items-start gap-3 ${
                        activePaymentTab === "code"
                          ? "border-[#0077B6] bg-cyan-50/70 shadow-md ring-2 ring-[#0077B6]/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="p-2.5 rounded-xl bg-[#0077B6]/10 text-[#0077B6] shrink-0">
                        <KeyRound size={22} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm">الشراء بكود التفعيل (فوري ⚡)</p>
                        <p className="text-xs text-slate-500 font-bold mt-0.5">
                          تفعيل فوري للكورس أو المحاضرة باستخدام كود السنتر (12 رقم)
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActivePaymentTab("manual");
                        setError("");
                        setNotice("");
                      }}
                      className={`rounded-2xl border p-4 text-right transition flex items-start gap-3 ${
                        activePaymentTab === "manual"
                          ? "border-[#0077B6] bg-cyan-50/70 shadow-md ring-2 ring-[#0077B6]/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="p-2.5 rounded-xl bg-[#00A8E8]/10 text-[#0077B6] shrink-0">
                        <Wallet size={22} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm">الدفع اليدوي (كاش / إنستاباي)</p>
                        <p className="text-xs text-slate-500 font-bold mt-0.5">
                          تحويل المبلغ ورفع لقطة الشاشة ليتم الاعتماد من الإدارة
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* TAB 1: BUY WITH ACCESS CODE */}
                {activePaymentTab === "code" && (
                  <div className="rounded-2xl border-2 border-dashed border-[#0077B6]/40 bg-gradient-to-br from-cyan-50/50 to-blue-50/30 p-6 space-y-4">
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 bg-[#0077B6]/10 text-[#0077B6] text-xs font-black px-3 py-1 rounded-full mb-2">
                        <KeyRound size={13} />
                        المكان المخصص: الشراء بالكود
                      </div>
                      <h3 className="font-black text-slate-900 text-base">اكتب كود التفعيل المخصص للكورس أو المحاضرة</h3>
                      <p className="text-xs text-slate-600 font-bold mt-1">
                        إذا حصلت على كود السنتر أو الكود المخصص من الأستاذ مينا موريد، اكتب الكود المكون من 12 رقماً لتفعيل اشتراكك فوراً:
                      </p>
                    </div>

                    <form onSubmit={handleClaimCode} className="space-y-4 max-w-lg mx-auto">
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={12}
                          value={accessCodeInput}
                          onChange={(e) => setAccessCodeInput(e.target.value.replace(/\D/g, ""))}
                          placeholder="أدخل الـ 12 رقماً هنا (مثال: 948271638291)"
                          className="w-full text-center tracking-[0.25em] font-black text-xl rounded-2xl border-2 border-cyan-200 bg-white py-4 px-4 outline-none focus:border-[#0077B6] text-slate-900 shadow-inner transition"
                          autoFocus
                        />
                        <div className="flex justify-between text-[11px] text-slate-400 font-bold px-2 mt-1">
                          <span>12 رقم مطلوب</span>
                          <span dir="ltr">{accessCodeInput.length} / 12</span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isClaimingCode || accessCodeInput.length !== 12}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#0077B6] to-[#00A8E8] hover:from-[#005f92] hover:to-[#0077B6] text-white font-black py-4 shadow-lg shadow-cyan-900/20 disabled:opacity-50 transition duration-200"
                      >
                        <KeyRound size={18} />
                        {isClaimingCode ? "جار التحقق وتفعيل الكورس..." : "تفعيل والشراء بالكود 🚀"}
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB 2: MANUAL TRANSFER (VODAFONE CASH / INSTAPAY) */}
                {activePaymentTab === "manual" && (
                  <div className="space-y-5 rounded-2xl border border-cyan-100 bg-cyan-50/20 p-6">
                    <div className="text-right">
                      <h3 className="font-extrabold text-slate-800 text-base mb-1">
                        أرسل المبلغ ({finalPrice} ج.م) كاملاً إلى أحد الحسابات التالية:
                      </h3>
                      <p className="text-xs text-slate-500">
                        بعد إرسال المبلغ، قم برفع لقطة شاشة (Screenshot) لعملية التحويل أدناه لتأكيد طلبك.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <span className="font-bold text-slate-700 text-xs">فودافون كاش (Vodafone Cash)</span>
                        <p className="mt-1 text-base font-black text-[#0077B6]" dir="ltr">01203324447</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <span className="font-bold text-slate-700 text-xs">إنستاباي (InstaPay IPN)</span>
                        <p className="mt-1 text-base font-black text-[#0077B6]" dir="ltr">01203324447</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">إثبات عملية التحويل:</label>
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-300 bg-white px-4 py-8 text-center hover:bg-cyan-50/50 transition">
                        <FileImage className="text-[#0077B6]" size={32} />
                        <span className="font-bold text-sm text-slate-600">
                          {proofImage ? proofImage.name : "اضغط هنا لاختيار صورة إثبات التحويل"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => setProofImage(event.target.files?.[0] || null)}
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting || !proofImage}
                      onClick={submitProof}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-3.5 font-extrabold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-60 transition duration-200"
                    >
                      <Smartphone size={18} />
                      {isSubmitting ? "جار إرسال الطلب والتنبيه..." : "تأكيد وإرسال طلب الدفع للمراجعة"}
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="pt-2">
              <Link
                to={`/courses/${course.id}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-[#0077B6] hover:underline"
              >
                العودة إلى صفحة الكورس
                <ArrowLeft size={14} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* POPUP MODAL: SUCCESS WITH GREEN CHECKMARK (علامة صح بوب اب) */}
      {codeSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 text-center shadow-2xl border border-emerald-100 space-y-5">
            {/* Animated Green Circle with Checkmark */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
              <CheckCircle2 size={46} className="stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">تم تفعيل الكورس بنجاح! 🎉</h2>
              <p className="text-sm font-bold text-[#0077B6]">{codeSuccessModal.courseTitle}</p>
              <div className="bg-emerald-50 text-emerald-800 rounded-xl px-4 py-2.5 text-xs font-black border border-emerald-200">
                {codeSuccessModal.accessType === "FullCourse"
                  ? "اشتراك كامل في جميع محتويات الكورس ✅"
                  : `محتوى مخصص ومحدد (${codeSuccessModal.allowedCount} درس/ملف) ✅`}
              </div>
              <p className="text-xs text-slate-500 font-bold pt-1">
                تم فتح المحتوى المحدد لك بنجاح. يمكنك الآن الدخول فوراً ومتابعة المحاضرات والملفات المصرح لك بها فقط.
              </p>
            </div>

            <Link
              to={`/courses/${course.id}`}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 shadow-lg shadow-emerald-600/25 transition text-sm"
            >
              الدخول للكورس وبدء المشاهدة 🚀
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
