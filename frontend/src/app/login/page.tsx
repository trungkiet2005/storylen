"use client";
import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";
import { Logo } from "@/components/TopBar";
import { FujiArt } from "@/components/FujiArt";

export default function LoginPage() {
  const router = useRouter();
  const { login, demoLogin } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      toast("Đăng nhập thành công! Chào mừng trở lại 🎌", "success");
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  // Quick demo login (bypass backend for frontend-only demo)
  async function handleDemoLogin() {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      demoLogin(); // Sets user in React context + localStorage
      // Navigate first, toast shows on landing page
      router.push("/?demo=1");
    } catch {
      toast("Đăng nhập demo thất bại", "error");
      setLoading(false);
    }
  }

  return (
    <div className="paper-grain" style={{ minHeight: "100vh", display: "flex" }}>
      {/* ── Left: Manga hero panel ── */}
      <div
        style={{
          flex: "0 0 480px",
          background: "var(--ink)",
          color: "var(--paper)",
          display: "flex",
          flexDirection: "column",
          padding: "48px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Halftone bg */}
        <div className="halftone-coarse" style={{ position: "absolute", inset: 0, opacity: 0.15 }} />
        {/* Giant kanji */}
        <div
          style={{
            position: "absolute",
            right: -20,
            bottom: -40,
            fontFamily: "var(--font-serif)",
            fontSize: 380,
            fontWeight: 800,
            color: "var(--accent)",
            opacity: 0.12,
            lineHeight: 0.8,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          入
        </div>

        {/* Logo */}
        <div style={{ position: "relative" }}>
          <Logo size={20} />
        </div>

        {/* Hero text */}
        <div style={{ position: "relative", marginTop: "auto", paddingBottom: 40 }}>
          <div
            className="caps-xs"
            style={{ color: "var(--accent)", marginBottom: 16 }}
          >
            ようこそ · CHÀO MỪNG TRỞ LẠI
          </div>
          <h1
            className="display"
            style={{ fontSize: 64, lineHeight: 0.92, color: "var(--paper)", marginBottom: 20 }}
          >
            ĐỌC<br/>
            MANGA<br/>
            <span style={{ color: "var(--d-beni)", fontStyle: "italic" }}>NHƯ</span><br/>
            NGƯỜI NHẬT.
          </h1>
          <p
            className="serif"
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "rgba(242,234,216,0.65)",
              maxWidth: 320,
            }}
          >
            Đăng nhập để truy cập lịch sử dịch, lưu tiến độ đọc và sử dụng tính năng Q&A thông minh.
          </p>

          {/* Manga bubble quote */}
          <div
            className="bubble"
            style={{
              marginTop: 32,
              background: "rgba(255,255,255,0.06)",
              border: "2px solid rgba(242,234,216,0.25)",
              color: "var(--paper)",
              maxWidth: 280,
            }}
          >
            <div className="serif" style={{ fontSize: 14 }}>「また会えて嬉しい」</div>
            <div style={{ fontSize: 12, color: "rgba(242,234,216,0.5)", marginTop: 4 }}>
              — Thật vui khi gặp lại bạn
            </div>
          </div>
        </div>

        {/* Fuji art */}
        <div style={{ position: "absolute", top: 120, right: 20, width: 180, opacity: 0.3 }}>
          <FujiArt variant="compact" />
        </div>
      </div>

      {/* ── Right: Login form ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 40px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <div
              className="caps-xs"
              style={{ color: "var(--accent)", marginBottom: 10 }}
            >
              ログイン · ĐĂNG NHẬP
            </div>
            <h2 className="display" style={{ fontSize: 36, marginBottom: 8 }}>
              Chào mừng trở lại
            </h2>
            <p style={{ color: "var(--fg-soft)", fontSize: 14 }}>
              Chưa có tài khoản?{" "}
              <Link
                href="/register"
                style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "underline" }}
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>

          {/* Demo login banner */}
          <div
            style={{
              background: "var(--bg-2)",
              border: "2px solid var(--accent)",
              padding: "12px 16px",
              marginBottom: 24,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="sparkle" size={14} />
              <span style={{ color: "var(--fg-soft)" }}>Thử demo không cần tài khoản</span>
            </div>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleDemoLogin}
              disabled={loading}
              style={{ whiteSpace: "nowrap" }}
            >
              Demo
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(200,16,46,0.08)",
                border: "2px solid var(--accent)",
                fontSize: 13,
                color: "var(--accent)",
                marginBottom: 20,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <Icon name="close" size={13} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="caps-xs"
                style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  border: "2px solid var(--border)",
                  background: "var(--panel)",
                  color: "var(--fg)",
                  fontSize: 14,
                  fontFamily: "var(--font-sans)",
                  borderRadius: "var(--radius-sm)",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label htmlFor="login-password" className="caps-xs" style={{ color: "var(--fg-soft)" }}>
                  Mật khẩu
                </label>
                <Link
                  href="/forgot-password"
                  style={{ fontSize: 12, color: "var(--accent)", textDecoration: "underline" }}
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  style={{
                    width: "100%",
                    padding: "11px 44px 11px 14px",
                    border: "2px solid var(--border)",
                    background: "var(--panel)",
                    color: "var(--fg)",
                    fontSize: 14,
                    fontFamily: "var(--font-sans)",
                    borderRadius: "var(--radius-sm)",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted)",
                    padding: 4,
                  }}
                >
                  <Icon name={showPw ? "eye" : "eye"} size={15} />
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
              />
              <span style={{ color: "var(--fg-soft)" }}>Nhớ đăng nhập trong 30 ngày</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "14px",
                fontSize: 15,
                marginTop: 4,
                position: "relative",
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: "2.5px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                      display: "inline-block",
                    }}
                  />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  Đăng nhập <Icon name="arrow-right" size={15} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "24px 0",
              color: "var(--muted)",
              fontSize: 12,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
            <span className="caps-xs">HOẶC</span>
            <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
          </div>

          {/* Google OAuth (UI only) */}
          <button
            className="btn"
            style={{ width: "100%", justifyContent: "center", gap: 10 }}
            type="button"
            onClick={() => toast("Google OAuth sẽ được tích hợp sớm!", "info")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Tiếp tục với Google
          </button>

          {/* Footer text */}
          <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 28, lineHeight: 1.5 }}>
            Bằng cách đăng nhập, bạn đồng ý với{" "}
            <Link href="/terms" style={{ color: "var(--accent)", textDecoration: "underline" }}>
              Điều khoản sử dụng
            </Link>{" "}
            và{" "}
            <Link href="/privacy" style={{ color: "var(--accent)", textDecoration: "underline" }}>
              Chính sách bảo mật
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
