import React, { Component } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { BrandingProvider } from "./context/BrandingContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import AddExamPage from "./pages/AddExamPage.jsx";
import AddQuizPage from "./pages/AddQuizPage.jsx";
import TermsPage from "./pages/TermsPage.jsx";
import DeveloperMaster from "./pages/DeveloperMaster.jsx";
import Courses from "./pages/Courses.jsx";
import CourseDetails from "./pages/CourseDetails.jsx";
import Payment from "./pages/Payment.jsx";
import Profile from "./pages/Profile.jsx";
import TakeExamPage from "./pages/TakeExamPage.jsx";
import SecurityGuard from "./components/SecurityGuard.jsx";
import ChemBotWidget from "./components/ChemBotWidget.jsx";

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("RootErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-['Cairo',sans-serif]">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-cyan-100 dark:bg-cyan-950 text-[#0077B6] flex items-center justify-center mx-auto text-2xl font-black">
              ⚛️
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">منصة الدكتور مينا موريد</h2>
            <p className="text-xs text-slate-500 font-bold leading-relaxed">
              حدث تنبيه غير متوقع أثناء الانتقال. اضغط بالأسفل للعودة للرئيسية ومتابعة المذاكرة بسلاسة.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "#/";
              }}
              className="px-6 py-2.5 rounded-xl bg-[#0077B6] hover:bg-[#005f92] text-white font-black text-xs transition"
            >
              العودة للرئيسية
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <RootErrorBoundary>
    <ThemeProvider>
      <ToastProvider>
        <BrandingProvider>
          <AuthProvider>
            <HashRouter>
              <SecurityGuard />
              <ChemBotWidget />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowRoles={["student", "developer"]}>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/dashboard"
                  element={
                    <ProtectedRoute allowRoles={["teacher"]}>
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/add-exam"
                  element={
                    <ProtectedRoute allowRoles={["teacher"]}>
                      <AddExamPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/add-quiz"
                  element={
                    <ProtectedRoute allowRoles={["teacher"]}>
                      <AddQuizPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dev/master"
                  element={
                    <ProtectedRoute allowRoles={["developer"]}>
                      <DeveloperMaster />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/courses"
                  element={
                    <ProtectedRoute>
                      <Courses />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/courses/:courseId"
                  element={
                    <ProtectedRoute>
                      <CourseDetails />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/courses/:courseId/payment"
                  element={
                    <ProtectedRoute>
                      <Payment />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/exam/:examId"
                  element={
                    <ProtectedRoute>
                      <TakeExamPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/terms" element={<TermsPage />} />
              </Routes>
            </HashRouter>
          </AuthProvider>
        </BrandingProvider>
      </ToastProvider>
    </ThemeProvider>
    </RootErrorBoundary>
  );
}
