"use client";

import React, { useEffect, useState } from "react";
import { useI18n, type Locale } from "@/contexts/I18nContext";
import { Icon } from "@/components/Icons";

const LABELS: Record<Locale, string> = { vi: "VI", en: "EN" };

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const next: Locale = locale === "vi" ? "en" : "vi";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className="btn btn-sm btn-ghost"
      aria-label={`Đổi ngôn ngữ sang ${LABELS[next]}`}
      title={`Switch to ${LABELS[next]}`}
      style={{ fontSize: 12, fontWeight: 800, display: "inline-flex", gap: 6, alignItems: "center" }}
    >
      <Icon name="globe" size={14} />
      {LABELS[locale]}
    </button>
  );
}
