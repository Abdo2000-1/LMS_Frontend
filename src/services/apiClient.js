export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://localhost:7062/api").replace(/\/+$/, "");
const AUTH_STORAGE_KEY = "lms.auth.session";

let inMemorySession = null;

function readStoredSession() {
  if (inMemorySession) return inMemorySession;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    inMemorySession = parsed;
    return parsed;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session) {
  inMemorySession = session;
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function getSession() {
  return readStoredSession();
}

export function setSession(session) {
  writeStoredSession(session);
}

export function clearSession() {
  writeStoredSession(null);
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function refreshAccessToken(session) {
  if (!session?.refreshToken) {
    clearSession();
    throw new Error("انتهت الجلسة، برجاء تسجيل الدخول مرة أخرى.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    clearSession();
    throw new Error(payload?.detail || payload?.message || "تعذر تجديد الجلسة.");
  }

  const nextSession = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    user: payload,
  };
  setSession(nextSession);
  return nextSession;
}

export async function apiRequest(path, { method = "GET", body, headers = {}, retry = true } = {}) {
  const session = getSession();
  const finalHeaders = { ...headers };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (session?.accessToken) finalHeaders.Authorization = `Bearer ${session.accessToken}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && retry && session?.refreshToken) {
    const refreshed = await refreshAccessToken(session);
    return apiRequest(path, {
      method,
      body,
      headers,
      retry: false,
    });
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || "تعذر إتمام الطلب.");
  }
  return payload;
}

export const api = {
  get: (path) => apiRequest(path),
  post: (path, body) => apiRequest(path, { method: "POST", body }),
  put: (path, body) => apiRequest(path, { method: "PUT", body }),
  patch: (path, body) => apiRequest(path, { method: "PATCH", body }),
  delete: (path) => apiRequest(path, { method: "DELETE" }),
};
