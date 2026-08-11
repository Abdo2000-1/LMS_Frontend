const listeners = new Set();

export function subscribeNotifications(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyError(message) {
  if (!message) return;
  listeners.forEach((listener) => listener({ type: "error", message }));
}

export function notifySuccess(message) {
  if (!message) return;
  listeners.forEach((listener) => listener({ type: "success", message }));
}
