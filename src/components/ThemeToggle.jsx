import { useTheme } from "../context/ThemeContext.jsx";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "التبديل للوضع النهاري" : "التبديل للوضع الليلي"}
      title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
      className="relative flex items-center justify-center w-14 h-7 rounded-full transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0077B6] overflow-hidden shrink-0"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
          : "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
        border: isDark ? "2px solid #334155" : "2px solid #7dd3fc",
        boxShadow: isDark
          ? "0 0 12px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "0 0 12px rgba(251,191,36,0.4), inset 0 1px 0 rgba(255,255,255,0.8)"
      }}
    >
      {/* Stars (dark mode) */}
      {isDark && (
        <>
          <span className="absolute w-0.5 h-0.5 rounded-full bg-white top-1 left-2 animate-pulse" />
          <span className="absolute w-1 h-1 rounded-full bg-white/70 top-2 left-4 animate-pulse" />
          <span className="absolute w-0.5 h-0.5 rounded-full bg-white top-1 left-6 animate-pulse" />
        </>
      )}
      {/* Sun rays (light mode) */}
      {!isDark && (
        <span className="absolute text-yellow-500 text-[9px] font-black left-1.5 top-0.5 animate-spin">
          ✦
        </span>
      )}
      {/* Sliding circle with icon */}
      <span
        className="absolute flex items-center justify-center w-5 h-5 rounded-full shadow-md transition-all duration-500"
        style={{
          left: isDark ? "calc(100% - 22px)" : "2px",
          background: isDark
            ? "linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%)"
            : "linear-gradient(135deg, #fde68a 0%, #f59e0b 100%)",
          boxShadow: isDark
            ? "0 2px 8px rgba(99,102,241,0.6)"
            : "0 2px 8px rgba(245,158,11,0.6)",
          transform: isDark ? "rotate(360deg)" : "rotate(0deg)"
        }}
      >
        <span className="text-[10px] leading-none">{isDark ? "🌙" : "☀️"}</span>
      </span>
    </button>
  );
}
