"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TopBar } from '@/components/TopBar';
import { SectionHeader } from '@/components/SectionHeader';
import { Icon } from '@/components/Icons';
import { MangaPage } from '@/components/MangaPage';
import { useToast } from '@/components/Toast';
import {
  uploadImages,
  pollUntilDone,
  PageStatus,
  APIError,
  healthCheck,
  getAIModuleOptions,
  AIModuleCurrentConfig,
  AIModuleOptions,
} from '@/lib/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
const DEFAULT_AI_CONFIG: AIModuleCurrentConfig = {
  translator: "gemini",
  target_lang: "VIN",
  detector: "default",
  ocr: "48px",
  inpainter: "lama_large",
  renderer: "default",
};

type UploadState = "idle" | "dragging" | "uploading" | "processing" | "done" | "error";
type AIModuleConfigKey = keyof AIModuleCurrentConfig;

export default function UploadPage() {
  const { toast } = useToast();
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiOptions, setAiOptions] = useState<AIModuleOptions | null>(null);
  const [aiOptionsError, setAiOptionsError] = useState<string | null>(null);
  const [translationConfig, setTranslationConfig] =
    useState<AIModuleCurrentConfig>(DEFAULT_AI_CONFIG);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null); // null = checking

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Health check on mount (and every 15s)
  useEffect(() => {
    const check = async () => {
      const online = await healthCheck();
      setBackendOnline(online);
    };
    check();
    const id = setInterval(check, 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      try {
        const data = await getAIModuleOptions();
        if (cancelled) return;
        setAiOptions(data);
        setTranslationConfig(data.current);
        setAiOptionsError(null);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof APIError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Không thể tải tùy chọn ai_module.";
        setAiOptionsError(msg);
      }
    };

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

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
    setState("uploading");

    // ── OFFLINE DEMO MODE ──────────────────────────────────────────────────
    if (!backendOnline) {
      toast("ⓘ Backend offline — chạy demo mô phỏng", "info");
      await new Promise(r => setTimeout(r, 800));
      setState("processing");
      const fakePid = "demo-" + Math.random().toString(36).slice(2, 10);
      setPageId(fakePid);
      setBatchId("batch-demo");

      const thresholds = [20, 40, 60, 85, 100];
      for (const pct of thresholds) {
        await new Promise(r => setTimeout(r, 900));
        setProgress(pct);
      }
      setState("done");
      toast("✅ Demo hoàn tất! (backend offline — dữ liệu giả lập)", "success");
      return;
    }

    try {
      // ── 1. Upload to backend ────────────────────────────────────────────
      const response = await uploadImages([file], translationConfig);
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
        },
        2000, // poll every 2s
        90,   // max 3 min
      );

      setState("done");
      toast("Xử lý hoàn tất! Bản dịch đã sẵn sàng.", "success");
    } catch (err) {
      // Mark backend as offline if it's a connection error
      if (err instanceof APIError && err.status === 0) {
        setBackendOnline(false);
      }
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
  }, [toast, backendOnline, translationConfig]);

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const isUploading = state === "uploading";
  const isProcessing = state === "processing";
  const aiOptionFields: Array<{
    key: AIModuleConfigKey;
    label: string;
    values: string[];
  }> = [
    {
      key: "translator",
      label: "Translator",
      values: aiOptions?.translators ?? [translationConfig.translator],
    },
    {
      key: "target_lang",
      label: "Ngôn ngữ đích",
      values: aiOptions?.target_languages ?? [translationConfig.target_lang],
    },
    {
      key: "detector",
      label: "Text detector",
      values: aiOptions?.detectors ?? [translationConfig.detector],
    },
    {
      key: "ocr",
      label: "OCR",
      values: aiOptions?.ocr_models ?? [translationConfig.ocr],
    },
    {
      key: "inpainter",
      label: "Inpainting",
      values: aiOptions?.inpainters ?? [translationConfig.inpainter],
    },
    {
      key: "renderer",
      label: "Renderer",
      values: aiOptions?.renderers ?? [translationConfig.renderer],
    },
  ];

  const updateTranslationConfig = (key: AIModuleConfigKey, value: string) => {
    setTranslationConfig(config => ({ ...config, [key]: value }));
  };

  return (
    <div className="paper-grain" style={{ minHeight: "100vh" }}>
      <TopBar active="upload" />
      <div style={{ padding: "40px 56px" }}>
        <SectionHeader
          kanji="U"
          label="Upload · Tải lên"
          title="Tải trang truyện để dịch"
          subtitle="Hỗ trợ JPG, PNG, WEBP. Tối đa 20MB / ảnh. Xử lý qua ai_module để phát hiện chữ, OCR, dịch và lưu dữ liệu đọc."
          stamp="LIVE"
        />

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }}>
          {/* ── Left: Dropzone ── */}
          <motion.div
            layout
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
              aria-label="Chọn file ảnh truyện"
            />

            <AnimatePresence mode="wait">
              {/* ── IDLE / DRAGGING STATE ── */}
              {(state === "idle" || state === "dragging") && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    padding: 56, textAlign: "center",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    minHeight: 520, position: "relative",
                  }}
                >
                  <div className="halftone" style={{ position: "absolute", inset: 20, border: `2px dashed var(--${state === "dragging" ? "accent" : "border"})`, pointerEvents: "none", transition: "border-color 0.15s" }}/>
                  <div style={{ position: "relative" }}>
                    <motion.div 
                      animate={state === "dragging" ? { scale: 1.1 } : { scale: 1 }}
                      style={{
                        width: 96, height: 96,
                        background: state === "dragging" ? "var(--accent)" : "var(--bg-2)",
                        color: state === "dragging" ? "var(--paper)" : "var(--fg)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 20px",
                        border: "3px solid var(--border)",
                        boxShadow: "4px 4px 0 var(--border)",
                        transition: "background 0.15s, color 0.15s",
                      }}
                    >
                      <Icon name="upload" size={42} stroke={2.5}/>
                    </motion.div>
                    <div className="display" style={{ fontSize: 26 }}>
                      {state === "dragging" ? "Thả file vào đây" : "Kéo thả trang truyện vào đây"}
                    </div>
                    <div style={{ color: "var(--fg-soft)", marginTop: 8, marginBottom: 24 }}>hoặc</div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-primary"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ padding: "14px 28px", fontSize: 14 }}
                    >
                      <Icon name="folder" size={14}/> Chọn file từ máy
                    </motion.button>
                    <div style={{ marginTop: 20, fontSize: 12, color: "var(--muted)" }}>
                      JPG · PNG · WEBP — tối đa 20MB mỗi file
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── UPLOADING STATE ── */}
              {isUploading && (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ padding: 56, minHeight: 520, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 20 }}
                >
                  <div style={{
                    width: 80, height: 80,
                    border: "4px solid var(--border-soft)",
                    borderTopColor: "var(--accent)",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}/>
                  <div className="display" style={{ fontSize: 22 }}>Đang tải lên…</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{fileName}</div>
                </motion.div>
              )}

              {/* ── PROCESSING STATE ── */}
              {isProcessing && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ padding: 36, minHeight: 520 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div className="caps-sm" style={{ color: "var(--accent)" }}>Đang xử lý · Processing</div>
                      <div className="display" style={{ fontSize: 20, marginTop: 4 }}>{fileName}</div>
                    </div>
                    <div className="chip chip-accent">{fileSize}</div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 8, background: "var(--bg-2)", border: "1px solid var(--border)", marginBottom: 16, overflow: "hidden" }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                      style={{
                        height: "100%",
                        background: "var(--accent)",
                      }}
                    />
                  </div>

                  {/* Preview side by side */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>Ảnh gốc</div>
                      <div className="stroke-ink" style={{ background: "#fff", overflow: "hidden" }}>
                        {previewUrl ? (
                          <motion.img initial={{ filter: "blur(4px)" }} animate={{ filter: "blur(0px)" }} src={previewUrl} alt="Ảnh truyện gốc" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}/>
                        ) : (
                          <MangaPage w={280} h={200} panels="default" showBubbles={true} showOverlay={false}/>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 6 }}>◯ ai_module · phát hiện vùng chữ</div>
                      <div className="stroke-ink" style={{ background: "#fff", position: "relative" }}>
                        <MangaPage w={280} h={200} panels="default" showBubbles={true} showOverlay={false}/>
                        <svg viewBox="0 0 280 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                          <motion.rect initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: progress > 20 ? 1 : 0, opacity: progress > 20 ? 1 : 0 }} transition={{ duration: 0.4 }} x="18" y="18" width="90" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                          <motion.rect initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: progress > 20 ? 1 : 0, opacity: progress > 20 ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }} x="18" y="135" width="90" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                          <motion.rect initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: progress > 20 ? 1 : 0, opacity: progress > 20 ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }} x="148" y="135" width="80" height="28" fill="none" stroke="var(--beni)" strokeWidth="2" strokeDasharray="4 3"/>
                          {progress > 20 && (
                            <>
                              <text x="112" y="16" fontSize="9" fill="var(--beni)" fontFamily="monospace">0.96</text>
                              <text x="112" y="133" fontSize="9" fill="var(--beni)" fontFamily="monospace">0.91</text>
                              <text x="232" y="133" fontSize="9" fill="var(--beni)" fontFamily="monospace">0.88</text>
                            </>
                          )}
                        </svg>
                      </div>
                    </div>
                  </div>

                </motion.div>
              )}

              {/* ── DONE STATE ── */}
              {state === "done" && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", bounce: 0.3 }}
                  style={{ padding: 40, minHeight: 520, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}
                >
                  <motion.div 
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    style={{
                      width: 80, height: 80,
                      background: "var(--jade)", color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "3px solid var(--border)", marginBottom: 20,
                      boxShadow: "4px 4px 0 var(--border)",
                    }}
                  >
                    <Icon name="check" size={40} stroke={3}/>
                  </motion.div>
                  <div className="display" style={{ fontSize: 28 }}>Xử lý hoàn tất!</div>
                  <div style={{ color: "var(--fg-soft)", marginTop: 8 }}>{fileName}</div>
                  {pageId && (
                    <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                      page_id: {pageId}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                    <Link href={pageId ? `/reader?page=${pageId}` : "/reader"}>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-primary" style={{ padding: "14px 28px" }}>
                        <Icon name="book" size={14}/> Đọc bản dịch
                      </motion.button>
                    </Link>
                    <Link href={pageId ? `/qa?page=${pageId}` : "/qa"}>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn" style={{ padding: "14px 28px" }}>
                        <Icon name="sparkle" size={14}/> Hỏi AI
                      </motion.button>
                    </Link>
                    <button className="btn btn-ghost" onClick={resetUpload}>
                      <Icon name="upload" size={14}/> Tải thêm
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── ERROR STATE ── */}
              {state === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ padding: 56, textAlign: "center", minHeight: 520, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
                >
                  <motion.div 
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                    style={{
                      width: 80, height: 80,
                      background: "var(--accent)", color: "var(--paper)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "3px solid var(--border)", marginBottom: 20,
                      boxShadow: "4px 4px 0 var(--border)",
                    }}
                  >
                    <Icon name="alert" size={38}/>
                  </motion.div>
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
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Right: Settings panel ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Translation options */}
            <div className="stroke-ink" style={{ background: "var(--panel)", padding: 20 }}>
              <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>Tùy chọn dịch</div>
              <div style={{ display: "grid", gap: 12 }}>
                {aiOptionFields.map(field => (
                  <label key={field.key} style={{ display: "grid", gap: 6 }}>
                    <span className="caps-xs" style={{ color: "var(--muted)" }}>{field.label}</span>
                    <select
                      value={translationConfig[field.key]}
                      onChange={event => updateTranslationConfig(field.key, event.target.value)}
                      disabled={!aiOptions}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "2px solid var(--border)",
                        background: "var(--bg)",
                        color: "var(--fg)",
                        fontFamily: "inherit",
                        fontSize: 13,
                        boxSizing: "border-box",
                      }}
                    >
                      {field.values.map(value => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {aiOptionsError && (
                <div style={{ marginTop: 12, fontSize: 12, color: "var(--accent)", lineHeight: 1.5 }}>
                  {aiOptionsError}
                </div>
              )}
            </div>

            {/* Tip box */}
            <div className="stroke-ink" style={{ background: "var(--bg-2)", padding: 16 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, marginTop: 1 }}><Icon name="sparkle" size={16}/></div>

                <div style={{ fontSize: 12, color: "var(--fg-soft)", lineHeight: 1.6 }}>
                  <strong>Mẹo:</strong> Với chương nhiều trang, dùng{" "}
                  <Link href="/batch" style={{ color: "var(--accent)", fontWeight: 700 }}>Batch Upload</Link>{" "}
                  để xử lý tuần tự với cùng cấu hình ai_module.
                </div>
              </div>
            </div>

            {/* API Status indicator */}
            <div className="stroke-ink" style={{ background: "var(--panel)", padding: 16 }}>
              <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 8 }}>Kết nối API</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background:
                    backendOnline === null ? "var(--muted)" :
                    backendOnline ? "var(--jade)" : "var(--accent)",
                  boxShadow:
                    backendOnline === null ? "none" :
                    backendOnline ? "0 0 6px var(--jade)" : "0 0 6px var(--accent)",
                  transition: "background 0.3s, box-shadow 0.3s",
                }}/>
                <span style={{ color: "var(--fg-soft)" }}>
                  {backendOnline === null
                    ? "Đang kiểm tra…"
                    : backendOnline
                    ? "Kết nối ổn định"
                    : "Backend offline (demo mode)"}
                </span>
              </div>
              {!backendOnline && backendOnline !== null && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
                  Mô phỏng pipeline — upload thật khi backend khởi động.
                </div>
              )}
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
