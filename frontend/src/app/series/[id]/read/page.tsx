"use client";
import React, { Suspense, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedPage } from "@/components/Animations";
import { QAChatPanel } from "@/components/QAChatPanel";
import { ListenMode } from "@/components/ListenMode";
import {
  APIError,
  getChapterRecap,
  getPage,
  getSeriesFull,
  updateBubbleTranslation,
  type BubbleData,
  type ChapterPage,
  type PageData,
  type SeriesDetail,
} from "@/lib/api";
import {
  chooseSeriesReaderImages,
  getLoadedImageNaturalSize,
  type SeriesTranslationMode,
} from "@/lib/seriesReader";

interface FlatPage extends ChapterPage {
  chapter_id: string;
  chapter_number: number;
  chapter_title: string | null;
}

type ReadMode = "pageflip" | "longstrip" | "webtoon";
const READ_MODE_KEY = "storylens_series_read_mode";
const TRANSLATION_MODE_KEY = "storylens_series_translation_mode";
const PRELOAD_AHEAD = 2; // pages preloaded ahead of current

function loadReadMode(): ReadMode {
  if (typeof window === "undefined") return "pageflip";
  const v = window.localStorage.getItem(READ_MODE_KEY);
  if (v === "longstrip" || v === "webtoon" || v === "pageflip") return v;
  return "pageflip";
}

function loadTranslationMode(): SeriesTranslationMode {
  if (typeof window === "undefined") return "overlay";
  const v = window.localStorage.getItem(TRANSLATION_MODE_KEY);
  if (v === "overlay" || v === "sidebyside" || v === "tap") return v;
  return "overlay";
}

function isPageReady(p: FlatPage | undefined): boolean {
  if (!p) return false;
  return (p.status === "completed" || p.status === "translated") && !!(p.translated_image_url || p.original_image_url);
}

function SeriesBubbleLayer({
  bubbles,
  dims,
  selected,
  onSelect,
  mode,
}: {
  bubbles: BubbleData[];
  dims: { w: number; h: number } | undefined;
  selected: number | null;
  onSelect: (index: number | null) => void;
  mode: "overlay" | "tap";
}) {
  if (!dims?.w || !dims.h || bubbles.length === 0) return null;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4 }}>
      {bubbles.map((bubble, index) => {
        const [x, y, w, h] = bubble.bbox;
        const boxStyle: React.CSSProperties = {
          position: "absolute",
          left: `${(x / dims.w) * 100}%`,
          top: `${(y / dims.h) * 100}%`,
          width: `${(w / dims.w) * 100}%`,
          height: `${(h / dims.h) * 100}%`,
          pointerEvents: "auto",
        };

        if (mode === "overlay") {
          return (
            <div
              key={bubble.bubble_id}
              title={bubble.original_text}
              style={{
                ...boxStyle,
                background: "rgba(255,253,232,0.9)",
                border: "1.5px solid #111",
                color: "#111",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: 4,
                overflow: "hidden",
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(10px, 1.5vw, 22px)",
                fontWeight: 700,
                lineHeight: 1.25,
              }}
            >
              {bubble.translated_text}
            </div>
          );
        }

        return (
          <button
            key={bubble.bubble_id}
            aria-label={`Xem bong bóng dịch ${index + 1}`}
            title={bubble.original_text || bubble.translated_text}
            onClick={() => onSelect(selected === index ? null : index)}
            style={{
              ...boxStyle,
              border: selected === index ? "2px solid var(--accent)" : "2px dashed rgba(200,16,46,0.55)",
              background: selected === index ? "rgba(200,16,46,0.12)" : "transparent",
              cursor: "pointer",
            }}
          />
        );
      })}

      {mode === "tap" && selected !== null && bubbles[selected] && (() => {
        const bubble = bubbles[selected];
        const [x, y, w, h] = bubble.bbox;
        const centerX = ((x + w / 2) / dims.w) * 100;
        const topY = (y / dims.h) * 100;
        const bottomY = ((y + h) / dims.h) * 100;
        const showBelow = bottomY < 72;

        return (
          <div
            style={{
              position: "absolute",
              left: `${centerX}%`,
              top: showBelow ? `${bottomY}%` : undefined,
              bottom: showBelow ? undefined : `${100 - topY}%`,
              transform: showBelow ? "translate(-50%, 10px)" : "translate(-50%, -10px)",
              width: "fit-content",
              minWidth: 90,
              maxWidth: "min(360px, calc(100% - 32px))",
              background: "#fffde8",
              border: "2px solid #111",
              boxShadow: "4px 4px 0 #111",
              color: "#111",
              padding: "10px 12px",
              pointerEvents: "auto",
              zIndex: 6,
            }}
          >
            {bubble.original_text && (
              <div style={{ fontSize: 11, marginBottom: 5, opacity: 0.68, lineHeight: 1.35 }}>
                {bubble.original_text}
              </div>
            )}
            <div style={{ fontFamily: "var(--font-serif)", fontWeight: 800, lineHeight: 1.35 }}>
              {bubble.translated_text}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function SeriesReadPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="refresh" size={28} />
        </div>
      }
    >
      <SeriesReadInner params={params} />
    </Suspense>
  );
}

function SeriesReadInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<ReadMode>("pageflip");
  const [translationMode, setTranslationMode] = useState<SeriesTranslationMode>("overlay");
  const [immersive, setImmersive] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedBubble, setSelectedBubble] = useState<number | null>(null);
  const [pageDetails, setPageDetails] = useState<Record<string, PageData>>({});
  const [editTexts, setEditTexts] = useState<Record<string, string>>({});
  const [savingBubbleId, setSavingBubbleId] = useState<string | null>(null);
  // Citation highlight: which bubble (pixel bbox) on which page to spotlight.
  const [highlight, setHighlight] = useState<{ pageId: string; bbox: number[] } | null>(null);
  // "Trước đó trong truyện...": recap of the PREVIOUS chapter, shown when
  // landing on the first page of a new chapter (dismissible, remembered per
  // current chapter in localStorage).
  const [recap, setRecap] = useState<{ chapterId: string; text: string } | null>(null);
  const [imgDims, setImgDims] = useState<Record<string, { w: number; h: number }>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Hydrate persisted mode after mount (avoids SSR flash)
  useEffect(() => {
    setMode(loadReadMode());
    setTranslationMode(loadTranslationMode());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(READ_MODE_KEY, mode);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TRANSLATION_MODE_KEY, translationMode);
    }
  }, [translationMode]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?next=/series/${id}/read`);
    }
  }, [authLoading, isAuthenticated, router, id]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSeriesFull(id);
      setSeries(data);
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không tải được bộ truyện.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const flatPages: FlatPage[] = useMemo(() => {
    if (!series) return [];
    const out: FlatPage[] = [];
    for (const c of series.chapters) {
      for (const p of c.pages) {
        out.push({
          ...p,
          chapter_id: c.chapter_id,
          chapter_number: c.chapter_number,
          chapter_title: c.title,
        });
      }
    }
    return out;
  }, [series]);

  // Seed index from URL ?page=<page_id>, or default to 0
  useEffect(() => {
    if (flatPages.length === 0) return;
    const pageParam = searchParams.get("page");
    if (pageParam) {
      const idx = flatPages.findIndex(p => p.page_id === pageParam);
      if (idx >= 0) {
        setIndex(idx);
        return;
      }
    }
    setIndex(0);
  }, [flatPages, searchParams]);

  const current = flatPages[index];
  const hasPrev = index > 0;
  const hasNext = index < flatPages.length - 1;
  const currentDetail = current ? pageDetails[current.page_id] : null;
  const currentOriginalUrl = currentDetail?.original_image_url ?? current?.original_image_url ?? null;
  const currentTranslatedUrl = currentDetail?.translated_image_url ?? current?.translated_image_url ?? null;
  const currentImages = chooseSeriesReaderImages({
    mode: translationMode,
    originalImageUrl: currentOriginalUrl,
    translatedImageUrl: currentTranslatedUrl,
  });
  const currentBubbles = currentDetail?.processed_data ?? [];

  useEffect(() => {
    setRecap(null);
    if (!series || !current || current.chapter_number <= 1) return;

    const isFirstPageOfChapter = flatPages[index - 1]?.chapter_id !== current.chapter_id;
    if (!isFirstPageOfChapter) return;

    const prevChapter = series.chapters.find(c => c.chapter_number === current.chapter_number - 1);
    if (!prevChapter) return;

    const dismissKey = `storylens.recap-dismissed.${current.chapter_id}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(dismissKey)) return;

    let cancelled = false;
    getChapterRecap(prevChapter.chapter_id)
      .then(res => {
        if (!cancelled && res.recap) {
          setRecap({ chapterId: current.chapter_id, text: res.recap });
        }
      })
      .catch(() => {
        // Best-effort reading aid — silent failure, no toast.
      });
    return () => {
      cancelled = true;
    };
  }, [series, current, flatPages, index]);

  const dismissRecap = useCallback(() => {
    if (recap && typeof window !== "undefined") {
      window.localStorage.setItem(`storylens.recap-dismissed.${recap.chapterId}`, "1");
    }
    setRecap(null);
  }, [recap]);

  useEffect(() => {
    setSelectedBubble(null);
  }, [current?.page_id, translationMode]);

  useEffect(() => {
    if (!current?.page_id || pageDetails[current.page_id]) return;
    let cancelled = false;
    getPage(current.page_id)
      .then(data => {
        if (!cancelled) {
          setPageDetails(prev => ({ ...prev, [current.page_id]: data }));
          setEditTexts(prev => ({
            ...prev,
            ...Object.fromEntries(data.processed_data.map(bubble => [bubble.bubble_id, bubble.translated_text])),
          }));
        }
      })
      .catch(() => {
        // Keep the reader usable with the lighter getSeriesFull page payload.
      });
    return () => {
      cancelled = true;
    };
  }, [current?.page_id, pageDetails]);

  const saveContextEdit = async (bubble: BubbleData) => {
    if (!current?.page_id) return;
    const nextText = (editTexts[bubble.bubble_id] ?? "").trim();
    if (!nextText) {
      toast("Bản dịch không được để trống.", "error");
      return;
    }

    setSavingBubbleId(bubble.bubble_id);
    try {
      const saved = await updateBubbleTranslation(current.page_id, bubble.bubble_id, nextText);
      setPageDetails(prev => {
        const detail = prev[current.page_id];
        if (!detail) return prev;
        return {
          ...prev,
          [current.page_id]: {
            ...detail,
            processed_data: detail.processed_data.map(item =>
              item.bubble_id === bubble.bubble_id
                ? { ...item, translated_text: saved.translated_text }
                : item,
            ),
          },
        };
      });
      setEditTexts(prev => ({ ...prev, [bubble.bubble_id]: saved.translated_text }));
      toast("Đã lưu bản sửa.", "success");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không lưu được bản sửa.";
      toast(msg, "error");
    } finally {
      setSavingBubbleId(null);
    }
  };

  const goPrev = useCallback(() => {
    if (hasPrev) setIndex(i => i - 1);
  }, [hasPrev]);
  const goNext = useCallback(() => {
    if (hasNext) setIndex(i => i + 1);
  }, [hasNext]);

  // Jump to a cited page IN PLACE (keeps the Q&A panel + conversation mounted)
  // and spotlight the cited bubble; falls back to the standalone reader if the
  // page isn't in this series.
  const openSource = useCallback((pid: string, bbox?: number[] | null) => {
    const idx = flatPages.findIndex(p => p.page_id === pid);
    if (idx >= 0) {
      setIndex(idx);
      setHighlight(bbox && bbox.length === 4 ? { pageId: pid, bbox } : null);
      const el = pageRefs.current[flatPages[idx].page_id];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      router.push(`/reader?page=${pid}`);
    }
  }, [flatPages, router]);

  // Auto-fade the spotlight after a few seconds.
  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => setHighlight(null), 4500);
    return () => clearTimeout(t);
  }, [highlight]);

  // Overlay a spotlight box on `pid`'s image, positioned by the cited bubble's
  // pixel bbox scaled to the image's natural size (so it tracks any zoom/mode).
  const renderHighlight = (pid: string) => {
    if (!highlight || highlight.pageId !== pid) return null;
    const dim = imgDims[pid];
    if (!dim || !dim.w || !dim.h) return null;
    const [bx, by, bw, bh] = highlight.bbox;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 1.25 }}
        animate={{ opacity: [0, 1, 0.65, 1, 0.7], scale: [1.25, 1, 1.05, 1, 1] }}
        transition={{ duration: 1.8, times: [0, 0.18, 0.45, 0.72, 1] }}
        style={{
          position: "absolute",
          left: `${(bx / dim.w) * 100}%`,
          top: `${(by / dim.h) * 100}%`,
          width: `${(bw / dim.w) * 100}%`,
          height: `${(bh / dim.h) * 100}%`,
          border: "3px solid var(--accent)",
          background: "rgba(200,16,46,0.14)",
          boxShadow: "0 0 0 3px rgba(255,255,255,0.65), 0 0 20px 5px rgba(200,16,46,0.5)",
          borderRadius: 2,
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
    );
  };

  const captureDims = (pid: string) => (e: React.SyntheticEvent<HTMLImageElement>) => {
    const t = e.currentTarget;
    if (!t.naturalWidth) return;
    setImgDims(d => (d[pid]?.w === t.naturalWidth ? d : { ...d, [pid]: { w: t.naturalWidth, h: t.naturalHeight } }));
  };

  const captureLoadedImageDims = (pid: string) => (image: HTMLImageElement | null) => {
    const size = getLoadedImageNaturalSize(image);
    if (!size) return;
    setImgDims(d => (d[pid]?.w === size.w && d[pid]?.h === size.h ? d : { ...d, [pid]: size }));
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === "l") goNext();
      else if (e.key === "ArrowLeft" || e.key === "h") goPrev();
      else if (e.key === "f" || e.key === "F") setImmersive(v => !v);
      else if (e.key === "Escape" && immersive) setImmersive(false);
      else if (e.key === "v" || e.key === "V") {
        // Cycle modes: pageflip → longstrip → webtoon
        setMode(m => (m === "pageflip" ? "longstrip" : m === "longstrip" ? "webtoon" : "pageflip"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, immersive]);

  // Scroll to top on page change (only in pageflip mode)
  useEffect(() => {
    if (mode !== "pageflip") return;
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [index, mode]);

  // Image preload — fetch the next N pages so the next swipe / scroll is instant
  useEffect(() => {
    if (typeof window === "undefined" || flatPages.length === 0) return;
    const start = mode === "pageflip" ? index + 1 : index;
    for (let i = start; i < Math.min(start + PRELOAD_AHEAD, flatPages.length); i++) {
      const p = flatPages[i];
      const url = p?.translated_image_url || p?.original_image_url;
      if (url) {
        const img = new Image();
        img.src = url;
      }
    }
  }, [index, flatPages, mode]);

  // In long-strip / webtoon mode, observe which page is on-screen → update index for progress bar
  useEffect(() => {
    if (mode === "pageflip" || flatPages.length === 0) return;
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const pageId = (visible.target as HTMLElement).dataset.pageId;
        if (!pageId) return;
        const idx = flatPages.findIndex(p => p.page_id === pageId);
        if (idx >= 0 && idx !== index) setIndex(idx);
      },
      { root, threshold: [0.3, 0.6] }
    );

    Object.values(pageRefs.current).forEach(el => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [mode, flatPages, index]);

  const handleJumpToChapter = (chapterId: string) => {
    const idx = flatPages.findIndex(p => p.chapter_id === chapterId);
    if (idx < 0) return;
    if (mode === "pageflip") {
      setIndex(idx);
    } else {
      // In strip modes, scroll to that page
      const targetId = flatPages[idx].page_id;
      const el = pageRefs.current[targetId];
      if (el && containerRef.current) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        setIndex(idx);
      }
    }
  };

  // Swipe handler — only active in pageflip mode
  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (mode !== "pageflip") return;
    const SWIPE_THRESHOLD = 80;
    const VELOCITY_THRESHOLD = 250;
    const dx = info.offset.x;
    const vx = info.velocity.x;
    if (dx < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) goNext();
    else if (dx > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) goPrev();
  };

  const imageUrl = currentImages.primary;
  const isReady = current && isPageReady(current);

  return (
    <AnimatedPage>
      <div
        ref={containerRef}
        className="paper-grain"
        style={{ height: "100vh", overflow: "auto" }}
      >
        {!immersive && <TopBar active="series" />}
        <div style={{ padding: immersive ? "8px 16px" : "16px 24px", maxWidth: 900, margin: "0 auto" }}>
          {/* Breadcrumb / header */}
          {!immersive && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <Link
              href={`/series/${id}`}
              style={{ textDecoration: "none", color: "var(--muted)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <Icon name="arrow-left" size={11} /> {series?.title || "Bộ truyện"}
            </Link>

            {current && (
              <>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>/</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Chương {current.chapter_number}
                  {current.chapter_title ? ` — ${current.chapter_title}` : ""}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>/</span>
                <span className="mono" style={{ fontSize: 12 }}>
                  Trang {(current.page_number ?? index + 1)} ({index + 1}/{flatPages.length})
                </span>
              </>
            )}

            {/* Chapter jump dropdown */}
            {series && series.chapters.length > 1 && (
              <select
                value={current?.chapter_id || ""}
                onChange={e => handleJumpToChapter(e.target.value)}
                style={{
                  marginLeft: "auto",
                  padding: "5px 8px",
                  fontSize: 12,
                  background: "var(--bg-2)",
                  border: "2px solid var(--border)",
                  color: "var(--fg)",
                  cursor: "pointer",
                }}
              >
                {series.chapters
                  .filter(c => c.pages.length > 0)
                  .map(c => (
                    <option key={c.chapter_id} value={c.chapter_id}>
                      Ch.{c.chapter_number}
                      {c.title ? ` — ${c.title}` : ""}
                    </option>
                  ))}
              </select>
            )}
          </div>
          )}

          {/* View-mode toolbar */}
          {!loading && !error && flatPages.length > 0 && !immersive && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <span className="caps-xs" style={{ color: "var(--muted)" }}>Chế độ đọc</span>
              <div style={{ display: "flex", border: "1.5px solid var(--border)", background: "var(--panel)" }}>
                {([
                  { id: "pageflip", label: "Từng trang", icon: "book" },
                  { id: "longstrip", label: "Cuộn dọc", icon: "stack" },
                  { id: "webtoon", label: "Webtoon", icon: "layers" },
                ] as { id: ReadMode; label: string; icon: string }[]).map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMode(m.id);
                      if (m.id !== "pageflip") setTranslationMode("overlay");
                    }}
                    aria-pressed={mode === m.id}
                    title={m.label}
                    style={{
                      padding: "6px 10px",
                      background: mode === m.id ? "var(--accent)" : "transparent",
                      color: mode === m.id ? "#fff" : "var(--fg)",
                      border: "none",
                      borderRight: i < 2 ? "1.5px solid var(--border)" : "none",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Icon name={m.icon} size={11} /> {m.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", border: "1.5px solid var(--border)", background: "var(--panel)" }}>
                {([
                  { id: "overlay", label: "Overlay", icon: "layers" },
                  { id: "sidebyside", label: "Song ngữ", icon: "grid" },
                  { id: "tap", label: "Tap", icon: "eye" },
                ] as { id: SeriesTranslationMode; label: string; icon: string }[]).map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setTranslationMode(m.id);
                      setMode("pageflip");
                    }}
                    aria-pressed={translationMode === m.id}
                    title={m.label}
                    style={{
                      padding: "6px 10px",
                      background: translationMode === m.id ? "var(--accent)" : "transparent",
                      color: translationMode === m.id ? "#fff" : "var(--fg)",
                      border: "none",
                      borderRight: i < 2 ? "1.5px solid var(--border)" : "none",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Icon name={m.icon} size={11} /> {m.label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginLeft: 4,
                  paddingLeft: 12,
                  borderLeft: "1.5px solid var(--border)",
                }}
              >
                {current && (
                  <button
                    className="btn btn-sm"
                    onClick={() => setShowEditPanel(true)}
                    title="Mở panel ngữ cảnh để sửa bản dịch ngay trong reader"
                    style={{ fontSize: 11, padding: "4px 8px" }}
                  >
                    <Icon name="settings" size={11} /> Chỉnh sửa
                  </button>
                )}

                {current && (
                  <ListenMode
                    pageId={null}
                    chapterId={current.chapter_id}
                    chapterPageCount={series?.chapters.find(c => c.chapter_id === current.chapter_id)?.page_count}
                  />
                )}

                <button
                  onClick={() => setImmersive(true)}
                  className="btn btn-sm btn-ghost"
                  title="Đọc toàn màn hình (F)"
                  style={{ fontSize: 11, padding: "4px 8px" }}
                >
                  <Icon name="eye" size={11} /> Toàn màn hình
                </button>
              </div>

              <div style={{ flex: 1 }} />

              <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                Phím: <kbd>V</kbd> đổi chế độ · <kbd>F</kbd> toàn màn hình · <kbd>←</kbd><kbd>→</kbd> chuyển trang
              </span>
            </div>
          )}

          {recap && recap.chapterId === current?.chapter_id && (
            <div
              className="stroke-ink"
              style={{
                background: "var(--panel)",
                boxShadow: "4px 4px 0 0 var(--border)",
                padding: "12px 14px",
                marginBottom: 12,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: 1 }}>
                <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 4 }}>
                  Trước đó trong truyện…
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--fg)" }}>{recap.text}</div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={dismissRecap}
                aria-label="Đóng tóm tắt"
                style={{ padding: 4, flexShrink: 0 }}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: 80, color: "var(--muted)" }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                style={{ display: "inline-flex" }}
              >
                <Icon name="refresh" size={28} />
              </motion.div>
              <div style={{ marginTop: 10 }}>Đang tải bộ truyện…</div>
            </div>
          ) : error ? (
            <div className="stroke-ink" style={{ background: "var(--panel)", padding: 20, color: "var(--accent)" }}>
              {error}
            </div>
          ) : flatPages.length === 0 ? (
            <div
              className="stroke-ink"
              style={{ background: "var(--panel)", padding: "60px 20px", textAlign: "center", color: "var(--muted)" }}
            >
              <div className="serif" style={{ fontSize: 48, opacity: 0.3 }}>巻</div>
              <div style={{ marginTop: 8 }}>Bộ truyện này chưa có trang nào.</div>
              <Link href={`/upload?series_id=${id}`} style={{ display: "inline-block", marginTop: 14, textDecoration: "none" }}>
                <button className="btn btn-sm btn-primary">
                  <Icon name="upload" size={12} /> Upload trang đầu tiên
                </button>
              </Link>
            </div>
          ) : mode === "pageflip" ? (
            <>
              <motion.div
                className="stroke-ink panel-shadow"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={handleDragEnd}
                style={{
                  background: "var(--panel)",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 400,
                  cursor: "grab",
                  touchAction: "pan-y",
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current?.page_id || index}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                    style={{ width: "100%", display: "flex", justifyContent: "center" }}
                  >
                    {isReady && imageUrl && current ? (
                      <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
                        {translationMode === "sidebyside" ? (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, alignItems: "start" }}>
                            {[
                              { label: "Bản gốc", url: currentImages.primary },
                              { label: "Bản dịch", url: currentImages.secondary },
                            ].map(item => (
                              <div key={item.label}>
                                <div className="caps-xs" style={{ color: item.label === "Bản dịch" ? "var(--accent)" : "var(--muted)", marginBottom: 6 }}>
                                  {item.label}
                                </div>
                                {item.url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.url}
                                    alt={`${item.label} trang ${current.page_number ?? index + 1}`}
                                    draggable={false}
                                    ref={captureLoadedImageDims(current.page_id)}
                                    onLoad={captureDims(current.page_id)}
                                    style={{
                                      maxWidth: "100%",
                                      height: "auto",
                                      display: "block",
                                      userSelect: "none",
                                      pointerEvents: "none",
                                      border: "2px solid var(--border)",
                                    }}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageUrl}
                              alt={`Trang ${current.page_number ?? index + 1}`}
                              draggable={false}
                              ref={captureLoadedImageDims(current.page_id)}
                              onLoad={captureDims(current.page_id)}
                              style={{
                                maxWidth: "100%",
                                height: "auto",
                                display: "block",
                                userSelect: "none",
                                pointerEvents: "none",
                              }}
                            />
                            {translationMode === "tap" && (
                              <SeriesBubbleLayer
                                bubbles={currentBubbles}
                                dims={imgDims[current.page_id]}
                                selected={selectedBubble}
                                onSelect={setSelectedBubble}
                                mode="tap"
                              />
                            )}
                            {translationMode === "overlay" && !currentTranslatedUrl && currentBubbles.length > 0 && (
                              <SeriesBubbleLayer
                                bubbles={currentBubbles}
                                dims={imgDims[current.page_id]}
                                selected={selectedBubble}
                                onSelect={setSelectedBubble}
                                mode="overlay"
                              />
                            )}
                            {renderHighlight(current.page_id)}
                          </>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
                        <Icon name="alert" size={28} />
                        <div style={{ marginTop: 10, fontSize: 13 }}>
                          {current?.status === "completed" || current?.status === "translated"
                            ? "Không có ảnh để hiển thị."
                            : "Trang này chưa được dịch xong."}
                        </div>
                        <Link
                          href={`/reader?page=${current?.page_id}`}
                          style={{ display: "inline-block", marginTop: 10, textDecoration: "none" }}
                        >
                          <button className="btn btn-sm">
                            <Icon name="external" size={11} /> Mở trang đơn
                          </button>
                        </Link>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {/* Bottom nav */}
              {!immersive && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 16,
                  padding: "10px 14px",
                  background: "var(--panel)",
                  border: "2px solid var(--border)",
                  boxShadow: "3px 3px 0 var(--border)",
                  position: "sticky",
                  bottom: 16,
                }}
              >
                <motion.button
                  whileHover={{ scale: hasPrev ? 1.04 : 1 }}
                  whileTap={{ scale: hasPrev ? 0.96 : 1 }}
                  onClick={goPrev}
                  disabled={!hasPrev}
                  className="btn btn-sm"
                  style={{ opacity: hasPrev ? 1 : 0.4 }}
                >
                  <Icon name="chevron-left" size={12} /> Trang trước
                </motion.button>

                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: "var(--bg-3)",
                    border: "1px solid var(--border-soft)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      width: `${((index + 1) / flatPages.length) * 100}%`,
                    }}
                    transition={{ duration: 0.3 }}
                    style={{
                      height: "100%",
                      background: "var(--accent)",
                    }}
                  />
                </div>

                <span className="mono" style={{ fontSize: 11, color: "var(--muted)", minWidth: 60, textAlign: "center" }}>
                  {index + 1} / {flatPages.length}
                </span>

                <motion.button
                  whileHover={{ scale: hasNext ? 1.04 : 1 }}
                  whileTap={{ scale: hasNext ? 0.96 : 1 }}
                  onClick={goNext}
                  disabled={!hasNext}
                  className="btn btn-sm btn-primary"
                  style={{ opacity: hasNext ? 1 : 0.4 }}
                >
                  Trang sau <Icon name="chevron-right" size={12} />
                </motion.button>
              </div>
              )}

              {!immersive && (
              <div style={{ marginTop: 8, textAlign: "center", fontSize: 10, color: "var(--muted)" }}>
                Phím <kbd style={{ padding: "1px 5px", border: "1px solid var(--border-soft)", fontSize: 9 }}>←</kbd> /{" "}
                <kbd style={{ padding: "1px 5px", border: "1px solid var(--border-soft)", fontSize: 9 }}>→</kbd> để chuyển trang
                · vuốt ngang trên điện thoại
              </div>
              )}
            </>
          ) : (
            // ── Long-strip / Webtoon mode ──
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: mode === "webtoon" ? 0 : 12,
                  paddingBottom: 80,
                }}
              >
                {flatPages.map((p, i) => {
                  const url = p.translated_image_url || p.original_image_url;
                  const ready = isPageReady(p);
                  return (
                    <div
                      key={p.page_id}
                      ref={el => { pageRefs.current[p.page_id] = el; }}
                      data-page-id={p.page_id}
                      className={mode === "longstrip" ? "stroke-ink panel-shadow" : ""}
                      style={{
                        background: "var(--panel)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: mode === "webtoon" ? 0 : 120,
                      }}
                    >
                      {ready && url ? (
                        <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Trang ${p.page_number ?? i + 1}`}
                            loading="lazy"
                            decoding="async"
                            ref={captureLoadedImageDims(p.page_id)}
                            onLoad={captureDims(p.page_id)}
                            style={{
                              maxWidth: "100%",
                              height: "auto",
                              display: "block",
                            }}
                          />
                          {renderHighlight(p.page_id)}
                        </div>
                      ) : (
                        <div style={{ padding: 30, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
                          <Icon name="alert" size={20} />
                          <div style={{ marginTop: 6 }}>
                            Trang {p.page_number ?? i + 1} chưa dịch xong
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Floating progress bar (long-strip / webtoon) */}
              {!immersive && (
                <div
                  style={{
                    position: "sticky",
                    bottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 14px",
                    background: "var(--panel)",
                    border: "2px solid var(--border)",
                    boxShadow: "3px 3px 0 var(--border)",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: "var(--bg-3)",
                      border: "1px solid var(--border-soft)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      initial={false}
                      animate={{ width: `${((index + 1) / flatPages.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                      style={{ height: "100%", background: "var(--accent)" }}
                    />
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)", minWidth: 60, textAlign: "center" }}>
                    {index + 1} / {flatPages.length}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Floating exit button when immersive */}
          {immersive && (
            <button
              onClick={() => setImmersive(false)}
              title="Thoát toàn màn hình (Esc)"
              style={{
                position: "fixed",
                top: 12,
                right: 12,
                zIndex: 1000,
                padding: "6px 10px",
                background: "var(--panel)",
                border: "2px solid var(--border)",
                color: "var(--fg)",
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Icon name="close" size={11} /> Thoát
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showEditPanel && current && (
          <motion.aside
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: "fixed",
              top: immersive ? 0 : 56,
              right: 0,
              bottom: 0,
              width: "min(420px, 100vw)",
              zIndex: 1001,
              background: "var(--bg-2)",
              borderLeft: "2px solid var(--border)",
              boxShadow: "-6px 0 0 rgba(17,17,17,0.12)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: 18, borderBottom: "2px solid var(--border)", background: "var(--panel)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div className="caps-sm" style={{ color: "var(--accent)" }}>Chỉnh sửa ngữ cảnh</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>
                    Chương {current.chapter_number}
                    {current.chapter_title ? ` · ${current.chapter_title}` : ""} · Trang {current.page_number ?? index + 1}
                  </div>
                </div>
                <button className="btn btn-sm btn-ghost" style={{ padding: 5 }} onClick={() => setShowEditPanel(false)} aria-label="Đóng panel chỉnh sửa">
                  <Icon name="x" size={13} />
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Link href={`/studio/${current.page_id}`} className="btn btn-sm btn-ghost" style={{ textDecoration: "none", fontSize: 11 }}>
                  <Icon name="external" size={11} /> Studio QC
                </Link>
                <button
                  className="btn btn-sm btn-ghost"
                  style={{ fontSize: 11 }}
                  onClick={async () => {
                    const text = currentBubbles
                      .map((bubble, bubbleIndex) => `[${bubbleIndex + 1}] ${editTexts[bubble.bubble_id] ?? bubble.translated_text}`)
                      .join("\n\n");
                    try {
                      await navigator.clipboard.writeText(text);
                      toast(`Đã copy ${currentBubbles.length} bubble.`, "success");
                    } catch {
                      toast("Không thể copy.", "error");
                    }
                  }}
                  disabled={currentBubbles.length === 0}
                >
                  <Icon name="copy" size={11} /> Copy tất cả
                </button>
              </div>
            </div>

            <div className="scroll" style={{ flex: 1, overflowY: "auto", padding: 18 }}>
              {!currentDetail ? (
                <div style={{ color: "var(--muted)", fontSize: 13 }}>Đang tải dữ liệu bubble…</div>
              ) : currentBubbles.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: 13 }}>Trang này chưa có bubble để chỉnh.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {currentBubbles.map((bubble, bubbleIndex) => {
                    const isSaving = savingBubbleId === bubble.bubble_id;
                    const currentText = editTexts[bubble.bubble_id] ?? bubble.translated_text;
                    return (
                      <div key={bubble.bubble_id} className="stroke-ink" style={{ background: "var(--panel)", padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                          <span className="mono" style={{ fontSize: 11, fontWeight: 800 }}>#{bubbleIndex + 1}</span>
                          <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                            {(bubble.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.45, marginBottom: 8 }}>
                          {bubble.original_text || "Không có OCR gốc"}
                        </div>
                        <textarea
                          value={currentText}
                          onChange={(event) => setEditTexts(prev => ({ ...prev, [bubble.bubble_id]: event.target.value }))}
                          rows={3}
                          style={{
                            width: "100%",
                            resize: "vertical",
                            border: "1.5px solid var(--border)",
                            background: "#fff",
                            color: "var(--fg)",
                            padding: 8,
                            fontSize: 12,
                            lineHeight: 1.4,
                            fontFamily: "var(--font-serif)",
                            boxSizing: "border-box",
                          }}
                        />
                        <button
                          className="btn btn-sm btn-primary"
                          style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                          disabled={isSaving}
                          onClick={() => saveContextEdit(bubble)}
                        >
                          <Icon name="check" size={13} /> {isSaving ? "Đang lưu..." : "Lưu bản sửa"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Floating RAG Q&A — reachable in every mode, including immersive */}
      {isAuthenticated && flatPages.length > 0 && !showQA && (
        <button
          onClick={() => setShowQA(true)}
          aria-label="Hỏi AI về truyện"
          title="Hỏi AI về truyện (RAG semantic)"
          style={{
            position: "fixed", bottom: 20, right: 20, zIndex: 999,
            padding: "10px 16px", background: "var(--accent)", color: "#fff",
            border: "2px solid var(--border)", boxShadow: "3px 3px 0 var(--border)",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          💬 Hỏi AI
        </button>
      )}
      {showQA && (
        <QAChatPanel seriesId={id} onClose={() => setShowQA(false)} onOpenSource={openSource} />
      )}
    </AnimatedPage>
  );
}
