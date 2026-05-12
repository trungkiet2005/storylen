"use client";
import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";
import { Logo } from "@/components/TopBar";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { show } = useToast();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (username.trim().length < 3) errs.username = "Tên đăng nhập tối thiểu 3 ký tự";
    if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Email không hợp lệ";
    if (password.length < 8) errs.password = "Mật khẩu tối thiểu 8 ký tự";
    if (password !== confirm) errs.confirm = "Mật khẩu xác nhận không khớp";
    if (!agreed) errs.agreed = "Vui lòng đồng ý điều khoản sử dụng";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      show("Tạo tài khoản thành công! Chào mừng đến StoryLens 🎌", "success");
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng ký thất bại";
      setError(msg);
      show(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  // Password strength
  const strength = password.length === 0 ? 0 :
    password.length < 6 ? 1 :
    password.length < 8 ? 2 :
    /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const strengthLabels = ["", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"];
  const strengthColors = ["", "#e04156", "#f59e0b", "#22c55e", "#16a34a"];

  return (
    <div className="paper-grain" style={{ minHeight: "100vh", display: "flex" }}>
      {/* ── Left: Dark hero panel ── */}
      <div
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
        <div className="halftone-coarse" style={{ position: "absolute", inset: 0, opacity: 0.15 }} />
        <div
          style={{
            position: "absolute",
            right: -20,
            bottom: -40,
            fontFamily: "var(--font-serif)",
            fontSize: 340,
            fontWeight: 800,
            color: "var(--accent)",
            opacity: 0.1,
            lineHeight: 0.8,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          登
        </div>

        <div style={{ position: "relative" }}>
          <Logo size={20} />
        </div>

        <div style={{ position: "relative", marginTop: "auto", paddingBottom: 40 }}>
          <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 12 }}>
            アカウント作成 · TẠO TÀI KHOẢN
          </div>
          <h1 className="display" style={{ fontSize: 52, lineHeight: 0.92, color: "var(--paper)", marginBottom: 20 }}>
            THAM GIA<br />
            STORYLENS<br />
            <span style={{ color: "var(--d-beni)", fontStyle: "italic" }}>NGAY HÔM NAY.</span>
          </h1>
          <p className="serif" style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(242,234,216,0.6)", maxWidth: 300 }}>
            Lưu lịch sử dịch, đặt câu hỏi về truyện và truy cập mọi nơi.
          </p>

          {/* Feature list */}
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "history", text: "Lịch sử dịch không giới hạn" },
              { icon: "chat", text: "Q&A thông minh với RAG" },
              { icon: "stack", text: "Batch upload nhiều trang" },
              { icon: "book", text: "Đọc manga mọi thiết bị" },
            ].map(f => (
              <div key={f.icon} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(242,234,216,0.7)" }}>
                <div style={{ color: "var(--accent)" }}><Icon name={f.icon} size={13} /></div>
                {f.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Register form ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>
              新規登録 · ĐĂNG KÝ
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
          </div>

          {/* Global error */}
          {error && (
            <div style={{ padding: "12px 16px", background: "rgba(200,16,46,0.08)", border: "2px solid var(--accent)", fontSize: 13, color: "var(--accent)", marginBottom: 20, display: "flex", gap: 8, alignItems: "center" }}>
              <Icon name="close" size={13} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Username */}
            <div>
              <label htmlFor="reg-username" className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                Tên đăng nhập
              </label>
              <input
                id="reg-username"
                type="text"
                required
                value={username}
                onChange={e => { setUsername(e.target.value); setFieldErrors(p => ({ ...p, username: "" })); }}
                placeholder="manhkiet, suzuki_manga..."
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
                }}
              />
              {fieldErrors.username && <div style={{ color: "var(--accent)", fontSize: 11, marginTop: 4 }}>{fieldErrors.username}</div>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: "" })); }}
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
                }}
              />
              {fieldErrors.email && <div style={{ color: "var(--accent)", fontSize: 11, marginTop: 4 }}>{fieldErrors.email}</div>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                Mật khẩu
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="reg-password"
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: "" })); }}
                  placeholder="Tối thiểu 8 ký tự..."
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
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
                >
                  <Icon name="eye" size={15} />
                </button>
              </div>
              {/* Password strength */}
              {password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColors[strength] : "var(--border-soft)", transition: "background 0.2s" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: strengthColors[strength] }}>
                    {strengthLabels[strength]}
                  </div>
                </div>
              )}
              {fieldErrors.password && <div style={{ color: "var(--accent)", fontSize: 11, marginTop: 4 }}>{fieldErrors.password}</div>}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="reg-confirm" className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                Xác nhận mật khẩu
              </label>
              <input
                id="reg-confirm"
                type="password"
                required
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setFieldErrors(p => ({ ...p, confirm: "" })); }}
                placeholder="Nhập lại mật khẩu..."
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
                }}
              />
              {fieldErrors.confirm && <div style={{ color: "var(--accent)", fontSize: 11, marginTop: 4 }}>{fieldErrors.confirm}</div>}
            </div>

            {/* Terms */}
            <div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => { setAgreed(e.target.checked); setFieldErrors(p => ({ ...p, agreed: "" })); }}
                  style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--accent)", flexShrink: 0 }}
                />
                <span style={{ color: "var(--fg-soft)", lineHeight: 1.4 }}>
                  Tôi đồng ý với{" "}
                  <Link href="/terms" style={{ color: "var(--accent)", textDecoration: "underline" }}>Điều khoản sử dụng</Link>
                  {" "}và{" "}
                  <Link href="/privacy" style={{ color: "var(--accent)", textDecoration: "underline" }}>Chính sách bảo mật</Link>
                  {" "}của StoryLens
                </span>
              </label>
              {fieldErrors.agreed && <div style={{ color: "var(--accent)", fontSize: 11, marginTop: 4 }}>{fieldErrors.agreed}</div>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 15, marginTop: 4 }}
            >
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                  Đang tạo tài khoản...
                </>
              ) : (
                <>Tạo tài khoản <Icon name="arrow-right" size={15} /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0", color: "var(--muted)", fontSize: 12 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
            <span className="caps-xs">HOẶC</span>
            <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
          </div>

          {/* Google */}
          <button
            className="btn"
            style={{ width: "100%", justifyContent: "center", gap: 10 }}
            type="button"
            onClick={() => show("Google OAuth sẽ được tích hợp sớm!", "info")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Đăng ký với Google
          </button>
        </div>
      </div>
    </div>
  );
}
