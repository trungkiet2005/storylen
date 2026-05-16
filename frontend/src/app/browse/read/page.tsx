"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { FadeIn } from "@/components/Animations";
import { motion, AnimatePresence } from "framer-motion";
import {
  mdxChapter,
  mdxChapterPages,
  mdxChapters,
  mdxPageUrls,
  mdxSaveReading,
  mdxLanguageFlag,
  type MdxChapter,
} from "@/lib/api";

// ── Page image component ───────────────────────────────────────────────────────

function PageImage({ src, index, eager }: { src: string; index: number; eager?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        background: errored ? "var(--bg-2)" : "var(--bg-3, var(--bg-2))",
        minHeight: errored ? 80 : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {!loaded && !errored && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--bg-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 300,
          }}
        >
          <span style={{ color: "var(--muted)", animation: "spin 1s linear infinite", display: "inline-flex" }}>
            <Icon name="refresh" size={20} />
          </span>
        </div>
      )}
      {errored && (
        <div style={{ padding: "20px 0", color: "var(--muted)", fontSize: 13 }}>
          <Icon name="alert" size={16} /> Trang {index + 1} không tải được
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
        style={{
          display: errored ? "none" : "block",
          width: "100%",
          height: "auto",
        }}
      />
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function chapterLabel(ch: MdxChapter): string {
  const num = ch.attributes.chapter ?? "?";
  const title = ch.attributes.title ? ` — ${ch.attributes.title}` : "";
  return `Chương ${num}${title}`;
}

// ── End-of-chapter CTA ─────────────────────────────────────────────────────────

function EndOfChapter({
  chapters,
  chapterIndex,
  currentLabel,
  onSwitch,
  onBack,
}: {
  chapters: MdxChapter[];
  chapterIndex: number;
  currentLabel: string;
  onSwitch: (id: string) => void;
  onBack: () => void;
}) {
  const prev = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
  const next = chapterIndex >= 0 && chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "32px auto 64px",
        padding: "24px 24px 20px",
        border: "2px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--panel)",
        boxShadow: "4px 4px 0 var(--border)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: 6,
        }}
      >
        Hết chương
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{currentLabel}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        {prev && (
          <button className="btn btn-secondary" onClick={() => onSwitch(prev.id)} style={{ flex: "1 1 200px" }}>
            <Icon name="arrow-left" size={14} />
            <span style={{ marginLeft: 6 }}>
              {mdxLanguageFlag(prev.attributes.translatedLanguage)} {chapterLabel(prev)}
            </span>
          </button>
        )}
        {next ? (
          <button className="btn btn-primary" onClick={() => onSwitch(next.id)} style={{ flex: "1 1 200px", fontWeight: 700 }}>
            <span>
              Tiếp: {mdxLanguageFlag(next.attributes.translatedLanguage)} {chapterLabel(next)}
            </span>
            <Icon name="arrow-right" size={14} />
          </button>
        ) : (
          <div
            style={{
              flex: "1 1 200px",
              padding: "10px 14px",
              border: "1.5px dashed var(--border)",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            🏁 Đây là chương mới nhất
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <select
          className="form-select"
          value=""
          onChange={(e) => { if (e.target.value) onSwitch(e.target.value); }}
          style={{ flex: 1, minWidth: 200, padding: "6px 10px", fontSize: 12 }}
        >
          <option value="">Nhảy tới chương khác…</option>
          {chapters.map((ch, i) => (
            <option key={ch.id} value={ch.id} disabled={i === chapterIndex}>
              {mdxLanguageFlag(ch.attributes.translatedLanguage)} {chapterLabel(ch)}
              {i === chapterIndex ? " (đang đọc)" : ""}
            </option>
          ))}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="arrow-left" size={13} /> Kho truyện
        </button>
      </div>
    </div>
  );
}

// ── Reader content ─────────────────────────────────────────────────────────────

function ReaderContent() {
  const params = useSearchParams();
  const router = useRouter();
  const initialChapterId = params?.get("chapterId") ?? "";
  const initialMangaId = params?.get("mangaId") ?? "";
  const initialMangaTitle = params?.get("mangaTitle") ?? "";
  const initialChapterLabel = params?.get("chapterLabel") ?? "";
  const initialMode = (params?.get("mode") === "page" ? "page" : "scroll") as "scroll" | "page";

  // Live state — chapterId & mangaId mutate as the user navigates between chapters
  const [chapterId, setChapterId] = useState(initialChapterId);
  const [mangaId, setMangaId] = useState(initialMangaId);
  const [mangaTitle, setMangaTitle] = useState(initialMangaTitle);
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageMode, setPageMode] = useState<"scroll" | "page">(initialMode);
  const [currentPage, setCurrentPage] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);

  // Chapter list (sorted asc by chapter number)
  const [chapters, setChapters] = useState<MdxChapter[]>([]);
  const [chaptersReady, setChaptersReady] = useState(false);

  const lastScrollY = useRef(0);

  // ── Hydrate mangaId from chapterId when missing (came from external link) ───
  useEffect(() => {
    if (mangaId || !chapterId) return;
    let cancelled = false;
    mdxChapter(chapterId)
      .then((res) => {
        if (cancelled) return;
        const rel = res.data.relationships.find((r) => r.type === "manga");
        if (rel?.id) setMangaId(rel.id);
      })
      .catch(() => {/* hydration is best-effort */});
    return () => { cancelled = true; };
  }, [chapterId, mangaId]);

  // ── Load chapter list when mangaId is known ─────────────────────────────────
  useEffect(() => {
    if (!mangaId) return;
    let cancelled = false;
    setChaptersReady(false);
    mdxChapters(mangaId, 100)
      .then((res) => {
        if (cancelled) return;
        setChapters(res.data);
        setChaptersReady(true);
      })
      .catch(() => {
        if (!cancelled) setChaptersReady(true);
      });
    return () => { cancelled = true; };
  }, [mangaId]);

  // ── Load the chapter's pages ────────────────────────────────────────────────
  useEffect(() => {
    if (!chapterId) {
      setError("Thiếu chapter ID");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    mdxChapterPages(chapterId)
      .then((data) => {
        if (cancelled) return;
        const urls = mdxPageUrls(data);
        if (!urls.length) throw new Error("Chương này không có trang nào");
        setPages(urls);
        setCurrentPage(0);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Không thể tải trang");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [chapterId, retryNonce]);

  // ── Auto-hide header on scroll down ─────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHeaderVisible(y < lastScrollY.current || y < 60);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Page mode keyboard nav ──────────────────────────────────────────────────
  const prevPage = useCallback(() => setCurrentPage((p) => Math.max(0, p - 1)), []);
  const nextPage = useCallback(
    () => setCurrentPage((p) => Math.min(pages.length - 1, p + 1)),
    [pages.length],
  );

  useEffect(() => {
    if (pageMode !== "page") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") nextPage();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prevPage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pageMode, nextPage, prevPage]);

  // ── Chapter navigation ──────────────────────────────────────────────────────
  const chapterIndex = useMemo(
    () => chapters.findIndex((c) => c.id === chapterId),
    [chapters, chapterId],
  );
  const hasPrev = chapterIndex > 0;
  const hasNext = chapterIndex >= 0 && chapterIndex < chapters.length - 1;

  const switchChapter = (nextId: string) => {
    if (!nextId || nextId === chapterId) return;
    setChapterId(nextId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goChapter = (dir: -1 | 1) => {
    if (chapterIndex < 0) return;
    const target = chapters[chapterIndex + dir];
    if (target) switchChapter(target.id);
  };

  const currentLabel = useMemo(() => {
    const ch = chapters.find((c) => c.id === chapterId);
    return ch ? chapterLabel(ch) : initialChapterLabel || "";
  }, [chapters, chapterId, initialChapterLabel]);

  // Persist last-read state once we know the chapter (and ideally its nicer label).
  useEffect(() => {
    if (!chapterId) return;
    mdxSaveReading({ mangaId, mangaTitle, chapterId, chapterLabel: currentLabel });
  }, [chapterId, mangaId, mangaTitle, currentLabel]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Sticky reading header */}
      <AnimatePresence>
        {headerVisible && (
          <motion.div
            initial={{ y: -60 }}
            animate={{ y: 0 }}
            exit={{ y: -60 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              background: "var(--panel)",
              borderBottom: "2px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 16px",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {/* Left: back + title */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: "1 1 220px" }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => router.push("/browse")}
                style={{ flexShrink: 0 }}
              >
                <Icon name="arrow-left" size={14} /> Kho
              </button>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {mangaTitle || "MangaDex"}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{currentLabel}</div>
              </div>
            </div>

            {/* Middle: chapter switcher */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 1 auto" }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => goChapter(-1)}
                disabled={loading || !chaptersReady || !hasPrev}
                title="Chương trước"
              >
                <Icon name="arrow-left" size={13} />
              </button>
              <select
                className="form-select"
                value={chapterId}
                onChange={(e) => switchChapter(e.target.value)}
                disabled={loading || !chaptersReady || chapters.length === 0}
                style={{ minWidth: 200, maxWidth: 280, padding: "4px 8px", fontSize: 12 }}
              >
                {chapters.length === 0 && (
                  <option value={chapterId}>
                    {chaptersReady ? "(không có chương)" : "Đang tải chương..."}
                  </option>
                )}
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {chapterLabel(ch)}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => goChapter(1)}
                disabled={loading || !chaptersReady || !hasNext}
                title="Chương sau"
              >
                <Icon name="arrow-right" size={13} />
              </button>
            </div>

            {/* Right: page count + mode toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {pages.length > 0 && (
                <span style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                  {pageMode === "page" ? `${currentPage + 1} / ${pages.length}` : `${pages.length} trang`}
                </span>
              )}
              <button
                className={`btn btn-sm ${pageMode === "scroll" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setPageMode("scroll")}
                title="Chế độ cuộn"
              >
                <Icon name="layers" size={13} />
              </button>
              <button
                className={`btn btn-sm ${pageMode === "page" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => { setPageMode("page"); setCurrentPage(0); }}
                title="Chế độ trang"
              >
                <Icon name="book" size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div style={{ paddingTop: 60 }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--muted)" }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-flex" }}>
              <Icon name="refresh" size={24} />
            </span>
            <div style={{ marginTop: 12, fontSize: 14 }}>Đang tải trang truyện...</div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--accent)" }}>
            <Icon name="alert" size={28} />
            <div style={{ marginTop: 12, fontSize: 14 }}>{error}</div>
            <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setRetryNonce((n) => n + 1)}
              >
                <Icon name="refresh" size={13} /> Thử lại
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => router.push("/browse")}
              >
                ← Quay lại
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {pageMode === "scroll" && (
              <FadeIn>
                <div style={{ maxWidth: 800, margin: "0 auto" }}>
                  {pages.map((src, i) => (
                    <PageImage key={`${chapterId}-${i}`} src={src} index={i} eager={i < 2} />
                  ))}
                </div>
                {chaptersReady && pages.length > 0 && (
                  <EndOfChapter
                    chapters={chapters}
                    chapterIndex={chapterIndex}
                    currentLabel={currentLabel}
                    onSwitch={switchChapter}
                    onBack={() => router.push("/browse")}
                  />
                )}
              </FadeIn>
            )}

            {pageMode === "page" && pages.length > 0 && (
              <div style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${chapterId}-${currentPage}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                  >
                    <PageImage src={pages[currentPage]} index={currentPage} eager />
                  </motion.div>
                </AnimatePresence>

                {/* Page navigation */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 16,
                    padding: "20px 0 32px",
                  }}
                >
                  <button
                    className="btn btn-ghost"
                    onClick={prevPage}
                    disabled={currentPage === 0}
                  >
                    <Icon name="arrow-left" size={16} /> Trước
                  </button>
                  <span style={{ fontSize: 13, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                    {currentPage + 1} / {pages.length}
                  </span>
                  <button
                    className="btn btn-ghost"
                    onClick={nextPage}
                    disabled={currentPage === pages.length - 1}
                  >
                    Sau <Icon name="arrow-right" size={16} />
                  </button>
                </div>

                {currentPage === pages.length - 1 && chaptersReady && (
                  <EndOfChapter
                    chapters={chapters}
                    chapterIndex={chapterIndex}
                    currentLabel={currentLabel}
                    onSwitch={switchChapter}
                    onBack={() => router.push("/browse")}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function BrowseReadPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
        <span style={{ animation: "spin 1s linear infinite", display: "inline-flex" }}>
          <Icon name="refresh" size={24} />
        </span>
      </div>
    }>
      <ReaderContent />
    </Suspense>
  );
}
