"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

/**
 * OAuth callback landing.
 *
 * Supabase Auth redirects back here with `#access_token=...&refresh_token=...`
 * in the URL hash. We:
 *   1. Pull tokens from the fragment.
 *   2. POST them to the backend so it can set HTTP-only cookies (server keeps
 *      JS away from raw tokens).
 *   3. Redirect to wherever the user came from (or home).
 *
 * If Supabase signals an error (`?error=...`), we surface a toast and bounce
 * the user back to /login.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://storylens-api.onrender.com/v1";

function parseHashFragment(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.replace(/^#/, "");
  const out: Record<string, string> = {};
  for (const part of hash.split("&")) {
    const [k, v] = part.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return out;
}

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<"working" | "error">("working");

  useEffect(() => {
    const url = new URL(window.location.href);
    const errParam = url.searchParams.get("error") || url.searchParams.get("error_description");
    if (errParam) {
      toast(decodeURIComponent(errParam).replace(/\+/g, " "), "error");
      setStatus("error");
      window.setTimeout(() => router.replace("/login"), 1500);
      return;
    }

    const tokens = parseHashFragment();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    if (!accessToken || !refreshToken) {
      toast("Phiên đăng nhập không hợp lệ.", "error");
      setStatus("error");
      window.setTimeout(() => router.replace("/login"), 1500);
      return;
    }

    // Hand the tokens to the backend so it can set HTTP-only cookies — same
    // shape as the /login endpoint returns. The frontend never persists them.
    fetch(`${BASE_URL}/auth/oauth-callback`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.detail || "Đăng nhập OAuth thất bại");
        }
        toast("Đăng nhập thành công.", "success");
        // Strip the fragment + redirect.
        window.history.replaceState({}, "", "/");
        const next = window.localStorage.getItem("sl.oauth-next") || "/";
        try { window.localStorage.removeItem("sl.oauth-next"); } catch { /* ignore */ }
        router.replace(next);
      })
      .catch((err) => {
        toast(err instanceof Error ? err.message : "Đăng nhập thất bại", "error");
        setStatus("error");
        window.setTimeout(() => router.replace("/login"), 1500);
      });
  }, [router, toast]);

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg)" }}>
      <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 24, textAlign: "center", maxWidth: 360 }}>
        <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 8 }}>OAUTH</div>
        <h1 className="display" style={{ fontSize: 22, marginBottom: 8 }}>
          {status === "working" ? "Đang đăng nhập..." : "Có lỗi xảy ra"}
        </h1>
        <p style={{ fontSize: 13, color: "var(--fg-soft)" }}>
          {status === "working"
            ? "Vui lòng chờ trong giây lát..."
            : "Đang chuyển về trang đăng nhập..."}
        </p>
      </div>
    </main>
  );
}
