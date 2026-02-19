import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { pb } from "@/lib/pocketbase";
import { mockUser } from "@/lib/mock-pocketbase";

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
  isLoading: boolean;
  isMockMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

function pbUserToProfile(model: any): UserProfile {
  return {
    id: model.id,
    name: model.name || model.username || "",
    email: model.email || "",
    avatarUrl: model.avatar_url || "",
    defaultProfile: model.default_profile || "todos",
    mfaEnabled: !!model.mfa_enabled,
  };
}

// Check if PocketBase is reachable
async function checkPBHealth(): Promise<boolean> {
  try {
    const url = import.meta.env.VITE_POCKETBASE_URL || "http://100.82.134.109:8090";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${url}/api/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // First check if PB auth store has a valid session
      if (pb.authStore.isValid && pb.authStore.record) {
        if (!cancelled) {
          setUser(pbUserToProfile(pb.authStore.record));
          setIsMockMode(false);
          setIsLoading(false);
        }
        return;
      }

      // Check if PB is reachable
      const healthy = await checkPBHealth();
      if (!cancelled) {
        if (!healthy) {
          console.warn("⚠️ PocketBase unreachable — entering MOCK MODE");
          setIsMockMode(true);
          // Don't auto-login in mock mode; let user click login
        }
        setIsLoading(false);
      }
    }

    init();

    // Listen for auth store changes
    const unsub = pb.authStore.onChange((_token, record) => {
      if (record) {
        setUser(pbUserToProfile(record));
        setIsMockMode(false);
      } else {
        setUser(null);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const isAuthenticated = !!user;

  const login = useCallback(async (email: string, password: string) => {
    if (isMockMode) {
      // Mock login — accept any credentials
      setUser({ ...mockUser, email });
      return;
    }
    const authData = await pb.collection("users").authWithPassword(email, password);
    setUser(pbUserToProfile(authData.record));
  }, [isMockMode]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    if (isMockMode) {
      setUser({ ...mockUser, email, name });
      return;
    }
    await pb.collection("users").create({
      email, password, passwordConfirm: password, name, default_profile: "todos",
    });
    const authData = await pb.collection("users").authWithPassword(email, password);
    setUser(pbUserToProfile(authData.record));
  }, [isMockMode]);

  const logout = useCallback(() => {
    pb.authStore.clear();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    if (!user) return;
    if (isMockMode) {
      setUser((prev) => prev ? { ...prev, ...patch } : prev);
      return;
    }
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.avatarUrl !== undefined) data.avatar_url = patch.avatarUrl;
    if (patch.defaultProfile !== undefined) data.default_profile = patch.defaultProfile;
    if (patch.mfaEnabled !== undefined) data.mfa_enabled = patch.mfaEnabled;
    const updated = await pb.collection("users").update(user.id, data);
    setUser(pbUserToProfile(updated));
  }, [user, isMockMode]);

  return (
    <AuthContext.Provider
      value={{
        user, isAuthenticated, isLoading, isMockMode,
        login, register, logout, updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
