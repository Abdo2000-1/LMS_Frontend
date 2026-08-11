/**
 * paymentService.js
 * All payment operations go through the .NET backend.
 */

import apiClient from "../lib/apiClient.js";

const requestConfig = { skipGlobalErrorToast: true };

function extractErrorMessage(error) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.title ||
    error?.response?.data?.message ||
    error?.message ||
    "حدث خطأ في عملية الدفع."
  );
}

function mapPayment(payment) {
  return {
    id: payment.id,
    userId: payment.userId,
    courseId: payment.courseId,
    studentName: payment.studentName || payment.userId,
    courseTitle: payment.courseTitle || payment.courseId,
    status: payment.status,
    amount: Number(payment.amount || 0),
    currency: payment.currency || "EGP",
    createdAt: payment.createdAt,
    providerPaymentId: payment.providerPaymentId,
  };
}

/**
 * Create a payment order for a course.
 */
export async function createPaymentOrder({ user, course }) {
  if (!course?.id) throw new Error("بيانات الكورس غير مكتملة.");
  if (!user?.uid) throw new Error("لازم تسجل الدخول قبل الدفع.");

  try {
    const { data } = await apiClient.post(
      "/api/payments/orders",
      { courseId: course.id },
      requestConfig
    );

    return {
      paymentId: data.paymentId,
      referenceCode: data.referenceCode,
      paymentUrl: data.paymentUrl || "#",
      paid: data.paid || false,
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Verify (confirm) a payment order — marks it as paid and enrolls the student.
 */
export async function verifyPaymentOrder({ paymentId }) {
  if (!paymentId) throw new Error("طلب الدفع غير موجود.");

  try {
    const { data } = await apiClient.post(
      `/api/payments/orders/${paymentId}/verify`,
      null,
      requestConfig
    );
    return {
      paid: data.paid,
      status: data.status,
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Subscribe to payments list with periodic refresh (Teacher/Admin view).
 */
export function subscribePayments(callback) {
  let active = true;

  const load = () =>
    apiClient
      .get("/api/payments", requestConfig)
      .then(({ data }) => {
        if (active) {
          callback(Array.isArray(data) ? data.map(mapPayment) : []);
        }
      })
      .catch(() => {
        if (active) callback([]);
      });

  load();
  const timer = setInterval(load, 10000);
  return () => {
    active = false;
    clearInterval(timer);
  };
}
