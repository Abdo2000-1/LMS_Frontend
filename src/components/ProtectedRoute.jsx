import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, allowRoles = [] }) {
  const { isAuthenticated, isLoading, user, getLandingRouteByRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-500">
        <div className="w-10 h-10 border-4 border-chem-light dark:border-chem-deep border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowRoles.length > 0 && !allowRoles.includes(user?.role)) {
    return <Navigate to={getLandingRouteByRole(user?.role)} replace />;
  }

  return children;
}
