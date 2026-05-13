import React from "react";
import Link from "next/link";
import { Icon } from "./Icons";

const FOOTER_LINKS = [
  {
    section: "Sản phẩm",
    links: [
      { label: "Tải lên truyện", href: "/upload" },
      { label: "Đọc truyện tranh", href: "/reader" },
      { label: "Hỏi đáp Q&A", href: "/qa" },
    ],
  },
  {
    section: "Tài khoản",
    links: [
      { label: "Đăng nhập", href: "/login" },
      { label: "Đăng ký", href: "/register" },
      { label: "Hồ sơ", href: "/profile" },
      { label: "Lịch sử", href: "/history" },
    ],
  },
  {
    section: "Pháp lý",
    links: [
      { label: "Điều khoản sử dụng", href: "/terms" },
      { label: "Chính sách bảo mật", href: "/privacy" },
      { label: "Bản quyền", href: "/copyright" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "var(--ink)",
        color: "var(--paper)",
        borderTop: "3px solid var(--border)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Halftone bg */}
      <div className="halftone-coarse" style={{ position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }} />

      {/* Giant kanji watermark */}
      <div
        style={{
          position: "absolute",
          right: -20,
          top: -40,
          fontFamily: "var(--font-serif)",
          fontSize: 280,
          fontWeight: 800,
          color: "var(--accent)",
          opacity: 0.07,
          lineHeight: 0.8,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        S
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 40px 32px", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(3, 1fr)", gap: 40, marginBottom: 40 }}>
          {/* Brand column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <svg viewBox="0 0 40 40" width={36} height={36} aria-hidden="true">
                <rect x="2" y="2" width="36" height="36" fill="var(--accent)" stroke="rgba(242,234,216,0.5)" strokeWidth="2.5" transform="rotate(-4 20 20)"/>
                <text x="20" y="29" textAnchor="middle" fontSize="24" fontFamily="var(--font-serif)" fontWeight={800} fill="var(--paper)" transform="rotate(-4 20 20)">S</text>
              </svg>
              <div>
                <div className="display" style={{ fontSize: 18, color: "var(--paper)" }}>StoryLens</div>
                <div className="caps-xs" style={{ color: "rgba(242,234,216,0.4)", marginTop: 2 }}>XÓA NHÒA RÀO CẢN NGÔN NGỮ</div>
              </div>
            </div>
            <p className="serif" style={{ fontSize: 14, color: "rgba(242,234,216,0.55)", lineHeight: 1.7, maxWidth: 240 }}>
              Dịch truyện tranh đa ngôn ngữ bằng AI. Giữ nguyên ý nghĩa, cảm xúc và phong cách gốc.
            </p>
            {/* Social / GitHub placeholder */}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {[
                { label: "GitHub", icon: "stack" },
                { label: "X / Twitter", icon: "chat" },
              ].map(s => (
                <button
                  key={s.label}
                  className="btn btn-sm"
                  style={{
                    background: "transparent",
                    color: "rgba(242,234,216,0.6)",
                    borderColor: "rgba(242,234,216,0.2)",
                    boxShadow: "none",
                    padding: "6px 10px",
                  }}
                  title={s.label}
                >
                  <Icon name={s.icon} size={13} />
                </button>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map(col => (
            <div key={col.section}>
              <div className="caps-xs" style={{ color: "rgba(242,234,216,0.4)", marginBottom: 14 }}>
                {col.section}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      fontSize: 13,
                      color: "rgba(242,234,216,0.65)",
                      textDecoration: "none",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--paper)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(242,234,216,0.65)"}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(242,234,216,0.12)", marginBottom: 24 }} />

        {/* Bottom bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 12, color: "rgba(242,234,216,0.35)", fontFamily: "var(--font-mono)" }}>
            © {year} StoryLens · Được xây dựng với ❤️ và Gemini AI
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 11, color: "rgba(242,234,216,0.3)", fontFamily: "var(--font-mono)" }}>
            <span>YOLOv8 · Cloud-OCR · Gemini · RAG</span>
          </div>
          {/* Barcode decorative */}
          <svg width="80" height="28" style={{ opacity: 0.25 }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <rect key={i} x={i * 5} y="0" width={i % 3 === 0 ? 2 : 3} height="22" fill="var(--paper)"/>
            ))}
            <text x="40" y="28" textAnchor="middle" fontSize="7" fontFamily="var(--font-mono)" fill="var(--paper)">SL-{year}</text>
          </svg>
        </div>
      </div>
    </footer>
  );
}
