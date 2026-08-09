import { api } from "./apiClient.js";

export async function createPaymentOrder({ course }) {
  if (!course?.id) throw new Error("بيانات الدفع غير مكتملة.");
  return api.post("/payments/orders", {
    courseId: course.id,
  });
}

export async function verifyPaymentOrder({ paymentId }) {
  if (!paymentId) throw new Error("طلب الدفع غير موجود.");
  return api.post(`/payments/orders/${paymentId}/verify`, {});
}

export function subscribePayments(callback) {
  let active = true;
  const load = () =>
    api
      .get("/payments")
      .then((items) => {
        if (active) callback(items || []);
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
