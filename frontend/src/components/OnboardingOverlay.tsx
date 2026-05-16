"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/components/Icons";

const KEY = "storylens.onboarding.done.v1";

type Step = {
  title: string;
  body: string;
  cta?: { href: string; label: string };
};

const STEPS: Step[] = [
  {
    title: "Chào mừng đến StoryLens 👋",
    body: "Nền tảng dịch truyện tranh bằng AI. Bạn có thể tải truyện lên, đọc bản dịch, hỏi đáp về nội dung và theo dõi tiến độ đọc.",
  },
  {
    title: "Tải truyện lên là xong",
    body: "Kéo-thả ảnh trang truyện vào trang Upload. AI sẽ tự phát hiện bóng thoại, dịch và hiển thị bản tiếng Việt.",
    cta: { href: "/upload", label: "Thử tải lên →" },
  },
  {
    title: "Hỏi đáp về truyện",
    body: "Đã đọc xong và có thắc mắc? Vào trang Hỏi đáp để hỏi AI bất cứ điều gì về truyện bạn đã dịch.",
    cta: { href: "/qa", label: "Thử hỏi đáp →" },
  },
  {
    title: "Credits & gói cước",
    body: "Mỗi tài khoản miễn phí có 5 credits/ngày. Mỗi credit = 1 trang dịch hoặc 1 câu hỏi. Cần nhiều hơn? Xem các gói nâng cấp.",
    cta: { href: "/plans", label: "Xem các gói →" },
  },
];

export function OnboardingOverlay() {
  const { isAuthenticated, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    try {
      if (window.localStorage.getItem(KEY) === "1") return;
      setOpen(true);
    } catch { /* ignore */ }
  }, [isAuthenticated, isLoading]);

  function close() {
    setOpen(false);
    try { window.localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  }

  if (!open) return null;
  const s = STEPS[step];

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        className="stroke-ink panel-shadow"
        style={{
          background: "var(--panel)",
          borderRadius: "var(--radius)",
          padding: "28px 26px 22px",
          maxWidth: 460, width: "100%",
          position: "relative",
        }}
      >
        <button onClick={close} aria-label="Đóng" style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 6 }}>
          <Icon name="x" size={16} />
        </button>

        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, background: i <= step ? "var(--accent)" : "var(--border-soft)", borderRadius: 2 }} />
          ))}
        </div>

        <h2 className="display" style={{ fontSize: 22, marginBottom: 10 }}>{s.title}</h2>
        <p style={{ fontSize: 14, color: "var(--fg-soft)", lineHeight: 1.65, marginBottom: 22 }}>{s.body}</p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={close} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer" }}>
            Bỏ qua
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {s.cta && (
              <Link href={s.cta.href} onClick={close} className="btn btn-sm btn-secondary">
                {s.cta.label}
              </Link>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep(step + 1)} className="btn btn-sm btn-primary">
                Tiếp →
              </button>
            ) : (
              <button type="button" onClick={close} className="btn btn-sm btn-primary">
                Bắt đầu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
