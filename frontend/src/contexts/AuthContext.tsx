"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PlanTier = "free" | "basic" | "pro" | "premium";

export interface User {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  locale: string;
  timezone: string;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  country: string | null;
  phone: string | null;
  preferred_target_lang: string;
  created_at: string | null;
  updated_at: string | null;
  last_seen_at: string | null;
  plan_tier: PlanTier;
  credits_balance: number;
  daily_credits_reset_at: string | null;
}

export type ProfileUpdate = Partial<{
  full_name: string | null;
  display_name: string | null;
  bio: string | null;
  locale: string;
  timezone: string;
  date_of_birth: string | null;
  gender: User["gender"];
  country: string | null;
  phone: string | null;
  preferred_target_lang: string;
}>;

export interface AuthResult {
  authenticated: boolean;
  user: User | null;
  requires_email_confirmation?: boolean;
  message?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (username: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  refreshCredits: () => Promise<void>;
  updateProfile: (patch: ProfileUpdate) => Promise<User>;
  uploadAvatar: (file: File) => Promise<User>;
  removeAvatar: () => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://storylens-api.onrender.com/v1";

async function parseAuthResponse(res: Response, fallback: string): Promise<AuthResult> {
  let body: Partial<AuthResult> & { detail?: string } = {};
  try {
    body = await res.json();
  } catch {
    // Keep fallback below.
  }

  if (!res.ok) {
    throw new Error(body.detail || body.message || fallback);
  }

  return {
    authenticated: Boolean(body.authenticated),
    user: body.user ?? null,
    requires_email_confirmation: body.requires_email_confirmation,
    message: body.message,
  };
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authFetch("/auth/me", { method: "GET" });
      if (!res.ok) {
        setUser(null);
        return null;
      }

      const data = await parseAuthResponse(res, "Không thể tải phiên đăng nhập");
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const nextUser = await refreshUser();
      if (!cancelled) {
        setUser(nextUser);
        setIsLoading(false);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await parseAuthResponse(res, "Đăng nhập thất bại");
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await authFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    const data = await parseAuthResponse(res, "Đăng ký thất bại");
    setUser(data.authenticated ? data.user : null);
    return data;
  }, []);

  const refreshCredits = useCallback(async () => {
    try {
      const res = await authFetch("/credits", { method: "GET" });
      if (!res.ok) return;
      const data: { credits_balance: number; plan_tier: string; daily_credits_reset_at: string } = await res.json();
      setUser(prev =>
        prev
          ? {
              ...prev,
              credits_balance: data.credits_balance,
              plan_tier: (data.plan_tier as PlanTier) ?? prev.plan_tier,
              daily_credits_reset_at: data.daily_credits_reset_at ?? prev.daily_credits_reset_at,
            }
          : prev,
      );
    } catch {
      // ignore — credits are non-critical for rendering
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authFetch("/auth/logout", { method: "POST", body: "{}" });
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (patch: ProfileUpdate) => {
    const res = await authFetch("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    const data = await parseAuthResponse(res, "Không thể cập nhật hồ sơ");
    if (!data.user) throw new Error("Phản hồi không hợp lệ");
    setUser(data.user);
    return data.user;
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE_URL}/auth/me/avatar`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = await parseAuthResponse(res, "Tải avatar thất bại");
    if (!data.user) throw new Error("Phản hồi không hợp lệ");
    setUser(data.user);
    return data.user;
  }, []);

  const removeAvatar = useCallback(async () => {
    const res = await authFetch("/auth/me/avatar", { method: "DELETE" });
    const data = await parseAuthResponse(res, "Không thể gỡ avatar");
    if (!data.user) throw new Error("Phản hồi không hợp lệ");
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      login,
      register,
      logout,
      refreshUser,
      refreshCredits,
      updateProfile,
      uploadAvatar,
      removeAvatar,
    }),
    [isLoading, login, logout, refreshUser, refreshCredits, register, user, updateProfile, uploadAvatar, removeAvatar],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function getAvatarInitial(user: User): string {
  const source =
    user.display_name?.trim() ||
    user.full_name?.trim() ||
    user.username ||
    user.email ||
    "?";
  return source[0]!.toUpperCase();
}

export function getDisplayName(user: User): string {
  return (
    user.display_name?.trim() ||
    user.full_name?.trim() ||
    user.username ||
    user.email.split("@")[0]
  );
}
