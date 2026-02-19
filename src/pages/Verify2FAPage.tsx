import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

/**
 * 2FA page — placeholder since PocketBase doesn't have built-in TOTP.
 * Redirect to home if user is already authenticated.
 */
const Verify2FAPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // PocketBase auth doesn't need 2FA step; redirect
    if (isAuthenticated) {
      navigate("/", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return null;
};

export default Verify2FAPage;
