import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mfaEnabled && !isAuthenticated) {
    return <Navigate to="/verify-2fa" replace />;
  }

  return <>{children}</>;
};
