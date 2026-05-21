"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import type { ForumAttachment } from "@/lib/api";

interface Props {
  attachments: ForumAttachment[];
  /** Compact mode: single-row strip, no autoplay. Used in ThreadCard previews. */
  compact?: boolean;
}

/**
 * Renders an album of images/videos with a Facebook-style grid layout:
 *   1 file  → full width
 *   2 files → side-by-side
 *   3+ files → grid, last cell shows "+N" overlay if more than 4
 * Click any cell opens a fullscreen lightbox (keyboard nav with ← / → / Esc).
 */
export function AttachmentGallery({ attachments, compact = false }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(() => {
    setOpenIndex(i => (i === null ? null : (i + 1) % attachments.length));
  }, [attachments.length]);
  const prev = useCallback(() => {
    setOpenIndex(i => (i === null ? null : (i - 1 + attachments.length) % attachments.length));
  }, [attachments.length]);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openIndex, close, next, prev]);

  if (!attachments || attachments.length === 0) return null;

  const visible = attachments.slice(0, 4);
  const extra = Math.max(0, attachments.length - 4);

  // Pick a grid template based on count to mimic Facebook's layout.
  const gridStyle: React.CSSProperties = (() => {
    if (compact || visible.length === 1) {
      return { display: "grid", gridTemplateColumns: "1fr", gap: 4 };
    }
    if (visible.length === 2) {
      return { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 };
    }
    // 3 or 4 → 2x2 grid
    return { display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 4 };
  })();

  return (
    <>
      <div className="stroke-ink" style={{ ...gridStyle, marginTop: 10, overflow: "hidden" }}>
        {visible.map((a, i) => {
          const isLast = i === visible.length - 1;
          const showOverlay = isLast && extra > 0;
          // For 3 files, span the first across the top row.
          const cellStyle: React.CSSProperties =
            !compact && visible.length === 3 && i === 0
              ? { gridColumn: "1 / span 2" }
              : {};
          return (
            <button
              key={a.url + i}
              type="button"
              onClick={() => setOpenIndex(i)}
              style={{
                position: "relative",
                background: "var(--panel)",
                cursor: "pointer",
                overflow: "hidden",
                // `padding: 0` MUST come before `paddingBottom` — shorthand
                // would otherwise overwrite the aspect-ratio padding and
                // collapse the cell to height 0 (silent rendering failure).
                padding: 0,
                paddingBottom: visible.length === 1 ? "56.25%" : "75%",
                border: "none",
                ...cellStyle,
              }}
              aria-label={a.type === "video" ? "Mở video" : "Mở ảnh"}
            >
              <div style={{ position: "absolute", inset: 0 }}>
                {a.type === "image" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={a.url}
                    alt=""
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <>
                    <video
                      src={a.url}
                      preload="metadata"
                      muted
                      playsInline
                      style={{ width: "100%", height: "100%", objectFit: "cover", background: "#000", display: "block" }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        className="stroke-ink"
                        style={{
                          width: 44, height: 44, borderRadius: "50%",
                          background: "rgba(0,0,0,0.65)", color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18, fontWeight: 700,
                        }}
                      >▶</div>
                    </div>
                  </>
                )}
              </div>
              {showOverlay && (
                <div
                  style={{
                    position: "absolute", inset: 0,
                    background: "rgba(0,0,0,0.55)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, fontWeight: 800,
                  }}
                >+{extra}</div>
              )}
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <button
            type="button"
            onClick={e => { e.stopPropagation(); close(); }}
            aria-label="Đóng"
            style={{
              position: "absolute", top: 16, right: 16,
              width: 36, height: 36,
              background: "var(--ink)", color: "var(--paper)",
              border: "2px solid var(--paper)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon name="close" size={16} />
          </button>
          {attachments.length > 1 && (
            <>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); prev(); }}
                aria-label="Trước"
                style={navBtnStyle("left")}
              >‹</button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); next(); }}
                aria-label="Sau"
                style={navBtnStyle("right")}
              >›</button>
            </>
          )}
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: "min(1100px, 95vw)", maxHeight: "90vh" }}>
            {attachments[openIndex].type === "image" ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={attachments[openIndex].url}
                alt=""
                style={{ maxWidth: "100%", maxHeight: "90vh", display: "block", margin: "0 auto" }}
              />
            ) : (
              <video
                key={attachments[openIndex].url}
                src={attachments[openIndex].url}
                controls
                autoPlay
                playsInline
                style={{ maxWidth: "100%", maxHeight: "90vh", background: "#000", display: "block", margin: "0 auto" }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function navBtnStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    left: side === "left" ? 16 : undefined,
    right: side === "right" ? 16 : undefined,
    width: 44,
    height: 44,
    background: "var(--ink)",
    color: "var(--paper)",
    border: "2px solid var(--paper)",
    cursor: "pointer",
    fontSize: 28,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  };
}
