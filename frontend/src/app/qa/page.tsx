"use client";

import React, { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";
import {
  askQuestion,
  listSeries,
  type QAResponse,
  type QASource,
  type SeriesListItem,
} from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: QASource[];
  asked_at: number;
};

const SUGGESTIONS = [
  "Truyện này nói về cái gì?",
  "Nhân vật chính tên là gì?",
  "Tóm tắt nội dung chương vừa rồi",
  "Có những bối cảnh nào xuất hiện?",
];

const ALL_SCOPE = "all";

function SourceCard({ source }: { source: QASource }) {
  const pct =
    source.similarity != null ? Math.round(source.similarity * 100) : null;
  return (
    <li
      className="stroke-ink"
      style={{
        background: "var(--panel)",
        padding: "8px 10px",
        marginBottom: 6,
        borderRadius: "var(--radius-sm)",
        listStyle: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span className="caps-xs" style={{ color: "var(--fg-soft)" }}>
          {source.page_number != null ? `Trang ${source.page_number}` : "Trang đã dịch"}
          {pct != null ? ` · khớp ${pct}%` : ""}
        </span>
        <Link
          href={source.reader_url}
          className="btn btn-sm btn-secondary"
          style={{ fontSize: 11, padding: "2px 8px" }}
        >
          Mở trang →
        </Link>
      </div>
      {source.original && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>
          <span style={{ opacity: 0.7 }}>Gốc:</span> {source.original}
        </div>
      )}
      <div style={{ fontSize: 13 }}>
        <span style={{ opacity: 0.7 }}>Dịch:</span> {source.translated}
      </div>
    </li>
  );
}

export default function QAPage() {
  const router = useRouter();
  const { user, isLoading, refreshCredits } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [series, setSeries] = useState<SeriesListItem[]>([]);
  const [scope, setScope] = useState<string>(ALL_SCOPE);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login?next=/qa");
  }, [user, isLoading, router]);

  // Load the user's series to populate the scope picker.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listSeries({ limit: 100 })
      .then((res) => {
        if (!cancelled) setSeries(res.items ?? []);
      })
      .catch(() => {
        /* scope picker just falls back to "Tất cả" — not fatal */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function send(question: string) {
    if (!question.trim() || sending) return;
    setSending(true);
    const userMsg: Message = { role: "user", content: question.trim(), asked_at: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    try {
      const res: QAResponse = await askQuestion({
        question: question.trim(),
        series_id: scope === ALL_SCOPE ? undefined : scope,
      });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.answer,
          sources: res.sources ?? [],
          asked_at: Date.now(),
        },
      ]);
      await refreshCredits();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra.";
      toast(msg, "error");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `_Không lấy được câu trả lời:_ ${msg}`, asked_at: Date.now() },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  if (isLoading || !user) return null;

  const scopeLabel =
    scope === ALL_SCOPE
      ? "tất cả truyện của bạn"
      : series.find((s) => s.series_id === scope)?.title ?? "truyện đã chọn";

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 160px)" }}>
        <header style={{ marginBottom: 20 }}>
          <div className="caps-xs" style={{ color: "var(--accent)" }}>RAG Q&A</div>
          <h1 className="display" style={{ fontSize: 30, marginTop: 4 }}>Hỏi đáp về truyện</h1>
          <p style={{ fontSize: 14, color: "var(--fg-soft)" }}>
            Hỏi bất cứ điều gì về truyện bạn đã dịch — câu trả lời kèm trích dẫn nguồn. Mỗi câu tốn 1 credit.
          </p>
        </header>

        {/* Scope picker */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, fontSize: 13 }}>
          <span className="caps-xs" style={{ color: "var(--fg-soft)" }}>Phạm vi</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            disabled={sending}
            style={{
              flex: 1,
              maxWidth: 360,
              padding: "8px 10px",
              border: "2px solid var(--border)",
              background: "var(--panel)",
              color: "var(--fg)",
              fontSize: 13,
              borderRadius: "var(--radius-sm)",
            }}
          >
            <option value={ALL_SCOPE}>Tất cả truyện của tôi</option>
            {series.map((s) => (
              <option key={s.series_id} value={s.series_id}>{s.title}</option>
            ))}
          </select>
        </label>

        <div
          className="stroke-ink"
          style={{
            flex: 1,
            background: "var(--panel)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minHeight: 420,
            overflowY: "auto",
            marginBottom: 16,
          }}
        >
          {messages.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", color: "var(--muted)" }}>
              <Icon name="search" size={28} />
              <p style={{ marginTop: 10, fontSize: 14 }}>Bắt đầu cuộc trò chuyện — đang hỏi trong {scopeLabel}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: 12 }}
                    disabled={sending}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: m.role === "user" ? "var(--accent)" : "var(--bg-2)",
                color: m.role === "user" ? "#fff" : "var(--fg)",
                padding: "12px 16px",
                borderRadius: 14,
                border: m.role === "user" ? "none" : "1px solid var(--border-soft)",
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
              {m.sources && m.sources.length > 0 && (
                <details open style={{ marginTop: 10, fontSize: 12 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 8 }}>
                    Nguồn trích dẫn ({m.sources.length})
                  </summary>
                  <ul style={{ margin: 0, padding: 0 }}>
                    {m.sources.map((s, j) => (
                      <SourceCard key={s.bubble_id ?? `${s.page_id}-${j}`} source={s} />
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}

          {sending && (
            <div style={{ alignSelf: "flex-start", color: "var(--muted)", fontSize: 13, padding: "8px 12px" }}>
              Đang suy nghĩ...
            </div>
          )}

          <div ref={endRef} />
        </div>

        <form onSubmit={onSubmit} style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi gì đó về truyện..."
            disabled={sending}
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
          <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()}>
            {sending ? "..." : "Gửi"}
          </button>
        </form>

        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
          Credits còn lại: <strong>{user.credits_balance}</strong>
        </div>
      </main>
      <Footer />
    </>
  );
}
