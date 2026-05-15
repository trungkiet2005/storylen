"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { AnimatePresence, motion } from "framer-motion";
import {
  mdxChapterPages,
  mdxChapters,
  mdxPageUrls,
  mdxSaveReading,
  type MdxChapter,
} from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function chapterLabel(ch: MdxChapter): string {
  const num = ch.attributes.chapter ?? "?";
  return ch.attributes.title
    ? `Chương ${num} — ${ch.attributes.title}`
    : `Chương ${num}`;
}

// ── Page image ─────────────────────────────────────────────────────────────────

function PageImage({ src, index, eager }: { src: string; index: number; eager?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 950,
        margin: "0 auto",
        lineHeight: 0,
        position: "relative",
        background: "var(--bg-2)",
        minHeight: loaded || errored ? undefined : 400,
      }}
    >
      {!loaded && !errored && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 400,
            color: "var(--muted)",
          }}
        >
          <span style={{ animation: "spin 1s linear infinite", display: "inline-flex" }}>
            <Icon name="refresh" size={18} />
          </span>
        </div>
      )}
      {errored && (
        <div
          style={{
            padding: "20px 0",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 13,
            minHeight: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Icon name="alert" size={14} /> Trang {index + 1} không tải được
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Trang ${index + 1}`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        style={{ display: errored ? "none" : "block", width: "100%", height: "auto" }}
      />
    </div>
  );
}

// ── Reader ────────────────────────────────────────────────────────────────────

function ReaderContent() {
  const params = useSearchParams();
  const router = useRouter();

  const initChapterId = params?.get("chapterId") ?? "";
  const initMangaId   = params?.get("mangaId")   ?? "";
  const initTitle     = params?.get("mangaTitle") ?? "";

  const [pages, setPages]               = useState<string[]>([]);
  const [chapters, setChapters]         = useState<MdxChapter[]>([]);
  const [chapterId, setChapterId]       = useState(initChapterId);
  const [mangaId]                       = useState(initMangaId);
  const [mangaTitle]                    = useState(initTitle);
  const [currentLabel, setCurrentLabel] = useState(params?.get("chapterLabel") ?? "");
  const [loading, setLoading]           = useState(!!initChapterId);
  const [error, setError]               = useState("");
  const [mode, setMode]                 = useState<"scroll" | "page">("scroll");
  const [currentPage, setCurrentPage]   = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const loadedCount = useRef(0);

  // ── Load page images for a chapter ──────────────────────────────────────────
  const loadChapter = useCallback(async (cid: string, label = "") => {
    setLoading(true);
    setError("");
    setPages([]);
    setCurrentPage(0);
    setChapterId(cid);
    if (label) setCurrentLabel(label);
    loadedCount.current += 1;
    const thisLoad = loadedCount.current;

    try {
      const data = await mdxChapterPages(cid);
      if (thisLoad !== loadedCount.current) return; // stale
      const urls = mdxPageUrls(data);
      if (!urls.length) throw new Error("Chương này không có trang nào");
      setPages(urls);
      if (mangaTitle) {
        mdxSaveReading({ mangaId, mangaTitle, chapterId: cid, chapterLabel: label });
      }
    } catch (e: unknown) {
      if (thisLoad !== loadedCount.current) return;
      setError(e instanceof Error ? e.message : "Không thể tải trang");
    } finally {
      if (thisLoad === loadedCount.current) setLoading(false);
    }
  }, [mangaId, mangaTitle]);

  // ── Load chapter list for navigation ────────────────────────────────────────
  useEffect(() => {
    if (!mangaId) return;
    mdxChapters(mangaId, 200).then((res) => setChapters(res.data)).catch(() => {});
  }, [mangaId]);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initChapterId) loadChapter(initChapterId, params?.get("chapterLabel") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-hide header on scroll ───────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHeaderVisible(y < lastScrollY.current || y < 80);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Keyboard navigation (page mode) ─────────────────────────────────────────
  const prevPage = useCallback(() => setCurrentPage((p) => Math.max(0, p - 1)), []);
  const nextPage = useCallback(() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1)), [pages.length]);

  useEffect(() => {
    if (mode !== "page") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") nextPage();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   prevPage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, nextPage, prevPage]);

  // ── Chapter navigation helpers ───────────────────────────────────────────────
  const currentIndex = chapters.findIndex((c) => c.id === chapterId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < chapters.length - 1;

  const goChapter = (dir: -1 | 1) => {
    const target = chapters[currentIndex + dir];
    if (!target) return;
    const label = chapterLabel(target);
    window.scrollTo({ top: 0 });
    loadChapter(target.id, label);
  };

  const onSelectChapter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const target = chapters.find((c) => c.id === e.target.value);
    if (!target) return;
    window.scrollTo({ top: 0 });
    loadChapter(target.id, chapterLabel(target));
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", color: "#eee" }}>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {headerVisible && (
          <motion.header
            initial={{ y: -64 }}
            animate={{ y: 0 }}
            exit={{ y: -64 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0,
              zIndex: 200,
              background: "rgba(10,10,14,0.96)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              flexWrap: "wrap",
            }}
          >
            {/* Back */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => router.push("/browse")}
              style={{ flexShrink: 0, color: "#ccc" }}
            >
              <Icon name="arrow-left" size={14} /> Kho
            </button>

            {/* Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {mangaTitle || "MangaDex Reader"}
              </div>
              {currentLabel && (
                <div style={{ fontSize: 11, color: "#888" }}>{currentLabel}</div>
              )}
            </div>

            {/* Chapter selector */}
            {chapters.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => goChapter(-1)}
                  disabled={!hasPrev || loading}
                  title="Chương trước"
                  style={{ color: "#ccc" }}
                >
                  <Icon name="chevron-left" size={14} />
                </button>

                <select
                  value={chapterId}
                  onChange={onSelectChapter}
                  disabled={loading}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#eee",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 12,
                    maxWidth: 220,
                  }}
                >
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id} style={{ background: "#1a1a1a" }}>
                      {chapterLabel(ch)}
                    </option>
                  ))}
                </select>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => goChapter(1)}
                  disabled={!hasNext || loading}
                  title="Chương sau"
                  style={{ color: "#ccc" }}
                >
                  <Icon name="chevron-right" size={14} />
                </button>
              </div>
            )}

            {/* Page counter + mode toggles */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {pages.length > 0 && (
                <span style={{ fontSize: 11, color: "#888", fontVariantNumeric: "tabular-nums" }}>
                  {mode === "page" ? `${currentPage + 1} / ${pages.length}` : `${pages.length} trang`}
                </span>
              )}
              <button
                className="btn btn-sm"
                onClick={() => setMode("scroll")}
                title="Cuộn dọc"
                style={{
                  background: mode === "scroll" ? "var(--accent)" : "rgba(255,255,255,0.08)",
                  color: "#eee",
                  border: "none",
                }}
              >
                <Icon name="layers" size={13} />
              </button>
              <button
                className="btn btn-sm"
                onClick={() => { setMode("page"); setCurrentPage(0); }}
                title="Lật trang"
                style={{
                  background: mode === "page" ? "var(--accent)" : "rgba(255,255,255,0.08)",
                  color: "#eee",
                  border: "none",
                }}
              >
                <Icon name="book" size={13} />
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ── Content area ──────────────────────────────────────────────────── */}
      <div style={{ paddingTop: 60 }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 16px", color: "#888" }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-flex" }}>
              <Icon name="refresh" size={28} />
            </span>
            <div style={{ marginTop: 14, fontSize: 14 }}>Đang tải trang truyện...</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign: "center", padding: "80px 16px" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>😢</div>
            <div style={{ color: "#e55", fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{error}</div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>
              Thử chọn chương khác hoặc đợi vài giây rồi thử lại.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => loadChapter(chapterId, currentLabel)}
              >
                <Icon name="refresh" size={13} /> Thử lại
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => router.push("/browse")}
                style={{ color: "#ccc" }}
              >
                <Icon name="arrow-left" size={13} /> Về kho truyện
              </button>
            </div>
          </div>
        )}

        {/* Scroll mode — all pages */}
        {!loading && !error && mode === "scroll" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {pages.map((src, i) => (
              <PageImage key={src} src={src} index={i} eager={i < 2} />
            ))}
            {/* Bottom nav after last page */}
            {pages.length > 0 && hasNext && (
              <div style={{ textAlign: "center", padding: "32px 0 48px" }}>
                <button
                  className="btn btn-primary"
                  onClick={() => goChapter(1)}
                  style={{ minWidth: 180 }}
                >
                  Chương tiếp theo <Icon name="arrow-right" size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Page mode — single page */}
        {!loading && !error && mode === "page" && pages.length > 0 && (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.12 }}
                style={{ maxWidth: 950, margin: "0 auto" }}
              >
                <PageImage src={pages[currentPage]} index={currentPage} eager />
              </motion.div>
            </AnimatePresence>

            {/* Preload next */}
            {pages[currentPage + 1] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pages[currentPage + 1]} alt="" aria-hidden style={{ display: "none" }} />
            )}

            {/* Fixed bottom nav */}
            <div
              style={{
                position: "fixed",
                bottom: 20,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 200,
                display: "flex",
                gap: 10,
                alignItems: "center",
                background: "rgba(15,15,20,0.97)",
                padding: "10px 20px",
                borderRadius: 99,
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
              }}
            >
              <button
                className="btn btn-sm"
                onClick={prevPage}
                disabled={currentPage === 0}
                style={{ background: "rgba(255,255,255,0.08)", color: "#eee", border: "none" }}
              >
                <Icon name="chevron-left" size={16} />
              </button>
              <span style={{ fontSize: 13, color: "#aaa", fontVariantNumeric: "tabular-nums", minWidth: 70, textAlign: "center" }}>
                {currentPage + 1} / {pages.length}
              </span>
              <button
                className="btn btn-sm"
                onClick={nextPage}
                disabled={currentPage === pages.length - 1}
                style={{ background: "rgba(255,255,255,0.08)", color: "#eee", border: "none" }}
              >
                <Icon name="chevron-right" size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Suspense wrapper ──────────────────────────────────────────────────────────

export default function BrowseReadPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#0d0d0d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#888",
          }}
        >
          <span style={{ animation: "spin 1s linear infinite", display: "inline-flex" }}>
            <Icon name="refresh" size={28} />
          </span>
        </div>
      }
    >
      <ReaderContent />
    </Suspense>
  );
}
