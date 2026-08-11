/**
 * apiClient.js
 * Axios HTTP client configured to talk to the .NET LMS backend.
 * Handles JWT token injection, automatic refresh on 401, and global error notifications.
 */

import axios from "axios";
import { notifyError } from "./notificationBus.js";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5102";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 30000,
});

let onSessionExpired = null;

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

// ─── Token helpers ─────────────────────────────────────────────
export function getStoredTokens() {
  try {
    return {
      accessToken: localStorage.getItem("lms_access_token") || null,
      refreshToken: localStorage.getItem("lms_refresh_token") || null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

export function storeTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem("lms_access_token", accessToken);
  if (refreshToken) localStorage.setItem("lms_refresh_token", refreshToken);
}

export function clearTokens() {
  localStorage.removeItem("lms_access_token");
  localStorage.removeItem("lms_refresh_token");
  localStorage.removeItem("lms_user");
}

export function storeUser(user) {
  localStorage.setItem("lms_user", JSON.stringify(user));
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("lms_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function extractApiErrorMessage(error) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.title ||
    error?.response?.data?.message ||
    error?.message ||
    "حدث خطأ غير متوقع."
  );
}

function handleSessionExpired() {
  clearTokens();
  onSessionExpired?.();
  notifyError("انتهت الجلسة. من فضلك سجّل الدخول مرة أخرى.");
}

// ─── Request interceptor — inject Authorization header ──────────
apiClient.interceptors.request.use((config) => {
  const { accessToken } = getStoredTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ─── Response interceptor — auto-refresh on 401 ─────────────────
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken } = getStoredTokens();
      if (!refreshToken) {
        handleSessionExpired();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        storeTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });

        onRefreshed(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        handleSessionExpired();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    if (originalRequest?.skipGlobalErrorToast) {
      return Promise.reject(error);
    }

    if (status && status >= 400 && !originalRequest?.url?.includes("/api/auth/refresh")) {
      notifyError(extractApiErrorMessage(error));
    }

    return Promise.reject(error);
  }
);

export default apiClient;
