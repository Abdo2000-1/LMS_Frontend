import { find, insertOne, objectIdFilter, updateOne } from "./appwriteDbService.js";
import { enrollStudentInCourse } from "./courseService.js";

const PAYMENTS_COLLECTION = "payments";

export async function createPaymentOrder({ user, course }) {
  if (!course?.id) throw new Error("بيانات الدفع غير مكتملة.");
  if (!user?.uid) throw new Error("لازم تسجل الدخول قبل الدفع.");

  const finalAmount = Math.max(0, Number(course.price || 0) * (1 - Number(course.discountPercent || 0) / 100));
  const now = new Date().toISOString();
  const payment = await insertOne(PAYMENTS_COLLECTION, {
    uid: user.uid,
    studentName: user.name || "",
    courseId: course.id,
    courseTitle: course.title || "",
    amount: Math.round(finalAmount),
    currency: "EGP",
    status: "pending",
    provider: "manual",
    referenceCode: `pay_${Date.now()}`,
    paid: false,
    createdAt: now,
    updatedAt: now,
  });

  return {
    paymentId: payment.id,
    referenceCode: payment.referenceCode,
    paymentUrl: "#",
    paid: false,
  };
}

export async function verifyPaymentOrder({ paymentId }) {
  if (!paymentId) throw new Error("طلب الدفع غير موجود.");

  const now = new Date().toISOString();
  await updateOne(PAYMENTS_COLLECTION, {
    filter: objectIdFilter(paymentId),
    update: {
      $set: {
        status: "paid",
        paid: true,
        paidAt: now,
        updatedAt: now,
      },
    },
  });

  const [payment] = await find(PAYMENTS_COLLECTION, { filter: objectIdFilter(paymentId), limit: 1 });
  if (payment?.uid && payment?.courseId) {
    await enrollStudentInCourse({ uid: payment.uid, courseId: payment.courseId });
  }

  return { paid: true, status: "paid" };
}

export function subscribePayments(callback) {
  let active = true;
  const load = () =>
    find(PAYMENTS_COLLECTION, { sort: { createdAt: -1 } })
      .then((items) => {
        if (active) callback(items);
      })
      .catch(() => {
        if (active) callback([]);
      });

  load();
  const timer = setInterval(load, 8000);
  return () => {
    active = false;
    clearInterval(timer);
  };
}
