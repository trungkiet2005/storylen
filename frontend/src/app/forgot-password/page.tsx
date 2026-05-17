"use client";

import React, { type FormEvent, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";
import { forgotPassword } from "@/lib/api";
import { TurnstileWidget, isTurnstileEnabled } from "@/components/TurnstileWidget";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRequired = isTurnstileEnabled();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (captchaRequired && !captchaToken) {
      toast("Vui lòng hoàn thành captcha.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim().toLowerCase(), captchaToken ?? undefined);
      setSent(true);
      toast(res.message, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Có lỗi xảy ra.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TopBar />
      <main style={{ minHeight: "calc(100vh - 80px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 36, maxWidth: 460, width: "100%", borderRadius: "var(--radius)" }}>
          <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 8 }}>KHÔI PHỤC TÀI KHOẢN</div>
          <h1 className="display" style={{ fontSize: 28, marginBottom: 10 }}>Quên mật khẩu?</h1>
          <p style={{ fontSize: 14, color: "var(--fg-soft)", marginBottom: 24, lineHeight: 1.6 }}>
            Nhập email của bạn. Chúng tôi sẽ gửi liên kết để bạn đặt lại mật khẩu.
          </p>

          {sent ? (
            <div style={{ padding: 18, background: "var(--bg-2)", border: "2px solid var(--border-soft)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, color: "#16a34a", fontWeight: 700 }}>
                <Icon name="check" size={16} /> Đã gửi email
              </div>
              <p style={{ fontSize: 13, color: "var(--fg-soft)", lineHeight: 1.6 }}>
                Nếu email <strong>{email}</strong> tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút. Kiểm tra cả hộp Spam.
              </p>
              <Link href="/login" className="btn btn-secondary" style={{ marginTop: 16, width: "100%", justifyContent: "center" }}>
                Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={loading}
                  style={{ width: "100%", padding: "11px 14px", border: "2px solid var(--border)", background: "var(--panel)", color: "var(--fg)", fontSize: 14, borderRadius: "var(--radius-sm)", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              {captchaRequired && (
                <TurnstileWidget onSuccess={setCaptchaToken} onExpired={() => setCaptchaToken(null)} />
              )}
              <button type="submit" className="btn btn-primary" disabled={loading || !email || (captchaRequired && !captchaToken)} style={{ width: "100%", justifyContent: "center", padding: 14 }}>
                {loading ? "Đang gửi..." : "Gửi liên kết đặt lại"}
              </button>
              <div style={{ textAlign: "center", fontSize: 13 }}>
                <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>← Quay lại đăng nhập</Link>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
