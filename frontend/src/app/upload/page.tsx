"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TopBar } from '@/components/TopBar';
import { SectionHeader } from '@/components/SectionHeader';
import { Icon } from '@/components/Icons';
import { useToast } from '@/components/Toast';
import {
  uploadImages,
  getBatchStatus,
  PageStatus,
  APIError,
  healthCheck,
  getAIModuleOptions,
  AIModuleCurrentConfig,
  AIModuleOptions,
  BatchStatus,
} from '@/lib/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from '@/components/Animations';

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

interface FileItem {
  id: string;
  file: File;
  name: string;
  size: string;
  previewUrl: string;
  pageId?: string;
  progress: number;
  status: PageStatus["status"] | "queued" | "uploading";
  error?: string | null;
}

interface LogMessage {
  id: string;
  time: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
}

export default function UploadPage() {
  const { toast } = useToast();
  const [state, setState] = useState<UploadState>("idle");
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [aiOptions, setAiOptions] = useState<AIModuleOptions | null>(null);
  const [aiOptionsError, setAiOptionsError] = useState<string | null>(null);
  const [translationConfig, setTranslationConfig] = useState<AIModuleCurrentConfig>(DEFAULT_AI_CONFIG);
  
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null); // null = checking
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      selectedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    };
  }, []); // Run once on unmount if needed, but file-specific cleanup is better

  const addLog = useCallback((text: string, type: LogMessage["type"] = 'info') => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { id: Math.random().toString(36).slice(2), time, text, type }]);
  }, []);

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
        const msg = err instanceof APIError ? err.message : err instanceof Error ? err.message : "Không thể tải tùy chọn ai_module.";
        setAiOptionsError(msg);
      }
    };
    loadOptions();
    return () => { cancelled = true; };
  }, []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    const newItems: FileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!validTypes.includes(file.type)) {
        toast(`Bỏ qua "${file.name}": Chỉ chấp nhận JPG, PNG, WEBP.`, "error");
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast(`Bỏ qua "${file.name}": Vượt quá kích thước 20 MB.`, "error");
        continue;
      }

      newItems.push({
        id: Math.random().toString(36).slice(2, 11),
        file,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + " MB",
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: "queued"
      });
    }

    if (newItems.length > 0) {
      setSelectedFiles(prev => [...prev, ...newItems]);
      setState("idle");
      toast(`Đã thêm ${newItems.length} trang vào hàng chờ.`, "success");
    }
  }, [toast]);

  const removeFile = useCallback((id: string) => {
    setSelectedFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState("idle");
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const startProcessing = async () => {
    if (selectedFiles.length === 0) return;

    setState("uploading");
    setLogs([]);
    addLog(`Khởi tạo phiên batch với ${selectedFiles.length} files...`, 'system');

    // ── OFFLINE DEMO SIMULATION ─────────────────────────────────────────────
    if (!backendOnline) {
      toast("ⓘ Backend offline — chạy demo mô phỏng", "info");
      addLog("Đang kết nối kênh xử lý (chế độ DEMO)...", 'info');
      
      // Simulate upload
      await new Promise(r => setTimeout(r, 1200));
      setState("processing");
      addLog("Đã tải lên các tệp thành công. Bắt đầu chuỗi AI...", 'success');
      
      // Mark all as pending
      setSelectedFiles(prev => prev.map(f => ({ ...f, status: 'pending' })));

      // Simulate sequential processing
      for (let i = 0; i < selectedFiles.length; i++) {
        const fileId = selectedFiles[i].id;
        const fileName = selectedFiles[i].name;

        addLog(`[${i+1}/${selectedFiles.length}] ● Đang quét chữ: ${fileName}`, 'info');
        
        // Progress tracking
        setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'ocr_running', progress: 20 } : f));
        await new Promise(r => setTimeout(r, 800));
        
        setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'translating', progress: 60 } : f));
        addLog(`[${i+1}/${selectedFiles.length}] → Đang dịch ngữ cảnh: ${fileName}`, 'info');
        await new Promise(r => setTimeout(r, 900));

        // 5% chance to fail for realism in large batches
        const isError = Math.random() < 0.05;
        if (isError) {
          setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'failed', progress: 60, error: "AI module exhausted" } : f));
          addLog(`[${i+1}/${selectedFiles.length}] ✕ Thất bại: ${fileName} - Lỗi định dạng AI`, 'error');
        } else {
          setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'completed', progress: 100 } : f));
          addLog(`[${i+1}/${selectedFiles.length}] ✓ Hoàn thành: ${fileName}`, 'success');
        }
        await new Promise(r => setTimeout(r, 300));
      }

      setState("done");
      addLog("=== TẤT CẢ TÁC VỤ ĐÃ HOÀN TẤT ===", 'system');
      toast("✅ Demo Batch hoàn tất! (Dữ liệu giả lập)", "success");
      return;
    }

    // ── REAL BACKEND FLOW ───────────────────────────────────────────────────
    try {
      addLog("Đang tải các tệp lên bộ lưu trữ...", 'info');
      const rawFiles = selectedFiles.map(f => f.file);
      
      const response = await uploadImages(rawFiles, translationConfig);
      const batchId = response.batch_id;
      const pageIds = response.page_ids;
      setBatchId(batchId);
      
      addLog(`Tải lên thành công. Batch ID: ${batchId.slice(0, 8)}...`, 'success');
      addLog("Bắt đầu chạy hàng đợi xử lý trên đám mây...", 'info');

      // Map pageIds back to selectedFiles
      setSelectedFiles(prev => prev.map((file, idx) => ({
        ...file,
        pageId: pageIds[idx],
        status: "pending",
      })));

      setState("processing");

      // Start polling the batch
      let attempts = 0;
      const maxAttempts = 150; // ~5 minutes
      
      const poll = setInterval(async () => {
        try {
          const batchStatus: BatchStatus = await getBatchStatus(batchId);
          
          // Update file statuses based on current data
          let terminalCount = 0;
          
          setSelectedFiles(prev => {
            return prev.map(file => {
              const remote = batchStatus.pages.find(p => p.page_id === file.pageId);
              if (!remote) return file;
              
              const isTerminal = ["completed", "failed", "ocr_failed"].includes(remote.status);
              if (isTerminal) terminalCount++;

              // Logging if transition to completed
              if (file.status !== remote.status) {
                if (remote.status === "completed") {
                  addLog(`✓ Xử lý xong: ${file.name}`, 'success');
                } else if (remote.status === "failed" || remote.status === "ocr_failed") {
                  addLog(`✕ Lỗi: ${file.name} - ${remote.error || 'Lỗi pipeline'}`, 'error');
                } else if (remote.status === "ocr_running") {
                  addLog(`● Phát hiện vùng chữ: ${file.name}`, 'info');
                } else if (remote.status === "translating") {
                  addLog(`→ Đang dịch thuật AI: ${file.name}`, 'info');
                }
              }

              return {
                ...file,
                status: remote.status,
                progress: remote.progress,
                error: remote.error,
              };
            });
          });

          attempts++;
          
          const allDone = terminalCount === selectedFiles.length;
          if (allDone || attempts >= maxAttempts) {
            clearInterval(poll);
            setState("done");
            addLog("=== HOÀN THÀNH TẤT CẢ TRANG TRUYỆN ===", 'system');
            toast("Tất cả trang đã được xử lý xong!", "success");
          }
        } catch (e) {
          console.error("Batch status poll error", e);
        }
      }, 2500);

    } catch (err) {
      if (err instanceof APIError && err.status === 0) {
        setBackendOnline(false);
      }
      const msg = err instanceof APIError ? err.message : err instanceof Error ? err.message : "Đã xảy ra lỗi kết nối.";
      setErrorMsg(msg);
      setState("error");
      addLog(`LỖI HỆ THỐNG: ${msg}`, 'error');
      toast(msg, "error");
    }
  };

  const resetUpload = useCallback(() => {
    selectedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setState("idle");
    setSelectedFiles([]);
    setBatchId(null);
    setLogs([]);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [selectedFiles]);

  const aiOptionFields: Array<{
    key: AIModuleConfigKey;
    label: string;
    values: string[];
  }> = [
    {
      key: "translator",
      label: "Bộ dịch (Translator)",
      values: aiOptions?.translators ?? [translationConfig.translator],
    },
    {
      key: "target_lang",
      label: "Ngôn ngữ đích",
      values: aiOptions?.target_languages ?? [translationConfig.target_lang],
    },
    {
      key: "detector",
      label: "Nhận diện chữ (Detector)",
      values: aiOptions?.detectors ?? [translationConfig.detector],
    },
    {
      key: "ocr",
      label: "Bóc tách OCR",
      values: aiOptions?.ocr_models ?? [translationConfig.ocr],
    },
    {
      key: "inpainter",
      label: "Xóa chữ nền (Inpainting)",
      values: aiOptions?.inpainters ?? [translationConfig.inpainter],
    },
    {
      key: "renderer",
      label: "Dựng ảnh (Renderer)",
      values: aiOptions?.renderers ?? [translationConfig.renderer],
    },
  ];

  const updateTranslationConfig = (key: AIModuleConfigKey, value: string) => {
    setTranslationConfig(config => ({ ...config, [key]: value }));
  };

  const completedCount = selectedFiles.filter(f => f.status === "completed").length;
  const failedCount = selectedFiles.filter(f => ["failed", "ocr_failed", "error"].includes(f.status)).length;
  const totalFiles = selectedFiles.length;
  const overallProgress = totalFiles === 0 ? 0 : Math.round((selectedFiles.reduce((acc, f) => acc + f.progress, 0)) / totalFiles);

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="upload" />
        <div style={{ padding: "40px 56px" }}>
          <FadeIn direction="up" distance={20} delay={0.1}>
            <SectionHeader
              kanji="B"
              label="Upload & Batch · Xử lý hàng loạt"
              title="Tải trang truyện & Dịch thuật AI"
              subtitle="Hỗ trợ nhiều ảnh cùng lúc. Tối đa 20MB / ảnh. Pipeline tích hợp bóc tách OCR và phủ văn bản dịch tự động."
              stamp="BATCH"
            />
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: state === "idle" || state === "dragging" ? "1.3fr 1fr" : "1.8fr 1fr", gap: 24, transition: "grid-template-columns 0.3s ease" }}>
            
            {/* ── Left Area ── */}
            <FadeIn direction="up" distance={15} delay={0.2} style={{ display: "flex", flexDirection: "column" }}>
              <motion.div
                layout
                className={`stroke-ink-thick ${state === "dragging" ? "panel-shadow-lg" : "panel-shadow"}`}
                style={{
                  background: state === "dragging" ? "var(--bg-2)" : "var(--panel)",
                  minHeight: 540,
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
                onDragOver={e => { e.preventDefault(); setState("dragging"); }}
                onDragLeave={e => { e.preventDefault(); if (state === "dragging") setState("idle"); }}
                onDrop={onDrop}
              >
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={e => handleFiles(e.target.files)}
                />

                <AnimatePresence mode="wait">
                  {/* ── IDLE / QUEUE STATE ── */}
                  {(state === "idle" || state === "dragging") && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24 }}
                    >
                      {selectedFiles.length === 0 ? (
                        // Normal Empty Dropzone
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32, position: "relative" }}>
                          <div className="halftone" style={{ position: "absolute", inset: 0, border: `2px dashed var(--${state === "dragging" ? "accent" : "border"})`, pointerEvents: "none" }}/>
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
                              cursor: "pointer",
                            }}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Icon name="upload" size={42} stroke={2.5}/>
                          </motion.div>
                          <div className="display" style={{ fontSize: 26 }}>Kéo thả trang truyện vào đây</div>
                          <div style={{ color: "var(--fg-soft)", marginTop: 8, marginBottom: 24 }}>Hỗ trợ chọn nhiều file cùng lúc</div>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="btn btn-primary"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ padding: "14px 28px" }}
                          >
                            <Icon name="folder" size={14}/> Chọn tệp tin
                          </motion.button>
                        </div>
                      ) : (
                        // Queue Table & Start Action
                        <div style={{ display: "flex", flexDirection: "column", height: "100%", flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <div>
                              <div className="display" style={{ fontSize: 22 }}>Hàng chờ xử lý</div>
                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Đã xếp {selectedFiles.length} tệp vào hàng đợi</div>
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                              <motion.button whileHover={{ scale: 1.02 }} className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
                                <Icon name="plus" size={12}/> Thêm ảnh
                              </motion.button>
                              <motion.button whileHover={{ scale: 1.02 }} className="btn btn-sm btn-ghost" style={{ color: "var(--accent)" }} onClick={resetUpload}>
                                Xóa tất cả
                              </motion.button>
                            </div>
                          </div>

                          {/* Table list of queued files */}
                          <div className="stroke-ink" style={{ flex: 1, background: "var(--bg-2)", overflowY: "auto", maxHeight: 360, marginBottom: 20 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "40px 60px 1fr 100px 60px", padding: "10px 16px", background: "var(--panel)", borderBottom: "2px solid var(--border)" }} className="caps-xs">
                              <span>#</span><span></span><span>File</span><span>Kích thước</span><span></span>
                            </div>
                            {selectedFiles.map((item, index) => (
                              <div key={item.id} style={{ display: "grid", gridTemplateColumns: "40px 60px 1fr 100px 60px", padding: "8px 16px", borderBottom: "1px dashed var(--border-soft)", alignItems: "center", fontSize: 13, background: "var(--panel)" }}>
                                <span className="mono" style={{ color: "var(--muted)" }}>{String(index + 1).padStart(2, "0")}</span>
                                <img src={item.previewUrl} alt="Preview" style={{ width: 36, height: 48, objectFit: "cover", border: "1.5px solid var(--border)" }}/>
                                <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{item.name}</span>
                                <span className="mono" style={{ color: "var(--muted)" }}>{item.size}</span>
                                <button className="btn btn-sm btn-ghost" onClick={() => removeFile(item.id)} style={{ color: "var(--accent)", padding: 4 }}>
                                  <Icon name="trash" size={13}/>
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* BIG SUBMIT BUTTON */}
                          <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="btn btn-primary btn-lg"
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "18px 0", fontSize: 16 }}
                            onClick={startProcessing}
                          >
                            <Icon name="sparkle" size={18}/> BẮT ĐẦU DỊCH THUẬT ({selectedFiles.length} TRANG TRUYỆN)
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ── UPLOADING / PROCESSING / DONE PROGRESS VIEW ── */}
                  {state !== "idle" && state !== "dragging" && (
                    <motion.div
                      key="progress-dashboard"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ display: "flex", flexDirection: "column", flex: 1, padding: 24 }}
                    >
                      {/* Upper Header Dashboard */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                        <div>
                          <div className="caps-sm" style={{ color: "var(--accent)" }}>
                            {state === "uploading" ? "ĐANG TẢI LÊN..." : state === "done" ? "HOÀN TẤT XỬ LÝ" : "ĐANG CHẠY BATCH PIPELINE"}
                          </div>
                          <div className="display" style={{ fontSize: 24, marginTop: 4 }}>
                            {state === "done" ? `${completedCount} / ${totalFiles} trang thành công` : `Đang dịch ${completedCount + failedCount} / ${totalFiles} trang`}
                          </div>
                        </div>
                        
                        <div style={{ display: "flex", gap: 8 }}>
                          {state === "done" && (
                            <motion.button whileHover={{ scale: 1.03 }} className="btn btn-sm btn-primary" onClick={resetUpload}>
                              <Icon name="upload" size={12}/> Upload thêm
                            </motion.button>
                          )}
                          {state === "processing" && (
                            <span className="chip chip-accent animate-pulse">DỊCH TỰ ĐỘNG LIVE</span>
                          )}
                        </div>
                      </div>

                      {/* Global Bar */}
                      <div style={{ height: 18, border: "2px solid var(--border)", background: "var(--bg-2)", position: "relative", overflow: "hidden", marginBottom: 20 }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${overallProgress}%` }}
                          transition={{ duration: 0.4 }}
                          className="halftone"
                          style={{ height: "100%", background: state === "done" && failedCount > 0 ? "var(--accent)" : "var(--jade)", borderRight: "2px solid var(--border)" }}
                        />
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, fontFamily: "var(--font-mono)" }}>
                          {overallProgress}%
                        </div>
                      </div>

                      {/* Table Grid */}
                      <div className="stroke-ink" style={{ flex: 1, background: "var(--panel)", overflowY: "auto", maxHeight: 320, marginBottom: 16 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 120px 100px", padding: "10px 16px", background: "var(--bg-2)", borderBottom: "2px solid var(--border)" }} className="caps-xs">
                          <span>#</span><span>File</span><span>Tiến độ</span><span>Trạng thái</span><span></span>
                        </div>
                        <StaggerContainer staggerDelay={0.02}>
                          {selectedFiles.map((f, i) => {
                            const statusMap: any = {
                              queued: { label: "Chờ", color: "var(--muted)" },
                              uploading: { label: "Tải lên...", color: "var(--fg-soft)" },
                              pending: { label: "Chờ AI", color: "var(--muted)" },
                              ocr_running: { label: "Bóc OCR", color: "var(--accent)" },
                              translating: { label: "Dịch thuật", color: "#e29b33" },
                              completed: { label: "✓ Xong", color: "var(--jade)" },
                              translated: { label: "✓ Đã dịch", color: "var(--jade)" },
                              failed: { label: "✕ Lỗi", color: "var(--beni-deep)" },
                              ocr_failed: { label: "✕ Lỗi OCR", color: "var(--beni-deep)" },
                              error: { label: "✕ Lỗi", color: "var(--beni-deep)" },
                            };
                            const s = statusMap[f.status] || { label: f.status, color: "var(--fg)" };
                            const isComplete = ["completed", "translated"].includes(f.status);
                            
                            return (
                              <StaggerItem key={f.id} direction="none">
                                <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 120px 100px", padding: "10px 16px", borderBottom: "1px dashed var(--border-soft)", fontSize: 13, alignItems: "center" }}>
                                  <span className="mono" style={{ color: "var(--muted)" }}>{String(i+1).padStart(2, "0")}</span>
                                  <span style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 10 }}>{f.name}</span>
                                  
                                  {/* Mini progress bar */}
                                  <div style={{ width: 70, height: 6, background: "var(--bg-2)", border: "1px solid var(--border)", overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${f.progress}%`, background: isComplete ? "var(--jade)" : "var(--accent)", transition: "width 0.3s ease" }}/>
                                  </div>

                                  <span style={{ color: s.color, fontWeight: 700, fontSize: 11 }}>{s.label}</span>
                                  
                                  <div>
                                    {isComplete && f.pageId && (
                                      <Link href={`/reader?page=${f.pageId}`} target="_blank">
                                        <button className="btn btn-xs btn-primary" style={{ padding: "3px 8px", fontSize: 10 }}>Xem dịch</button>
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              </StaggerItem>
                            );
                          })}
                        </StaggerContainer>
                      </div>

                      {/* Console Simulator Box */}
                      <div className="stroke-ink" style={{ background: "var(--ink)", color: "#ececec", padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.6, height: 120, overflowY: "auto", position: "relative" }}>
                        {logs.map(l => {
                          const colors = {
                            system: "#b58a3b",
                            info: "#dfd4b0",
                            success: "#9fbfa8",
                            warning: "#ecb365",
                            error: "#e04156"
                          };
                          return (
                            <div key={l.id} style={{ color: colors[l.type] || "#fff" }}>
                              [{l.time}] {l.text}
                            </div>
                          );
                        })}
                        <div ref={consoleEndRef} />
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </FadeIn>

            {/* ── Right Area: Settings Pane ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              
              {/* Settings Pane */}
              <FadeIn direction="up" distance={15} delay={0.25}>
                <div className="stroke-ink" style={{ background: "var(--panel)", padding: 20 }}>
                  <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>Cấu hình AI Module</div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {aiOptionFields.map(field => (
                      <label key={field.key} style={{ display: "grid", gap: 6 }}>
                        <span className="caps-xs" style={{ color: "var(--muted)", fontSize: 10 }}>{field.label}</span>
                        <select
                          value={translationConfig[field.key]}
                          onChange={event => updateTranslationConfig(field.key, event.target.value)}
                          disabled={!aiOptions || state !== "idle"}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "2px solid var(--border)",
                            background: "var(--bg)",
                            color: "var(--fg)",
                            fontFamily: "inherit",
                            fontSize: 13,
                            boxSizing: "border-box",
                            transition: "border-color 0.15s",
                            cursor: state !== "idle" ? "not-allowed" : "pointer",
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
                    <div style={{ marginTop: 12, fontSize: 12, color: "var(--accent)" }}>
                      {aiOptionsError}
                    </div>
                  )}
                  {state !== "idle" && (
                            <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>
                              Khóa tùy chọn khi đang tiến hành dịch thuật.
                            </div>
                  )}
                </div>
              </FadeIn>

              {/* API Status indicator */}
              <FadeIn direction="up" distance={15} delay={0.3}>
                <div className="stroke-ink" style={{ background: "var(--panel)", padding: 16 }}>
                  <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 8 }}>Kênh Dữ Liệu</div>
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
                        ? "Đang kiểm tra liên kết..."
                        : backendOnline
                        ? "Đám mây ổn định"
                        : "Ngoại tuyến (Mô phỏng Pipeline)"}
                    </span>
                  </div>
                  {batchId && (
                    <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 10 }}>
                      BATCH ID: {batchId}
                    </div>
                  )}
                </div>
              </FadeIn>

              {/* Feature Tip Box */}
              <FadeIn direction="up" distance={15} delay={0.35}>
                <div className="stroke-ink" style={{ background: "var(--bg-2)", padding: 16 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ marginTop: 2 }}><Icon name="sparkle" size={14}/></div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--fg-soft)" }}>
                      <strong>Gộp Batch & Upload:</strong> Bạn có thể đọc trực tiếp các trang đã hoàn tất ngay cả khi các trang khác trong lô vẫn đang được AI xử lý.
                    </div>
                  </div>
                </div>
              </FadeIn>

            </div>

          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
