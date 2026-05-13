"use client";
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Icon } from '@/components/Icons';
import { MangaPage } from '@/components/MangaPage';
import { useToast } from '@/components/Toast';
import { getPage, PageData, BubbleData, APIError } from '@/lib/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedPage, StaggerContainer, StaggerItem } from '@/components/Animations';

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

// ── Overlay bubble renderer using real bbox data ────────────────────────────
function BubbleOverlays({
  bubbles,
  containerW,
  containerH,
  imageW,
  imageH,
  selected,
  onSelect,
  mode,
}: {
  bubbles: BubbleData[];
  containerW: number;
  containerH: number;
  imageW: number;
  imageH: number;
  selected: number | null;
  onSelect: (i: number | null) => void;
  mode: ViewMode;
}) {
  const scaleX = containerW / imageW;
  const scaleY = containerH / imageH;

  return (
    <svg
      viewBox={`0 0 ${containerW} ${containerH}`}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}
    >
      <AnimatePresence mode="popLayout">
        {bubbles.map((b, i) => {
          const [x, y, w, h] = b.bbox;
          const rx = x * scaleX;
          const ry = y * scaleY;
          const rwScaled = w * scaleX;
          const rhScaled = h * scaleY;

          // Detect if bubble spans most of the screen (usually fallback)
          const isGiant = (w * h) >= (imageW * imageH * 0.8);

          if (mode === "overlay") {
            return (
              <motion.g 
                key={`${i}-overlay`} 
                style={{ pointerEvents: "auto", transformOrigin: `${rx + rwScaled/2}px ${ry + rhScaled/2}px` }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 260, 
                  damping: 20,
                  delay: i * 0.05 // Slight sequential cascade
                }}
              >
                {/* Background overlay - make transparent if giant fallback so it doesn't hide image */}
                {!isGiant ? (
                  <rect x={rx} y={ry} width={rwScaled} height={rhScaled} fill="white" stroke="#111" strokeWidth="1.5" rx="4" />
                ) : (
                  <rect x={rx} y={ry} width={rwScaled} height={rhScaled} fill="rgba(255,255,255,0.2)" stroke="rgba(255,0,0,0.5)" strokeWidth="2" strokeDasharray="5 5" rx="4" />
                )}
                
                <foreignObject 
                  x={isGiant ? rx + 20 : rx + 2} 
                  y={isGiant ? ry + 20 : ry + 2} 
                  width={isGiant ? rwScaled - 40 : rwScaled - 4} 
                  height={isGiant ? rhScaled - 40 : rhScaled - 4}
                >
                  <div
                    style={{
                      width: "100%", height: "100%",
                      fontSize: isGiant ? 18 : Math.min(32, Math.max(10, rhScaled * 0.35)),
                      fontFamily: "var(--font-serif)",
                      fontWeight: 600,
                      display: "flex", 
                      alignItems: isGiant ? "flex-start" : "center", 
                      justifyContent: isGiant ? "center" : "center",
                      textAlign: "center",
                      color: isGiant ? "#d00" : "#111",
                      overflow: "hidden",
                      lineHeight: 1.3,
                      padding: isGiant ? "10px" : "2px",
                      textShadow: isGiant ? "0 0 4px #fff, 0 0 4px #fff" : "none",
                    }}
                  >
                    {b.translated_text}
                  </div>
                </foreignObject>
              </motion.g>
            );
          }

          if (mode === "tap") {
            return (
              <motion.rect
                key={`${i}-tap`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                x={rx} y={ry} width={rwScaled} height={rhScaled}
                fill={selected === i ? "rgba(200,16,46,0.12)" : "transparent"}
                stroke={selected === i ? "var(--beni)" : "rgba(200,16,46,0.4)"}
                strokeWidth="2"
                strokeDasharray="4 3"
                style={{ cursor: "pointer", pointerEvents: "auto" }}
                onClick={() => onSelect(selected === i ? null : i)}
                whileHover={{ fill: "rgba(200,16,46,0.05)" }}
              />
            );
          }

          return null;
        })}

        {/* Tap mode: selected bubble tooltip */}
        {mode === "tap" && selected !== null && bubbles[selected] && (() => {
          const b = bubbles[selected];
          const [x, y, , h] = b.bbox;
          const rx = x * scaleX;
          const ry = (y + h) * scaleY + 4;
          return (
            <motion.foreignObject 
              key="tooltip"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              x={rx} y={ry} width={240} height={80}
            >
              <div style={{
                background: "#fffde8",
                border: "2px solid #111",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
                boxShadow: "3px 3px 0 #111",
              }}>
                <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>JA → VI</div>
                <div style={{ fontFamily: "var(--font-serif)", lineHeight: 1.4 }}>{b.translated_text}</div>
              </div>
            </motion.foreignObject>
          );
        })()}
      </AnimatePresence>
    </svg>
  );
}

// ── Actual reader content, needs search params ─────────────────────────────
function ReaderContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const pageIdParam = searchParams.get("page");

  const [mode, setMode] = useState<ViewMode>("overlay");
  const [page, setPage] = useState(2); // 0-indexed local pages
  const [selected, setSelected] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [showContext, setShowContext] = useState(true);
  const mainRef = useRef<HTMLDivElement>(null);

  // Real page data from API
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  
  // Capture actual image dimensions to calculate scaling accurately
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // Load page data if page_id provided
  useEffect(() => {
    if (!pageIdParam) return;
    setIsLoadingPage(true);
    setImgNaturalSize(null); // reset for new page
    getPage(pageIdParam)
      .then(data => {
        setPageData(data);
        toast("Đã tải dữ liệu trang", "success");
      })
      .catch(err => {
        const msg = err instanceof APIError ? err.message : "Không thể tải dữ liệu trang.";
        toast(msg, "error");
      })
      .finally(() => setIsLoadingPage(false));
  }, [pageIdParam, toast]);

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

  useEffect(() => setSelected(null), [page]);

  const pageLayouts: ("default" | "action" | "dialogue")[] = [
    "default", "action", "dialogue", "default", "action", "dialogue", "default", "action"
  ];

  const CANVAS_W = 520;
  // Dynamically compute canvas height from image aspect ratio to avoid letterboxing disconnect
  const computedHeight = imgNaturalSize ? CANVAS_W * (imgNaturalSize.h / imgNaturalSize.w) : 740;
  
  // Sidebar side-by-side fixed width
  const SIDE_W = 360;
  const computedSideH = imgNaturalSize ? SIDE_W * (imgNaturalSize.h / imgNaturalSize.w) : 520;
  const translatedImageUrl = pageData?.translated_image_url || null;
  const mainImageUrl = pageData?.original_image_url
    ? mode === "overlay" && showOverlay && translatedImageUrl
      ? translatedImageUrl
      : pageData.original_image_url
    : null;

  return (
    <AnimatedPage>
    <div style={{ height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar active="reader" compact />

      <div style={{ display: "grid", gridTemplateColumns: `72px 1fr ${showContext ? "320px" : "0px"}`, flex: 1, overflow: "hidden", transition: "grid-template-columns 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>

        {/* ── Thumbnail Rail ── */}
        <StaggerContainer
          className="scroll"
          staggerDelay={0.05}
          style={{ background: "var(--bg-2)", borderRight: "2px solid var(--border)", padding: "14px 8px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}
        >
          <div className="caps-xs" style={{ color: "var(--muted)", textAlign: "center", marginBottom: 4 }}>頁</div>
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <StaggerItem key={i} direction="right" distance={10}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
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
              </motion.button>
            </StaggerItem>
          ))}
        </StaggerContainer>

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
              {pageData ? `Trang đã dịch · ${pageData.page_id.slice(0, 8)}…` : `月影の剣 · Ch. 12 · P.${String(page + 1).padStart(2, "0")}`}
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

          {/* Loading state */}
          {isLoadingPage && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40 }}>
              <div style={{ width: 40, height: 40, border: "3px solid var(--border-soft)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Đang tải dữ liệu trang…</span>
            </div>
          )}

          {/* Page Display */}
          {!isLoadingPage && (
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.15s" }}>
              {mode === "sidebyside" ? (
                <div style={{ display: "flex", gap: 20 }}>
                  <div>
                    <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>原文 · Gốc</div>
                    <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff", width: SIDE_W, height: computedSideH, position: "relative" }}>
                      {pageData?.original_image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img 
                          src={pageData.original_image_url} 
                          alt="Ảnh gốc" 
                          style={{ width: "100%", height: "100%", display: "block" }}
                          onLoad={(e) => {
                            if (!imgNaturalSize) {
                              setImgNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
                            }
                          }}
                        />
                      ) : (
                        <MangaPage w={SIDE_W} h={computedSideH} panels={pageLayouts[page]} showBubbles showOverlay={false}/>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 6 }}>訳 · Dịch tiếng Việt</div>
                    <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff", position: "relative", width: SIDE_W, height: computedSideH }}>
                      {pageData?.original_image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={translatedImageUrl || pageData.original_image_url} alt="Ảnh đã dịch" style={{ width: "100%", height: "100%", display: "block" }}/>
                      ) : (
                        <MangaPage w={SIDE_W} h={computedSideH} panels={pageLayouts[page]} showBubbles showOverlay overlayLang="vn"/>
                      )}
                      {pageData && showOverlay && !translatedImageUrl && imgNaturalSize && (
                        <BubbleOverlays
                          bubbles={pageData.processed_data}
                          containerW={SIDE_W} containerH={computedSideH}
                          imageW={imgNaturalSize.w} imageH={imgNaturalSize.h}
                          selected={selected} onSelect={setSelected} mode="overlay"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "#fff", width: CANVAS_W, height: computedHeight, position: "relative" }}>
                    {mainImageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={mainImageUrl}
                        alt="Manga page"
                        style={{ width: "100%", height: "100%", display: "block" }}
                        onLoad={(e) => {
                          if (!imgNaturalSize) {
                            setImgNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
                          }
                        }}
                      />
                    ) : (
                      <MangaPage w={CANVAS_W} h={computedHeight} panels={pageLayouts[page]} showBubbles showOverlay={mode === "overlay" && showOverlay} overlayLang="vn"/>
                    )}

                    {/* Real bubble overlays */}
                    {pageData && imgNaturalSize && (mode === "tap" || (mode === "overlay" && showOverlay && !translatedImageUrl)) && (
                      <BubbleOverlays
                        bubbles={pageData.processed_data}
                        containerW={CANVAS_W} containerH={computedHeight}
                        imageW={imgNaturalSize.w} imageH={imgNaturalSize.h}
                        selected={selected} onSelect={setSelected} mode={mode}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
        <AnimatePresence>
          {showContext && (
            <motion.div 
              className="scroll" 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ 
                background: "var(--bg-2)", 
                borderLeft: "2px solid var(--border)", 
                padding: 20, 
                overflowY: "auto",
                minWidth: 320
              }}
            >
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
                  <motion.div 
                    whileHover={{ x: 4 }}
                    key={c.jp} 
                    className="stroke-ink" 
                    style={{ background: "var(--panel)", padding: 10, display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}
                  >
                    <div style={{ width: 36, height: 36, background: c.color, color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: 18, border: "2px solid var(--border)", flexShrink: 0 }}>
                      {c.jp.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{c.vn} <span style={{ fontWeight: 400, color: "var(--muted)" }}>· {c.jp}</span></div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.role}</div>
                    </div>
                  </motion.div>
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

              {/* Real bubble data stats */}
              <div className="stroke-ink" style={{ background: "var(--panel)", padding: 12, marginBottom: 16 }}>
                <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>Thống kê trang</div>
                {[
                  ["Bubbles detected", pageData ? String(pageData.processed_data.length) : "—"],
                  ["OCR confidence", pageData ? `${Math.round((pageData.processed_data.reduce((a, b) => a + b.confidence, 0) / Math.max(1, pageData.processed_data.length)) * 100)}%` : "—"],
                  ["Translation", pageData ? "ai_module" : "—"],
                  ["Chunks indexed", pageData ? String(pageData.processed_data.length) : "—"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0" }}>
                    <span style={{ color: "var(--muted)" }}>{k}</span>
                    <span className="mono" style={{ fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Q&A CTA */}
              <Link href={pageIdParam ? `/qa?page=${pageIdParam}` : "/qa"} style={{ textDecoration: "none" }}>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}
                >
                  <Icon name="sparkle" size={14}/> Hỏi AI về trang này
                </motion.button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </AnimatedPage>
  );
}

// Wrap with Suspense for useSearchParams
export default function ReaderPage() {
  return (
    <Suspense fallback={
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "3px solid var(--border-soft)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }}/>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Đang tải reader…</div>
        </div>
      </div>
    }>
      <ReaderContent />
    </Suspense>
  );
}
