import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { subscribeNotifications } from "../lib/notificationBus.js";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    return subscribeNotifications((nextToast) => {
      setToast(nextToast);
      window.clearTimeout(window.__lmsToastTimer);
      window.__lmsToastTimer = window.setTimeout(() => setToast(null), 5000);
    });
  }, []);

  const value = useMemo(() => ({ dismissToast }), [dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="alert"
          className={`fixed top-4 left-1/2 z-[100] w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-bold shadow-lg backdrop-blur ${
            toast.type === "error"
              ? "border-red-200 bg-red-50/95 text-red-700 dark:border-red-900/40 dark:bg-red-950/90 dark:text-red-300"
              : "border-emerald-200 bg-emerald-50/95 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/90 dark:text-emerald-300"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-right leading-6">{toast.message}</p>
            <button
              type="button"
              onClick={dismissToast}
              className="shrink-0 text-xs opacity-70 hover:opacity-100"
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
