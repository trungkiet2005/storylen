"use client";

/**
 * BubbleDictionaryModal — S2 (Tier S).
 *
 * Pops up when a reader double-clicks (or taps a 📖 icon on) a bubble.
 * Shows: original text, romaji/pinyin, per-token breakdown, alternative
 * VN translations, optional translator note. Powered by Gemini via
 * GET /page/:id/bubbles/:bid/dictionary.
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/Icons";
import {
  APIError,
  getBubbleDictionary,
  type BubbleDictionaryResponse,
} from "@/lib/api";

interface Props {
  open: boolean;
  pageId: string | null;
  bubbleId: string | null;
  originalText: string;
  translatedText: string;
  onClose: () => void;
  /** Optional — when supplied, "Dùng bản này" replaces the current translation. */
  onApplyAlternative?: (text: string) => void;
}

export function BubbleDictionaryModal({
  open,
  pageId,
  bubbleId,
  originalText,
  translatedText,
  onClose,
  onApplyAlternative,
}: Props) {
  const [data, setData] = useState<BubbleDictionaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !pageId || !bubbleId) return;
    setData(null);
    setError(null);
    setLoading(true);
    getBubbleDictionary(pageId, bubbleId)
      .then(setData)
      .catch(err => {
        setError(err instanceof APIError ? err.message : "Không tải được phân tích từ điển.");
      })
      .finally(() => setLoading(false));
  }, [open, pageId, bubbleId]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const langLabel = (lang: string | undefined): string => {
    if (lang === "ja") return "Tiếng Nhật";
    if (lang === "zh") return "Tiếng Trung";
    return "Không xác định";
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
            className="stroke-ink-thick panel-shadow-lg"
            style={{
              background: "var(--panel)",
              maxWidth: 560,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "20px 22px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="translate" size={16} />
                <span className="caps-xs" style={{ color: "var(--accent)" }}>Từ điển bong bóng</span>
              </div>
              <button
                onClick={onClose}
                aria-label="Đóng"
                style={{
                  background: "transparent",
                  border: "1.5px solid var(--border)",
                  padding: "4px 6px",
                  cursor: "pointer",
                  color: "var(--fg)",
                }}
              >
                <Icon name="close" size={12} />
              </button>
            </div>

            {/* Original */}
            <div style={{ marginBottom: 12 }}>
              <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 4 }}>Văn bản gốc</div>
              <div
                className="serif"
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  padding: "8px 10px",
                  background: "var(--bg-2)",
                  border: "1.5px solid var(--border-soft)",
                  wordBreak: "break-word",
                }}
              >
                {originalText || "(không có)"}
              </div>
              {data?.romaji && (
                <div style={{ marginTop: 6, fontSize: 13, color: "var(--fg-soft)", fontStyle: "italic" }}>
                  {data.romaji}
                </div>
              )}
            </div>

            {/* Current translation */}
            <div style={{ marginBottom: 12 }}>
              <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 4 }}>Bản dịch hiện tại</div>
              <div
                style={{
                  fontSize: 14,
                  padding: "8px 10px",
                  background: "var(--bg-2)",
                  border: "1.5px solid var(--border-soft)",
                  color: "var(--fg)",
                }}
              >
                {translatedText || "(chưa có)"}
              </div>
            </div>

            {/* Loading / error */}
            {loading && (
              <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  style={{ display: "inline-flex", marginBottom: 6 }}
                >
                  <Icon name="refresh" size={20} />
                </motion.div>
                <div>Đang phân tích bằng Gemini…</div>
              </div>
            )}

            {error && !loading && (
              <div
                style={{
                  padding: "10px 12px",
                  background: "var(--bg-2)",
                  border: "1.5px solid var(--accent)",
                  color: "var(--accent)",
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            {/* Tokens */}
            {data && data.tokens.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>
                  Phân tích từ ngữ · {langLabel(data.language)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.tokens.map((tok, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(60px, max-content) 1fr",
                        gap: 10,
                        padding: "6px 10px",
                        background: "var(--bg-2)",
                        border: "1px solid var(--border-soft)",
                        alignItems: "baseline",
                      }}
                    >
                      <div>
                        <span className="serif" style={{ fontSize: 16, fontWeight: 600 }}>{tok.surface}</span>
                        {tok.reading && tok.reading !== tok.surface && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: "var(--fg-soft)", fontStyle: "italic" }}>
                            {tok.reading}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg)" }}>
                        {tok.meaning || "—"}
                        {tok.pos && (
                          <span
                            className="mono"
                            style={{
                              marginLeft: 6,
                              padding: "1px 5px",
                              fontSize: 9,
                              color: "var(--muted)",
                              border: "1px solid var(--border-soft)",
                              textTransform: "uppercase",
                            }}
                          >
                            {tok.pos}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternatives */}
            {data && data.alternatives.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>Cách dịch khác</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.alternatives.map((alt, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        background: "var(--bg-2)",
                        border: "1.5px solid var(--border-soft)",
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 13 }}>{alt}</span>
                      {onApplyAlternative && (
                        <button
                          onClick={() => onApplyAlternative(alt)}
                          className="btn btn-sm"
                          title="Dùng bản này thay cho bản hiện tại"
                          style={{ fontSize: 11, padding: "3px 7px" }}
                        >
                          <Icon name="check" size={10} /> Dùng
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            {data?.note && (
              <div
                style={{
                  padding: "10px 12px",
                  background: "var(--bg-3)",
                  border: "1.5px dashed var(--border-soft)",
                  fontSize: 12,
                  color: "var(--fg-soft)",
                  fontStyle: "italic",
                  marginBottom: 8,
                }}
              >
                <Icon name="info" size={11} /> {data.note}
              </div>
            )}

            {/* Footer */}
            {data && (
              <div style={{ marginTop: 8, fontSize: 10, color: "var(--muted)", textAlign: "right" }}>
                {data.cached ? "Đã cache · " : "Gemini · "}miễn phí, không trừ credit
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
