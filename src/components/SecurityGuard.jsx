import { useEffect, useState } from "react";

const blockedKeys = new Set(["F12"]);

function isBlockedShortcut(event) {
  const key = String(event.key || "").toLowerCase();
  return (
    blockedKeys.has(event.key) ||
    (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) ||
    (event.ctrlKey && ["u", "s"].includes(key))
  );
}

export default function SecurityGuard() {
  const [blurred, setBlurred] = useState(false);

  useEffect(() => {
    // استثناء الموبايل والتابلت لمنع إغلاق الشاشة بالخطأ بسبب أبعاد متصفحات الهواتف
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) return;

    function blockContextMenu(event) {
      event.preventDefault();
    }

    function blockShortcuts(event) {
      if (isBlockedShortcut(event)) {
        event.preventDefault();
        setBlurred(true);
        window.setTimeout(() => setBlurred(false), 1800);
      }
    }

    function detectDevTools() {
      const threshold = 170;
      const open =
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold;
      setBlurred(open);
    }

    function blockSelection(e) {
      e.preventDefault();
    }

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockShortcuts);
    document.addEventListener("selectstart", blockSelection);
    document.addEventListener("dragstart", blockSelection);
    document.addEventListener("copy", blockSelection);
    document.addEventListener("cut", blockSelection);
    const timer = window.setInterval(detectDevTools, 1200);

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockShortcuts);
      document.removeEventListener("selectstart", blockSelection);
      document.removeEventListener("dragstart", blockSelection);
      document.removeEventListener("copy", blockSelection);
      document.removeEventListener("cut", blockSelection);
      window.clearInterval(timer);
    };
  }, []);

  if (!blurred) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl text-white">
      <div className="rounded-2xl border border-cyan-300/30 bg-white/10 px-6 py-5 text-center shadow-2xl">
        <p className="text-lg font-extrabold">تم إيقاف العرض مؤقتًا</p>
        <p className="mt-1 text-sm text-cyan-100">
          حماية محتوى منصة الدكتور مينا موريد
        </p>
      </div>
    </div>
  );
}
