"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TopBar } from '@/components/TopBar';
import { SectionHeader } from '@/components/SectionHeader';
import { Icon } from '@/components/Icons';
import { MangaPage } from '@/components/MangaPage';
import { useToast } from '@/components/Toast';
import { uploadImages, pollUntilDone, PageStatus, APIError } from '@/lib/api';
import Link from 'next/link';

type UploadState = "idle" | "dragging" | "uploading" | "processing" | "done" | "error";

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

function deriveStepsFromStatus(status: PageStatus): ProcessingStep[] {
  // Map progress percentage to which steps are done/active
  const progress = status.progress ?? 0;
  const stepThresholds = [20, 40, 60, 85, 100]; // each step completes at %

  return PIPELINE_STEPS.map((s, i) => ({
    ...s,
    done: progress >= stepThresholds[i],
    active: progress >= (stepThresholds[i - 1] ?? 0) && progress < stepThresholds[i],
    time: progress >= stepThresholds[i] ? TIMINGS[i] : progress >= (stepThresholds[i - 1] ?? 0) && progress < stepThresholds[i] ? "…" : "—",
  }));
}

export default function UploadPage() {
  const { toast } = useToast();
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState(0);
  const [pageId, setPageId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<ProcessingStep[]>(PIPELINE_STEPS.map(s => ({ ...s })));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [options, setOptions] = useState({
    glossary: true,
    onyomi: true,
    indexVector: true,
    sfx: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("File không hợp lệ — chỉ chấp nhận JPG, PNG, WEBP.");
      setState("error");
      return;
    }
    // Validate size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg("File vượt quá giới hạn 20 MB.");
      setState("error");
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / (1024 * 1024)).toFixed(1) + " MB");
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setProgress(0);
    setSteps(PIPELINE_STEPS.map(s => ({ ...s })));
    setState("uploading");

    try {
      // ── 1. Upload to backend ────────────────────────────────────────────
      const response = await uploadImages([file]);
      const pid = response.page_ids[0];
      setPageId(pid);
      setBatchId(response.batch_id);
      setState("processing");
      toast(`Đã tải lên thành công — đang xử lý…`, "info");

      // ── 2. Poll for completion ──────────────────────────────────────────
      await pollUntilDone(
        pid,
        (status: PageStatus) => {
          setProgress(status.progress);
          setSteps(deriveStepsFromStatus(status));
        },
        2000, // poll every 2s
        90,   // max 3 min
      );

      setState("done");
      toast("Xử lý hoàn tất! Bản dịch đã sẵn sàng.", "success");
    } catch (err) {
      const msg =
        err instanceof APIError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi không xác định.";
      setErrorMsg(msg);
      setState("error");
      toast(msg, "error");
    }
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState("idle");
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const resetUpload = useCallback(() => {
    setState("idle");
    setFileName(null);
    setFileSize(null);
    setPreviewUrl(null);
    setPageId(null);
    setBatchId(null);
    setProgress(0);
    setErrorMsg(null);
    setSteps(PIPELINE_STEPS.map(s => ({ ...s })));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const series = ["月影の剣", "春の足音", "+ Tạo mới"];
  const isUploading = state === "uploading";
  const isProcessing = state === "processing";

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

            {/* ── IDLE / DRAGGING STATE ── */}
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

            {/* ── UPLOADING STATE ── */}
            {isUploading && (
              <div style={{ padding: 56, minHeight: 520, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 20 }}>
                <div style={{
                  width: 80, height: 80,
                  border: "4px solid var(--border-soft)",
                  borderTopColor: "var(--accent)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}/>
                <div className="display" style={{ fontSize: 22 }}>Đang tải lên…</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{fileName}</div>
              </div>
            )}

            {/* ── PROCESSING STATE ── */}
            {isProcessing && (
              <div style={{ padding: 36, minHeight: 520 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div className="caps-sm" style={{ color: "var(--accent)" }}>Đang xử lý · Processing</div>
                    <div className="display" style={{ fontSize: 20, marginTop: 4 }}>{fileName}</div>
                  </div>
                  <div className="chip chip-accent">{fileSize}</div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 8, background: "var(--bg-2)", border: "1px solid var(--border)", marginBottom: 16 }}>
                  <div style={{
                    width: `${progress}%`, height: "100%",
                    background: "var(--accent)",
                    transition: "width 0.4s ease",
                  }}/>
                </div>

                {/* Preview side by side */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>Ảnh gốc</div>
                    <div className="stroke-ink" style={{ background: "#fff", overflow: "hidden" }}>
                      {previewUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={previewUrl} alt="Ảnh manga gốc" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}/>
                      ) : (
                        <MangaPage w={280} h={200} panels="default" showBubbles={true} showOverlay={false}/>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 6 }}>◯ YOLOv8 · phát hiện bubble</div>
                    <div className="stroke-ink" style={{ background: "#fff", position: "relative" }}>
                      <MangaPage w={280} h={200} panels="default" showBubbles={true} showOverlay={false}/>
                      <svg viewBox="0 0 280 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                        <rect x="18" y="18" width="90" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                        <rect x="18" y="135" width="90" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                        <rect x="148" y="135" width="80" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
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
                        background: s.done ? "var(--accent)" : "transparent",
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
                <div style={{ color: "var(--fg-soft)", marginTop: 8 }}>{fileName}</div>
                {pageId && (
                  <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                    page_id: {pageId}
                  </div>
                )}
                <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                  <Link href={pageId ? `/reader?page=${pageId}` : "/reader"}>
                    <button className="btn btn-primary" style={{ padding: "14px 28px" }}>
                      <Icon name="book" size={14}/> Đọc bản dịch
                    </button>
                  </Link>
                  <Link href={pageId ? `/qa?page=${pageId}` : "/qa"}>
                    <button className="btn" style={{ padding: "14px 28px" }}>
                      <Icon name="sparkle" size={14}/> Hỏi AI
                    </button>
                  </Link>
                  <button className="btn" onClick={resetUpload}>
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
                <div className="display" style={{ fontSize: 24, color: "var(--accent)" }}>Không thể xử lý</div>
                <div style={{ color: "var(--fg-soft)", marginTop: 8, maxWidth: 400 }}>
                  {errorMsg || "File không hợp lệ hoặc xảy ra lỗi trong quá trình xử lý."}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                  <button className="btn" onClick={resetUpload}>
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
                <div style={{ flexShrink: 0, marginTop: 1 }}><Icon name="sparkle" size={16}/></div>

                <div style={{ fontSize: 12, color: "var(--fg-soft)", lineHeight: 1.6 }}>
                  <strong>Mẹo:</strong> Với chương nhiều trang, dùng{" "}
                  <Link href="/batch" style={{ color: "var(--accent)", fontWeight: 700 }}>Batch Upload</Link>{" "}
                  để xử lý tuần tự và tiết kiệm quota Gemini.
                </div>
              </div>
            </div>

            {/* API Status indicator */}
            <div className="stroke-ink" style={{ background: "var(--panel)", padding: 16 }}>
              <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 8 }}>Kết nối API</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: state === "error" ? "var(--accent)" : "var(--jade)",
                  boxShadow: `0 0 6px ${state === "error" ? "var(--accent)" : "var(--jade)"}`,
                }}/>
                <span style={{ color: "var(--fg-soft)" }}>
                  {state === "error" ? "Mất kết nối" : "Kết nối ổn định"}
                </span>
              </div>
              {pageId && (
                <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>
                  batch: {batchId?.slice(0, 8)}…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
