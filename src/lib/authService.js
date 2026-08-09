import { account, ID } from "./appwrite.js";
import { findOne, insertOne, updateOne } from "../services/appwriteDbService.js";

const USERS_COLLECTION = "users";

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

function normalizeRole(role) {
  const normalized = String(role || "student").toLowerCase();
  if (["teacher", "developer"].includes(normalized)) return normalized;
  return "student";
}

export function mapUserProfile(appwriteUser, profile = {}) {
  if (!appwriteUser && !profile) return null;
  return {
    uid: profile.uid || profile.appwriteUserId || appwriteUser?.$id || "",
    appwriteUserId: profile.appwriteUserId || appwriteUser?.$id || "",
    name: profile.name || profile.fullName || appwriteUser?.name || "مستخدم",
    email: profile.email || appwriteUser?.email || "",
    phone: profile.phone || "",
    role: normalizeRole(profile.role),
    grade: profile.grade || "",
    governorate: profile.governorate || "",
    enrolledCourses: profile.enrolledCourses || [],
    progress: profile.progress || {},
    quizResults: profile.quizResults || {},
    isBlocked: Boolean(profile.isBlocked),
  };
}

async function findProfileByAppwriteId(appwriteUserId) {
  return findOne(USERS_COLLECTION, { filter: { appwriteUserId } });
}

async function findProfileByPhone(phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;
  return findOne(USERS_COLLECTION, { filter: { phone: normalizedPhone } });
}

async function ensureProfile(appwriteUser, overrides = {}) {
  const existing = await findProfileByAppwriteId(appwriteUser.$id);
  if (existing) return mapUserProfile(appwriteUser, existing);

  const now = new Date().toISOString();
  const document = {
    appwriteUserId: appwriteUser.$id,
    uid: appwriteUser.$id,
    name: overrides.name || appwriteUser.name || "",
    email: appwriteUser.email || "",
    phone: normalizePhone(overrides.phone),
    role: "student",
    grade: overrides.grade || "",
    governorate: overrides.governorate || "",
    enrolledCourses: [],
    progress: {},
    quizResults: {},
    isBlocked: false,
    createdAt: now,
    updatedAt: now,
  };

  const created = await insertOne(USERS_COLLECTION, document);
  return mapUserProfile(appwriteUser, created);
}

export async function refreshProfileRequest() {
  const appwriteUser = await account.get();
  const profile = await ensureProfile(appwriteUser);
  return { user: profile, token: appwriteUser.$id };
}

export async function registerRequest({ name, email, phone, grade, governorate, password }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanName = String(name || "").trim();
  await account.create(ID.unique(), cleanEmail, password, cleanName);
  await account.createEmailPasswordSession(cleanEmail, password);
  const appwriteUser = await account.get();
  const profile = await ensureProfile(appwriteUser, {
    name: cleanName,
    phone,
    grade,
    governorate,
  });
  return { user: profile, token: appwriteUser.$id };
}

export async function loginRequest({ email, phone, password }) {
  let loginEmail = String(email || "").trim().toLowerCase();
  if (!loginEmail && phone) {
    const profile = await findProfileByPhone(phone);
    loginEmail = String(profile?.email || "").trim().toLowerCase();
  }

  if (!loginEmail) {
    throw new Error("لم يتم العثور على حساب مرتبط بهذا الرقم.");
  }

  await account.createEmailPasswordSession(loginEmail, password);
  const appwriteUser = await account.get();
  const profile = await ensureProfile(appwriteUser);
  return { user: profile, token: appwriteUser.$id };
}

export async function updateProfileRequest({ name }) {
  const appwriteUser = await account.get();
  const cleanName = String(name || "").trim();
  if (cleanName) {
    await account.updateName(cleanName);
  }

  await updateOne(USERS_COLLECTION, {
    filter: { appwriteUserId: appwriteUser.$id },
    update: {
      $set: {
        name: cleanName || appwriteUser.name,
        updatedAt: new Date().toISOString(),
      },
    },
  });

  return refreshProfileRequest();
}

export async function logoutRequest() {
  await account.deleteSession("current").catch(() => undefined);
}

export function watchAuthState(callback) {
  let active = true;
  refreshProfileRequest()
    .then(({ user, token }) => {
      if (active) callback(user, token);
    })
    .catch(() => {
      if (active) callback(null, null);
    });

  return () => {
    active = false;
  };
}

export function getLandingRouteByRole(role) {
  if (role === "teacher") return "/teacher/dashboard";
  if (role === "developer") return "/dev/master";
  return "/dashboard";
}
