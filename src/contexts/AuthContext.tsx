import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  defaultProfile: "marido" | "esposa" | "todos";
  mfaEnabled: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isMfaVerified: boolean;
  login: (provider: "google") => void;
  verifyMfa: (code: string) => boolean;
  logout: () => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  enableMfa: () => string; // returns fake secret
  disableMfa: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const MOCK_USER: UserProfile = {
  id: "mock-001",
  name: "Guerreiro(a)",
  email: "guerreiro@finwar.app",
  avatarUrl: "",
  defaultProfile: "todos",
  mfaEnabled: false,
};

// Fake TOTP secret for QR code demo
const FAKE_TOTP_SECRET = "JBSWY3DPEHPK3PXP";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("finwar_auth");
    return saved ? JSON.parse(saved) : null;
  });
  const [isMfaVerified, setMfaVerified] = useState(() => {
    return localStorage.getItem("finwar_mfa_verified") === "true";
  });

  const isAuthenticated = !!user && (!user.mfaEnabled || isMfaVerified);

  const login = useCallback((_provider: "google") => {
    // Mock login — will be replaced with real Supabase Auth
    const u = { ...MOCK_USER };
    const saved = localStorage.getItem("finwar_user_profile");
    const merged = saved ? { ...u, ...JSON.parse(saved) } : u;
    setUser(merged);
    localStorage.setItem("finwar_auth", JSON.stringify(merged));
    if (!merged.mfaEnabled) {
      setMfaVerified(true);
      localStorage.setItem("finwar_mfa_verified", "true");
    } else {
      setMfaVerified(false);
      localStorage.removeItem("finwar_mfa_verified");
    }
  }, []);

  const verifyMfa = useCallback((code: string) => {
    // Mock: accept any 6-digit code
    if (code.length === 6 && /^\d+$/.test(code)) {
      setMfaVerified(true);
      localStorage.setItem("finwar_mfa_verified", "true");
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setMfaVerified(false);
    localStorage.removeItem("finwar_auth");
    localStorage.removeItem("finwar_mfa_verified");
  }, []);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem("finwar_auth", JSON.stringify(updated));
      localStorage.setItem("finwar_user_profile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const enableMfa = useCallback(() => {
    updateProfile({ mfaEnabled: true });
    return FAKE_TOTP_SECRET;
  }, [updateProfile]);

  const disableMfa = useCallback(() => {
    updateProfile({ mfaEnabled: false });
    setMfaVerified(true);
    localStorage.setItem("finwar_mfa_verified", "true");
  }, [updateProfile]);

  return (
    <AuthContext.Provider
      value={{
        user, isAuthenticated, isMfaVerified,
        login, verifyMfa, logout, updateProfile,
        enableMfa, disableMfa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
