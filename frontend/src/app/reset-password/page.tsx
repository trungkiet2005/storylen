"use client";

import React, { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { useToast } from "@/components/Toast";

// Supabase's recovery email lands here with #access_token=...&type=recovery in the URL hash.
// We use that token to call Supabase Auth REST directly to update the password,
// then send the user to /login.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = parseHashFragment();
    if (params.access_token && params.type === "recovery") {
      setToken(params.access_token);
    } else {
      setError("Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.");
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (!token) return;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setError("Cấu hình Supabase chưa được thiết lập trên frontend.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.msg || body.error_description || "Không thể đặt lại mật khẩu.");
      }
      toast("Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.", "success");
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TopBar />
      <main style={{ minHeight: "calc(100vh - 80px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 36, maxWidth: 460, width: "100%", borderRadius: "var(--radius)" }}>
          <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 8 }}>ĐẶT LẠI MẬT KHẨU</div>
          <h1 className="display" style={{ fontSize: 28, marginBottom: 20 }}>Tạo mật khẩu mới</h1>

          {error && (
            <div role="alert" style={{ padding: "12px 16px", background: "rgba(200,16,46,0.08)", border: "2px solid var(--accent)", color: "var(--accent)", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {token ? (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{ width: "100%", padding: "11px 14px", border: "2px solid var(--border)", background: "var(--panel)", color: "var(--fg)", fontSize: 14, borderRadius: "var(--radius-sm)", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>Xác nhận mật khẩu</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                  style={{ width: "100%", padding: "11px 14px", border: "2px solid var(--border)", background: "var(--panel)", color: "var(--fg)", fontSize: 14, borderRadius: "var(--radius-sm)", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: 14 }}>
                {loading ? "Đang lưu..." : "Đặt lại mật khẩu"}
              </button>
            </form>
          ) : (
            <Link href="/forgot-password" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
              Yêu cầu liên kết mới
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
