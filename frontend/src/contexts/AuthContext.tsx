"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  demoLogin: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";
const STORAGE_KEY = "sl-auth";

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { user: User; token: string };
        setUser(parsed.user);
        setToken(parsed.token);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persist = useCallback((u: User, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: u, token: t }));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let msg = "Đăng nhập thất bại";
      try {
        const body = await res.json();
        msg = body.detail || msg;
      } catch { /* ignore */ }
      throw new Error(msg);
    }

    const data = await res.json() as { user: User; access_token: string };
    persist(data.user, data.access_token);
  }, [persist]);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    if (!res.ok) {
      let msg = "Đăng ký thất bại";
      try {
        const body = await res.json();
        msg = body.detail || msg;
      } catch { /* ignore */ }
      throw new Error(msg);
    }

    const data = await res.json() as { user: User; access_token: string };
    persist(data.user, data.access_token);
  }, [persist]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const demoLogin = useCallback(() => {
    const demoUser: User = {
      id: "demo-001",
      username: "KietDemo",
      email: "demo@storylens.ai",
    };
    const demoToken = "demo-token-" + Date.now();
    persist(demoUser, demoToken);
  }, [persist]);

  return (
    <AuthContext.Provider value={{ user, isLoading, token, login, register, logout, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

export function getAvatarInitial(user: User): string {
  return (user.username?.[0] || user.email?.[0] || "?").toUpperCase();
}
