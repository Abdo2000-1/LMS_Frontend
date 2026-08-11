import { Link, useNavigate } from "react-router-dom";
import { Languages, LayoutDashboard, BookOpen, UserCircle, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBranding } from "../context/BrandingContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

function getRoleLabel(role) {
  if (role === "teacher") return "مدرّس";
  if (role === "developer") return "مطور";
  return "طالب";
}

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
  const { user, logout } = useAuth();
  const { teacherDisplayName, logoUrl } = useBranding();
  const navigate = useNavigate();
  const links = getLinks(user?.role);

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-amber-400/70 dark:border-amber-500/30 shadow-sm shadow-black/[0.03] transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-red-800 dark:hover:text-amber-400 transition-colors duration-300 px-3 py-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <LogOut size={16} />
            خروج
          </button>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          {links.map((l) => {
            const Icon = l.icon;
            const isActive = active === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-red-800 text-white dark:bg-amber-400 dark:text-slate-950"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={16} />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold leading-tight">{user?.name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{getRoleLabel(user?.role)}</p>
          </div>
          <Link to="/" className="text-xl font-extrabold text-red-800 dark:text-amber-400 flex items-center gap-1.5">
            {logoUrl ? (
              <img src={logoUrl} alt={teacherDisplayName} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <Languages size={20} />
            )}
            {teacherDisplayName}
          </Link>
        </div>
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
                isActive ? "text-red-800 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Icon size={18} />
              {l.label}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400"
        >
          <LogOut size={18} />
          خروج
        </button>
      </nav>
    </header>
  );
}
