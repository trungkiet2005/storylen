"use client";

import React, { type FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icons";
import { searchBubbles, searchSemantic, type SearchHit } from "@/lib/api";
import { useToast } from "@/components/Toast";

type SearchMode = "keyword" | "semantic";

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
  const [mode, setMode] = useState<SearchMode>("keyword");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) {
      toast("Nhập ít nhất 2 ký tự", "info");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = mode === "semantic"
        ? await searchSemantic(q.trim(), { limit: 30 })
        : await searchBubbles(q.trim(), 50);
      setHits(res.hits);
      if (mode === "semantic" && res.hits.length === 0) {
        toast(
          "Không có kết quả semantic. Có thể trang chưa được index (chưa có embedding) — thử từ khoá thường.",
          "info",
        );
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Có lỗi xảy ra.", "error");
    } finally {
      setLoading(false);
    }
  }

  const examplesByMode: Record<SearchMode, string[]> = {
    keyword: ["định mệnh", "tiến lên", "chạy trốn"],
    semantic: [
      "cảnh nhân vật khóc trong mưa",
      "trận đánh giữa hai phe",
      "lúc thú nhận tình yêu",
    ],
  };

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 80px" }}>
        <header style={{ marginBottom: 20 }}>
          <div className="caps-xs" style={{ color: "var(--accent)" }}>TÌM KIẾM</div>
          <h1 className="display" style={{ fontSize: 28, marginTop: 4 }}>Tìm trong nội dung truyện đã dịch</h1>
        </header>

        {/* Mode toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <span className="caps-xs" style={{ color: "var(--muted)" }}>Chế độ</span>
          <div style={{ display: "flex", border: "1.5px solid var(--border)", background: "var(--panel)" }}>
            <button
              onClick={() => setMode("keyword")}
              aria-pressed={mode === "keyword"}
              style={{
                padding: "6px 12px", fontSize: 12, fontWeight: 600,
                background: mode === "keyword" ? "var(--accent)" : "transparent",
                color: mode === "keyword" ? "#fff" : "var(--fg)",
                border: "none", borderRight: "1.5px solid var(--border)", cursor: "pointer",
                display: "inline-flex", gap: 5, alignItems: "center",
              }}
            >
              <Icon name="search" size={11} /> Từ khoá
            </button>
            <button
              onClick={() => setMode("semantic")}
              aria-pressed={mode === "semantic"}
              style={{
                padding: "6px 12px", fontSize: 12, fontWeight: 600,
                background: mode === "semantic" ? "var(--accent)" : "transparent",
                color: mode === "semantic" ? "#fff" : "var(--fg)",
                border: "none", cursor: "pointer",
                display: "inline-flex", gap: 5, alignItems: "center",
              }}
            >
              <Icon name="sparkle" size={11} /> Theo nghĩa (semantic)
            </button>
          </div>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>
            {mode === "semantic"
              ? "Tìm cảnh theo ý nghĩa — không cần khớp chữ"
              : "Tìm theo từ khoá xuất hiện trong lời thoại"}
          </span>
        </div>

        <form onSubmit={onSubmit} style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={mode === "semantic" ? "vd: cảnh nhân vật khóc trong mưa" : "Tìm theo lời thoại tiếng Việt..."}
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
            <Icon name={mode === "semantic" ? "sparkle" : "search"} size={14} /> {loading ? "..." : "Tìm"}
          </button>
        </form>

        {/* Example chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Ví dụ:</span>
          {examplesByMode[mode].map(example => (
            <button
              key={example}
              onClick={() => setQ(example)}
              style={{
                fontSize: 11, padding: "3px 8px",
                background: "var(--bg-2)", color: "var(--fg-soft)",
                border: "1.5px solid var(--border-soft)", cursor: "pointer",
              }}
            >
              {example}
            </button>
          ))}
        </div>

        {!searched && (
          <div style={{ color: "var(--muted)", fontSize: 14 }}>
            {mode === "semantic"
              ? "Nhập câu mô tả cảnh / chủ đề. Chỉ áp dụng cho các trang đã được index embedding."
              : "Nhập từ khoá để tìm trong tất cả lời thoại đã dịch."}
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Link href={`/reader?page=${h.page_id}`} style={{ fontWeight: 700, color: "var(--accent)" }}>
                      {h.series_title || "Truyện"}{h.chapter_number ? ` · Chương ${h.chapter_number}` : ""}{h.page_number ? ` · Trang ${h.page_number}` : ""}
                    </Link>
                    {h.similarity != null && (
                      <span
                        className="mono"
                        style={{
                          fontSize: 10, padding: "1px 6px",
                          background: "var(--bg-3)", color: "var(--muted)",
                          border: "1px solid var(--border-soft)",
                        }}
                        title="Độ tương tự ngữ nghĩa"
                      >
                        {(h.similarity * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--fg-soft)", marginTop: 6, lineHeight: 1.6 }}>
                    {mode === "keyword" ? <Highlight text={h.snippet} q={q} /> : h.snippet}
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
