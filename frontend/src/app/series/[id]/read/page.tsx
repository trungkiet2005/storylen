"use client";
import React, { Suspense, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedPage } from "@/components/Animations";
import {
  APIError,
  getSeriesFull,
  type ChapterPage,
  type SeriesDetail,
} from "@/lib/api";

interface FlatPage extends ChapterPage {
  chapter_id: string;
  chapter_number: number;
  chapter_title: string | null;
}

type ReadMode = "pageflip" | "longstrip" | "webtoon";
const READ_MODE_KEY = "storylens_series_read_mode";
const PRELOAD_AHEAD = 2; // pages preloaded ahead of current

function loadReadMode(): ReadMode {
  if (typeof window === "undefined") return "pageflip";
  const v = window.localStorage.getItem(READ_MODE_KEY);
  if (v === "longstrip" || v === "webtoon" || v === "pageflip") return v;
  return "pageflip";
}

function isPageReady(p: FlatPage | undefined): boolean {
  if (!p) return false;
  return (p.status === "completed" || p.status === "translated") && !!(p.translated_image_url || p.original_image_url);
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

  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<ReadMode>("pageflip");
  const [immersive, setImmersive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Hydrate persisted mode after mount (avoids SSR flash)
  useEffect(() => {
    setMode(loadReadMode());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(READ_MODE_KEY, mode);
    }
  }, [mode]);

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

  const goPrev = useCallback(() => {
    if (hasPrev) setIndex(i => i - 1);
  }, [hasPrev]);
  const goNext = useCallback(() => {
    if (hasNext) setIndex(i => i + 1);
  }, [hasNext]);

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

  const imageUrl = current?.translated_image_url || current?.original_image_url;
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
                    onClick={() => setMode(m.id)}
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

              <button
                onClick={() => setImmersive(true)}
                className="btn btn-sm btn-ghost"
                title="Đọc toàn màn hình (F)"
                style={{ fontSize: 11, padding: "4px 8px" }}
              >
                <Icon name="eye" size={11} /> Toàn màn hình
              </button>

              <div style={{ flex: 1 }} />

              <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                Phím: <kbd>V</kbd> đổi chế độ · <kbd>F</kbd> toàn màn hình · <kbd>←</kbd><kbd>→</kbd> chuyển trang
              </span>
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
                    {isReady && imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={`Trang ${current.page_number ?? index + 1}`}
                        draggable={false}
                        style={{
                          maxWidth: "100%",
                          height: "auto",
                          display: "block",
                          userSelect: "none",
                          pointerEvents: "none",
                        }}
                      />
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
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={`Trang ${p.page_number ?? i + 1}`}
                          loading="lazy"
                          decoding="async"
                          style={{
                            maxWidth: "100%",
                            height: "auto",
                            display: "block",
                          }}
                        />
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
    </AnimatedPage>
  );
}
