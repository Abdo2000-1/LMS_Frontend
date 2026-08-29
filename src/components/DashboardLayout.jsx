import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  LayoutDashboard,
  UserCircle,
  ShieldCheck,
  Users,
  NotebookText,
  PlusCircle,
  ClipboardList,
  FileText,
  HelpCircle,
  BarChart3,
  LogOut,
  Wallet,
  KeyRound,
  FileEdit,
  Video
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBranding } from "../context/BrandingContext.jsx";
import AppHeader from "./AppHeader.jsx";
import Footer from "./Footer.jsx";

export const TEACHER_SIDEBAR_TABS = [
  { id: "courses", label: "الكورسات الحالية", icon: BookOpen },
  { id: "access-codes", label: "أكواد التفعيل (12 رقم)", icon: KeyRound },
  { id: "essay-grading", label: "تصحيح الأسئلة المقالية", icon: FileEdit },
  { id: "students", label: "بيانات الطلاب", icon: Users },
  { id: "student-details", label: "متابعة وتفاصيل الطلاب", icon: NotebookText },
  { id: "incoming-requests", label: "الطلبات الواردة", icon: Wallet, hasBadge: true },
  { id: "add-course", label: "إضافة كورس جديد", icon: PlusCircle },
  { id: "add-standalone-lecture", label: "إضافة محاضرة مستقلة", icon: Video },
  { id: "add-exam", label: "إضافة امتحان جديد", icon: HelpCircle },
];

export default function DashboardLayout({ active, activeTab, onTabChange, badges = {}, children }) {
  const { user, logout } = useAuth();
  const { teacherDisplayName } = useBranding();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const isTeacher = user?.role === "teacher" || user?.role === "developer";

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-chem-bg dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Cairo',_sans-serif] transition-colors duration-500 flex flex-col"
    >
      <AppHeader active={active} />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-3xl border border-chem-light/20 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 shadow-xl shadow-chem-deep/5 space-y-4">
            {/* User Info Header */}
            <div className="px-3 py-3 rounded-2xl bg-gradient-to-br from-chem-bg-alt to-white dark:from-slate-800 dark:to-slate-900 border border-chem-light/10 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-chem-deep text-white flex items-center justify-center font-black text-base shadow-md">
                  {isTeacher ? "M" : (user?.name || teacherDisplayName || "م")[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold truncate text-slate-900 dark:text-slate-100">
                    {isTeacher ? "Mena Mourid" : (user?.name || teacherDisplayName)}
                  </p>
                  <p className="text-xs text-chem-deep dark:text-chem-light font-bold truncate">
                    {user?.role === "teacher" ? "معلّم المادة" : user?.role === "developer" ? "مطور المنصة" : "طالب"}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1.5">
              {isTeacher && onTabChange ? (
                TEACHER_SIDEBAR_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const badgeCount = tab.id === "incoming-requests" ? badges.pendingRequests : undefined;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onTabChange(tab.id)}
                      className={`w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-l from-chem-deep to-chem-light text-white shadow-lg shadow-chem-deep/20 scale-[1.02]"
                          : "text-slate-600 hover:bg-chem-bg-alt dark:text-slate-300 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={19} className={isActive ? "text-white" : "text-chem-deep dark:text-chem-light"} />
                        <span>{tab.label}</span>
                      </div>

                      {Boolean(badgeCount && badgeCount > 0) && (
                        <span className={`px-2 py-0.5 text-xs font-black rounded-full ${
                          isActive ? "bg-amber-400 text-slate-950" : "bg-red-500 text-white animate-pulse"
                        }`}>
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-slate-600 hover:bg-chem-bg-alt dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <LayoutDashboard size={19} className="text-chem-deep dark:text-chem-light" />
                    <span>لوحة الطالب</span>
                  </Link>
                  <Link
                    to="/courses"
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-slate-600 hover:bg-chem-bg-alt dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <BookOpen size={19} className="text-chem-deep dark:text-chem-light" />
                    <span>الكورسات</span>
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-slate-600 hover:bg-chem-bg-alt dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <UserCircle size={19} className="text-chem-deep dark:text-chem-light" />
                    <span>الملف الشخصي</span>
                  </Link>
                </>
              )}
            </nav>

            {/* Logout Sidebar Action */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-extrabold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors duration-200"
              >
                <LogOut size={18} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="min-w-0 space-y-8">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
