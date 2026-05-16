"use client";

import React, { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";
import { askQuestion, type QAResponse } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  asked_at: number;
};

const SUGGESTIONS = [
  "Truyện này nói về cái gì?",
  "Nhân vật chính tên là gì?",
  "Tóm tắt nội dung chương vừa rồi",
  "Có những bối cảnh nào xuất hiện?",
];

export default function QAPage() {
  const router = useRouter();
  const { user, isLoading, refreshCredits } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login?next=/qa");
  }, [user, isLoading, router]);

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
      const res: QAResponse = await askQuestion({ question: question.trim() });
      const sources = (res.source_chunks ?? []).filter(Boolean);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.answer, sources, asked_at: Date.now() },
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

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 160px)" }}>
        <header style={{ marginBottom: 20 }}>
          <div className="caps-xs" style={{ color: "var(--accent)" }}>RAG Q&A</div>
          <h1 className="display" style={{ fontSize: 30, marginTop: 4 }}>Hỏi đáp về truyện</h1>
          <p style={{ fontSize: 14, color: "var(--fg-soft)" }}>
            Hỏi bất cứ điều gì về truyện bạn đã dịch. Mỗi câu trả lời tốn 1 credit.
          </p>
        </header>

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
              <p style={{ marginTop: 10, fontSize: 14 }}>Bắt đầu cuộc trò chuyện</p>
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
                <details style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>Nguồn ({m.sources.length})</summary>
                  <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                    {m.sources.map((s, j) => (
                      <li key={j} style={{ marginBottom: 4 }}>{s}</li>
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
