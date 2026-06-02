"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/components/Icons";

const KEY = "storylens.onboarding.done.v1";

type Step = {
  title: string;
  body: string;
  cta?: { href: string; label: string };
  /** Render a demo above the body. Reserved keys map to specific demos. */
  demo?: "pipeline";
};

const STEPS: Step[] = [
  {
    title: "Chào mừng đến StoryLens 👋",
    body: "Nền tảng dịch truyện tranh bằng AI. Bạn có thể tải truyện lên, đọc bản dịch và theo dõi tiến độ đọc.",
  },
  {
    title: "Xem AI dịch truyện trong 3 giây ✨",
    body: "Hệ thống tự động: phát hiện bong bóng → đọc OCR → dịch bằng Gemini → hiển thị bản tiếng Việt overlay. Không thao tác gì thêm.",
    demo: "pipeline",
  },
  {
    title: "Tải truyện lên là xong",
    body: "Kéo-thả ảnh trang truyện vào trang Upload. AI sẽ tự phát hiện bóng thoại, dịch và hiển thị bản tiếng Việt.",
    cta: { href: "/upload", label: "Thử tải lên →" },
  },
  {
    title: "Credits & gói cước",
    body: "Mỗi tài khoản miễn phí có 5 credits/ngày. Mỗi credit = 1 trang dịch hoặc 1 câu hỏi. Cần nhiều hơn? Xem các gói nâng cấp.",
    cta: { href: "/plans", label: "Xem các gói →" },
  },
];

const PIPELINE_STAGE_LABELS = ["Ảnh gốc", "Phát hiện", "Đã dịch"] as const;
type PipelineStage = 0 | 1 | 2;

const DEMO_BUBBLES: { x: number; y: number; w: number; h: number; vi: string }[] = [
  { x: 18, y: 12, w: 38, h: 14, vi: "Không lẽ…" },
  { x: 50, y: 36, w: 36, h: 12, vi: "Định mệnh?" },
  { x: 10, y: 64, w: 42, h: 14, vi: "Tiến lên!" },
];

function PipelineDemo() {
  const [stage, setStage] = useState<PipelineStage>(0);

  useEffect(() => {
    const t = setInterval(() => {
      setStage(s => ((s + 1) % 3) as PipelineStage);
    }, 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "4/5",
        maxHeight: 220,
        margin: "0 auto 16px",
        background: "#000",
        border: "2px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <Image
        src="/images/manga_hero_clean.png"
        alt="Demo"
        fill
        unoptimized
        style={{ objectFit: "cover", opacity: stage === 0 ? 1 : 0.55 }}
      />

      {/* Stage 1: detection boxes */}
      <AnimatePresence>
        {stage >= 1 && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          >
            {DEMO_BUBBLES.map((b, i) => (
              <motion.rect
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.12 }}
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                fill="none"
                stroke="#c8102e"
                strokeWidth="0.6"
                strokeDasharray="1.5 1"
              />
            ))}
          </svg>
        )}
      </AnimatePresence>

      {/* Stage 2: VN translation bubbles */}
      <AnimatePresence>
        {stage === 2 && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          >
            {DEMO_BUBBLES.map((b, i) => (
              <motion.g
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08, type: "spring" }}
                style={{ transformOrigin: `${b.x + b.w / 2}px ${b.y + b.h / 2}px` }}
              >
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  fill="#fffde8"
                  stroke="#111"
                  strokeWidth="0.4"
                />
                <text
                  x={b.x + b.w / 2}
                  y={b.y + b.h / 2 + 1}
                  textAnchor="middle"
                  fontSize="3.5"
                  fontFamily="var(--font-serif)"
                  fontWeight="600"
                  fill="#111"
                >
                  {b.vi}
                </text>
              </motion.g>
            ))}
          </svg>
        )}
      </AnimatePresence>

      {/* Stage indicator */}
      <div
        className="mono"
        style={{
          position: "absolute",
          left: 8,
          bottom: 8,
          padding: "3px 7px",
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          fontSize: 10,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {String(stage + 1).padStart(2, "0")} · {PIPELINE_STAGE_LABELS[stage]}
      </div>
    </div>
  );
}

/** Cookie name mirrors the localStorage key so a user who clears one but not
 *  the other still won't see onboarding again. Cookie persists 1 year. */
const COOKIE_NAME = "sl_onboarded";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const exp = new Date(Date.now() + days * 86400_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`;
}

export function OnboardingOverlay() {
  const { isAuthenticated, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    try {
      // Either signal counts as "done" — be lenient so clearing one storage
      // doesn't re-popup onboarding for returning users.
      if (window.localStorage.getItem(KEY) === "1") return;
      if (readCookie(COOKIE_NAME) === "1") return;
      setOpen(true);
    } catch { /* ignore */ }
  }, [isAuthenticated, isLoading]);

  function close() {
    setOpen(false);
    try { window.localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    writeCookie(COOKIE_NAME, "1", 365);
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
        {s.demo === "pipeline" && <PipelineDemo />}
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
