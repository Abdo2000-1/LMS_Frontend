/**
 * paymentService.js
 * All payment operations go through the .NET backend.
 */

import apiClient from "../lib/apiClient.js";

function extractErrorMessage(error) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.title ||
    error?.response?.data?.message ||
    error?.message ||
    "حدث خطأ في عملية الدفع."
  );
}

/**
 * Create a payment order for a course.
 * @param {{ user: object, course: object }} param
 */
export async function createPaymentOrder({ user, course }) {
  if (!course?.id) throw new Error("بيانات الكورس غير مكتملة.");
  if (!user?.uid) throw new Error("لازم تسجل الدخول قبل الدفع.");

  try {
    const { data } = await apiClient.post("/api/payments/orders", {
      courseId: course.id,
    });

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
 * @param {{ paymentId: string }} param
 */
export async function verifyPaymentOrder({ paymentId }) {
  if (!paymentId) throw new Error("طلب الدفع غير موجود.");

  try {
    const { data } = await apiClient.post(`/api/payments/orders/${paymentId}/verify`);
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
 * Returns an unsubscribe function.
 */
export function subscribePayments(callback) {
  let active = true;

  const load = () =>
    apiClient
      .get("/api/payments")
      .then(({ data }) => {
        if (active) callback(Array.isArray(data) ? data : []);
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
