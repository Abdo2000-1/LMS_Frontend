import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Wallet, ArrowLeft, ReceiptText, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getCourseById } from "../services/courseService.js";
import { createPaymentOrder, verifyPaymentOrder } from "../services/paymentService.js";
import AppHeader from "../components/AppHeader.jsx";
import Footer from "../components/Footer.jsx";

function calculateFinalPrice(course) {
  const basePrice = Number(course?.price || 0);
  const discountPercent = Number(course?.discountPercent || 0);
  if (!discountPercent) return basePrice;
  return Math.max(0, Math.round(basePrice * (1 - discountPercent / 100)));
}

export default function Payment() {
  const { courseId } = useParams();
  const { user, refreshProfile } = useAuth();

  const [course, setCourse] = useState(null);
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCourseById(courseId)
      .then(setCourse)
      .catch(() => setError("تعذر تحميل بيانات الكورس."));
  }, [courseId]);

  const finalPrice = useMemo(() => calculateFinalPrice(course), [course]);
  const alreadyEnrolled = useMemo(() => (user?.enrolledCourses || []).includes(courseId), [user?.enrolledCourses, courseId]);

  async function handleCheckout() {
    if (!course || !user) return;
    setIsSubmitting(true);
    setError("");
    try {
      const order = await createPaymentOrder({ user, course });
      setResult(order);
    } catch (checkoutError) {
      setError(checkoutError.message || "تعذر تنفيذ عملية الدفع.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyPayment() {
    if (!result || !course || !user) return;
    setIsVerifying(true);
    setError("");
    try {
      const verification = await verifyPaymentOrder({
        paymentId: result.paymentId,
      });
      if (!verification.paid) {
        setError(`الدفع لم يكتمل حتى الآن. الحالة الحالية: ${verification.status}`);
        return;
      }
      setResult((prev) => ({ ...prev, paid: true }));
      await refreshProfile();
    } catch (verifyError) {
      setError(verifyError.message || "تعذر التحقق من الدفع.");
    } finally {
      setIsVerifying(false);
    }
  }

  if (!course) {
    return (
      <div dir="rtl" className="min-h-screen bg-white dark:bg-slate-950">
        <AppHeader active="/courses" />
        <main className="max-w-3xl mx-auto px-6 sm:px-10 py-10 text-center text-slate-500 dark:text-slate-400">
          جارٍ تحميل صفحة الدفع...
        </main>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Cairo',_sans-serif] transition-colors duration-500"
    >
      <AppHeader active="/courses" />

      <main className="max-w-3xl mx-auto px-6 sm:px-10 py-10">
        <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-7 ring-1 ring-black/5 dark:ring-white/10 space-y-6">
          <div className="text-right">
            <h1 className="text-2xl font-extrabold mb-1">صفحة الدفع</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">تأكيد الاشتراك ثم التحويل إلى فوري باي.</p>
          </div>

          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3 text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400">الكورس</p>
            <h2 className="font-extrabold">{course.title}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">السعر الأساسي</p>
                <p className="font-bold">{course.price || 0} ج.م</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">الخصم</p>
                <p className="font-bold">{course.discountPercent || 0}%</p>
              </div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">المطلوب دفعه الآن</span>
              <span className="text-xl font-extrabold text-red-800 dark:text-amber-400">{finalPrice} ج.م</span>
            </div>
          </div>

          {error && (
            <div className="text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40 rounded-xl px-4 py-3 text-right">
              {error}
            </div>
          )}

          {!result && !alreadyEnrolled && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCheckout}
              className="w-full bg-red-800 text-white font-extrabold rounded-xl py-3.5 hover:bg-red-900 transition-colors duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Wallet size={18} />
              {isSubmitting ? "جاري تجهيز طلب الدفع..." : "تأكيد وطلب كود فوري"}
            </button>
          )}

          {alreadyEnrolled && !result && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-300 text-right">
              أنت مشترك بالفعل في هذا الكورس.
            </div>
          )}

          {result && (
            <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 rounded-xl p-5 text-right space-y-3">
              <p className="font-extrabold flex items-center gap-2 text-amber-900 dark:text-amber-300">
                <ReceiptText size={18} />
                تم إنشاء طلب الدفع
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                كود المرجع: <span className="font-bold">{result.referenceCode}</span>
              </p>
              <a
                href={result.paymentUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-amber-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors duration-300"
              >
                التحويل إلى فوري باي
                <ArrowLeft size={14} />
              </a>
              <button
                type="button"
                onClick={handleVerifyPayment}
                disabled={isVerifying || result.paid}
                className="block w-full sm:w-auto bg-red-800 text-white font-bold px-4 py-2 rounded-lg hover:bg-red-900 transition-colors duration-300 disabled:opacity-60"
              >
                {result.paid ? "تم تأكيد الدفع وفتح الكورس" : isVerifying ? "جاري التحقق..." : "تحقّق من الدفع وافتح الكورس"}
              </button>
              <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <ShieldCheck size={12} />
                الاشتراك لا يفتح إلا بعد رجوع حالة الدفع من فوري بأنه مكتمل.
              </p>
            </div>
          )}

          <Link
            to={`/courses/${course.id}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-red-800 dark:text-amber-400 hover:underline"
          >
            العودة إلى صفحة الكورس
            <ArrowLeft size={14} />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
