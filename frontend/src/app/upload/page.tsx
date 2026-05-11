"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TopBar } from '@/components/TopBar';
import { SectionHeader } from '@/components/SectionHeader';
import { Icon } from '@/components/Icons';
import { MangaPage } from '@/components/MangaPage';
import Link from 'next/link';

type UploadState = "idle" | "dragging" | "processing" | "done" | "error";

interface ProcessingStep {
  step: string;
  done: boolean;
  active: boolean;
  time: string;
}

const PIPELINE_STEPS: ProcessingStep[] = [
  { step: "Bubble Detection (YOLOv8)", done: false, active: false, time: "—" },
  { step: "Text Extraction (Manga-OCR)", done: false, active: false, time: "—" },
  { step: "Context Retrieval (ChromaDB)", done: false, active: false, time: "—" },
  { step: "Translation (Gemini 1.5 Flash)", done: false, active: false, time: "—" },
  { step: "Index to Vector DB", done: false, active: false, time: "—" },
];

const TIMINGS = ["0.8s", "1.4s", "0.6s", "4.2s", "0.4s"];

function useProcessingSimulation(isProcessing: boolean) {
  const [steps, setSteps] = useState<ProcessingStep[]>(PIPELINE_STEPS.map(s => ({ ...s })));
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isProcessing) {
      setSteps(PIPELINE_STEPS.map(s => ({ ...s })));
      setCurrentStep(0);
      return;
    }
    let step = 0;
    const delays = [1000, 1800, 800, 4500, 600];
    let timeout: ReturnType<typeof setTimeout>;

    const advance = () => {
      if (step >= PIPELINE_STEPS.length) return;
      setSteps(prev => prev.map((s, i) => ({
        ...s,
        done: i < step,
        active: i === step,
        time: i < step ? TIMINGS[i] : i === step ? "…" : "—",
      })));
      setCurrentStep(step);
      timeout = setTimeout(() => {
        step++;
        advance();
      }, delays[step] || 800);
    };
    advance();
    return () => clearTimeout(timeout);
  }, [isProcessing]);

  return { steps, currentStep, allDone: steps.every(s => s.done) };
}

export default function UploadPage() {
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState(0);
  const [options, setOptions] = useState({
    glossary: true,
    onyomi: true,
    indexVector: true,
    sfx: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { steps, allDone } = useProcessingSimulation(state === "processing");

  // Handle file selection
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setState("error");
      return;
    }
    // Validate size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      setState("error");
      return;
    }
    setFileName(file.name);
    setFileSize((file.size / (1024 * 1024)).toFixed(1) + " MB");
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setState("processing");
  }, []);

  // Auto-transition to done after all steps
  useEffect(() => {
    if (allDone && state === "processing") {
      const t = setTimeout(() => setState("done"), 600);
      return () => clearTimeout(t);
    }
  }, [allDone, state]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState("idle"); // reset dragging state first
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const series = ["月影の剣", "春の足音", "+ Tạo mới"];

  return (
    <div className="paper-grain" style={{ minHeight: "100vh" }}>
      <TopBar active="upload" />
      <div style={{ padding: "40px 56px" }}>
        <SectionHeader
          kanji="入"
          label="Upload · Tải lên"
          title="Tải trang manga để dịch"
          subtitle="Hỗ trợ JPG, PNG, WEBP. Tối đa 20MB / ảnh. Xử lý qua YOLOv8 (bubble detection) + Manga-OCR (text extraction) + Gemini (dịch)."
          stamp="入稿"
        />

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }}>
          {/* ── Left: Dropzone ── */}
          <div
            className={`stroke-ink-thick ${state === "dragging" ? "panel-shadow-lg" : "panel-shadow"}`}
            style={{
              background: state === "dragging" ? "var(--bg-2)" : "var(--panel)",
              minHeight: 520,
              position: "relative",
              overflow: "hidden",
              transition: "background 0.15s",
            }}
            onDragOver={e => { e.preventDefault(); setState("dragging"); }}
            onDragLeave={e => { e.preventDefault(); if (state === "dragging") setState("idle"); }}
            onDrop={onDrop}
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={e => handleFiles(e.target.files)}
              aria-label="Chọn file ảnh manga"
            />

            {/* ── IDLE STATE ── */}
            {(state === "idle" || state === "dragging") && (
              <div style={{
                padding: 56, textAlign: "center",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                minHeight: 520, position: "relative",
              }}>
                <div className="halftone" style={{ position: "absolute", inset: 20, border: `2px dashed var(--${state === "dragging" ? "accent" : "border"})`, pointerEvents: "none", transition: "border-color 0.15s" }}/>
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: 96, height: 96,
                    background: state === "dragging" ? "var(--accent)" : "var(--bg-2)",
                    color: state === "dragging" ? "var(--paper)" : "var(--fg)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px",
                    border: "3px solid var(--border)",
                    boxShadow: "4px 4px 0 var(--border)",
                    transition: "background 0.15s, color 0.15s",
                  }}>
                    <Icon name="upload" size={42} stroke={2.5}/>
                  </div>
                  <div className="display" style={{ fontSize: 26 }}>
                    {state === "dragging" ? "Thả file vào đây" : "Kéo thả trang manga vào đây"}
                  </div>
                  <div style={{ color: "var(--fg-soft)", marginTop: 8, marginBottom: 24 }}>hoặc</div>
                  <button
                    className="btn btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ padding: "14px 28px", fontSize: 14 }}
                  >
                    <Icon name="folder" size={14}/> Chọn file từ máy
                  </button>
                  <div style={{ marginTop: 20, fontSize: 12, color: "var(--muted)" }}>
                    JPG · PNG · WEBP — tối đa 20MB mỗi file
                  </div>
                </div>
              </div>
            )}

            {/* ── PROCESSING STATE ── */}
            {state === "processing" && (
              <div style={{ padding: 36, minHeight: 520 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div className="caps-sm" style={{ color: "var(--accent)" }}>Đang xử lý · Processing</div>
                    <div className="display" style={{ fontSize: 20, marginTop: 4 }}>{fileName || "page_04_chapter12.jpg"}</div>
                  </div>
                  <div className="chip chip-accent">{fileSize || "3.2 MB"}</div>
                </div>

                {/* Preview side by side */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>Ảnh gốc</div>
                    <div className="stroke-ink" style={{ background: "#fff", overflow: "hidden" }}>
                      {previewUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={previewUrl} alt="Ảnh manga gốc" style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }}/>
                      ) : (
                        <MangaPage w={280} h={280} panels="default" showBubbles={true} showOverlay={false}/>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 6 }}>◯ YOLOv8 · phát hiện bubble</div>
                    <div className="stroke-ink" style={{ background: "#fff", position: "relative" }}>
                      <MangaPage w={280} h={280} panels="default" showBubbles={true} showOverlay={false}/>
                      <svg viewBox="0 0 280 280" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                        <rect x="18" y="18" width="90" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                        <rect x="18" y="135" width="90" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                        <rect x="148" y="135" width="80" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                        {/* confidence labels */}
                        <text x="112" y="16" fontSize="9" fill="var(--beni)" fontFamily="monospace">0.96</text>
                        <text x="112" y="133" fontSize="9" fill="var(--beni)" fontFamily="monospace">0.91</text>
                        <text x="232" y="133" fontSize="9" fill="var(--beni)" fontFamily="monospace">0.88</text>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Pipeline steps */}
                <div style={{ marginTop: 24, borderTop: "2px solid var(--border-soft)", paddingTop: 16 }}>
                  {steps.map((s, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "8px 0",
                      borderBottom: i < steps.length - 1 ? "1px dashed var(--border-soft)" : "none",
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        border: "2px solid var(--border)",
                        background: s.done ? "var(--accent)" : s.active ? "transparent" : "transparent",
                        color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {s.done && <Icon name="check" size={11} stroke={3}/>}
                        {s.active && (
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s ease-in-out infinite" }}/>
                        )}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: s.active ? 700 : 500, color: s.done ? "var(--muted)" : "var(--fg)" }}>
                        {s.step}
                      </span>
                      <span className="mono" style={{ fontSize: 11, color: s.done ? "var(--accent)" : "var(--muted)" }}>{s.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── DONE STATE ── */}
            {state === "done" && (
              <div style={{ padding: 40, minHeight: 520, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <div style={{
                  width: 80, height: 80,
                  background: "var(--jade)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "3px solid var(--border)", marginBottom: 20,
                  boxShadow: "4px 4px 0 var(--border)",
                }}>
                  <Icon name="check" size={40} stroke={3}/>
                </div>
                <div className="display" style={{ fontSize: 28 }}>Xử lý hoàn tất!</div>
                <div style={{ color: "var(--fg-soft)", marginTop: 8 }}>{fileName} · 3 bubbles dịch thành công</div>
                <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                  <Link href="/reader">
                    <button className="btn btn-primary" style={{ padding: "14px 28px" }}>
                      <Icon name="book" size={14}/> Đọc bản dịch
                    </button>
                  </Link>
                  <button className="btn" onClick={() => { setState("idle"); setFileName(null); setFileSize(null); setPreviewUrl(null); }}>
                    <Icon name="upload" size={14}/> Tải file khác
                  </button>
                </div>
              </div>
            )}

            {/* ── ERROR STATE ── */}
            {state === "error" && (
              <div style={{ padding: 56, textAlign: "center", minHeight: 520, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{
                  width: 80, height: 80,
                  background: "var(--accent)", color: "var(--paper)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "3px solid var(--border)", marginBottom: 20,
                  boxShadow: "4px 4px 0 var(--border)",
                }}>
                  <Icon name="alert" size={38}/>
                </div>
                <div className="display" style={{ fontSize: 24, color: "var(--accent)" }}>Không thể xử lý file</div>
                <div style={{ color: "var(--fg-soft)", marginTop: 8, maxWidth: 400 }}>
                  File không hợp lệ (cần JPG/PNG/WEBP, tối đa 20MB) hoặc Manga-OCR không nhận diện được text.
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                  <button className="btn" onClick={() => setState("idle")}>
                    <Icon name="refresh" size={14}/> Thử lại
                  </button>
                  <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                    <Icon name="folder" size={14}/> Chọn file khác
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Settings panel ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Series selector */}
            <div className="stroke-ink" style={{ background: "var(--panel)", padding: 20 }}>
              <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>Gắn vào bộ truyện</div>
              <div style={{ position: "relative" }}>
                <input
                  placeholder="Chọn hoặc tạo bộ truyện mới…"
                  style={{
                    width: "100%", padding: "10px 12px",
                    border: "2px solid var(--border)",
                    background: "var(--bg)", fontSize: 13,
                    fontFamily: "inherit", color: "var(--fg)",
                    boxSizing: "border-box",
                  }}
                  aria-label="Tên bộ truyện"
                />
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {series.map((t, i) => (
                  <div
                    key={t}
                    className={`chip ${selectedSeries === i ? "chip-accent" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedSeries(i)}
                    role="button"
                    tabIndex={0}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Translation options */}
            <div className="stroke-ink" style={{ background: "var(--panel)", padding: 20 }}>
              <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>Tùy chọn dịch</div>
              {(Object.entries(options) as [keyof typeof options, boolean][]).map(([key, val]) => {
                const labels: Record<keyof typeof options, string> = {
                  glossary: "Dùng glossary đã lưu",
                  onyomi: "Giữ âm danh từ riêng (onyomi)",
                  indexVector: "Index vào vector DB",
                  sfx: "Phát hiện SFX / onomatopoeia",
                };
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 0", borderBottom: "1px dashed var(--border-soft)",
                      cursor: "pointer",
                    }}
                    onClick={() => setOptions(o => ({ ...o, [key]: !o[key] }))}
                    role="switch"
                    aria-checked={val}
                    tabIndex={0}
                  >
                    <span style={{ fontSize: 13 }}>{labels[key]}</span>
                    <div style={{
                      width: 36, height: 20,
                      background: val ? "var(--accent)" : "var(--bg-3)",
                      border: "2px solid var(--border)",
                      borderRadius: 999, position: "relative",
                      transition: "background 0.15s",
                    }}>
                      <div style={{
                        position: "absolute", top: 1, left: val ? 17 : 1,
                        width: 14, height: 14,
                        background: "var(--paper)", border: "1.5px solid var(--border)",
                        borderRadius: "50%",
                        transition: "left 0.15s",
                      }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tip box */}
            <div className="stroke-ink" style={{ background: "var(--bg-2)", padding: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Icon name="sparkle" size={16} style={{ flexShrink: 0, marginTop: 1 } as React.CSSProperties}/>
                <div style={{ fontSize: 12, color: "var(--fg-soft)", lineHeight: 1.6 }}>
                  <strong>Mẹo:</strong> Với chương nhiều trang, dùng{" "}
                  <Link href="/batch" style={{ color: "var(--accent)", fontWeight: 700 }}>Batch Upload</Link>{" "}
                  để xử lý tuần tự và tiết kiệm quota Gemini.
                </div>
              </div>
            </div>

            {/* Quota indicator */}
            <div className="stroke-ink" style={{ background: "var(--panel)", padding: 16 }}>
              <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 8 }}>Gemini API Quota</div>
              <div style={{ height: 8, background: "var(--bg-2)", border: "1px solid var(--border)", marginBottom: 6 }}>
                <div style={{ width: "34%", height: "100%", background: "var(--jade)" }}/>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                <span>158 / 500 RPD used</span>
                <span style={{ color: "var(--jade)", fontWeight: 700 }}>OK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
