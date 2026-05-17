"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";

/**
 * GDPR-style cookie consent banner.
 *
 * Categories:
 *   - **necessary**: always on, can't be opted out (auth cookie, CSRF, etc.)
 *   - **analytics**: PostHog / similar; off by default
 *   - **marketing**: future Stripe Ads / retargeting pixels; off by default
 *
 * Decision persists in `localStorage` under `sl.cookie-consent` AND a 1-year
 * cookie so cleared-storage users don't see the prompt again on every visit.
 * Other parts of the app (e.g. analytics init) call `getConsent()` to decide
 * whether to load tracking scripts.
 */

const STORAGE_KEY = "sl.cookie-consent";
const COOKIE_NAME = "sl_cookie_consent";

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  /** ISO timestamp of when the user accepted. */
  decided_at: string;
}

const DEFAULT_STATE: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  decided_at: "",
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const exp = new Date(Date.now() + days * 86400_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`;
}

/** Read the user's consent — call from analytics init, etc. */
export function getConsent(): ConsentState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? readCookie(COOKIE_NAME);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      decided_at: String(parsed.decided_at ?? ""),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveConsent(state: ConsentState) {
  const json = JSON.stringify(state);
  try { window.localStorage.setItem(STORAGE_KEY, json); } catch { /* ignore */ }
  writeCookie(COOKIE_NAME, json, 365);
  // Let other components react without a page reload.
  window.dispatchEvent(new CustomEvent("sl:consent-changed", { detail: state }));
}

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = getConsent();
    if (!existing.decided_at) setShow(true);
  }, []);

  function decide(state: Omit<ConsentState, "necessary" | "decided_at">) {
    const final: ConsentState = {
      necessary: true,
      ...state,
      decided_at: new Date().toISOString(),
    };
    saveConsent(final);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Tuỳ chọn cookie"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 9500,
        maxWidth: 520,
        margin: "0 auto",
        background: "var(--panel)",
        border: "2px solid var(--border)",
        boxShadow: "4px 4px 0 0 var(--border)",
        padding: 20,
        fontFamily: "var(--font-sans)",
      }}
    >
      <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 8 }}>
        COOKIE PREFERENCES
      </div>
      <h2 className="display" style={{ fontSize: 18, marginBottom: 10 }}>
        Chúng tôi dùng cookie
      </h2>
      <p style={{ fontSize: 13, color: "var(--fg-soft)", lineHeight: 1.55, marginBottom: 14 }}>
        Cookie thiết yếu (đăng nhập, CSRF) luôn bật. Bạn có thể chọn bật cookie
        phân tích để giúp chúng tôi cải thiện sản phẩm. Xem{" "}
        <Link href="/privacy" style={{ color: "var(--accent)", textDecoration: "underline" }}>
          Chính sách bảo mật
        </Link>.
      </p>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, padding: 12, background: "var(--bg-2)", border: "1px solid var(--border-soft)" }}>
          <CategoryRow label="Thiết yếu" desc="Đăng nhập, phiên, bảo mật. Luôn bật." checked disabled />
          <CategoryRow
            label="Phân tích"
            desc="PostHog / Plausible — đo lưu lượng, không bán dữ liệu."
            checked={analytics}
            onChange={setAnalytics}
          />
          <CategoryRow
            label="Marketing"
            desc="Hiện không sử dụng — sẽ thông báo trước khi bật."
            checked={marketing}
            onChange={setMarketing}
          />
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => decide({ analytics: true, marketing: false })}
          style={{ flex: "1 1 auto", padding: "10px 16px", fontSize: 13 }}
        >
          Đồng ý tất cả
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => decide({ analytics: false, marketing: false })}
          style={{ flex: "1 1 auto", padding: "10px 16px", fontSize: 13 }}
        >
          Chỉ cần thiết
        </button>
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, padding: "10px 8px" }}
          >
            Tuỳ chọn chi tiết →
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => decide({ analytics, marketing })}
            style={{ flex: "1 1 100%", padding: "10px 16px", fontSize: 13, marginTop: 4 }}
          >
            Lưu lựa chọn
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => decide({ analytics: false, marketing: false })}
        aria-label="Đóng"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--muted)",
          padding: 6,
        }}
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

function CategoryRow({
  label,
  desc,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        style={{ marginTop: 3, accentColor: "var(--accent)" }}
      />
      <span style={{ flex: 1 }}>
        <strong style={{ color: "var(--fg)", display: "block", marginBottom: 2 }}>{label}</strong>
        <span style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>{desc}</span>
      </span>
    </label>
  );
}
