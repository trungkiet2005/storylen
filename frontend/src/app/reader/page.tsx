"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopBar } from '@/components/TopBar';
import { Icon } from '@/components/Icons';
import { MangaPage } from '@/components/MangaPage';
import Link from 'next/link';

type ViewMode = "overlay" | "sidebyside" | "tap";

const TOTAL_PAGES = 8;

const CHARACTERS = [
  { jp: "剣心", vn: "Kenshin", role: "Nhân vật chính", color: "var(--accent)" },
  { jp: "薫", vn: "Kaoru", role: "Đồng minh", color: "var(--jade)" },
];

const GLOSSARY = [
  { jp: "運命", vn: "Định mệnh", note: "Dùng trong ngữ cảnh số phận không thể tránh" },
  { jp: "誓い", vn: "Lời thề", note: "Thường gắn với danh dự samurai" },
  { jp: "逆刃刀", vn: "Sakabatou", note: "Kiếm lưỡi ngược — biểu tượng lời thề không sát sinh" },
];

export default function ReaderPage() {
  const [mode, setMode] = useState<ViewMode>("overlay");
  const [page, setPage] = useState(2); // 0-indexed
  const [selected, setSelected] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [showContext, setShowContext] = useState(true);
  const mainRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "ArrowRight": case "l": setPage(p => Math.min(p + 1, TOTAL_PAGES - 1)); break;
        case "ArrowLeft":  case "h": setPage(p => Math.max(p - 1, 0)); break;
        case "o": setShowOverlay(v => !v); break;
        case "+": case "=": setZoom(z => Math.min(z + 0.1, 2.0)); break;
        case "-": setZoom(z => Math.max(z - 0.1, 0.5)); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Reset tap selection on page change
  useEffect(() => setSelected(null), [page]);

  const pageLayouts: ("default" | "action" | "dialogue")[] = [
    "default", "action", "dialogue", "default", "action", "dialogue", "default", "action"
  ];

  return (
    <div style={{ height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar active="reader" compact />

      <div style={{ display: "grid", gridTemplateColumns: `72px 1fr ${showContext ? "300px" : "0px"}`, flex: 1, overflow: "hidden", transition: "grid-template-columns 0.2s" }}>

        {/* ── Thumbnail Rail ── */}
        <div
          className="scroll"
          style={{ background: "var(--bg-2)", borderRight: "2px solid var(--border)", padding: "14px 8px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}
          role="navigation"
          aria-label="Danh sách trang"
        >
          <div className="caps-xs" style={{ color: "var(--muted)", textAlign: "center", marginBottom: 4 }}>頁</div>
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              title={`Trang ${i + 1}`}
              aria-current={i === page ? "page" : undefined}
              style={{
                width: 52, height: 68,
                background: "#fff",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `${i === page ? 3 : 2}px solid ${i === page ? "var(--accent)" : "var(--border)"}`,
                boxShadow: i === page ? "2px 2px 0 var(--accent)" : "none",
                transition: "border-color 0.1s, box-shadow 0.1s",
              }}
            >
              <span className="mono" style={{ fontSize: 11, color: i === page ? "var(--accent)" : "var(--muted)", fontWeight: i === page ? 700 : 400 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
            </button>
          ))}
        </div>

        {/* ── Reader Canvas ── */}
        <div
          ref={mainRef}
          className="scroll"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto", padding: "20px 32px", gap: 16 }}
        >
          {/* Toolbar */}
          <div
            className="stroke-ink"
            style={{ background: "var(--panel)", padding: "8px 14px", display: "flex", gap: 6, alignItems: "center", width: "100%", maxWidth: 840, flexWrap: "wrap" }}
          >
            <span className="caps-xs" style={{ color: "var(--accent)", marginRight: 6 }}>
              月影の剣 · Ch. 12 · P.{String(page + 1).padStart(2, "0")}
            </span>
            <div style={{ flex: 1 }}/>

            {/* View mode tabs */}
            <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 2 }}>
              {([
                { id: "overlay", label: "Overlay", icon: "layers" },
                { id: "sidebyside", label: "Song ngữ", icon: "grid" },
                { id: "tap", label: "Tap", icon: "eye" },
              ] as { id: ViewMode; label: string; icon: string }[]).map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                  style={{
                    padding: "6px 10px",
                    background: mode === m.id ? "var(--accent)" : "transparent",
                    color: mode === m.id ? "#fff" : "var(--fg)",
                    border: "none",
                    borderRight: i < 2 ? "1.5px solid var(--border)" : "none",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <Icon name={m.icon} size={12}/> {m.label}
                </button>
              ))}
            </div>

            {/* Overlay toggle */}
            {mode !== "sidebyside" && (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowOverlay(v => !v)}
                aria-label="Bật/tắt bản dịch overlay"
                title="Toggle overlay (O)"
              >
                <Icon name={showOverlay ? "eye" : "eye-off"} size={14}/>
              </button>
            )}

            {/* Zoom */}
            <button className="btn btn-sm btn-ghost" onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} aria-label="Thu nhỏ" title="Zoom out (-)">
              <Icon name="zoom-out" size={14}/>
            </button>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)", minWidth: 36, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setZoom(z => Math.min(z + 0.1, 2.0))} aria-label="Phóng to" title="Zoom in (+)">
              <Icon name="zoom-in" size={14}/>
            </button>
            <button className="btn btn-sm btn-ghost" aria-label="Bookmark trang này">
              <Icon name="bookmark" size={14}/>
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowContext(v => !v)} aria-label="Bật/tắt panel ngữ cảnh">
              <Icon name="info" size={14}/>
            </button>
          </div>

          {/* Page Display */}
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.15s" }}>
            {mode === "sidebyside" ? (
              <div style={{ display: "flex", gap: 20 }}>
                <div>
                  <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>原文 · Gốc</div>
                  <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff" }}>
                    <MangaPage w={360} h={520} panels={pageLayouts[page]} showBubbles showOverlay={false}/>
                  </div>
                </div>
                <div>
                  <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 6 }}>訳 · Dịch tiếng Việt</div>
                  <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff" }}>
                    <MangaPage w={360} h={520} panels={pageLayouts[page]} showBubbles showOverlay overlayLang="vn"/>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff" }}>
                  <MangaPage w={520} h={740} panels={pageLayouts[page]} showBubbles showOverlay={mode === "overlay" && showOverlay} overlayLang="vn"/>
                </div>

                {/* Tap mode hotspots */}
                {mode === "tap" && (
                  <>
                    {[
                      { top: 22, left: 20, w: 110, h: 38 },
                      { top: 248, left: 20, w: 110, h: 38 },
                      { top: 248, left: 194, w: 100, h: 38 },
                    ].map((spot, i) => (
                      <div
                        key={i}
                        onClick={() => setSelected(selected === i ? null : i)}
                        role="button"
                        aria-label={`Bubble ${i + 1}`}
                        style={{
                          position: "absolute",
                          top: spot.top, left: spot.left,
                          width: spot.w, height: spot.h,
                          border: `2px dashed ${selected === i ? "var(--accent)" : "rgba(200,16,46,0.5)"}`,
                          cursor: "pointer",
                          background: selected === i ? "rgba(200,16,46,0.1)" : "transparent",
                          transition: "background 0.1s, border-color 0.1s",
                        }}
                      />
                    ))}
                    {selected !== null && (
                      <div className="bubble" style={{
                        position: "absolute",
                        top: selected === 0 ? 72 : 298,
                        left: selected === 2 ? 224 : 140,
                        maxWidth: 220, background: "#fffde8", zIndex: 10,
                        animation: "fadeIn 0.15s ease",
                      }}>
                        <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>JA → VI · dịch có ngữ cảnh</div>
                        <div className="serif" style={{ fontSize: 13, lineHeight: 1.45 }}>
                          {["Khoan đã… không lẽ đây là định mệnh?", "Mình… không thể quay lại nữa đâu.", "Đừng chạy trốn!"][selected]}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Page navigation */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
            <button
              className="btn btn-sm"
              onClick={() => setPage(p => Math.max(p - 1, 0))}
              disabled={page === 0}
              aria-label="Trang trước"
              style={{ opacity: page === 0 ? 0.4 : 1 }}
            >
              <Icon name="arrow-left" size={14}/>
            </button>
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              {page + 1} / {TOTAL_PAGES}
            </span>
            <button
              className="btn btn-sm"
              onClick={() => setPage(p => Math.min(p + 1, TOTAL_PAGES - 1))}
              disabled={page === TOTAL_PAGES - 1}
              aria-label="Trang tiếp"
              style={{ opacity: page === TOTAL_PAGES - 1 ? 0.4 : 1 }}
            >
              <Icon name="arrow-right" size={14}/>
            </button>
          </div>

          {/* Keyboard hint */}
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", display: "flex", gap: 16 }}>
            <span>← → : chuyển trang</span>
            <span>O : toggle overlay</span>
            <span>+/- : zoom</span>
          </div>
        </div>

        {/* ── Context Panel ── */}
        {showContext && (
          <div className="scroll" style={{ background: "var(--bg-2)", borderLeft: "2px solid var(--border)", padding: 20, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span className="caps-sm" style={{ color: "var(--accent)" }}>Ngữ cảnh · Context</span>
              <button className="btn btn-sm btn-ghost" style={{ padding: 4 }} onClick={() => setShowContext(false)} aria-label="Đóng panel ngữ cảnh">
                <Icon name="x" size={13}/>
              </button>
            </div>

            {/* Characters */}
            <div style={{ marginBottom: 20 }}>
              <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 8 }}>Nhân vật trên trang</div>
              {CHARACTERS.map(c => (
                <div key={c.jp} className="stroke-ink" style={{ background: "var(--panel)", padding: 10, display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, background: c.color, color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: 18, border: "2px solid var(--border)", flexShrink: 0 }}>
                    {c.jp.charAt(0)}
                  </div>
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
              {GLOSSARY.map(g => (
                <div key={g.jp} style={{ padding: "10px 0", borderBottom: "1px dashed var(--border-soft)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span className="serif" style={{ fontSize: 14, fontWeight: 700 }}>{g.jp}</span>
                    <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{g.vn}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{g.note}</div>
                </div>
              ))}
            </div>

            {/* Chapter info */}
            <div className="stroke-ink" style={{ background: "var(--panel)", padding: 12, marginBottom: 16 }}>
              <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>Thống kê trang</div>
              {[
                ["Bubbles detected", "12"],
                ["OCR confidence", "94.3%"],
                ["Translation", "Gemini Flash"],
                ["Chunks indexed", "3"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0" }}>
                  <span style={{ color: "var(--muted)" }}>{k}</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Q&A CTA */}
            <Link href="/qa" style={{ textDecoration: "none" }}>
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                <Icon name="sparkle" size={14}/> Hỏi AI về trang này
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
