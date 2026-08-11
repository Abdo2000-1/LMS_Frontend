import { Link } from "react-router-dom";
import { BookOpen, LayoutDashboard, UserCircle, ShieldCheck, GraduationCap, Home } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBranding } from "../context/BrandingContext.jsx";
import AppHeader from "./AppHeader.jsx";
import Footer from "./Footer.jsx";

function getSidebarLinks(role) {
  const common = [
    { label: "الرئيسية", to: "/", icon: Home },
    { label: "الكورسات", to: "/courses", icon: BookOpen },
    { label: "الملف الشخصي", to: "/profile", icon: UserCircle },
  ];

  if (role === "teacher") {
    return [{ label: "لوحة المدرس", to: "/teacher/dashboard", icon: GraduationCap }, ...common];
  }

  if (role === "developer") {
    return [
      { label: "ماستر المطور", to: "/dev/master", icon: ShieldCheck },
      { label: "لوحة الطالب", to: "/dashboard", icon: LayoutDashboard },
      { label: "لوحة المدرس", to: "/teacher/dashboard", icon: GraduationCap },
      ...common,
    ];
  }

  return [{ label: "لوحة الطالب", to: "/dashboard", icon: LayoutDashboard }, ...common];
}

export default function DashboardLayout({ active, children }) {
  const { user } = useAuth();
  const { teacherDisplayName } = useBranding();
  const links = getSidebarLinks(user?.role);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Cairo',_sans-serif] transition-colors duration-500"
    >
      <AppHeader active={active} />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur p-3 shadow-sm">
            <div className="px-3 py-3 mb-2 border-b border-slate-100 dark:border-slate-800">
              <p className="text-sm font-extrabold">{user?.name || teacherDisplayName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user?.phone || user?.email}</p>
            </div>
            <nav className="space-y-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = active === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-red-800 text-white shadow-sm dark:bg-amber-400 dark:text-slate-950"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 space-y-8">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
