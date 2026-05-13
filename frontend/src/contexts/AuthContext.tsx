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

export interface User {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
}

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
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

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

  const logout = useCallback(async () => {
    try {
      await authFetch("/auth/logout", { method: "POST", body: "{}" });
    } finally {
      setUser(null);
    }
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
    }),
    [isLoading, login, logout, refreshUser, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function getAvatarInitial(user: User): string {
  return (user.username?.[0] || user.email?.[0] || "?").toUpperCase();
}
