import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CreditCard, FileImage, ReceiptText, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getCourseById } from "../services/courseService.js";
import { createPaymentOrder, submitManualPaymentRequest } from "../services/paymentService.js";
import AppHeader from "../components/AppHeader.jsx";
import Footer from "../components/Footer.jsx";

function calculateFinalPrice(course) {
  const basePrice = Number(course?.price || 0);
  const discountPercent = Number(course?.discountPercent || 0);
  return Math.max(0, Math.round(basePrice * (1 - discountPercent / 100)));
}

export default function Payment() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [step, setStep] = useState("invoice");
  const [proofImage, setProofImage] = useState(null);
  const [walletChannel, setWalletChannel] = useState("vodafone-cash");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getCourseById(courseId)
      .then(setCourse)
      .catch(() => setError("تعذر تحميل بيانات الكورس."));
  }, [courseId]);

  const finalPrice = useMemo(() => calculateFinalPrice(course), [course]);
  const alreadyEnrolled = useMemo(() => (user?.enrolledCourses || []).includes(courseId), [user?.enrolledCourses, courseId]);

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

  async function createInvoice() {
    if (!course || !user) return;
    setIsSubmitting(true);
    setError("");
    try {
      const order = await createPaymentOrder({ user, course });
      setInvoice(order);
      setStep("method");
    } catch (err) {
      setError(err.message || "تعذر إنشاء الفاتورة.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitProof() {
    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      await submitManualPaymentRequest({ courseId, proofImage, walletChannel });
      setNotice("تم إرسال طلب الدفع بنجاح. سيتم فتح الكورس فور موافقة الإدارة.");
      setStep("sent");
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

  return (
    <div dir="rtl" className="min-h-screen bg-[#F4F9FF] text-slate-950 font-['Cairo',_sans-serif]">
      <AppHeader active="/courses" />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <section className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-white shadow-2xl shadow-cyan-900/10">
          <div className="bg-gradient-to-l from-[#0077B6] via-[#00A8E8] to-[#38D9C8] px-6 py-7 text-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold opacity-85">MENA MOURID Chemistry LMS</p>
                <h1 className="mt-1 text-3xl font-extrabold">فاتورة الاشتراك</h1>
              </div>
              <div className="rounded-2xl bg-white/15 px-4 py-3 text-left backdrop-blur">
                <p className="text-xs opacity-80">Invoice For</p>
                <p className="font-extrabold">{user?.name}</p>
                <p className="text-sm opacity-90">{user?.phone || user?.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            {alreadyEnrolled ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-700">
                أنت مشترك بالفعل في هذا الكورس.
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-4 py-3">المنتج</th>
                        <th className="px-4 py-3">الكمية</th>
                        <th className="px-4 py-3">السعر</th>
                        <th className="px-4 py-3">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-200">
                        <td className="px-4 py-4 font-bold">{course.title}</td>
                        <td className="px-4 py-4">1</td>
                        <td className="px-4 py-4">{course.price} EGP</td>
                        <td className="px-4 py-4 font-extrabold">{finalPrice} EGP</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                  <span className="font-bold text-slate-500">Total</span>
                  <span className="text-2xl font-extrabold text-[#0077B6]">{finalPrice} EGP</span>
                </div>

                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

                {step === "invoice" && (
                  <div className="text-center space-y-4">
                    <p className="text-sm font-bold text-slate-500">
                      زي ما هو موضح كدا في الصورة دي
                    </p>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={createInvoice}
                      className="mx-auto flex min-w-64 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-6 py-3.5 font-extrabold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-60"
                    >
                      <ReceiptText size={18} />
                      {isSubmitting ? "جار تجهيز الفاتورة..." : `دفع الفاتورة ${finalPrice} EGP`}
                    </button>
                  </div>
                )}

                {step === "method" && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNotice("عفواً، الدفع الإلكتروني تحت التطوير حالياً. برجاء اختيار الدفع اليدوي.");
                        }}
                        className="rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-[#FF6B35] hover:shadow-md"
                      >
                        <CreditCard className="mb-3 text-[#FF6B35]" />
                        <p className="font-extrabold">دفع إلكتروني (فيزا / محافظ)</p>
                        <p className="mt-1 text-sm text-slate-500">هذه الخدمة تحت التطوير حالياً</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStep("manual");
                          setNotice("");
                        }}
                        className="rounded-2xl border border-[#00A8E8] bg-cyan-50/50 p-5 text-right shadow-sm transition hover:border-[#0077B6] hover:shadow-md"
                      >
                        <Wallet className="mb-3 text-[#0077B6]" />
                        <p className="font-extrabold">دفع يدوي (فودافون كاش / إنستاباي)</p>
                        <p className="mt-1 text-sm text-slate-500">رفع صورة التحويل وتفعيل فوري للكورس</p>
                      </button>
                    </div>
                  </div>
                )}

                {step === "manual" && (
                  <div className="space-y-5 rounded-2xl border border-cyan-100 bg-cyan-50/20 p-6">
                    <div className="text-right">
                      <h3 className="font-extrabold text-slate-800 text-base mb-1">أرسل المبلغ كاملاً إلى أحد الحسابات التالية:</h3>
                      <p className="text-xs text-slate-500">بعد إرسال المبلغ، قم برفع لقطة شاشة (Screenshot) لعملية التحويل أدناه لتأكيد طلبك.</p>
                    </div>
                    
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <span className="font-bold text-slate-700">فودافون كاش (Vodafone Cash)</span>
                        <p className="mt-1 text-base font-black text-[#0077B6]" dir="ltr">{invoice?.vodafoneCash || "01000000000"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <span className="font-bold text-slate-700">إنستاباي (InstaPay IPN)</span>
                        <p className="mt-1 text-base font-black text-[#0077B6]" dir="ltr">{invoice?.instaPay || "mena.mourid@instapay"}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-slate-700">إثبات عملية التحويل:</label>
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-300 bg-white px-4 py-8 text-center hover:bg-cyan-50/50">
                        <FileImage className="text-[#0077B6]" />
                        <span className="font-bold text-sm text-slate-600">{proofImage ? proofImage.name : "ارفع صورة إثبات التحويل"}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => setProofImage(event.target.files?.[0] || null)} />
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

                {step === "sent" && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800 space-y-2">
                    <p className="flex items-center gap-2 font-extrabold text-lg"><ShieldCheck size={22} /> تم إرسال طلب الاشتراك بنجاح!</p>
                    <p className="text-sm">لقد تم إرسال إشعار فوري للدكتور مينا موريد لتفعيل الكورس الخاص بك. سيتم مراجعة صورة التحويل وتفعيل الكورس في أقرب وقت.</p>
                  </div>
                )}
              </>
            )}

            <Link to={`/courses/${course.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#0077B6] hover:underline">
              العودة إلى صفحة الكورس
              <ArrowLeft size={14} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
