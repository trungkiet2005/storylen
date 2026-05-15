"use client";
import React, { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { SectionHeader } from '@/components/SectionHeader';
import { Icon } from '@/components/Icons';
import { useToast } from '@/components/Toast';
import {
  uploadImages,
  subscribeBatchProgress,
  PageStatus,
  APIError,
  healthCheck,
  getAIModuleOptions,
  AIModuleCurrentConfig,
  AIModuleOptions,
  BatchStatus,
  createSeries,
  listSeries,
  getSeries,
  previewChapter,
  scrapeChapter,
  ScrapePreviewResponse,
  type SeriesListItem,
  type ChapterResponse,
  type SeriesDetail,
} from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from '@/components/Animations';
import { useAuth } from '@/contexts/AuthContext';
import { LANG_NAMES, FILE_LIMITS } from '@/lib/constants';

const DEFAULT_AI_CONFIG: AIModuleCurrentConfig = {
  translator: "gemini",
  target_lang: "VIN",
  detector: "default",
  ocr: "48px",
  inpainter: "default",
  renderer: "default",
};

type UploadState = "idle" | "dragging" | "uploading" | "processing" | "done" | "error";
type AIModuleConfigKey = keyof AIModuleCurrentConfig;
type LeftTab = "upload" | "scrape";

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const MAX_IMAGE_BYTES = FILE_LIMITS.IMAGE_MAX_BYTES;
const MAX_PDF_BYTES = FILE_LIMITS.PDF_MAX_BYTES;
const PDF_RENDER_MAX_WIDTH = FILE_LIMITS.PDF_RENDER_MAX_WIDTH;
const PDF_RENDER_MAX_HEIGHT = FILE_LIMITS.PDF_RENDER_MAX_HEIGHT;
const PDF_RENDER_QUALITY = FILE_LIMITS.PDF_RENDER_QUALITY;

interface FileItem {
  id: string;
  file: File;
  name: string;
  size: string;
  previewUrl: string;
  sourceName?: string;
  sourcePage?: number;
  pageId?: string;
  progress: number;
  simulatedProgress: number;
  status: PageStatus["status"] | "queued" | "uploading";
  error?: string | null;
}

interface LogMessage {
  id: string;
  time: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
}

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function getBaseName(name: string): string {
  return name.replace(/\.[^/.]+$/, "") || "document";
}

function isImageFile(file: File): boolean {
  return IMAGE_TYPES.has(file.type.toLowerCase()) || IMAGE_EXTENSIONS.has(getExtension(file.name));
}

function isPdfFile(file: File): boolean {
  return file.type.toLowerCase() === "application/pdf" || getExtension(file.name) === "pdf";
}

function createFileItem(file: File, source?: { name: string; page: number }): FileItem {
  return {
    id: Math.random().toString(36).slice(2, 11),
    file,
    name: file.name,
    size: formatFileSize(file.size),
    previewUrl: URL.createObjectURL(file),
    sourceName: source?.name,
    sourcePage: source?.page,
    progress: 0,
    simulatedProgress: 0,
    status: "queued",
  };
}

async function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Không thể xuất trang PDF thành ảnh."));
      },
      "image/jpeg",
      PDF_RENDER_QUALITY,
    );
  });
}

async function convertPdfToImageFiles(
  file: File,
  onPageDone?: (page: number, total: number) => void,
): Promise<File[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();

  const documentData = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: documentData }).promise;
  const baseName = getBaseName(file.name);
  const pages: File[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(
      2,
      PDF_RENDER_MAX_WIDTH / baseViewport.width,
      PDF_RENDER_MAX_HEIGHT / baseViewport.height,
    );
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Trình duyệt không hỗ trợ canvas để render PDF.");
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await canvasToJpeg(canvas);
    const generatedName = `${baseName}-page-${String(pageNumber).padStart(3, "0")}.jpg`;

    pages.push(new File([blob], generatedName, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    }));

    canvas.width = 0;
    canvas.height = 0;
    onPageDone?.(pageNumber, pdf.numPages);
  }

  return pages;
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="refresh" size={28} />
        </div>
      }
    >
      <UploadPageInner />
    </Suspense>
  );
}

function UploadPageInner() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const [state, setState] = useState<UploadState>("idle");
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const selectedFilesRef = useRef<FileItem[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPreparingFiles, setIsPreparingFiles] = useState(false);

  const [aiOptions, setAiOptions] = useState<AIModuleOptions | null>(null);
  const [aiOptionsError, setAiOptionsError] = useState<string | null>(null);
  const [translationConfig, setTranslationConfig] = useState<AIModuleCurrentConfig>(DEFAULT_AI_CONFIG);

  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null); // null = checking

  // ── Series binding ─────────────────────────────────────────────────────────
  // "none" = orphan upload (legacy behavior). Otherwise series_id.
  const [seriesChoice, setSeriesChoice] = useState<string>(
    searchParams.get("series_id") || "none",
  );
  const [chapterChoice, setChapterChoice] = useState<string>(
    searchParams.get("chapter_id") || "auto",
  );
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [seriesList, setSeriesList] = useState<SeriesListItem[]>([]);
  const [seriesDetail, setSeriesDetail] = useState<SeriesDetail | null>(null);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [showCreateSeries, setShowCreateSeries] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [creatingSeries, setCreatingSeries] = useState(false);

  // Load series list once
  useEffect(() => {
    setLoadingSeries(true);
    listSeries({ limit: 200 })
      .then(res => setSeriesList(res.items))
      .catch(() => setSeriesList([]))
      .finally(() => setLoadingSeries(false));
  }, []);

  // Load chapters when a series is picked
  useEffect(() => {
    if (seriesChoice === "none") {
      setSeriesDetail(null);
      return;
    }
    getSeries(seriesChoice)
      .then(setSeriesDetail)
      .catch(() => setSeriesDetail(null));
  }, [seriesChoice]);

  const handleCreateInlineSeries = async () => {
    if (!newSeriesTitle.trim()) {
      toast("Hãy nhập tên bộ truyện.", "error");
      return;
    }
    setCreatingSeries(true);
    try {
      const series = await createSeries({ title: newSeriesTitle.trim() });
      const item: SeriesListItem = {
        series_id: series.series_id,
        title: series.title,
        description: series.description,
        status: series.status,
        tags: series.tags,
        cover_image_url: series.cover_image_url,
        source_language: series.source_language,
        target_language: series.target_language,
        created_at: series.created_at,
        updated_at: series.updated_at,
        chapter_count: series.chapter_count,
        page_count: series.page_count,
      };
      setSeriesList(prev => [item, ...prev]);
      setSeriesChoice(series.series_id);
      setChapterChoice("auto");
      setShowCreateSeries(false);
      setNewSeriesTitle("");
      toast("Đã tạo bộ truyện.", "success");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Tạo bộ truyện thất bại.";
      toast(msg, "error");
    } finally {
      setCreatingSeries(false);
    }
  };
  // ── Left tab (upload vs scrape) ────────────────────────────────────────────
  const [leftTab, setLeftTab] = useState<LeftTab>("upload");

  // ── Scrape URL state ────────────────────────────────────────────────────────
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapePreview, setScrapePreview] = useState<ScrapePreviewResponse | null>(null);
  const [scrapePreviewLoading, setScrapePreviewLoading] = useState(false);
  const [scrapePreviewError, setScrapePreviewError] = useState<string | null>(null);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  // ── Chapter preview reader (lướt đọc trước khi dịch) ──────────────────────
  const [previewReaderIndex, setPreviewReaderIndex] = useState<number | null>(null);
  const [previewReaderMode, setPreviewReaderMode] = useState<"scroll" | "page">("scroll");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Smooth simulated progress — crawls toward status-based targets so bar never feels frozen
  useEffect(() => {
    if (state !== "processing" && state !== "uploading") return;

    const STATUS_TARGETS: Record<string, number> = {
      queued: 3,
      uploading: 15,
      pending: 8,
      ocr_running: 43,
      translating: 82,
      completed: 100,
      translated: 100,
      failed: 0,
      ocr_failed: 0,
      error: 0,
    };

    const id = setInterval(() => {
      setSelectedFiles(prev => prev.map(f => {
        const target = STATUS_TARGETS[f.status] ?? f.simulatedProgress;
        if (f.simulatedProgress >= target) return f;
        const diff = target - f.simulatedProgress;
        const step = Math.max(0.15, diff * 0.025);
        return { ...f, simulatedProgress: Math.min(target, f.simulatedProgress + step) };
      }));
    }, 100);

    return () => clearInterval(id);
  }, [state]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      selectedFilesRef.current.forEach(f => URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  const addLog = useCallback((text: string, type: LogMessage["type"] = 'info') => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { id: Math.random().toString(36).slice(2), time, text, type }]);
  }, []);

  // Health check on mount; re-schedules itself after each result to avoid
  // overlapping requests when healthCheck() takes long (Render cold start ~35s).
  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout>;

    const runCheck = async () => {
      const online = await healthCheck();
      if (cancelled) return;
      setBackendOnline(online);
      // Poll faster (10s) while offline so we notice when Render wakes up quickly.
      timerId = setTimeout(runCheck, online ? 30_000 : 10_000);
    };

    runCheck();
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
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

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: FileItem[] = [];
    setIsPreparingFiles(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (isImageFile(file)) {
          if (file.size > MAX_IMAGE_BYTES) {
            toast(`Bỏ qua "${file.name}": Vượt quá kích thước 20 MB.`, "error");
            continue;
          }

          newItems.push(createFileItem(file));
          continue;
        }

        if (isPdfFile(file)) {
          if (file.size > MAX_PDF_BYTES) {
            toast(`Bỏ qua "${file.name}": PDF vượt quá kích thước 100 MB.`, "error");
            continue;
          }

          addLog(`Đang cắt PDF "${file.name}" thành từng trang ảnh...`, "info");
          try {
            const pageFiles = await convertPdfToImageFiles(file, (page, total) => {
              addLog(`PDF "${file.name}": đã chuyển trang ${page}/${total}.`, "info");
            });

            pageFiles.forEach((pageFile, index) => {
              if (pageFile.size > MAX_IMAGE_BYTES) {
                toast(`Bỏ qua "${pageFile.name}": trang PDF sau khi chuyển vượt quá 20 MB.`, "error");
                return;
              }
              newItems.push(createFileItem(pageFile, { name: file.name, page: index + 1 }));
            });
            addLog(`Đã cắt xong "${file.name}" thành ${pageFiles.length} trang ảnh.`, "success");
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Không thể đọc PDF.";
            addLog(`Lỗi PDF "${file.name}": ${msg}`, "error");
            toast(`Không thể xử lý PDF "${file.name}".`, "error");
          }
          continue;
        }

        toast(`Bỏ qua "${file.name}": Chỉ chấp nhận JPG, PNG, WEBP hoặc PDF.`, "error");
      }

      if (newItems.length > 0) {
        setSelectedFiles(prev => [...prev, ...newItems]);
        setState("idle");
        toast(`Đã thêm ${newItems.length} trang vào hàng chờ.`, "success");
      }
    } finally {
      setIsPreparingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [addLog, toast]);

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
    void handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleScrapePreview = async () => {
    const url = scrapeUrl.trim();
    if (!url) return;
    setScrapePreview(null);
    setScrapePreviewError(null);
    setScrapePreviewLoading(true);
    try {
      const preview = await previewChapter(url);
      setScrapePreview(preview);
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không thể tải thông tin chapter.";
      setScrapePreviewError(msg);
    } finally {
      setScrapePreviewLoading(false);
    }
  };

  const handleScrapeStart = async () => {
    const url = scrapeUrl.trim();
    if (!url || !scrapePreview) return;

    if (!backendOnline) {
      toast("Backend đang offline. Vui lòng thử lại sau.", "error");
      return;
    }

    const activeUser = isAuthenticated ? await refreshUser() : null;
    if (!activeUser) {
      toast("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.", "error");
      return;
    }

    setScrapeLoading(true);
    setState("uploading");
    setLogs([]);
    addLog(`Bắt đầu scrape ${scrapePreview.page_count} trang từ: ${url}`, "system");

    try {
      const opts: { seriesId?: string; chapterId?: string; newChapterTitle?: string; aiConfig: AIModuleCurrentConfig } = {
        aiConfig: translationConfig,
      };
      if (seriesChoice !== "none") {
        opts.seriesId = seriesChoice;
        if (chapterChoice === "new") {
          opts.newChapterTitle = newChapterTitle.trim() || scrapePreview.chapter_title;
        } else if (chapterChoice !== "auto") {
          opts.chapterId = chapterChoice;
        }
      }

      addLog("Đang tải ảnh từ web và upload lên cloud...", "info");
      const response = await scrapeChapter(url, opts);
      const batchId = response.batch_id;
      const pageIds = response.page_ids;
      setBatchId(batchId);

      addLog(`Scrape thành công ${pageIds.length} trang. Batch: ${batchId.slice(0, 8)}...`, "success");
      addLog("Bắt đầu pipeline dịch thuật AI...", "info");

      const fakePlaceholders = pageIds.map((pid, idx) => ({
        id: pid,
        file: new File([], `page-${String(idx + 1).padStart(3, "0")}.jpg`),
        name: `Trang ${idx + 1}`,
        size: "—",
        previewUrl: scrapePreview.preview_urls[idx] || "",
        pageId: pid,
        progress: 0,
        simulatedProgress: 0,
        status: "pending" as const,
      }));
      setSelectedFiles(fakePlaceholders);
      setState("processing");

      // Subscribe to live progress (WebSocket — falls back to polling if WS fails).
      // Same handle returned for both transports, so cleanup is uniform.
      const sub = subscribeBatchProgress(
        batchId,
        (batchStatus: BatchStatus) => {
          setSelectedFiles(prev => prev.map(f => {
            const remote = batchStatus.pages.find(p => p.page_id === f.pageId);
            if (!remote) return f;
            if (f.status !== remote.status) {
              if (remote.status === "completed") addLog(`✓ Xong: ${f.name}`, "success");
              else if (["failed", "ocr_failed"].includes(remote.status)) addLog(`✕ Lỗi: ${f.name}`, "error");
              else if (remote.status === "translating") addLog(`→ Đang dịch: ${f.name}`, "info");
            }
            return { ...f, status: remote.status, progress: remote.progress, error: remote.error };
          }));
        },
        () => {
          setState("done");
          addLog("=== HOÀN THÀNH SCRAPE & DỊCH THUẬT ===", "system");
          toast("Đã scrape và dịch xong toàn bộ chapter!", "success");
          sub.close();
        },
      );
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Lỗi khi scrape chapter.";
      setErrorMsg(msg);
      setState("error");
      addLog(`LỖI: ${msg}`, "error");
      toast(msg, "error");
    } finally {
      setScrapeLoading(false);
    }
  };

  const startProcessing = async () => {
    if (selectedFiles.length === 0 || isPreparingFiles) return;

    if (authLoading) {
      const msg = "Đang kiểm tra phiên đăng nhập. Vui lòng thử lại sau vài giây.";
      setErrorMsg(msg);
      setState("error");
      addLog(`LỖI: ${msg}`, 'error');
      toast(msg, "error");
      return;
    }

    const activeUser = isAuthenticated ? await refreshUser() : null;
    if (!activeUser) {
      const msg = "Phiên đăng nhập không hợp lệ hoặc cookie đăng nhập chưa được trình duyệt gửi. Vui lòng đăng nhập lại.";
      setErrorMsg(msg);
      setState("error");
      addLog(`LỖI: ${msg}`, 'error');
      toast(msg, "error");
      return;
    }

    if (!backendOnline) {
      const msg = "Backend đang offline. Vui lòng kiểm tra kết nối và thử lại.";
      setErrorMsg(msg);
      setState("error");
      addLog(`LỖI: ${msg}`, 'error');
      toast(msg, "error");
      return;
    }

    setState("uploading");
    setLogs([]);
    addLog(`Khởi tạo phiên batch với ${selectedFiles.length} files...`, 'system');

    try {
      addLog("Đang tải các tệp lên bộ lưu trữ...", 'info');
      const rawFiles = selectedFiles.map(f => f.file);
      
      const uploadOpts: { aiConfig: AIModuleCurrentConfig; seriesId?: string; chapterId?: string; newChapterTitle?: string } = {
        aiConfig: translationConfig,
      };
      if (seriesChoice !== "none") {
        uploadOpts.seriesId = seriesChoice;
        if (chapterChoice === "new") {
          uploadOpts.newChapterTitle = newChapterTitle.trim() || "Chương mới";
        } else if (chapterChoice !== "auto") {
          uploadOpts.chapterId = chapterChoice;
        }
      }
      const response = await uploadImages(rawFiles, uploadOpts);
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

      // Live progress over WebSocket (auto-falls back to polling on handshake failure).
      const sub = subscribeBatchProgress(
        batchId,
        (batchStatus: BatchStatus) => {
          setSelectedFiles(prev => prev.map(file => {
            const remote = batchStatus.pages.find(p => p.page_id === file.pageId);
            if (!remote) return file;
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
          }));
        },
        () => {
          setState("done");
          addLog("=== HOÀN THÀNH TẤT CẢ TRANG TRUYỆN ===", 'system');
          toast("Tất cả trang đã được xử lý xong!", "success");
          sub.close();
        },
      );

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
  const getDisplayProgress = (f: FileItem) => Math.max(f.progress, Math.round(f.simulatedProgress));
  const overallProgress = totalFiles === 0 ? 0 : Math.round(selectedFiles.reduce((acc, f) => acc + getDisplayProgress(f), 0) / totalFiles);

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
              subtitle="Hỗ trợ nhiều ảnh cùng lúc hoặc 1 file PDF; PDF sẽ được cắt từng trang thành ảnh rồi đưa vào batch dịch. Tối đa 20MB / ảnh."
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
                {/* ── Tab switcher ── */}
                {(state === "idle" || state === "dragging") && (
                  <div style={{ display: "flex", borderBottom: "2px solid var(--border)", flexShrink: 0 }}>
                    {([
                      { id: "upload" as LeftTab, label: "Upload ảnh / PDF", icon: "upload" },
                      { id: "scrape" as LeftTab, label: "Scrape từ URL", icon: "link" },
                    ]).map((tab, i) => (
                      <button
                        key={tab.id}
                        onClick={() => setLeftTab(tab.id)}
                        style={{
                          flex: 1,
                          padding: "12px 16px",
                          background: leftTab === tab.id ? "var(--panel)" : "var(--bg-2)",
                          color: leftTab === tab.id ? "var(--fg)" : "var(--muted)",
                          border: "none",
                          borderRight: i === 0 ? "2px solid var(--border)" : "none",
                          borderBottom: leftTab === tab.id ? "2px solid var(--panel)" : "none",
                          marginBottom: leftTab === tab.id ? -2 : 0,
                          fontSize: 13, fontWeight: leftTab === tab.id ? 800 : 500,
                          cursor: "pointer", display: "flex", alignItems: "center",
                          justifyContent: "center", gap: 7,
                          fontFamily: "var(--font-serif)",
                          transition: "background 0.15s, color 0.15s",
                        }}
                      >
                        <Icon name={tab.icon} size={13}/> {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  style={{ display: "none" }}
                  onChange={e => void handleFiles(e.target.files)}
                />

                <AnimatePresence mode="wait">
                  {/* ── SCRAPE URL PANEL ── */}
                  {(state === "idle" || state === "dragging") && leftTab === "scrape" && (
                    <motion.div
                      key="scrape"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, gap: 16 }}
                    >
                      <div>
                        <div className="display" style={{ fontSize: 20, marginBottom: 6 }}>Scrape chapter từ web</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          Dán link chapter từ mangaread.org — tự động tải về toàn bộ trang và dịch.
                        </div>
                      </div>

                      {/* URL input */}
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="url"
                          value={scrapeUrl}
                          onChange={e => { setScrapeUrl(e.target.value); setScrapePreview(null); setScrapePreviewError(null); }}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleScrapePreview(); } }}
                          placeholder="https://www.mangaread.org/manga/.../chapter-XX/"
                          style={{
                            flex: 1,
                            padding: "10px 12px",
                            border: "2px solid var(--border)",
                            background: "var(--bg)",
                            color: "var(--fg)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            outline: "none",
                          }}
                        />
                        <motion.button
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          className="btn btn-sm"
                          onClick={() => void handleScrapePreview()}
                          disabled={!scrapeUrl.trim() || scrapePreviewLoading}
                          style={{ whiteSpace: "nowrap", padding: "10px 16px" }}
                        >
                          {scrapePreviewLoading ? "Đang tải..." : "Xem trước"}
                        </motion.button>
                      </div>

                      {/* Preview error */}
                      {scrapePreviewError && (
                        <div style={{ background: "var(--bg-2)", border: "1.5px solid var(--accent)", color: "var(--accent)", padding: "10px 12px", fontSize: 12 }}>
                          {scrapePreviewError}
                        </div>
                      )}

                      {/* Preview result */}
                      {scrapePreview && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{ display: "flex", flexDirection: "column", gap: 12 }}
                        >
                          {/* Chapter info */}
                          <div className="stroke-ink" style={{ background: "var(--bg-2)", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 3 }}>Chapter tìm thấy</div>
                              <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "var(--font-serif)" }}>{scrapePreview.chapter_title}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div className="caps-xs" style={{ color: "var(--muted)" }}>Số trang</div>
                              <div className="display" style={{ fontSize: 28, lineHeight: 1 }}>{scrapePreview.page_count}</div>
                            </div>
                          </div>

                          {/* Image thumbnail strip — click any to open the preview reader */}
                          {scrapePreview.preview_urls.length > 0 && (
                            <>
                              <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "2px 0" }}>
                                {scrapePreview.preview_urls.slice(0, 8).map((url, i) => (
                                  <button
                                    key={i}
                                    onClick={() => { setPreviewReaderMode("page"); setPreviewReaderIndex(i); }}
                                    title={`Mở trang ${i + 1}`}
                                    style={{
                                      padding: 0,
                                      background: "transparent",
                                      border: "2px solid var(--border)",
                                      cursor: "pointer",
                                      flexShrink: 0,
                                      position: "relative",
                                      transition: "transform 0.12s, border-color 0.12s",
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "var(--border)"; }}
                                  >
                                    {/* Remote MangaDex / mangaread URL — Next/Image lets us serve
                                        AVIF/WebP transcodes from the optimizer for free. We pass an
                                        explicit width/height and use `unoptimized` only if the
                                        runtime forbids the optimizer (offline dev). */}
                                    <Image
                                      src={url}
                                      alt={`Trang ${i + 1}`}
                                      width={70}
                                      height={90}
                                      referrerPolicy="no-referrer"
                                      style={{ height: 90, width: "auto", display: "block", objectFit: "cover" }}
                                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                    />
                                    <div style={{ position: "absolute", bottom: 2, right: 2, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 4px" }}>
                                      {i + 1}
                                    </div>
                                  </button>
                                ))}
                                {scrapePreview.preview_urls.length > 8 && (
                                  <button
                                    onClick={() => { setPreviewReaderMode("scroll"); setPreviewReaderIndex(0); }}
                                    title="Mở tất cả các trang"
                                    style={{ height: 90, minWidth: 56, flexShrink: 0, border: "2px dashed var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--muted)", cursor: "pointer", background: "transparent" }}
                                  >
                                    +{scrapePreview.preview_urls.length - 8}
                                  </button>
                                )}
                              </div>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => { setPreviewReaderMode("scroll"); setPreviewReaderIndex(0); }}
                                style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }}
                              >
                                <Icon name="book" size={13}/> Lướt đọc cả chapter ({scrapePreview.page_count} trang)
                              </button>
                            </>
                          )}

                          {/* Start button */}
                          <motion.button
                            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                            className="btn btn-primary btn-lg"
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "16px 0", fontSize: 15 }}
                            disabled={scrapeLoading || authLoading}
                            onClick={() => void handleScrapeStart()}
                          >
                            <Icon name="sparkle" size={17}/>
                            {scrapeLoading ? "ĐANG SCRAPE..." : `SCRAPE & DỊCH ${scrapePreview.page_count} TRANG`}
                          </motion.button>

                          <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
                            Tiêu thụ <strong>{scrapePreview.page_count} credit</strong> · Trang sẽ được lưu vào bộ truyện đã chọn bên phải
                          </div>
                        </motion.div>
                      )}

                      {/* Empty hint */}
                      {!scrapePreview && !scrapePreviewError && !scrapePreviewLoading && (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "var(--muted)", gap: 10, opacity: 0.7 }}>
                          <Icon name="link" size={36} stroke={1.2}/>
                          <div style={{ fontSize: 12 }}>Dán URL chapter vào ô trên rồi bấm Xem trước</div>
                          <div style={{ fontSize: 11 }}>Hỗ trợ: mangaread.org, mangakakalot.com, chapmanganato.to</div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ── IDLE / QUEUE STATE (upload tab only) ── */}
                  {(state === "idle" || state === "dragging") && leftTab === "upload" && (
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
                              cursor: isPreparingFiles ? "wait" : "pointer",
                              opacity: isPreparingFiles ? 0.72 : 1,
                            }}
                            onClick={() => {
                              if (!isPreparingFiles) fileInputRef.current?.click();
                            }}
                          >
                            <Icon name="upload" size={42} stroke={2.5}/>
                          </motion.div>
                          <div className="display" style={{ fontSize: 26 }}>Kéo thả ảnh hoặc PDF vào đây</div>
                          <div style={{ color: "var(--fg-soft)", marginTop: 8, marginBottom: 24 }}>Chọn nhiều ảnh, hoặc chọn PDF để tự cắt từng trang</div>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="btn btn-primary"
                            disabled={isPreparingFiles}
                            onClick={() => fileInputRef.current?.click()}
                            style={{ padding: "14px 28px" }}
                          >
                            <Icon name="folder" size={14}/> {isPreparingFiles ? "Đang cắt PDF..." : "Chọn tệp tin"}
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
                              <motion.button whileHover={{ scale: 1.02 }} className="btn btn-sm" disabled={isPreparingFiles} onClick={() => fileInputRef.current?.click()}>
                                <Icon name="plus" size={12}/> {isPreparingFiles ? "Đang cắt PDF..." : "Thêm ảnh/PDF"}
                              </motion.button>
                              <motion.button whileHover={{ scale: 1.02 }} className="btn btn-sm btn-ghost" style={{ color: "var(--accent)" }} onClick={resetUpload}>
                                Xóa tất cả
                              </motion.button>
                            </div>
                          </div>

                          {/* Table list of queued files */}
                          <div className="stroke-ink" style={{ flex: 1, background: "var(--bg-2)", overflowY: "auto", maxHeight: 360, marginBottom: 20 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "28px 40px 60px 1fr 100px 60px", padding: "10px 16px", background: "var(--panel)", borderBottom: "2px solid var(--border)" }} className="caps-xs">
                              <span></span><span>#</span><span></span><span>File</span><span>Kích thước</span><span></span>
                            </div>
                            <Reorder.Group
                              axis="y"
                              values={selectedFiles}
                              onReorder={setSelectedFiles}
                              style={{ listStyle: "none", padding: 0, margin: 0 }}
                            >
                              {selectedFiles.map((item, index) => (
                                <Reorder.Item key={item.id} value={item} style={{ listStyle: "none" }}>
                                  <div style={{ display: "grid", gridTemplateColumns: "28px 40px 60px 1fr 100px 60px", padding: "8px 16px", borderBottom: "1px dashed var(--border-soft)", alignItems: "center", fontSize: 13, background: "var(--panel)", cursor: "grab", userSelect: "none" }}>
                                    <span style={{ color: "var(--muted)", display: "flex", alignItems: "center" }}>
                                      <Icon name="dots" size={12} />
                                    </span>
                                    <span className="mono" style={{ color: "var(--muted)" }}>{String(index + 1).padStart(2, "0")}</span>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.previewUrl} alt="Preview" draggable={false} style={{ width: 36, height: 48, objectFit: "cover", border: "1.5px solid var(--border)" }}/>
                                    <div style={{ overflow: "hidden", paddingRight: 10 }}>
                                      <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                                      {item.sourceName && (
                                        <div className="mono" style={{ color: "var(--muted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          PDF trang {item.sourcePage}: {item.sourceName}
                                        </div>
                                      )}
                                    </div>
                                    <span className="mono" style={{ color: "var(--muted)" }}>{item.size}</span>
                                    <button
                                      className="btn btn-sm btn-ghost"
                                      onClick={e => { e.stopPropagation(); removeFile(item.id); }}
                                      style={{ color: "var(--accent)", padding: 4 }}
                                    >
                                      <Icon name="trash" size={13}/>
                                    </button>
                                  </div>
                                </Reorder.Item>
                              ))}
                            </Reorder.Group>
                          </div>

                          {/* BIG SUBMIT BUTTON */}
                          <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="btn btn-primary btn-lg"
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "18px 0", fontSize: 16 }}
                            disabled={isPreparingFiles || authLoading}
                            onClick={startProcessing}
                          >
                            <Icon name="sparkle" size={18}/> {isPreparingFiles ? "ĐANG CẮT PDF..." : `BẮT ĐẦU DỊCH THUẬT (${selectedFiles.length} TRANG TRUYỆN)`}
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

                      {state === "error" && errorMsg && (
                        <div className="stroke-ink" style={{ background: "var(--bg-2)", color: "var(--accent)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
                          {errorMsg}
                        </div>
                      )}

                      {/* Global Bar */}
                      <div style={{ height: 18, border: "2px solid var(--border)", background: "var(--bg-2)", position: "relative", overflow: "hidden", marginBottom: 20 }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${overallProgress}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="halftone"
                          style={{ height: "100%", background: state === "done" && failedCount > 0 ? "var(--accent)" : "var(--jade)", borderRight: overallProgress > 0 ? "2px solid var(--border)" : "none", position: "relative", overflow: "hidden" }}
                        >
                          {(state === "processing" || state === "uploading") && (
                            <motion.div
                              animate={{ x: ["-80%", "180%"] }}
                              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.8 }}
                              style={{
                                position: "absolute",
                                top: 0, bottom: 0,
                                width: "55%",
                                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)",
                              }}
                            />
                          )}
                        </motion.div>
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
                            const statusMap: Record<FileItem["status"], { label: string; color: string }> = {
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
                                    <div style={{ height: "100%", width: `${getDisplayProgress(f)}%`, background: isComplete ? "var(--jade)" : "var(--accent)", transition: "width 0.25s ease-out" }}/>
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
                          disabled={!aiOptions || state !== "idle" || isPreparingFiles}
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
                            cursor: state !== "idle" || isPreparingFiles ? "not-allowed" : "pointer",
                          }}
                        >
                          {field.values.map(value => (
                            <option key={value} value={value}>
                              {field.key === "target_lang" ? (LANG_NAMES[value] ?? value) : value}
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

              {/* Series binding */}
              <FadeIn direction="up" distance={15} delay={0.28}>
                <div className="stroke-ink" style={{ background: "var(--panel)", padding: 20 }}>
                  <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>Thêm vào bộ truyện</div>

                  <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                    <span className="caps-xs" style={{ color: "var(--muted)", fontSize: 10 }}>Bộ truyện</span>
                    <select
                      value={seriesChoice}
                      onChange={e => {
                        setSeriesChoice(e.target.value);
                        setChapterChoice("auto");
                      }}
                      disabled={state !== "idle" || isPreparingFiles || loadingSeries}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "2px solid var(--border)",
                        background: "var(--bg)",
                        color: "var(--fg)",
                        fontFamily: "inherit",
                        fontSize: 13,
                        cursor: state !== "idle" ? "not-allowed" : "pointer",
                      }}
                    >
                      <option value="none">— Không (chỉ dịch) —</option>
                      {seriesList.map(s => (
                        <option key={s.series_id} value={s.series_id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  {!showCreateSeries ? (
                    <button
                      type="button"
                      onClick={() => setShowCreateSeries(true)}
                      className="btn btn-sm btn-ghost"
                      style={{ width: "100%", marginBottom: 12, fontSize: 11 }}
                      disabled={state !== "idle"}
                    >
                      <Icon name="plus" size={11} /> Tạo bộ truyện mới
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginBottom: 12,
                        padding: 8,
                        background: "var(--bg-2)",
                        border: "1px dashed var(--border)",
                      }}
                    >
                      <input
                        autoFocus
                        value={newSeriesTitle}
                        onChange={e => setNewSeriesTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCreateInlineSeries();
                          }
                          if (e.key === "Escape") setShowCreateSeries(false);
                        }}
                        placeholder="Tên bộ truyện…"
                        maxLength={200}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          fontSize: 12,
                          border: "1px solid var(--border)",
                          background: "var(--panel)",
                          outline: "none",
                          color: "var(--fg)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCreateInlineSeries}
                        disabled={creatingSeries}
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: 11 }}
                      >
                        {creatingSeries ? "…" : <Icon name="check" size={10} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateSeries(false)}
                        className="btn btn-sm btn-ghost"
                        style={{ fontSize: 11 }}
                      >
                        <Icon name="x" size={10} />
                      </button>
                    </div>
                  )}

                  {seriesChoice !== "none" && (
                    <>
                      <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                        <span className="caps-xs" style={{ color: "var(--muted)", fontSize: 10 }}>Chương</span>
                        <select
                          value={chapterChoice}
                          onChange={e => setChapterChoice(e.target.value)}
                          disabled={state !== "idle" || isPreparingFiles}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "2px solid var(--border)",
                            background: "var(--bg)",
                            color: "var(--fg)",
                            fontFamily: "inherit",
                            fontSize: 13,
                            cursor: state !== "idle" ? "not-allowed" : "pointer",
                          }}
                        >
                          <option value="auto">
                            {seriesDetail && seriesDetail.chapters.length > 0
                              ? `Tự động — thêm vào chương cuối (Ch.${seriesDetail.chapters[seriesDetail.chapters.length - 1].chapter_number})`
                              : "Tự động — tạo Chương 1"}
                          </option>
                          {seriesDetail?.chapters.map(c => (
                            <option key={c.chapter_id} value={c.chapter_id}>
                              Ch.{c.chapter_number} {c.title ? `— ${c.title}` : ""}
                            </option>
                          ))}
                          <option value="new">+ Tạo chương mới</option>
                        </select>
                      </label>

                      {chapterChoice === "new" && (
                        <input
                          value={newChapterTitle}
                          onChange={e => setNewChapterTitle(e.target.value)}
                          placeholder="Tên chương mới (tùy chọn)…"
                          maxLength={200}
                          disabled={state !== "idle"}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            fontSize: 12,
                            border: "2px solid var(--border)",
                            background: "var(--bg-2)",
                            outline: "none",
                            color: "var(--fg)",
                            boxSizing: "border-box",
                          }}
                        />
                      )}
                    </>
                  )}

                  <div style={{ marginTop: 8, fontSize: 10, color: "var(--muted)" }}>
                    Để trống nếu chỉ muốn dịch như bình thường (sẽ vào Lịch sử).
                  </div>
                </div>
              </FadeIn>


            </div>

          </div>
        </div>
      </div>

      {/* ── Preview reader modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {previewReaderIndex !== null && scrapePreview && (
          <ScrapePreviewReader
            urls={scrapePreview.preview_urls}
            startIndex={previewReaderIndex}
            mode={previewReaderMode}
            chapterTitle={scrapePreview.chapter_title}
            onModeChange={setPreviewReaderMode}
            onClose={() => setPreviewReaderIndex(null)}
          />
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}

// ── Preview reader (lướt đọc chapter trước khi dịch) ─────────────────────────

function ScrapePreviewReader({
  urls,
  startIndex,
  mode,
  chapterTitle,
  onModeChange,
  onClose,
}: {
  urls: string[];
  startIndex: number;
  mode: "scroll" | "page";
  chapterTitle: string;
  onModeChange: (m: "scroll" | "page") => void;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(startIndex);

  // Sync to startIndex when the modal is re-opened at a new thumbnail
  useEffect(() => { setCurrent(startIndex); }, [startIndex]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Keyboard: ←/→ paginate, Esc close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (mode !== "page") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setCurrent(c => Math.min(urls.length - 1, c + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrent(c => Math.max(0, c - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, urls.length, onClose]);

  const total = urls.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(10,10,14,0.96)",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={(e) => {
        // Click outside image area = close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Topbar */}
      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          background: "rgba(15,15,20,0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Xem trước (chưa dịch)
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {chapterTitle}
          </div>
        </div>

        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums" }}>
          {mode === "page" ? `${current + 1} / ${total}` : `${total} trang`}
        </span>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            className={`btn btn-sm ${mode === "scroll" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => onModeChange("scroll")}
            title="Cuộn dọc"
          >
            <Icon name="layers" size={13}/> Cuộn
          </button>
          <button
            className={`btn btn-sm ${mode === "page" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => onModeChange("page")}
            title="Lật trang"
          >
            <Icon name="book" size={13}/> Trang
          </button>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          style={{ color: "#fff" }}
          title="Đóng (Esc)"
        >
          <Icon name="x" size={14}/> Đóng
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: mode === "scroll" ? "auto" : "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: mode === "scroll" ? "12px 16px" : 0,
        }}
      >
        {mode === "scroll" ? (
          <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 2 }}>
            {urls.map((u, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={i}
                src={u}
                alt={`Trang ${i + 1}`}
                referrerPolicy="no-referrer"
                loading={i < 2 ? "eager" : "lazy"}
                decoding="async"
                style={{ width: "100%", display: "block", background: "#1a1a22" }}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.style.cssText = "width:100%;min-height:120px;display:flex;align-items:center;justify-content:center;background:#2a1010;color:#aaa";
                  img.alt = `Lỗi tải trang ${i + 1}`;
                }}
              />
            ))}
          </div>
        ) : (
          <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <button
              onClick={() => setCurrent(c => Math.max(0, c - 1))}
              disabled={current === 0}
              aria-label="Trang trước"
              style={{
                position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                width: 44, height: 44, borderRadius: "50%",
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff", cursor: current === 0 ? "not-allowed" : "pointer",
                opacity: current === 0 ? 0.3 : 1, zIndex: 2,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon name="arrow-left" size={20}/>
            </button>

            <AnimatePresence mode="wait">
              <motion.img
                key={current}
                src={urls[current]}
                alt={`Trang ${current + 1}`}
                referrerPolicy="no-referrer"
                decoding="async"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                style={{ maxWidth: "92%", maxHeight: "100%", objectFit: "contain", display: "block", background: "#1a1a22" }}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.style.background = "#2a1010";
                  img.alt = `Lỗi tải trang ${current + 1}`;
                }}
              />
            </AnimatePresence>

            <button
              onClick={() => setCurrent(c => Math.min(urls.length - 1, c + 1))}
              disabled={current === urls.length - 1}
              aria-label="Trang sau"
              style={{
                position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                width: 44, height: 44, borderRadius: "50%",
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff", cursor: current === urls.length - 1 ? "not-allowed" : "pointer",
                opacity: current === urls.length - 1 ? 0.3 : 1, zIndex: 2,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon name="arrow-right" size={20}/>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
