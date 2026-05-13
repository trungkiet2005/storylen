"use client";

import React, { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { Logo } from "@/components/TopBar";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email.trim().toLowerCase(), password);
      toast("Đăng nhập thành công.", "success");
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="paper-grain" style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      <aside
        aria-hidden="true"
        style={{
          flex: "0 0 420px",
          background: "var(--ink)",
          color: "var(--paper)",
          display: "flex",
          flexDirection: "column",
          padding: "48px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="halftone-coarse" style={{ position: "absolute", inset: 0, opacity: 0.14 }} />
        <div
          style={{
            position: "absolute",
            right: -20,
            bottom: -34,
            fontFamily: "var(--font-serif)",
            fontSize: 340,
            fontWeight: 800,
            color: "var(--accent)",
            opacity: 0.1,
            lineHeight: 0.8,
          }}
        >
          S
        </div>
        <div style={{ position: "relative" }}>
          <Logo size={20} />
        </div>
        <div style={{ position: "relative", marginTop: "auto", paddingBottom: 40 }}>
          <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 14 }}>
            ĐĂNG NHẬP
          </div>
          <h1 className="display" style={{ fontSize: 56, lineHeight: 0.94, color: "var(--paper)", marginBottom: 18 }}>
            TIẾP TỤC<br />
            KHÔNG GIÁN<br />
            ĐOẠN.
          </h1>
          <p className="serif" style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(242,234,216,0.66)", maxWidth: 310 }}>
            Phiên đăng nhập được bảo vệ bằng cookie HTTP-only, phù hợp cho môi trường deploy thật.
          </p>
        </div>
      </aside>

      <section style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ marginBottom: 32 }}>
            <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>
              STORYLENS ACCOUNT
            </div>
            <h2 className="display" style={{ fontSize: 34, marginBottom: 8 }}>
              Chào mừng trở lại
            </h2>
            <p style={{ color: "var(--fg-soft)", fontSize: 14 }}>
              Chưa có tài khoản?{" "}
              <Link href="/register" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "underline" }}>
                Đăng ký
              </Link>
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              style={{
                padding: "12px 16px",
                background: "rgba(200,16,46,0.08)",
                border: "2px solid var(--accent)",
                color: "var(--accent)",
                fontSize: 13,
                marginBottom: 20,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <Icon name="alert" size={14} />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label htmlFor="login-email" className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

            <div>
              <label htmlFor="login-password" className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                Mật khẩu
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
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
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  disabled={loading}
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
                  <Icon name={showPassword ? "eye-off" : "eye"} size={15} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 15, marginTop: 4 }}
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
        </div>
      </section>
    </main>
  );
}
