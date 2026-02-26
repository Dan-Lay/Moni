import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { mockUser } from "@/lib/mock-pocketbase";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  defaultProfile: "marido" | "esposa" | "todos";
  mfaEnabled: boolean;
  isAdmin: boolean;
  familyId: string | null;
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

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name || "",
    email: data.email || "",
    avatarUrl: data.avatar_url || "",
    defaultProfile: data.default_profile || "todos",
    mfaEnabled: !!data.mfa_enabled,
    isAdmin: !!data.is_admin,
    familyId: data.family_id || null,
  };
}

function fallbackProfile(supaUser: { id: string; email?: string }): UserProfile {
  return {
    id: supaUser.id,
    name: supaUser.email?.split("@")[0] || "",
    email: supaUser.email || "",
    avatarUrl: "",
    defaultProfile: "todos",
    mfaEnabled: false,
    isAdmin: false,
    familyId: null,
  };
}

const isMockConfigured = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMockMode] = useState(isMockConfigured);

  useEffect(() => {
    if (isMockMode) {
      console.warn("⚠️ Supabase não configurado — entrando em MOCK MODE");
      setIsLoading(false);
      return;
    }

    let initialized = false;

    const finishLoading = () => {
      if (!initialized) {
        initialized = true;
        setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUser(null);
        finishLoading();
        return;
      }
      // SIGNED_IN: login() already called fetchProfile + setUser directly.
      // Fetching here would deadlock because the SDK is still processing the
      // new access token, queuing any Supabase query indefinitely.
      if (_event === "SIGNED_IN") {
        finishLoading();
        return;
      }
      // INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED — fetch full profile
      try {
        const profile = await fetchProfile(session.user.id);
        setUser(profile ?? fallbackProfile(session.user));
      } catch {
        setUser(fallbackProfile(session.user));
      }
      finishLoading();
    });

    // Safety: if onAuthStateChange never fires (network down), unblock after 8s
    const safetyTimer = setTimeout(finishLoading, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [isMockMode]);

  const isAuthenticated = !!user;

  const login = useCallback(async (email: string, password: string) => {
    if (isMockMode) {
      setUser({ ...mockUser, email, isAdmin: email === "contato.dan@gmail.com", familyId: null });
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Set user directly from the response — do NOT rely on onAuthStateChange here.
    // onAuthStateChange(SIGNED_IN) would deadlock trying to query Supabase while
    // the SDK is still finalizing the new session token.
    if (data.user) {
      try {
        const profile = await fetchProfile(data.user.id);
        setUser(profile ?? fallbackProfile(data.user));
      } catch {
        setUser(fallbackProfile(data.user));
      }
    }
  }, [isMockMode]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    if (isMockMode) {
      setUser({ ...mockUser, email, name, isAdmin: false, familyId: null });
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        name,
        email,
        default_profile: "todos",
        is_admin: false,
      });
    }
  }, [isMockMode]);

  const logout = useCallback(() => {
    if (isMockMode) { setUser(null); return; }
    supabase.auth.signOut();
    setUser(null);
  }, [isMockMode]);

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
    await supabase.from("profiles").update(data).eq("id", user.id);
    setUser((prev) => prev ? { ...prev, ...patch } : prev);
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
