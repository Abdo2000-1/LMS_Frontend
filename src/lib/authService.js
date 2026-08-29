/**
 * authService.js
 * All authentication logic now goes through the .NET backend REST API.
 * JWT tokens are stored in localStorage via apiClient helpers.
 */

import apiClient, {
  clearTokens,
  getStoredTokens,
  getStoredUser,
  storeTokens,
  storeUser,
} from "./apiClient.js";

const requestConfig = { skipGlobalErrorToast: true };

// ─── Constants ─────────────────────────────────────────────────
export const STUDENT_GRADES = [
  "الصف الأول الثانوي",
  "الصف الثاني الثانوي",
  "الصف الثالث الثانوي",
];

export const GOVERNORATE_OPTIONS = [
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

// ─── Helpers ────────────────────────────────────────────────────
export function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeRole(role) {
  const normalized = String(role || "student").toLowerCase();
  if (["teacher", "developer"].includes(normalized)) return normalized;
  return "student";
}

/**
 * Map the backend AuthResponse to the frontend user shape.
 * Backend returns: { userId, uid, email, phone, fullName, name, role, grade, governorate,
 *                    isBlocked, enrolledCourses, progress, quizResults,
 *                    accessToken, refreshToken, ... }
 */
export function mapUserProfile(data) {
  if (!data) return null;
  return {
    uid: data.uid || data.userId || "",
    userId: data.userId || data.uid || "",
    name: data.name || data.fullName || "مستخدم",
    email: data.email || "",
    phone: data.phone || "",
    parentPhone: data.parentPhone || "",
    center: data.center || "",
    role: normalizeRole(data.role),
    grade: data.grade || "",
    governorate: data.governorate || "",
    enrolledCourses: Array.isArray(data.enrolledCourses) ? data.enrolledCourses : [],
    allowedUnits: data.allowedUnits || {},
    progress: data.progress || {},
    quizResults: data.quizResults || {},
    isBlocked: Boolean(data.isBlocked),
  };
}

function extractErrorMessage(error) {
  // Try to get a readable message from the backend error response
  const detail =
    error?.response?.data?.detail ||
    error?.response?.data?.title ||
    error?.response?.data?.message ||
    error?.message ||
    "حدث خطأ غير متوقع.";
  return detail;
}

// ─── Auth API Calls ─────────────────────────────────────────────

/**
 * Register a new student account.
 */
export async function registerRequest({ name, email, phone, parentPhone, center, grade, governorate, password }) {
  try {
    const { data } = await apiClient.post("/api/auth/register", {
      fullName: String(name || "").trim(),
      email: String(email || "").trim().toLowerCase(),
      phone: normalizePhone(phone),
      parentPhone: normalizePhone(parentPhone),
      center: String(center || "").trim(),
      grade: String(grade || "").trim(),
      governorate: String(governorate || "").trim(),
      password,
    }, requestConfig);

    storeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    const user = mapUserProfile(data);
    storeUser(user);
    return { user, token: data.accessToken };
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Login with email/phone + password.
 */
export async function loginRequest({ email, phone, password }) {
  try {
    const { data } = await apiClient.post("/api/auth/login", {
      email: email ? String(email).trim().toLowerCase() : null,
      phone: phone ? normalizePhone(phone) : null,
      password,
    }, requestConfig);

    storeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    const user = mapUserProfile(data);
    storeUser(user);
    return { user, token: data.accessToken };
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Fetch current user profile from backend (uses stored access token).
 */
export async function refreshProfileRequest() {
  try {
    const { accessToken, refreshToken } = getStoredTokens();
    if (!accessToken && !refreshToken) {
      throw new Error("No session.");
    }

    const { data } = await apiClient.get("/api/auth/me", requestConfig);
    const user = mapUserProfile(data);
    storeUser(user);
    return { user, token: accessToken };
  } catch (error) {
    clearTokens();
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Update display name.
 */
export async function updateProfileRequest({ name }) {
  try {
    const { data } = await apiClient.patch("/api/auth/me", {
      name: String(name || "").trim(),
    }, requestConfig);
    const user = mapUserProfile(data);
    storeUser(user);
    return { user };
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Logout — revoke the refresh token on the backend, clear local storage.
 */
export async function logoutRequest() {
  try {
    const { refreshToken } = getStoredTokens();
    if (refreshToken) {
      await apiClient.post("/api/auth/revoke", { refreshToken }, requestConfig).catch(() => undefined);
    }
  } finally {
    clearTokens();
  }
}

/**
 * Called on app startup — tries to restore session from stored tokens.
 * Calls the callback immediately with (user, token) or (null, null).
 */
export function watchAuthState(callback) {
  let active = true;

  const { accessToken } = getStoredTokens();
  if (!accessToken) {
    // No stored token — try cached user first, then give up
    const cachedUser = getStoredUser();
    callback(cachedUser, null);
    return () => { active = false; };
  }

  // Validate the stored token by hitting /api/auth/me
  refreshProfileRequest()
    .then(({ user, token }) => {
      if (active) callback(user, token);
    })
    .catch(() => {
      if (active) callback(null, null);
    });

  return () => { active = false; };
}

/**
 * Route helper based on user role.
 */
export function getLandingRouteByRole(role) {
  if (role === "teacher") return "/teacher/dashboard";
  if (role === "developer") return "/dev/master";
  return "/dashboard";
}
