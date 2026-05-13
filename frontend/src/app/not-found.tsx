import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "404 — Trang không tồn tại | StoryLens",
  description: "Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.",
};

export default function NotFound() {
  return (
    <div
      className="paper-grain"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 40,
      }}
    >
      {/* Giant 404 with manga-style overlay */}
      <div style={{ position: "relative", marginBottom: 32 }}>
        <div
          className="display"
          style={{
            fontSize: 180,
            lineHeight: 0.9,
            color: "var(--border-soft)",
            userSelect: "none",
            letterSpacing: "-0.06em",
          }}
        >
          404
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="serif"
            style={{
              fontSize: 64,
              color: "var(--accent)",
              fontWeight: 800,
              textShadow: "3px 3px 0 var(--border)",
            }}
          >
            ?
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="caps-sm" style={{ color: "var(--accent)", marginBottom: 10 }}>
        LỖI KHÔNG TÌM THẤY
      </div>
      <h1 className="display" style={{ fontSize: 40, margin: "0 0 16px" }}>
        Trang không tồn tại
      </h1>
      <p style={{ color: "var(--fg-soft)", maxWidth: 440, lineHeight: 1.6, marginBottom: 36 }}>
        Trang bạn đang tìm kiếm đã bị di chuyển, xóa, hoặc chưa bao giờ tồn tại — giống như những trang truyện chưa được dịch.
      </p>

      {/* Bubble with error message */}
      <div className="bubble" style={{ maxWidth: 320, marginBottom: 36, background: "#fff" }}>
        <span className="serif" style={{ fontSize: 14 }}>
          "Lost in translation..."
        </span>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, fontFamily: "var(--font-serif)" }}>
          — Lạc lối giữa những dòng dịch…
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12 }}>
        <Link href="/">
          <button className="btn btn-primary" style={{ padding: "14px 28px" }}>
            Về trang chủ
          </button>
        </Link>
        <Link href="/upload">
          <button className="btn" style={{ padding: "14px 28px" }}>
            Tải truyện lên
          </button>
        </Link>
      </div>

      {/* Decorative barcode */}
      <div style={{ marginTop: 48, opacity: 0.4 }}>
        <svg width="120" height="40">
          {Array.from({ length: 24 }).map((_, i) => (
            <rect key={i} x={i * 5} y="0" width={i % 3 === 0 ? 2 : 3} height="32" fill="var(--ink)"/>
          ))}
          <text x="60" y="40" textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--muted)">
            SL-ERR-404
          </text>
        </svg>
      </div>
    </div>
  );
}
