"use client";
import React, { useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { Icon } from '@/components/Icons';

export default function QAPage() {
  const [state, setState] = useState("empty"); // empty, loading, active

  return (
    <div className="paper-grain" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar active="qa" />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 0, flex: 1 }}>
        {/* Sessions sidebar */}
        <div style={{ background: "var(--bg-2)", borderRight: "2px solid var(--border)", padding: "20px 16px", minHeight: "100%" }}>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginBottom: 18 }} onClick={() => setState("empty")}>
            <Icon name="plus" size={14}/> Cuộc trò chuyện mới
          </button>
          <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 10 }}>Gần đây</div>
          {[
            { title: "Tại sao Kenshin không giết ai?", series: "月影の剣", active: state !== "empty" },
            { title: "Ý nghĩa của hoa sakura trong ch.3", series: "春の足音" },
            { title: "Quan hệ Kaoru và Yahiko", series: "月影の剣" },
            { title: "Timeline của cuộc chiến", series: "紅の誓い" },
          ].map((s, i) => (
            <div key={i} onClick={() => setState("active")} style={{ padding: "10px 12px", background: s.active ? "var(--panel)" : "transparent", border: s.active ? "2px solid var(--border)" : "2px solid transparent", marginBottom: 6, cursor: "pointer" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-serif)" }}>{s.series}</div>
            </div>
          ))}
        </div>

        {/* Chat main */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 900 }}>
          {/* Header */}
          <div style={{ padding: "16px 32px", borderBottom: "2px solid var(--border)", background: "var(--panel)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="caps-xs" style={{ color: "var(--accent)" }}>RAG Q&A · 月影の剣</div>
              <div className="display" style={{ fontSize: 20, marginTop: 2 }}>{state === "empty" ? "Trò chuyện mới" : "Tại sao Kenshin không giết ai?"}</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              <span>🟢 Grounded in 124 pages</span>
              <button className="btn btn-sm btn-ghost" onClick={() => setState(state === "loading" ? "active" : "loading")}><Icon name="refresh" size={12}/> Toggle Load</button>
            </div>
          </div>

          {/* Messages */}
          <div className="scroll" style={{ flex: 1, padding: "28px 32px", overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
            {state === "empty" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: 40 }}>
                <div style={{ width: 80, height: 80, background: "var(--accent)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid var(--border)", marginBottom: 20, fontFamily: "var(--font-serif)", fontSize: 42, fontWeight: 800 }}>問</div>
                <div className="display" style={{ fontSize: 28 }}>Hãy hỏi bất kỳ điều gì về truyện</div>
                <div style={{ color: "var(--fg-soft)", marginTop: 8, maxWidth: 480 }}>AI sẽ chỉ trả lời dựa trên nội dung đã được index vào vector DB. Không bịa.</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 28, maxWidth: 560 }}>
                  {[
                    "Tóm tắt chương này trong 3 câu",
                    "Kenshin là ai? Tính cách thế nào?",
                    "Vì sao Kaoru tin Kenshin?",
                    "Thuật ngữ 逆刃刀 nghĩa là gì?",
                  ].map(q => (
                    <div key={q} onClick={() => setState("loading")} className="stroke-ink" style={{ background: "var(--panel)", padding: "10px 14px", fontSize: 13, textAlign: "left", cursor: "pointer" }}>{q}</div>
                  ))}
                </div>
              </div>
            )}
            {state !== "empty" && (
              <>
                {/* User msg */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                  <div className="bubble" style={{ maxWidth: 500, background: "var(--accent)", color: "#fff", border: "2.5px solid var(--border)", boxShadow: "3px 3px 0 var(--border)" }}>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>Tại sao Kenshin trong chương 12 từ chối giết đối thủ mặc dù đã có cơ hội?</div>
                  </div>
                </div>

                {/* Assistant msg */}
                {state === "active" && (
                  <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 36, height: 36, background: "var(--ink)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 800, border: "2px solid var(--border)", flexShrink: 0 }}>問</div>
                    <div style={{ flex: 1, maxWidth: 620 }}>
                      <div className="stroke-ink" style={{ background: "#fff", padding: "14px 18px", borderRadius: 2 }}>
                        <div style={{ fontSize: 14, lineHeight: 1.65 }}>
                          Trong chương 12, Kenshin từ chối giết đối thủ vì <strong>lời thề không sát sinh</strong> mà anh đã lập sau kết thúc thời kỳ Bakumatsu. Điều này được thể hiện qua:
                          <ol style={{ paddingLeft: 20, marginTop: 10 }}>
                            <li>Thanh <span className="serif" style={{ fontWeight: 700 }}>逆刃刀 (sakabatou)</span> — lưỡi kiếm quay ngược, vật chứng vật lý cho lời thề</li>
                            <li>Hồi tưởng trong panel 3 về Tomoe (vợ cũ)</li>
                            <li>Đối thoại với Kaoru ở trang 08: &quot;Mình đã giết đủ rồi&quot;</li>
                          </ol>
                        </div>
                      </div>
                      {/* Sources */}
                      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span className="caps-xs" style={{ color: "var(--muted)" }}>Nguồn · 5 chunks:</span>
                        {[
                          { ch: 12, p: 8, score: 0.94 },
                          { ch: 3, p: 22, score: 0.88 },
                          { ch: 12, p: 11, score: 0.82 },
                          { ch: 7, p: 14, score: 0.76 },
                          { ch: 1, p: 4, score: 0.71 },
                        ].map(src => (
                          <div key={`${src.ch}-${src.p}`} className="chip" style={{ fontSize: 10, padding: "3px 8px", cursor: "pointer" }}>
                            <span>Ch.{src.ch} · P.{src.p}</span>
                            <span className="mono" style={{ color: "var(--muted)" }}>{src.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {state === "loading" && (
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ width: 36, height: 36, background: "var(--ink)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 800, border: "2px solid var(--border)" }}>問</div>
                    <div className="stroke-ink" style={{ background: "#fff", padding: "14px 18px", display: "flex", gap: 6, alignItems: "center" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s infinite" }}/>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s infinite 0.2s" }}/>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s infinite 0.4s" }}/>
                      <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8, fontFamily: "var(--font-mono)" }}>Retrieving 5 chunks · synthesizing…</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Composer */}
          <div style={{ padding: "16px 32px", borderTop: "2px solid var(--border)", background: "var(--panel)" }}>
            <div className="stroke-ink-thick" style={{ background: "#fff", padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea placeholder="Hỏi về cốt truyện, nhân vật, thuật ngữ…" rows={1}
                        style={{ flex: 1, border: "none", outline: "none", resize: "none", fontSize: 14, fontFamily: "inherit", background: "transparent", color: "var(--fg)" }}/>
              <button className="btn btn-primary btn-sm" onClick={() => setState("loading")}><Icon name="send" size={14}/> Gửi</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              <span>Scope: 月影の剣 · 124 trang · 1,842 chunks</span>
              <span>Gemini 1.5 Flash · free tier · 158 / 500 RPD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
