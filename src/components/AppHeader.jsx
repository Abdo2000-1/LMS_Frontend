import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, BookOpen, UserCircle, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import logoImage from "../../images/1.jpeg";

function getLinks(role) {
  if (role === "teacher") {
    return [
      { label: "لوحة المدرس", to: "/teacher/dashboard", icon: LayoutDashboard },
      { label: "الكورسات", to: "/courses", icon: BookOpen },
      { label: "الملف الشخصي", to: "/profile", icon: UserCircle },
    ];
  }

  if (role === "developer") {
    return [
      { label: "لوحة المطور", to: "/dev/master", icon: ShieldCheck },
      { label: "لوحة الطالب", to: "/dashboard", icon: LayoutDashboard },
      { label: "لوحة المدرس", to: "/teacher/dashboard", icon: BookOpen },
      { label: "الملف الشخصي", to: "/profile", icon: UserCircle },
    ];
  }

  return [
    { label: "الرئيسية", to: "/dashboard", icon: LayoutDashboard },
    { label: "الكورسات", to: "/courses", icon: BookOpen },
    { label: "الملف الشخصي", to: "/profile", icon: UserCircle },
  ];
}

export default function AppHeader({ active }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const links = getLinks(user?.role);

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-4 z-50 mx-auto w-[94%] rounded-2xl border border-cyan-200/60 bg-white/70 shadow-xl shadow-cyan-900/10 backdrop-blur-xl dark:border-cyan-400/20 dark:bg-slate-950/70 transition-colors duration-500"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          {isAuthenticated && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-300 px-3 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200/60 dark:border-red-900/50 shadow-sm cursor-pointer"
              title="تسجيل الخروج من المنصة"
            >
              <LogOut size={16} />
              <span>خروج</span>
            </motion.button>
          )}
        </div>

        <nav className="hidden md:flex items-center gap-2" aria-label="روابط لوحة التحكم">
          {links.map((l) => {
            const Icon = l.icon;
            const isActive = active === l.to;
            return (
              <motion.div key={l.to} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to={l.to}
                  className={`flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-[#0077B6] text-white dark:bg-[#00A8E8] dark:text-slate-950 shadow-md shadow-[#0077B6]/20"
                      : "text-slate-600 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon size={16} />
                  {l.label}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link to="/" className="text-xl font-extrabold text-[#0077B6] dark:text-[#00A8E8] flex items-center gap-2">
            <img src={logoImage} alt="Mena Mourid" className="h-9 w-9 rounded-full object-cover ring-2 ring-cyan-200/70" />
            <span>Mena Mourid</span>
          </Link>
        </motion.div>
      </div>

      <nav className="md:hidden flex items-center justify-around border-t border-slate-100 dark:border-slate-800 px-2 py-1.5">
        {links.slice(0, 3).map((l) => {
          const Icon = l.icon;
          const isActive = active === l.to;
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`flex flex-col items-center gap-0.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors duration-200 ${
                isActive ? "text-[#0077B6] dark:text-[#00A8E8]" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Icon size={18} />
              {l.label}
            </Link>
          );
        })}
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400"
          >
            <LogOut size={18} />
            خروج
          </button>
        )}
      </nav>
    </motion.header>
  );
}
