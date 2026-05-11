"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TopBar } from '@/components/TopBar';
import { Icon } from '@/components/Icons';

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: { ch: number; p: number; score: number }[];
}

interface Session {
  id: number;
  title: string;
  series: string;
  messages: Message[];
}

const SAMPLE_SESSIONS: Session[] = [
  {
    id: 1,
    title: "Tại sao Kenshin không giết ai?",
    series: "月影の剣",
    messages: [
      { id: 1, role: "user", content: "Tại sao Kenshin trong chương 12 từ chối giết đối thủ mặc dù đã có cơ hội?" },
      {
        id: 2,
        role: "assistant",
        content: "Trong chương 12, Kenshin từ chối giết đối thủ vì **lời thề không sát sinh** mà anh đã lập sau kết thúc thời kỳ Bakumatsu. Điều này được thể hiện qua:\n\n1. Thanh **逆刃刀 (sakabatou)** — lưỡi kiếm quay ngược, vật chứng vật lý cho lời thề\n2. Hồi tưởng trong panel 3 về Tomoe (vợ cũ)\n3. Đối thoại với Kaoru ở trang 08: *\"Mình đã giết đủ rồi\"*",
        sources: [
          { ch: 12, p: 8, score: 0.94 },
          { ch: 3, p: 22, score: 0.88 },
          { ch: 12, p: 11, score: 0.82 },
          { ch: 7, p: 14, score: 0.76 },
          { ch: 1, p: 4, score: 0.71 },
        ],
      },
    ],
  },
  { id: 2, title: "Ý nghĩa của hoa sakura trong ch.3", series: "春の足音", messages: [] },
  { id: 3, title: "Quan hệ Kaoru và Yahiko", series: "月影の剣", messages: [] },
  { id: 4, title: "Timeline của cuộc chiến", series: "紅の誓い", messages: [] },
];

const SUGGESTIONS = [
  "Tóm tắt chương này trong 3 câu",
  "Kenshin là ai? Tính cách thế nào?",
  "Vì sao Kaoru tin Kenshin?",
  "Thuật ngữ 逆刃刀 nghĩa là gì?",
];

function renderMarkdown(text: string) {
  // Simple inline markdown: **bold**, *italic*, numbered lists
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s/, "");
      return (
        <div key={i} style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <span style={{ color: "var(--accent)", fontWeight: 700, minWidth: 16, flexShrink: 0 }}>{line.match(/^\d+/)?.[0]}.</span>
          <span dangerouslySetInnerHTML={{ __html: inlineStyles(content) }}/>
        </div>
      );
    }
    return <p key={i} style={{ margin: i > 0 ? "8px 0 0" : 0 }} dangerouslySetInnerHTML={{ __html: inlineStyles(line) }}/>;
  });
}

function inlineStyles(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export default function QAPage() {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>(SAMPLE_SESSIONS);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages.length, isLoading]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const sendMessage = useCallback(async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || isLoading) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);

    const userMsg: Message = { id: Date.now(), role: "user", content: q };

    if (activeSessionId === null) {
      // Create new session
      const newSession: Session = {
        id: Date.now(),
        title: q.length > 40 ? q.slice(0, 40) + "…" : q,
        series: "月影の剣",
        messages: [userMsg],
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
    } else {
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg] } : s
      ));
    }

    // Simulate response delay
    await new Promise(r => setTimeout(r, 2200));

    const aiMsg: Message = {
      id: Date.now() + 1,
      role: "assistant",
      content: `Dựa trên **${Math.floor(Math.random() * 100 + 20)} trang** đã được index từ bộ truyện này, câu trả lời cho "${q}" là:\n\nHệ thống RAG đã tìm được các đoạn văn bản liên quan nhất và tổng hợp câu trả lời dựa trên nội dung thực tế. Không có thông tin được bịa thêm ngoài dữ liệu đã dịch.`,
      sources: [
        { ch: Math.floor(Math.random() * 12) + 1, p: Math.floor(Math.random() * 30) + 1, score: +(0.8 + Math.random() * 0.18).toFixed(2) },
        { ch: Math.floor(Math.random() * 12) + 1, p: Math.floor(Math.random() * 30) + 1, score: +(0.7 + Math.random() * 0.18).toFixed(2) },
        { ch: Math.floor(Math.random() * 12) + 1, p: Math.floor(Math.random() * 30) + 1, score: +(0.6 + Math.random() * 0.18).toFixed(2) },
      ],
    };

    setSessions(prev => prev.map(s =>
      s.id === (activeSessionId ?? prev[0]?.id) ? { ...s, messages: [...s.messages, aiMsg] } : s
    ));
    setIsLoading(false);
  }, [input, activeSessionId, isLoading]);

  // Keyboard: Ctrl+Enter to send
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="paper-grain" style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar active="qa" compact />

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", flex: 1, overflow: "hidden" }}>

        {/* ── Sessions Sidebar ── */}
        <div className="scroll" style={{ background: "var(--bg-2)", borderRight: "2px solid var(--border)", padding: "16px 14px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginBottom: 16 }}
            onClick={() => setActiveSessionId(null)}
          >
            <Icon name="plus" size={14}/> Cuộc trò chuyện mới
          </button>

          <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 8 }}>Gần đây</div>

          {sessions.map(s => (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveSessionId(s.id)}
              onKeyDown={e => e.key === "Enter" && setActiveSessionId(s.id)}
              style={{
                padding: "10px 12px",
                background: activeSessionId === s.id ? "var(--panel)" : "transparent",
                border: activeSessionId === s.id ? "2px solid var(--border)" : "2px solid transparent",
                marginBottom: 4, cursor: "pointer",
                borderRadius: 2,
                transition: "background 0.1s",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-serif)" }}>{s.series}</div>
            </div>
          ))}
        </div>

        {/* ── Chat Main ── */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: "14px 28px", borderBottom: "2px solid var(--border)", background: "var(--panel)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div>
              <div className="caps-xs" style={{ color: "var(--accent)" }}>RAG Q&amp;A · {activeSession?.series ?? "月影の剣"}</div>
              <div className="display" style={{ fontSize: 18, marginTop: 2 }}>
                {activeSession ? activeSession.title : "Cuộc trò chuyện mới"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3d9a5a" }}/>
                Grounded · 124 pages · 1,842 chunks
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="scroll" style={{ flex: 1, padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Empty state */}
            {(!activeSession || activeSession.messages.length === 0) && !isLoading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", padding: "40px 24px" }}>
                <div style={{
                  width: 80, height: 80,
                  background: "var(--accent)", color: "var(--paper)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "3px solid var(--border)",
                  boxShadow: "4px 4px 0 var(--border)",
                  marginBottom: 20,
                  fontFamily: "var(--font-serif)", fontSize: 44, fontWeight: 800,
                }}>問</div>
                <div className="display" style={{ fontSize: 26 }}>Hãy hỏi bất kỳ điều gì về truyện</div>
                <div style={{ color: "var(--fg-soft)", marginTop: 8, maxWidth: 460, lineHeight: 1.6 }}>
                  AI sẽ chỉ trả lời dựa trên nội dung đã được index vào vector DB. Không bịa thông tin.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 28, maxWidth: 540 }}>
                  {SUGGESTIONS.map(q => (
                    <div
                      key={q}
                      className="stroke-ink"
                      role="button"
                      tabIndex={0}
                      onClick={() => sendMessage(q)}
                      onKeyDown={e => e.key === "Enter" && sendMessage(q)}
                      style={{
                        background: "var(--panel)", padding: "10px 14px",
                        fontSize: 13, textAlign: "left", cursor: "pointer",
                        transition: "background 0.1s",
                        lineHeight: 1.4,
                      }}
                    >
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message list */}
            {activeSession?.messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  gap: 12,
                }}
              >
                {msg.role === "assistant" && (
                  <div style={{
                    width: 36, height: 36, background: "var(--ink)", color: "var(--paper)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 800,
                    border: "2px solid var(--border)", flexShrink: 0,
                  }}>問</div>
                )}
                <div style={{ maxWidth: 620, flex: msg.role === "user" ? undefined : 1 }}>
                  <div
                    className={msg.role === "user" ? "bubble" : "stroke-ink"}
                    style={{
                      background: msg.role === "user" ? "var(--accent)" : "#fff",
                      color: msg.role === "user" ? "#fff" : "var(--fg)",
                      border: msg.role === "user" ? "2.5px solid var(--border)" : "2px solid var(--border)",
                      padding: "12px 16px",
                      borderRadius: msg.role === "user" ? undefined : 2,
                      boxShadow: "3px 3px 0 var(--border)",
                    }}
                  >
                    <div style={{ fontSize: 14, lineHeight: 1.65 }}>{renderMarkdown(msg.content)}</div>
                  </div>

                  {/* Sources */}
                  {msg.sources && (
                    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span className="caps-xs" style={{ color: "var(--muted)" }}>Nguồn · {msg.sources.length} chunks:</span>
                      {msg.sources.map(src => (
                        <div key={`${src.ch}-${src.p}`} className="chip" style={{ fontSize: 10, padding: "3px 8px", cursor: "pointer" }}>
                          <span>Ch.{src.ch} · P.{src.p}</span>
                          <span className="mono" style={{ color: "var(--muted)", marginLeft: 4 }}>{src.score}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 36, height: 36, background: "var(--ink)", color: "var(--paper)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 800,
                  border: "2px solid var(--border)", flexShrink: 0,
                }}>問</div>
                <div className="stroke-ink" style={{ background: "#fff", padding: "14px 18px", display: "flex", gap: 6, alignItems: "center" }}>
                  {[0, 0.2, 0.4].map(delay => (
                    <div key={delay} style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "var(--accent)",
                      animation: `pulse 1.2s ease-in-out ${delay}s infinite`,
                    }}/>
                  ))}
                  <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8, fontFamily: "var(--font-mono)" }}>
                    Đang tìm kiếm chunks · tổng hợp…
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>

          {/* Composer */}
          <div style={{ padding: "14px 28px", borderTop: "2px solid var(--border)", background: "var(--panel)", flexShrink: 0 }}>
            <div className="stroke-ink-thick" style={{ background: "#fff", padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi về cốt truyện, nhân vật, thuật ngữ…"
                rows={1}
                style={{
                  flex: 1, border: "none", outline: "none",
                  resize: "none", fontSize: 14,
                  fontFamily: "inherit", background: "transparent",
                  color: "var(--fg)", lineHeight: 1.5,
                  maxHeight: 160, overflowY: "auto",
                }}
                aria-label="Nhập câu hỏi"
                disabled={isLoading}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                aria-label="Gửi câu hỏi"
                style={{ opacity: (!input.trim() || isLoading) ? 0.5 : 1, flexShrink: 0 }}
              >
                <Icon name="send" size={13}/> Gửi
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              <span>Scope: 月影の剣 · 124 trang · 1,842 chunks</span>
              <span>Ctrl+Enter để gửi · Gemini 1.5 Flash · 158 / 500 RPD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
