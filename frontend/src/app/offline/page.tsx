import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mất kết nối · StoryLens",
};

/** Offline fallback served by the service worker when a navigation fails. */
export default function OfflinePage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", background: "var(--bg)" }}>
      <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 8 }}>OFFLINE</div>
      <h1 className="display" style={{ fontSize: 36, marginBottom: 12 }}>Mất kết nối</h1>
      <p style={{ fontSize: 14, color: "var(--fg-soft)", maxWidth: 360, lineHeight: 1.6 }}>
        Bạn đang offline. Một số trang đã đọc trước đó có thể vẫn xem được nhờ cache.
        Khi có mạng trở lại, hãy thử lại.
      </p>
      <Link href="/" className="btn btn-primary" style={{ marginTop: 24 }}>
        Thử lại
      </Link>
    </main>
  );
}
