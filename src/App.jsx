import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { BrandingProvider } from "./context/BrandingContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import DeveloperMaster from "./pages/DeveloperMaster.jsx";
import Courses from "./pages/Courses.jsx";
import CourseDetails from "./pages/CourseDetails.jsx";
import Payment from "./pages/Payment.jsx";
import Profile from "./pages/Profile.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <BrandingProvider>
        <AuthProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
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
                <ProtectedRoute allowRoles={["teacher", "developer"]}>
                  <TeacherDashboard />
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
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </BrandingProvider>
    </ThemeProvider>
  );
}
