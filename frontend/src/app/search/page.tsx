"use client";

import React, { type FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icons";
import { searchBubbles, type SearchHit } from "@/lib/api";
import { useToast } from "@/components/Toast";

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.trim().toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(200,16,46,0.18)", padding: "0 2px" }}>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function SearchPage() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) {
      toast("Nhập ít nhất 2 ký tự", "info");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchBubbles(q.trim(), 50);
      setHits(res.hits);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Có lỗi xảy ra.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 80px" }}>
        <header style={{ marginBottom: 20 }}>
          <div className="caps-xs" style={{ color: "var(--accent)" }}>TÌM KIẾM</div>
          <h1 className="display" style={{ fontSize: 28, marginTop: 4 }}>Tìm trong nội dung truyện đã dịch</h1>
        </header>

        <form onSubmit={onSubmit} style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo lời thoại tiếng Việt..."
            style={{
              flex: 1,
              padding: "12px 14px",
              border: "2px solid var(--border)",
              background: "var(--panel)",
              color: "var(--fg)",
              fontSize: 14,
              borderRadius: "var(--radius-sm)",
              outline: "none",
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || q.trim().length < 2} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Icon name="search" size={14} /> {loading ? "..." : "Tìm"}
          </button>
        </form>

        {!searched && (
          <div style={{ color: "var(--muted)", fontSize: 14 }}>
            Nhập từ khoá để tìm trong tất cả lời thoại đã dịch.
          </div>
        )}

        {searched && !loading && hits.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
            Không tìm thấy kết quả nào cho <strong>&ldquo;{q}&rdquo;</strong>.
          </div>
        )}

        {hits.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {hits.map((h) => (
              <li key={h.page_id} className="stroke-ink" style={{ display: "flex", gap: 12, padding: 12, background: "var(--panel)", borderRadius: "var(--radius-sm)" }}>
                {h.thumbnail_url && (
                  <Image src={h.thumbnail_url} alt="" width={80} height={120} unoptimized style={{ flexShrink: 0, objectFit: "cover", borderRadius: 4 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/reader/${h.page_id}`} style={{ fontWeight: 700, color: "var(--accent)" }}>
                    {h.series_title || "Truyện"}{h.chapter_number ? ` · Chương ${h.chapter_number}` : ""}{h.page_number ? ` · Trang ${h.page_number}` : ""}
                  </Link>
                  <div style={{ fontSize: 13, color: "var(--fg-soft)", marginTop: 6, lineHeight: 1.6 }}>
                    <Highlight text={h.snippet} q={q} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </>
  );
}
