"use client";
import React, { useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { Icon } from '@/components/Icons';
import { MangaPage } from '@/components/MangaPage';
import Link from 'next/link';

export default function ReaderPage() {
  const [mode, setMode] = useState("overlay");
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <TopBar active="reader" />
      <div style={{ display: "grid", gridTemplateColumns: "72px 1fr 320px", gap: 0, flex: 1 }}>
        {/* Thumb rail */}
        <div style={{ background: "var(--bg-2)", borderRight: "2px solid var(--border)", padding: "16px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="caps-xs" style={{ color: "var(--muted)", textAlign: "center", marginBottom: 4 }}>頁</div>
          {Array.from({length: 8}).map((_, i) => (
            <div key={i} className="stroke-ink" style={{ width: 52, height: 70, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderWidth: i === 2 ? 3 : 2, borderColor: i === 2 ? "var(--accent)" : "var(--border)" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{String(i+1).padStart(2,"0")}</span>
            </div>
          ))}
        </div>

        {/* Reader canvas */}
        <div style={{ padding: "20px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {/* Toolbar */}
          <div className="stroke-ink" style={{ background: "var(--panel)", padding: "8px 14px", display: "flex", gap: 6, alignItems: "center", width: "100%", maxWidth: 800 }}>
            <span className="caps-xs" style={{ color: "var(--accent)", marginRight: 10 }}>月影の剣 · Ch. 12 · P. 03</span>
            <div style={{ flex: 1 }}/>
            <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 2 }}>
              {[
                { id: "overlay", label: "Overlay", icon: "layers" },
                { id: "sidebyside", label: "Song ngữ", icon: "grid" },
                { id: "tap", label: "Tap", icon: "plus" },
              ].map((m, i) => (
                <button key={m.id} onClick={() => setMode(m.id)}
                        style={{ padding: "6px 10px", background: mode === m.id ? "var(--accent)" : "transparent", color: mode === m.id ? "#fff" : "var(--fg)", border: "none", borderRight: i < 2 ? "1.5px solid var(--border)" : "none", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name={m.icon} size={12}/> {m.label}
                </button>
              ))}
            </div>
            <button className="btn btn-sm btn-ghost"><Icon name="zoom-out" size={14}/></button>
            <button className="btn btn-sm btn-ghost"><Icon name="zoom-in" size={14}/></button>
            <button className="btn btn-sm btn-ghost"><Icon name="bookmark" size={14}/></button>
          </div>

          {/* Pages */}
          {mode === "sidebyside" ? (
            <div style={{ display: "flex", gap: 20, maxWidth: 900 }}>
              <div>
                <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>原文 · Gốc</div>
                <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff" }}>
                  <MangaPage w={360} h={520} panels="default" showBubbles={true} showOverlay={false}/>
                </div>
              </div>
              <div>
                <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 6 }}>訳 · Dịch tiếng Việt</div>
                <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff" }}>
                  <MangaPage w={360} h={520} panels="default" showBubbles={true} showOverlay={true} overlayLang="vn"/>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff" }}>
                <MangaPage w={500} h={700} panels="default" showBubbles={true}
                           showOverlay={mode === "overlay"} overlayLang="vn"/>
              </div>
              {/* In tap mode, show hotspots */}
              {mode === "tap" && (
                <>
                  <div onClick={() => setSelected(0)} style={{ position: "absolute", top: 22, left: 20, width: 100, height: 36, border: "2px dashed var(--accent)", cursor: "pointer", background: "rgba(200,16,46,0.08)" }}/>
                  <div onClick={() => setSelected(1)} style={{ position: "absolute", top: 240, left: 20, width: 100, height: 36, border: "2px dashed var(--accent)", cursor: "pointer", background: "rgba(200,16,46,0.08)" }}/>
                  {selected !== null && (
                    <div className="bubble" style={{ position: "absolute", top: selected === 0 ? 70 : 290, left: 130, maxWidth: 220, background: "#fffde8", zIndex: 10 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>JA → VI · dịch có ngữ cảnh</div>
                      <div className="serif" style={{ fontSize: 14 }}>
                        {selected === 0 ? "Khoan đã… không lẽ đây là định mệnh?" : "Mình… không thể quay lại nữa đâu."}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: glossary + context panel */}
        <div style={{ background: "var(--bg-2)", borderLeft: "2px solid var(--border)", padding: 20, overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span className="caps-sm" style={{ color: "var(--accent)" }}>Ngữ cảnh · Context</span>
            <button className="btn btn-sm btn-ghost" style={{ padding: 4 }}><Icon name="x" size={12}/></button>
          </div>

          {/* Characters */}
          <div style={{ marginBottom: 20 }}>
            <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 8 }}>Nhân vật trên trang</div>
            {[
              { jp: "剣心", vn: "Kenshin", role: "Nhân vật chính", color: "var(--accent)" },
              { jp: "薫", vn: "Kaoru", role: "Đồng minh", color: "var(--jade)" },
            ].map(c => (
              <div key={c.jp} className="stroke-ink" style={{ background: "var(--panel)", padding: 10, display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, background: c.color, color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: 18, border: "2px solid var(--border)" }}>{c.jp.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.vn} <span style={{ fontWeight: 400, color: "var(--muted)" }}>· {c.jp}</span></div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.role}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Glossary */}
          <div style={{ marginBottom: 20 }}>
            <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 8 }}>Thuật ngữ</div>
            {[
              { jp: "運命", vn: "Định mệnh", note: "Dùng trong ngữ cảnh số phận không thể tránh" },
              { jp: "誓い", vn: "Lời thề", note: "Thường gắn với danh dự samurai" },
            ].map(g => (
              <div key={g.jp} style={{ padding: "10px 0", borderBottom: "1px dashed var(--border-soft)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="serif" style={{ fontSize: 14, fontWeight: 700 }}>{g.jp}</span>
                  <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{g.vn}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{g.note}</div>
              </div>
            ))}
          </div>

          {/* Quick Q&A chip */}
          <Link href="/qa" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              <Icon name="sparkle" size={14}/> Hỏi AI về trang này
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
