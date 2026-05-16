"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "vi" | "en";

type Dict = Record<string, string>;

const VI: Dict = {
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
  "common.search": "Tìm kiếm",
  "common.cancel": "Huỷ",
  "common.save": "Lưu",
  "common.delete": "Xoá",
  "common.loading": "Đang tải...",
};

const EN: Dict = {
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
  "common.search": "Search",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.loading": "Loading...",
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
