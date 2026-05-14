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
  const containerRef = useRef<HTMLDivElement>(null);

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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  // Scroll to top on page change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [index]);

  const handleJumpToChapter = (chapterId: string) => {
    const idx = flatPages.findIndex(p => p.chapter_id === chapterId);
    if (idx >= 0) setIndex(idx);
  };

  const imageUrl = current?.translated_image_url || current?.original_image_url;
  const isReady =
    current && (current.status === "completed" || current.status === "translated") && imageUrl;

  return (
    <AnimatedPage>
      <div
        ref={containerRef}
        className="paper-grain"
        style={{ minHeight: "100vh", overflow: "auto" }}
      >
        <TopBar active="series" />
        <div style={{ padding: "16px 24px", maxWidth: 900, margin: "0 auto" }}>
          {/* Breadcrumb / header */}
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
          ) : (
            <>
              <div
                className="stroke-ink panel-shadow"
                style={{
                  background: "var(--panel)",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 400,
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
                        style={{
                          maxWidth: "100%",
                          height: "auto",
                          display: "block",
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
              </div>

              {/* Bottom nav */}
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

              <div style={{ marginTop: 8, textAlign: "center", fontSize: 10, color: "var(--muted)" }}>
                Phím <kbd style={{ padding: "1px 5px", border: "1px solid var(--border-soft)", fontSize: 9 }}>←</kbd> /{" "}
                <kbd style={{ padding: "1px 5px", border: "1px solid var(--border-soft)", fontSize: 9 }}>→</kbd> để chuyển trang
              </div>
            </>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
