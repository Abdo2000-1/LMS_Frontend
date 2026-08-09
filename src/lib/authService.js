import { api, clearSession, getSession, setSession } from "../services/apiClient.js";

const GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الدقهلية",
  "الشرقية",
  "المنوفية",
  "القليوبية",
  "الغربية",
  "كفر الشيخ",
  "الفيوم",
  "أسيوط",
  "سوهاج",
  "المنيا",
  "البحيرة",
  "بني سويف",
  "قنا",
  "الأقصر",
  "أسوان",
  "دمياط",
  "الإسماعيلية",
  "بورسعيد",
  "السويس",
  "مطروح",
  "شمال سيناء",
  "جنوب سيناء",
  "الوادي الجديد",
  "البحر الأحمر",
];

export const STUDENT_GRADES = ["الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"];
export const GOVERNORATE_OPTIONS = GOVERNORATES;

export function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function mapApiUser(payload) {
  return {
    uid: payload.uid || payload.userId || "",
    name: payload.name || payload.fullName || "مستخدم",
    email: payload.email || "",
    phone: payload.phone || "",
    role: payload.role || "student",
    grade: payload.grade || "",
    governorate: payload.governorate || "",
    enrolledCourses: payload.enrolledCourses || [],
    progress: payload.progress || {},
    quizResults: payload.quizResults || {},
    isBlocked: Boolean(payload.isBlocked),
  };
}

function writeSessionFromAuthResponse(payload) {
  const user = mapApiUser(payload);
  const session = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    user,
  };
  setSession(session);
  return session;
}

export async function refreshProfileRequest() {
  const session = getSession();
  if (!session?.accessToken) return { user: null, token: null };

  const payload = await api.get("/auth/me");
  const nextSession = {
    ...session,
    user: mapApiUser(payload),
  };
  setSession(nextSession);
  return { user: nextSession.user, token: nextSession.accessToken };
}

export async function registerRequest({ name, email, phone, grade, governorate, password }) {
  const normalizedPhone = normalizePhone(phone);
  const payload = await api.post("/auth/register", {
    fullName: String(name || "").trim(),
    email: String(email || "").trim().toLowerCase(),
    phone: normalizedPhone,
    grade: String(grade || "").trim(),
    governorate: String(governorate || "").trim(),
    password,
  });
  const session = writeSessionFromAuthResponse(payload);
  return { user: session.user, token: session.accessToken };
}

export async function loginRequest({ phone, password }) {
  const normalizedPhone = normalizePhone(phone);
  const payload = await api.post("/auth/login", {
    phone: normalizedPhone,
    password,
  });
  const session = writeSessionFromAuthResponse(payload);
  return { user: session.user, token: session.accessToken };
}

export async function updateProfileRequest({ name }) {
  const payload = await api.patch("/auth/me", { name: String(name || "").trim() });
  const session = getSession();
  if (session) {
    const next = { ...session, user: mapApiUser(payload) };
    setSession(next);
    return { user: next.user };
  }
  return { user: mapApiUser(payload) };
}

export async function logoutRequest() {
  const session = getSession();
  if (session?.refreshToken) {
    try {
      await api.post("/auth/revoke", { refreshToken: session.refreshToken });
    } catch {
      // no-op: local session must still be cleared
    }
  }
  clearSession();
}

export function watchAuthState(callback) {
  const session = getSession();
  if (!session?.accessToken) {
    callback(null, null);
    return () => {};
  }

  refreshProfileRequest()
    .then(({ user, token }) => {
      callback(user, token);
    })
    .catch(() => {
      clearSession();
      callback(null, null);
    });

  return () => {};
}

export function getLandingRouteByRole(role) {
  if (role === "teacher") return "/teacher/dashboard";
  if (role === "developer") return "/dev/master";
  return "/dashboard";
}
