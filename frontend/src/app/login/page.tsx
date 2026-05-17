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
import { AnimatedBackground } from "@/components/AnimatedBackground";

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
          <AnimatedBackground bounded playlist="classic" intervalMs={22_000} overlay={0.78} />
          <div className="halftone-coarse" style={{ position: "absolute", inset: 0, opacity: 0.14, zIndex: 1 }} />
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

        <section style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px clamp(20px, 5vw, 56px)" }}>
          <div style={{ width: "100%", maxWidth: 440 }}>

            <FadeIn direction="up" distance={15} delay={0.1}>
              <div style={{ marginBottom: 32 }}>
                <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>
                  STORYLENS ACCOUNT · LOGIN
                </div>
                <h2 className="display" style={{ fontSize: "clamp(30px, 4vw, 38px)", marginBottom: 10, lineHeight: 1.1 }}>
                  Chào mừng trở lại
                </h2>
                <p style={{ color: "var(--fg-soft)", fontSize: 14 }}>
                  Chưa có tài khoản?{" "}
                  <Link href="/register" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "underline" }}>
                    Đăng ký
                  </Link>
                </p>
              </div>
            </FadeIn>

            <AnimatePresence>
              {error && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="stroke-ink"
                  style={{
                    padding: "10px 14px",
                    background: "rgba(200,16,46,0.06)",
                    borderColor: "var(--accent)",
                    color: "var(--accent)",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 18,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <Icon name="alert" size={14} />
                  <span style={{ flex: 1 }}>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <FadeIn direction="up" distance={12} delay={0.2}>
                <div>
                  <label htmlFor="login-email" className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                    Email
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none", display: "flex" }}>
                      <Icon name="key" size={14} />
                    </span>
                    <motion.input
                      whileFocus={{ borderColor: "var(--accent)", boxShadow: "3px 3px 0 0 var(--accent)" }}
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
                        padding: "11px 14px 11px 38px",
                        border: "2px solid var(--border)",
                        background: "var(--panel)",
                        color: "var(--fg)",
                        fontSize: 14,
                        fontFamily: "var(--font-sans)",
                        borderRadius: "var(--radius-sm)",
                        boxSizing: "border-box",
                        outline: "none",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                    />
                  </div>
                </div>
              </FadeIn>

              <FadeIn direction="up" distance={12} delay={0.25}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <label htmlFor="login-password" className="caps-xs" style={{ color: "var(--fg-soft)" }}>
                      Mật khẩu
                    </label>
                    <Link href="/forgot-password" className="caps-xs" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none", display: "flex" }}>
                      <Icon name="layers" size={14} />
                    </span>
                    <motion.input
                      whileFocus={{ borderColor: "var(--accent)", boxShadow: "3px 3px 0 0 var(--accent)" }}
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      minLength={8}
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự"
                      style={{
                        width: "100%",
                        padding: "11px 44px 11px 38px",
                        border: "2px solid var(--border)",
                        background: "var(--panel)",
                        color: "var(--fg)",
                        fontSize: 14,
                        fontFamily: "var(--font-sans)",
                        borderRadius: "var(--radius-sm)",
                        boxSizing: "border-box",
                        outline: "none",
                        transition: "border-color 0.15s, box-shadow 0.15s",
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

              <FadeIn direction="up" distance={10} delay={0.3}>
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

              <FadeIn direction="up" distance={8} delay={0.4}>
                <div style={{ position: "relative", textAlign: "center", margin: "8px 0 0" }}>
                  <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 2, background: "var(--border)" }} />
                  <span className="caps-xs" style={{ position: "relative", padding: "0 12px", background: "var(--bg)", color: "var(--muted)" }}>
                    HOẶC
                  </span>
                </div>
              </FadeIn>

              <FadeIn direction="up" distance={8} delay={0.45}>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
                    if (!supabaseUrl) {
                      toast("OAuth chưa được cấu hình trên frontend (.env).", "error");
                      return;
                    }
                    // Remember where the user was so /auth/callback can return them.
                    try { window.localStorage.setItem("sl.oauth-next", "/"); } catch { /* ignore */ }
                    const redirect = encodeURIComponent(`${siteUrl}/auth/callback`);
                    // Supabase Auth — provider=google, scope default. Returns
                    // tokens in the URL hash after OAuth dance completes.
                    window.location.href =
                      `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirect}`;
                  }}
                  className="stroke-ink"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: 13,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--panel)",
                    color: "var(--fg)",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-sans)",
                    fontWeight: 700,
                    cursor: loading ? "wait" : "pointer",
                    letterSpacing: "0.02em",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Tiếp tục với Google
                </motion.button>
              </FadeIn>

              <FadeIn direction="up" distance={6} delay={0.5}>
                <div className="mono" style={{ textAlign: "center", fontSize: 10.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.7, letterSpacing: "0.04em" }}>
                  Bằng việc đăng nhập, bạn đồng ý với{" "}
                  <Link href="/terms" style={{ color: "var(--fg-soft)", textDecoration: "underline" }}>Điều khoản</Link>{" "}
                  ·{" "}
                  <Link href="/privacy" style={{ color: "var(--fg-soft)", textDecoration: "underline" }}>Bảo mật</Link>
                </div>
              </FadeIn>
            </form>
          </div>
        </section>
      </main>
    </AnimatedPage>
  );
}
