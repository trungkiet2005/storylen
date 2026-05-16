"use client";

import React, { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { Logo } from "@/components/TopBar";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedPage, FadeIn } from "@/components/Animations";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

function getPasswordScore(password: string): number {
  if (!password) return 0;
  let score = password.length >= 8 ? 1 : 0;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const strength = useMemo(() => getPasswordScore(password), [password]);
  const strengthLabels = ["", "Yếu", "Trung bình", "Khá", "Mạnh"];
  const strengthColors = ["", "#e04156", "#f59e0b", "#22c55e", "#16a34a"];

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const nextUsername = username.trim();
    const nextEmail = email.trim().toLowerCase();

    if (!USERNAME_RE.test(nextUsername)) errs.username = "Chỉ dùng chữ, số, dấu gạch dưới và dài 3-32 ký tự.";
    if (!/\S+@\S+\.\S+/.test(nextEmail)) errs.email = "Email không hợp lệ.";
    if (password.length < 8) errs.password = "Mật khẩu tối thiểu 8 ký tự.";
    if (password !== confirm) errs.confirm = "Mật khẩu xác nhận không khớp.";
    if (!agreed) errs.agreed = "Vui lòng xác nhận điều khoản sử dụng.";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await register(username.trim(), email.trim().toLowerCase(), password);
      if (result.requires_email_confirmation) {
        toast(result.message || "Tài khoản đã được tạo. Vui lòng xác thực email.", "info", 6000);
        router.replace("/login");
        return;
      }

      toast("Tạo tài khoản thành công.", "success");
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng ký thất bại";
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
            padding: "48px 36px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <AnimatedBackground bounded playlist="mystic" intervalMs={22_000} overlay={0.78} />
          <div className="halftone-coarse" style={{ position: "absolute", inset: 0, opacity: 0.14, zIndex: 1 }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: 15 }}
            animate={{ opacity: 0.1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}
            style={{
              position: "absolute",
              right: -20,
              bottom: -40,
              fontFamily: "var(--font-serif)",
              fontSize: 330,
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
              <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 12 }}>
                TẠO TÀI KHOẢN
              </div>
            </FadeIn>
            <FadeIn direction="up" distance={20} delay={0.3}>
              <h1 className="display" style={{ fontSize: 50, lineHeight: 0.94, color: "var(--paper)", marginBottom: 20 }}>
                LƯU LẠI<br />
                TOÀN BỘ<br />
                HÀNH TRÌNH.
              </h1>
            </FadeIn>
            <FadeIn direction="up" distance={10} delay={0.4}>
              <p className="serif" style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(242,234,216,0.66)", maxWidth: 300 }}>
                Tài khoản dùng Supabase Auth thật, mật khẩu không đi vào database ứng dụng.
              </p>
            </FadeIn>
          </div>
        </aside>

        <section style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", overflowY: "auto" }}>
          <div style={{ width: "100%", maxWidth: 440 }}>
            <div style={{ marginBottom: 30 }}>
              <FadeIn direction="up" distance={15} delay={0.15}>
                <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>
                  STORYLENS ACCOUNT
                </div>
                <h2 className="display" style={{ fontSize: 32, marginBottom: 8 }}>
                  Tạo tài khoản mới
                </h2>
                <p style={{ color: "var(--fg-soft)", fontSize: 14 }}>
                  Đã có tài khoản?{" "}
                  <Link href="/login" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "underline" }}>
                    Đăng nhập
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

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <FadeIn direction="up" distance={10} delay={0.2}>
                <div>
                  <label htmlFor="reg-username" className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                    Tên đăng nhập
                  </label>
                  <motion.input
                    whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 2px rgba(200,16,46,0.1)" }}
                    id="reg-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    disabled={loading}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, username: "" }));
                    }}
                    aria-invalid={Boolean(fieldErrors.username)}
                    placeholder="story_reader"
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: `2px solid ${fieldErrors.username ? "var(--accent)" : "var(--border)"}`,
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
                  <AnimatePresence>
                    {fieldErrors.username && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ color: "var(--accent)", fontSize: 11, marginTop: 5, overflow: "hidden" }}
                      >
                        {fieldErrors.username}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>

              <FadeIn direction="up" distance={10} delay={0.25}>
                <div>
                  <label htmlFor="reg-email" className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                    Email
                  </label>
                  <motion.input
                    whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 2px rgba(200,16,46,0.1)" }}
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    aria-invalid={Boolean(fieldErrors.email)}
                    placeholder="name@example.com"
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: `2px solid ${fieldErrors.email ? "var(--accent)" : "var(--border)"}`,
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
                  <AnimatePresence>
                    {fieldErrors.email && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ color: "var(--accent)", fontSize: 11, marginTop: 5, overflow: "hidden" }}
                      >
                        {fieldErrors.email}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>

              <FadeIn direction="up" distance={10} delay={0.3}>
                <div>
                  <label htmlFor="reg-password" className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                    Mật khẩu
                  </label>
                  <div style={{ position: "relative" }}>
                    <motion.input
                      whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 2px rgba(200,16,46,0.1)" }}
                      id="reg-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      disabled={loading}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, password: "" }));
                      }}
                      aria-invalid={Boolean(fieldErrors.password)}
                      placeholder="Tối thiểu 8 ký tự"
                      style={{
                        width: "100%",
                        padding: "11px 44px 11px 14px",
                        border: `2px solid ${fieldErrors.password ? "var(--accent)" : "var(--border)"}`,
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
                  <AnimatePresence>
                    {password && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                            {[1, 2, 3, 4].map((item) => (
                              <motion.div
                                key={item}
                                initial={{ scaleX: 0 }}
                                animate={{ 
                                  scaleX: 1,
                                  background: item <= strength ? strengthColors[strength] : "var(--border-soft)" 
                                }}
                                transition={{ duration: 0.25 }}
                                style={{
                                  flex: 1,
                                  height: 3,
                                  borderRadius: 2,
                                  transformOrigin: "left"
                                }}
                              />
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: strengthColors[strength], fontWeight: 600 }}>{strengthLabels[strength]}</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {fieldErrors.password && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ color: "var(--accent)", fontSize: 11, marginTop: 5, overflow: "hidden" }}
                      >
                        {fieldErrors.password}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>

              <FadeIn direction="up" distance={10} delay={0.35}>
                <div>
                  <label htmlFor="reg-confirm" className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                    Xác nhận mật khẩu
                  </label>
                  <motion.input
                    whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 2px rgba(200,16,46,0.1)" }}
                    id="reg-confirm"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    disabled={loading}
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, confirm: "" }));
                    }}
                    aria-invalid={Boolean(fieldErrors.confirm)}
                    placeholder="Nhập lại mật khẩu"
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: `2px solid ${fieldErrors.confirm ? "var(--accent)" : confirm && confirm === password ? "#22c55e" : "var(--border)"}`,
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
                  <AnimatePresence>
                    {fieldErrors.confirm && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ color: "var(--accent)", fontSize: 11, marginTop: 5, overflow: "hidden" }}
                      >
                        {fieldErrors.confirm}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>

              <FadeIn direction="up" distance={5} delay={0.4}>
                <div>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={agreed}
                      disabled={loading}
                      onChange={(e) => {
                        setAgreed(e.target.checked);
                        setFieldErrors((prev) => ({ ...prev, agreed: "" }));
                      }}
                      style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--accent)", flexShrink: 0 }}
                    />
                    <span style={{ color: "var(--fg-soft)", lineHeight: 1.4 }}>
                      Tôi xác nhận thông tin đăng ký là chính xác và đồng ý sử dụng StoryLens theo quy định của dịch vụ.
                    </span>
                  </label>
                  <AnimatePresence>
                    {fieldErrors.agreed && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ color: "var(--accent)", fontSize: 11, marginTop: 5, overflow: "hidden" }}
                      >
                        {fieldErrors.agreed}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>

              <FadeIn direction="up" distance={10} delay={0.45}>
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
                      Đang tạo tài khoản...
                    </>
                  ) : (
                    <>
                      Tạo tài khoản <Icon name="arrow-right" size={15} />
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
