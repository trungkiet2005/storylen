"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { askQuestion, type QASource } from "@/lib/api";
import { Icon } from "@/components/Icons";

type Msg = {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: QASource[];
  isError?: boolean;
};

const SUGGESTIONS = [
  "Truyện này kể về gì?",
  "Nhân vật chính là ai?",
  "Tóm tắt tình tiết chính",
];

/**
 * Reusable RAG Q&A panel. Semantic search is scoped to `seriesId` (whole series)
 * or falls back to `pageId`. Citations open via `onOpenSource` when provided
 * (so the host can jump in-place without unmounting this panel); otherwise they
 * link to the standalone reader.
 */
export function QAChatPanel({
  seriesId,
  pageId,
  onClose,
  onOpenSource,
}: {
  seriesId?: string;
  pageId?: string;
  onClose?: () => void;
  onOpenSource?: (pageId: string, bbox?: number[] | null) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setLoading(true);
    setMessages((m) => [...m, { id: Date.now(), role: "user", content: q }]);
    try {
      const res = await askQuestion({
        question: q,
        series_id: seriesId,
        page_id: seriesId ? undefined : pageId,
      });
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: res.answer ?? "Không có câu trả lời.",
          sources: res.sources ?? [],
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi trả lời.";
      setMessages((m) => [
        ...m,
        { id: Date.now() + 2, role: "assistant", content: msg, isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    display: "block",
    background: "var(--panel)",
    border: "1.5px solid var(--border)",
    padding: "6px 8px",
    textAlign: "left",
    cursor: "pointer",
    color: "var(--fg)",
    textDecoration: "none",
    width: "100%",
    font: "inherit",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "min(400px, 92vw)",
        background: "var(--bg-2)",
        borderLeft: "2px solid var(--border)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 16px 10px",
          borderBottom: "2px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div>
          <div className="caps-xs" style={{ color: "var(--accent)" }}>RAG Q&A</div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Hỏi AI về truyện</div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Đóng Hỏi AI" style={{ padding: 4 }}>
          <Icon name="x" size={14} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && !loading && (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", marginTop: 24 }}>
            <p style={{ lineHeight: 1.6 }}>
              Hỏi về cốt truyện, nhân vật, tình tiết…
              <br />
              Câu trả lời tìm trong cả bộ, kèm trích dẫn nguồn.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 14 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: 11 }}
                  onClick={() => void send(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 5 }}
          >
            <div
              style={{
                maxWidth: "90%",
                background: m.role === "user" ? "var(--accent)" : m.isError ? "rgba(200,16,46,0.06)" : "#fff",
                color: m.role === "user" ? "#fff" : "var(--fg)",
                border: "2px solid var(--border)",
                padding: "9px 12px",
                fontSize: 13,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                boxShadow: "2px 2px 0 var(--border)",
              }}
            >
              {m.content}
            </div>

            {m.sources && m.sources.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "90%" }}>
                {m.sources.slice(0, 5).map((s, j) => {
                  const inner = (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--fg-soft)", fontSize: 10, marginBottom: 2 }}>
                        <span>
                          {s.page_number != null ? `Trang ${s.page_number}` : "Trang đã dịch"}
                          {s.similarity != null ? ` · khớp ${Math.round(s.similarity * 100)}%` : ""}
                        </span>
                        <span style={{ color: "var(--accent)", fontWeight: 700 }}>Mở →</span>
                      </div>
                      <div style={{ fontSize: 12 }}>{s.translated}</div>
                    </>
                  );
                  const key = s.bubble_id ?? `${s.page_id}-${j}`;
                  return onOpenSource ? (
                    <button key={key} type="button" style={cardStyle} onClick={() => onOpenSource(s.page_id, s.bbox)}>
                      {inner}
                    </button>
                  ) : (
                    <Link key={key} href={s.reader_url} style={cardStyle}>
                      {inner}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ color: "var(--muted)", fontSize: 12, padding: "4px 2px" }}>Đang suy nghĩ…</div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div style={{ padding: 12, borderTop: "2px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Hỏi về cốt truyện, nhân vật…"
            rows={2}
            disabled={loading}
            style={{
              flex: 1,
              border: "2px solid var(--border)",
              padding: "8px 10px",
              fontSize: 13,
              fontFamily: "inherit",
              resize: "none",
              background: "var(--panel)",
              color: "var(--fg)",
              lineHeight: 1.5,
              outline: "none",
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            aria-label="Gửi câu hỏi"
            style={{ opacity: !input.trim() || loading ? 0.5 : 1, flexShrink: 0 }}
          >
            <Icon name="send" size={14} />
          </button>
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 5, textAlign: "right" }}>
          Ctrl+Enter · RAG semantic (cả bộ) · 1 credit/câu
        </div>
      </div>
    </div>
  );
}
