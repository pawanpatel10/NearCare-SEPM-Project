import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userRole, loading } = useAuth();
  const location = useLocation();

  // Wait for auth to load - show loading indicator
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated but has no role - redirect to role selection
  // But allow access if already on /select-role to avoid infinite loop
  if (!userRole && location.pathname !== "/select-role") {
    return <Navigate to="/select-role" replace />;
  }

  //  If no role restrictions specified, allow access (including /select-role)
  if (!allowedRoles) {
    return children;
  }

  //  Check if user's role is in the allowed list
  if (allowedRoles.includes(userRole)) {
    return children;
  }

  //  Role mismatch - redirect to appropriate dashboard
  if (userRole === "clinic") {
    return <Navigate to="/doctor-dashboard" replace />;
  }
  if (userRole === "pharmacy") {
    return <Navigate to="/pharmacy-dashboard" replace />;
  }
  if (userRole === "user") {
    return <Navigate to="/home" replace />;
  }

  // Fallback: unknown role, go to login
  return <Navigate to="/login" replace />;
}

// Component for public routes (login/signup) that redirect authenticated users
export function PublicRoute({ children }) {
  const { currentUser, userRole, loading } = useAuth();

  // ⏳ Wait for auth - show a loading indicator instead of blank screen
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  if (currentUser && userRole) {
    if (userRole === "clinic")
      return <Navigate to="/doctor-dashboard" replace />;
    if (userRole === "pharmacy")
      return <Navigate to="/pharmacy-dashboard" replace />;
    if (userRole === "user") return <Navigate to="/home" replace />;
  }

  return children;
}
