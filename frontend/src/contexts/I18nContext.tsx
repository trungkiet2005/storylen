"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "vi" | "en";

type Dict = Record<string, string>;

const VI: Dict = {
  // ── Navigation ──────────────────────────────────────────────────────
  "nav.home": "Trang chủ",
  "nav.upload": "Tải lên",
  "nav.browse": "Khám phá",
  "nav.qa": "Hỏi đáp",
  "nav.history": "Lịch sử",
  "nav.notifications": "Thông báo",
  "nav.profile": "Hồ sơ",
  "nav.login": "Đăng nhập",
  "nav.register": "Đăng ký",
  "nav.logout": "Đăng xuất",
  "nav.library": "Thư viện",

  // ── Common buttons / actions ────────────────────────────────────────
  "common.search": "Tìm kiếm",
  "common.cancel": "Huỷ",
  "common.save": "Lưu",
  "common.delete": "Xoá",
  "common.confirm": "Xác nhận",
  "common.back": "Quay lại",
  "common.next": "Tiếp",
  "common.continue": "Tiếp tục",
  "common.loading": "Đang tải...",
  "common.error_generic": "Có lỗi xảy ra. Vui lòng thử lại.",
  "common.retry": "Thử lại",
  "common.close": "Đóng",
  "common.email": "Email",
  "common.password": "Mật khẩu",
  "common.username": "Tên đăng nhập",

  // ── Hero / landing ──────────────────────────────────────────────────
  "hero.tagline": "XÓA NHÒA RÀO CẢN NGÔN NGỮ · STORYLENS VOL. 1",
  "hero.title.line1": "ĐỌC TRUYỆN,",
  "hero.title.line2": "KHÔNG CÒN",
  "hero.title.line3": "rào cản.",
  "hero.subtitle":
    "Bản dịch giữ nguyên nhịp điệu, ngữ khí nhân vật, và giọng văn gốc — nhờ ngữ cảnh được AI học từ toàn bộ chương truyện.",
  "hero.cta_start": "Bắt đầu ngay",
  "hero.cta_qa": "Trải nghiệm Q&A",

  // ── Login ───────────────────────────────────────────────────────────
  "login.section": "STORYLENS ACCOUNT · LOGIN",
  "login.title": "Chào mừng trở lại",
  "login.no_account": "Chưa có tài khoản?",
  "login.forgot": "Quên mật khẩu?",
  "login.submit": "Đăng nhập",
  "login.submitting": "Đang đăng nhập...",
  "login.or": "HOẶC",
  "login.google_soon": "Tiếp tục với Google",
  "login.coming_soon": "SOON",
  "login.terms_consent": "Bằng việc đăng nhập, bạn đồng ý với",

  // ── Forms ───────────────────────────────────────────────────────────
  "form.email_placeholder": "name@example.com",
  "form.password_placeholder": "Tối thiểu 8 ký tự",
  "form.show_password": "Hiện mật khẩu",
  "form.hide_password": "Ẩn mật khẩu",
};

const EN: Dict = {
  // Navigation
  "nav.home": "Home",
  "nav.upload": "Upload",
  "nav.browse": "Browse",
  "nav.qa": "Q&A",
  "nav.history": "History",
  "nav.notifications": "Notifications",
  "nav.profile": "Profile",
  "nav.login": "Sign in",
  "nav.register": "Sign up",
  "nav.logout": "Sign out",
  "nav.library": "Library",

  // Common
  "common.search": "Search",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.confirm": "Confirm",
  "common.back": "Back",
  "common.next": "Next",
  "common.continue": "Continue",
  "common.loading": "Loading...",
  "common.error_generic": "Something went wrong. Please try again.",
  "common.retry": "Retry",
  "common.close": "Close",
  "common.email": "Email",
  "common.password": "Password",
  "common.username": "Username",

  // Hero
  "hero.tagline": "BREAKING LANGUAGE BARRIERS · STORYLENS VOL. 1",
  "hero.title.line1": "READ MANGA,",
  "hero.title.line2": "WITHOUT",
  "hero.title.line3": "barriers.",
  "hero.subtitle":
    "Translations preserve pacing, character voice, and authorial tone — context-aware AI trained on the entire chapter.",
  "hero.cta_start": "Get started",
  "hero.cta_qa": "Try Q&A",

  // Login
  "login.section": "STORYLENS ACCOUNT · LOGIN",
  "login.title": "Welcome back",
  "login.no_account": "Don't have an account?",
  "login.forgot": "Forgot password?",
  "login.submit": "Sign in",
  "login.submitting": "Signing in...",
  "login.or": "OR",
  "login.google_soon": "Continue with Google",
  "login.coming_soon": "SOON",
  "login.terms_consent": "By signing in you agree to our",

  // Forms
  "form.email_placeholder": "name@example.com",
  "form.password_placeholder": "Minimum 8 characters",
  "form.show_password": "Show password",
  "form.hide_password": "Hide password",
};

const DICTS: Record<Locale, Dict> = { vi: VI, en: EN };
const STORAGE_KEY = "storylens.locale";

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const Ctx = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "vi" || saved === "en") setLocaleState(saved);
    } catch { /* ignore */ }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    if (typeof document !== "undefined") document.documentElement.lang = l;
  }, []);

  const t = useCallback((key: string, fallback?: string) => {
    return DICTS[locale][key] ?? fallback ?? key;
  }, [locale]);

  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
