"use client";

import React, { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { Logo } from "@/components/TopBar";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedPage, FadeIn, ScaleIn } from "@/components/Animations";

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
    <AnimatedPage>
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
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: 15 }}
            animate={{ opacity: 0.1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}
            style={{
              position: "absolute",
              right: -20,
              bottom: -34,
              fontFamily: "var(--font-serif)",
              fontSize: 340,
              fontWeight: 800,
              color: "var(--accent)",
              lineHeight: 0.8,
            }}
          >
            S
          </motion.div>
          <div style={{ position: "relative" }}>
            <FadeIn direction="down" distance={10} delay={0.1}>
              <Logo size={20} />
            </FadeIn>
          </div>
          <div style={{ position: "relative", marginTop: "auto", paddingBottom: 40 }}>
            <FadeIn direction="up" distance={15} delay={0.2}>
              <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 14 }}>
                ĐĂNG NHẬP
              </div>
            </FadeIn>
            <FadeIn direction="up" distance={20} delay={0.3}>
              <h1 className="display" style={{ fontSize: 56, lineHeight: 0.94, color: "var(--paper)", marginBottom: 18 }}>
                TIẾP TỤC<br />
                KHÔNG GIÁN<br />
                ĐOẠN.
              </h1>
            </FadeIn>
            <FadeIn direction="up" distance={10} delay={0.4}>
              <p className="serif" style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(242,234,216,0.66)", maxWidth: 310 }}>
                Phiên đăng nhập được bảo vệ bằng cookie HTTP-only, phù hợp cho môi trường deploy thật.
              </p>
            </FadeIn>
          </div>
        </aside>

        <section style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px" }}>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ marginBottom: 32 }}>
              <FadeIn direction="up" distance={15} delay={0.15}>
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
              </FadeIn>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
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
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <FadeIn direction="up" distance={15} delay={0.25}>
                <div>
                  <label htmlFor="login-email" className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                    Email
                  </label>
                  <motion.input
                    whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 2px rgba(200,16,46,0.1)" }}
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
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s"
                    }}
                  />
                </div>
              </FadeIn>

              <FadeIn direction="up" distance={15} delay={0.3}>
                <div>
                  <label htmlFor="login-password" className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                    Mật khẩu
                  </label>
                  <div style={{ position: "relative" }}>
                    <motion.input
                      whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 2px rgba(200,16,46,0.1)" }}
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
                        outline: "none",
                        transition: "border-color 0.2s, box-shadow 0.2s"
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
              </FadeIn>

              <FadeIn direction="up" distance={10} delay={0.35}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 15, marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}
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
                </motion.button>
              </FadeIn>
            </form>
          </div>
        </section>
      </main>
    </AnimatedPage>
  );
}
