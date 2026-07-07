"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { askQuestionStream, type QASource, type QAChatTurn } from "@/lib/api";
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
 * Reusable, streaming RAG Q&A assistant. Semantic search is scoped to `seriesId`
 * (whole series) or falls back to `pageId`. Answers stream token-by-token, remember
 * the conversation (multi-turn), and carry inline [n] citations. Citations open via
 * `onOpenSource` when provided (host jumps in-place); otherwise they link out.
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
  const idRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const nid = () => (idRef.current += 1);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Cancel any in-flight stream if the panel unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setLoading(true);

    const history: QAChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const userId = nid();
    const assistantId = nid();
    setMessages((m) => [
      ...m,
      { id: userId, role: "user", content: q },
      { id: assistantId, role: "assistant", content: "", sources: [] },
    ]);

    const patch = (fn: (x: Msg) => Msg) =>
      setMessages((m) => m.map((x) => (x.id === assistantId ? fn(x) : x)));

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    await askQuestionStream(
      { question: q, series_id: seriesId, page_id: seriesId ? undefined : pageId, history },
      {
        onSources: (srcs) => patch((x) => ({ ...x, sources: srcs })),
        onToken: (t) => patch((x) => ({ ...x, content: x.content + t })),
        onError: (msg) =>
          patch((x) => ({
            ...x,
            content: x.content ? `${x.content}\n\n${msg}` : msg,
            isError: !x.content,
          })),
      },
      ctrl.signal,
    );
    setLoading(false);
  }

  // Render assistant text with clickable inline [n] citations.
  const renderContent = (m: Msg): React.ReactNode => {
    const srcs = m.sources ?? [];
    if (m.role !== "assistant" || srcs.length === 0 || !m.content.includes("[")) {
      return m.content;
    }
    const out: React.ReactNode[] = [];
    const re = /\[(\d+)\]/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let k = 0;
    while ((match = re.exec(m.content)) !== null) {
      const n = parseInt(match[1], 10);
      const src = srcs[n - 1];
      if (match.index > last) out.push(m.content.slice(last, match.index));
      if (src) {
        out.push(
          <button
            key={`c${k++}`}
            type="button"
            onClick={() => onOpenSource?.(src.page_id, src.bbox)}
            title={src.translated}
            style={{
              display: "inline-flex",
              alignItems: "center",
              margin: "0 1px",
              padding: "0 4px",
              fontSize: 10,
              fontWeight: 800,
              lineHeight: 1.4,
              color: "#fff",
              background: "var(--accent)",
              border: "none",
              borderRadius: 2,
              cursor: onOpenSource ? "pointer" : "default",
              verticalAlign: "middle",
            }}
          >
            {n}
          </button>,
        );
      } else {
        out.push(match[0]);
      }
      last = match.index + match[0].length;
    }
    if (last < m.content.length) out.push(m.content.slice(last));
    return out;
  };

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

  const last = messages[messages.length - 1];
  const thinking = loading && last?.role === "assistant" && !last.content;

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
          <div style={{ fontWeight: 800, fontSize: 15 }}>Trợ lý đọc truyện</div>
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
              Trả lời tìm trong cả bộ, có trích dẫn [số] bấm được.
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

        {messages.map((m) => {
          const srcs = m.sources ?? [];
          const showBubble = m.role === "user" || m.content.length > 0;
          return (
            <div
              key={m.id}
              style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 5 }}
            >
              {showBubble && (
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
                  {renderContent(m)}
                </div>
              )}

              {srcs.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "90%" }}>
                  {srcs.slice(0, 5).map((s, j) => {
                    const inner = (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--fg-soft)", fontSize: 10, marginBottom: 2 }}>
                          <span>
                            [{j + 1}] {s.page_number != null ? `Trang ${s.page_number}` : "Trang đã dịch"}
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
          );
        })}

        {thinking && (
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
          Ctrl+Enter · streaming · RAG cả bộ · 1 credit/câu
        </div>
      </div>
    </div>
  );
}
