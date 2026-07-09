"use client";

/**
 * ListenMode — "Nghe truyện" (audio narration).
 *
 * A VLM (vision LLM) looks at the current page, weaves the translated dialogue
 * into a short Vietnamese storytelling script, then a local/Microsoft TTS voice
 * reads it aloud. Users pick the engine (edge / offline / XTTS) and voice.
 *
 * Self-contained: renders its own trigger button + drawer, so wiring into the
 * reader is a single <ListenMode pageId=… /> mount. Talks to the backend only
 * through src/lib/api.ts.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/Icons";
import {
  APIError,
  listVoices,
  narratePage,
  type NarrationResponse,
  type TTSEngineInfo,
} from "@/lib/api";

interface Props {
  pageId: string | null;
  /** Optional label override for the trigger button. */
  compact?: boolean;
}

export function ListenMode({ pageId, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [engines, setEngines] = useState<TTSEngineInfo[]>([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [engine, setEngine] = useState<string>("");
  const [voice, setVoice] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [narration, setNarration] = useState<NarrationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const availableEngines = engines.filter(e => e.available);
  const currentEngine = engines.find(e => e.engine === engine);

  // Load voices the first time the drawer opens.
  useEffect(() => {
    if (!open || voicesLoaded) return;
    listVoices()
      .then(res => {
        setEngines(res.engines);
        const firstAvail = res.engines.find(e => e.available);
        const pick = res.engines.find(e => e.engine === res.default_engine && e.available) || firstAvail;
        if (pick) {
          setEngine(pick.engine);
          setVoice(pick.voices[0]?.id ?? "");
        }
        setVoicesLoaded(true);
      })
      .catch(err => {
        setError(err instanceof APIError ? err.message : "Không tải được danh sách giọng đọc.");
        setVoicesLoaded(true);
      });
  }, [open, voicesLoaded]);

  // Keep the voice in sync when the engine changes.
  useEffect(() => {
    if (!currentEngine) return;
    if (!currentEngine.voices.some(v => v.id === voice)) {
      setVoice(currentEngine.voices[0]?.id ?? "");
    }
  }, [engine]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = useCallback(async () => {
    if (!pageId) return;
    setGenerating(true);
    setError(null);
    setNarration(null);
    try {
      const result = await narratePage(pageId, { engine: engine || undefined, voice: voice || undefined });
      setNarration(result);
      // Autoplay once the <audio> has the new src.
      requestAnimationFrame(() => {
        audioRef.current?.load();
        audioRef.current?.play().catch(() => {/* autoplay may be blocked; user can press play */});
      });
    } catch (err) {
      setError(err instanceof APIError ? err.message : "Không tạo được lời kể.");
    } finally {
      setGenerating(false);
    }
  }, [pageId, engine, voice]);

  // Reset the rendered narration when the page changes.
  useEffect(() => {
    setNarration(null);
    setError(null);
  }, [pageId]);

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn btn-sm"
        title="Nghe truyện — AI kể chuyện bằng giọng nói"
        aria-label="Nghe truyện"
        data-testid="listen-mode-trigger"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <Icon name="sparkle" size={12} />
        {!compact && "Nghe"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.18 }}
            className="stroke-ink-thick panel-shadow-lg"
            data-testid="listen-mode-panel"
            role="dialog"
            aria-label="Nghe truyện"
            style={{
              position: "fixed",
              right: 16,
              bottom: 16,
              width: "min(380px, calc(100vw - 32px))",
              background: "var(--panel)",
              zIndex: 9000,
              padding: "16px 18px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="sparkle" size={14} />
                <span className="caps-xs" style={{ color: "var(--accent)" }}>Nghe truyện</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                data-testid="listen-mode-close"
                style={{ background: "transparent", border: "1.5px solid var(--border)", padding: "4px 6px", cursor: "pointer", color: "var(--fg)" }}
              >
                <Icon name="close" size={12} />
              </button>
            </div>

            {/* Engine + voice pickers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="caps-xs" style={{ color: "var(--muted)" }}>Engine</span>
                <select
                  value={engine}
                  onChange={e => setEngine(e.target.value)}
                  disabled={!voicesLoaded || generating}
                  data-testid="listen-engine-select"
                  style={selectStyle}
                >
                  {availableEngines.length === 0 && <option value="">(không có)</option>}
                  {availableEngines.map(e => (
                    <option key={e.engine} value={e.engine}>
                      {engineLabel(e.engine)}{e.is_default ? " ★" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="caps-xs" style={{ color: "var(--muted)" }}>Giọng</span>
                <select
                  value={voice}
                  onChange={e => setVoice(e.target.value)}
                  disabled={!currentEngine || generating}
                  data-testid="listen-voice-select"
                  style={selectStyle}
                >
                  {(currentEngine?.voices ?? []).map(v => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!pageId || generating || availableEngines.length === 0}
              className="btn"
              data-testid="listen-generate"
              style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}
            >
              {generating ? (
                <>
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }} style={{ display: "inline-flex" }}>
                    <Icon name="refresh" size={14} />
                  </motion.span>
                  Đang tạo lời kể…
                </>
              ) : (
                <><Icon name="sparkle" size={14} /> Tạo &amp; nghe trang này</>
              )}
            </button>

            {error && (
              <div style={{ padding: "8px 10px", background: "var(--bg-2)", border: "1.5px solid var(--accent)", color: "var(--accent)", fontSize: 12, marginBottom: 10 }} data-testid="listen-error">
                {error}
              </div>
            )}

            {/* Result */}
            {narration && (
              <div data-testid="listen-result">
                {narration.audio_url && (
                  <audio
                    ref={audioRef}
                    controls
                    src={narration.audio_url}
                    data-testid="listen-audio"
                    style={{ width: "100%", marginBottom: 10 }}
                  />
                )}
                <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 4 }}>
                  Lời kể
                  {narration.source === "dialogue_fallback" && (
                    <span title="VLM không phản hồi — đang đọc thẳng lời thoại" style={{ marginLeft: 6, color: "var(--accent)" }}>
                      · đọc thoại
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--fg)", background: "var(--bg-2)", border: "1.5px solid var(--border-soft)", padding: "8px 10px", maxHeight: 160, overflowY: "auto" }}>
                  {narration.script}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const selectStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1.5px solid var(--border)",
  color: "var(--fg)",
  padding: "5px 6px",
  fontSize: 12,
  cursor: "pointer",
};

function engineLabel(engine: string): string {
  switch (engine) {
    case "edge": return "Microsoft";
    case "pyttsx3": return "Offline";
    case "coqui": return "XTTS (GPU)";
    default: return engine;
  }
}
