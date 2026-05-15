"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { FadeIn } from "@/components/Animations";
import { motion, AnimatePresence } from "framer-motion";
import { mdxChapterPages } from "@/lib/api";

// ── Page image component ───────────────────────────────────────────────────────

function PageImage({ src, index }: { src: string; index: number }) {
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

// ── Reader content ─────────────────────────────────────────────────────────────

function ReaderContent() {
  const params = useSearchParams();
  const router = useRouter();
  const chapterId = params?.get("chapterId") ?? "";
  const mangaTitle = params?.get("mangaTitle") ?? "";
  const chapterLabel = params?.get("chapterLabel") ?? "";

  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageMode, setPageMode] = useState<"scroll" | "page">("scroll");
  const [currentPage, setCurrentPage] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = React.useRef(0);

  useEffect(() => {
    if (!chapterId) { setError("Thiếu chapter ID"); setLoading(false); return; }
    mdxChapterPages(chapterId)
      .then((data) => {
        const urls = data.chapter.data.map(
          (f: string) => `${data.baseUrl}/data/${data.chapter.hash}/${f}`,
        );
        setPages(urls);
      })
      .catch((e) => setError(e.message || "Không thể tải trang"))
      .finally(() => setLoading(false));
  }, [chapterId]);

  // Auto-hide header on scroll down
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHeaderVisible(y < lastScrollY.current || y < 60);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
              padding: "10px 20px",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
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
                  {mangaTitle}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{chapterLabel}</div>
              </div>
            </div>

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
            <button
              className="btn btn-ghost"
              onClick={() => router.push("/browse")}
              style={{ marginTop: 16 }}
            >
              ← Quay lại
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {pageMode === "scroll" && (
              <FadeIn>
                <div style={{ maxWidth: 800, margin: "0 auto" }}>
                  {pages.map((src, i) => (
                    <PageImage key={i} src={src} index={i} />
                  ))}
                </div>
              </FadeIn>
            )}

            {pageMode === "page" && pages.length > 0 && (
              <div style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                  >
                    <PageImage src={pages[currentPage]} index={currentPage} />
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
