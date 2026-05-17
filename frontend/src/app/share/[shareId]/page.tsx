"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { getSharedPage, type PageData } from "@/lib/api";
import { ChapterComments } from "@/components/ChapterComments";

export default function SharedPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = use(params);
  const [page, setPage] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getSharedPage(shareId);
        setPage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Liên kết không hợp lệ.");
      } finally {
        setLoading(false);
      }
    })();
  }, [shareId]);

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px 20px 80px" }}>
        <div style={{ marginBottom: 18 }}>
          <div className="caps-xs" style={{ color: "var(--accent)" }}>TRANG ĐƯỢC CHIA SẺ</div>
          <h1 className="display" style={{ fontSize: 26, marginTop: 4 }}>Đọc thử bản dịch</h1>
        </div>

        {loading && <div style={{ color: "var(--muted)" }}>Đang tải...</div>}

        {error && !loading && (
          <div className="stroke-ink" style={{ background: "var(--panel)", padding: 24, borderRadius: "var(--radius)" }}>
            <strong style={{ color: "var(--accent)" }}>{error}</strong>
            <p style={{ marginTop: 8, fontSize: 13, color: "var(--fg-soft)" }}>Liên kết có thể đã hết hạn hoặc bị thu hồi.</p>
            <Link href="/" className="btn btn-secondary" style={{ marginTop: 12 }}>Về trang chủ</Link>
          </div>
        )}

        {page && !loading && (
          <div className="stroke-ink" style={{ background: "var(--panel)", borderRadius: "var(--radius)", padding: 16 }}>
            {page.translated_image_url ? (
              <Image
                src={page.translated_image_url}
                alt="Trang đã dịch"
                width={900}
                height={1300}
                unoptimized
                style={{ width: "100%", height: "auto", display: "block", borderRadius: "var(--radius-sm)" }}
              />
            ) : page.original_image_url ? (
              <Image
                src={page.original_image_url}
                alt="Trang gốc"
                width={900}
                height={1300}
                unoptimized
                style={{ width: "100%", height: "auto", display: "block", borderRadius: "var(--radius-sm)" }}
              />
            ) : null}
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
              Liên kết chia sẻ • Trang #{page.metadata.page_number ?? "?"}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "var(--fg-soft)" }}>
          Thích bản dịch này?{" "}
          <Link href="/register" style={{ color: "var(--accent)", fontWeight: 700 }}>Tạo tài khoản StoryLens</Link>{" "}
          để dịch truyện của bạn.
        </div>

        {page?.metadata?.chapter_id && (
          <ChapterComments chapterId={page.metadata.chapter_id} />
        )}
      </main>
      <Footer />
    </>
  );
}
