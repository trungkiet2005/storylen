"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icons";
import { getPublicLibrary, type LibrarySeriesItem } from "@/lib/api";

export default function PublicLibraryPage() {
  const [items, setItems] = useState<LibrarySeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPublicLibrary(60);
        setItems(data.items);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Không tải được thư viện.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <TopBar active="library" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 80px" }}>
        <header style={{ marginBottom: 24 }}>
          <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 6 }}>PUBLIC LIBRARY</div>
          <h1 className="display" style={{ fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-0.02em" }}>
            Thư viện công khai
          </h1>
          <p style={{ fontSize: 14, color: "var(--fg-soft)", marginTop: 6 }}>
            Các bộ truyện đã được tác giả publish — đọc tự do, không cần đăng nhập.
          </p>
        </header>

        {loading && <div style={{ color: "var(--muted)" }}>Đang tải...</div>}
        {err && (
          <div className="stroke-ink" style={{ padding: 16, color: "var(--accent)", background: "rgba(200,16,46,0.05)" }}>
            {err}
          </div>
        )}

        {!loading && !err && items.length === 0 && (
          <div className="stroke-ink" style={{ padding: 32, textAlign: "center", color: "var(--muted)", background: "var(--panel)" }}>
            <Icon name="book" size={28} />
            <p style={{ marginTop: 12, fontSize: 14 }}>
              Chưa có bộ truyện nào được publish. Trở thành tác giả đầu tiên — upload + publish chapter của bạn để xuất hiện ở đây.
            </p>
            <Link href="/upload" className="btn btn-primary" style={{ marginTop: 16 }}>
              Tải truyện lên →
            </Link>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
          {items.map((s) => (
            <Link key={s.series_id} href={`/library/${s.series_id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", overflow: "hidden", borderRadius: "var(--radius-sm)", height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ aspectRatio: "3/4", background: "var(--bg-2)", position: "relative" }}>
                  {s.cover_image_url ? (
                    <Image src={s.cover_image_url} alt={s.title} fill unoptimized style={{ objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                      <Icon name="image" size={28} />
                    </div>
                  )}
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {s.title}
                  </div>
                  <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4 }}>
                    {s.published_chapter_count} chương
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
