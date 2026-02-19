import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { pb } from "@/lib/pocketbase";

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from PocketBase's built-in cookie/localStorage auth store
  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.record) {
      setUser(pbUserToProfile(pb.authStore.record));
    }
    setIsLoading(false);

    // Listen for auth store changes (e.g., token refresh)
    const unsub = pb.authStore.onChange((_token, record) => {
      if (record) {
        setUser(pbUserToProfile(record));
      } else {
        setUser(null);
      }
    });
    return unsub;
  }, []);

  const isAuthenticated = !!user;

  const login = useCallback(async (email: string, password: string) => {
    const authData = await pb.collection("users").authWithPassword(email, password);
    setUser(pbUserToProfile(authData.record));
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    await pb.collection("users").create({
      email,
      password,
      passwordConfirm: password,
      name,
      default_profile: "todos",
    });
    // Auto-login after registration
    const authData = await pb.collection("users").authWithPassword(email, password);
    setUser(pbUserToProfile(authData.record));
  }, []);

  const logout = useCallback(() => {
    pb.authStore.clear();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    if (!user) return;
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.avatarUrl !== undefined) data.avatar_url = patch.avatarUrl;
    if (patch.defaultProfile !== undefined) data.default_profile = patch.defaultProfile;
    if (patch.mfaEnabled !== undefined) data.mfa_enabled = patch.mfaEnabled;
    const updated = await pb.collection("users").update(user.id, data);
    setUser(pbUserToProfile(updated));
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user, isAuthenticated, isLoading,
        login, register, logout, updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
