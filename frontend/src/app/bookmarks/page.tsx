"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { SectionHeader } from "@/components/SectionHeader";
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from "@/components/Animations";
import { useWibu } from "@/contexts/WibuContext";
import { type Bookmark } from "@/lib/localStore";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function BookmarkCard({ bm, onRemove }: { bm: Bookmark; onRemove: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -3, boxShadow: "6px 6px 0 0 var(--border)" }}
      className="stroke-ink panel-shadow"
      style={{ background: "var(--panel)", overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      {/* Thumbnail */}
      <Link
        href={`/reader?page_id=${bm.pageId}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div
          style={{
            width: "100%", aspectRatio: "3/4",
            background: "var(--bg-3)",
            borderBottom: "2px solid var(--border)",
            position: "relative", overflow: "hidden",
          }}
          className="halftone-coarse"
        >
          {bm.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bm.thumbnailUrl}
              alt="bookmark"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)" }}>
              <Icon name="bookmark" size={32} />
            </div>
          )}
          {/* Bookmark ribbon */}
          <div style={{
            position: "absolute", top: 0, right: 14,
            width: 22, height: 36,
            background: "var(--accent)",
            clipPath: "polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)",
          }} />
        </div>
      </Link>

      <div style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {bm.seriesTitle && (
          <div className="serif" style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {bm.seriesTitle}
          </div>
        )}
        <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 8, alignItems: "center" }}>
          {bm.chapterNumber != null && <span>Ch.{bm.chapterNumber}</span>}
          {bm.pageNumber != null && <span>Trang {bm.pageNumber}</span>}
          <span style={{ marginLeft: "auto" }}>{formatDate(bm.savedAt)}</span>
        </div>
        {bm.note && (
          <div style={{
            fontSize: 11, color: "var(--fg-soft)", marginTop: 4,
            padding: "4px 8px", background: "var(--bg-2)",
            borderLeft: "3px solid var(--accent)", fontStyle: "italic",
          }}>
            {bm.note}
          </div>
        )}
      </div>

      <div style={{ padding: "8px 12px", borderTop: "1px dashed var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href={`/reader?page_id=${bm.pageId}`} style={{ textDecoration: "none" }}>
          <button className="btn btn-sm" style={{ padding: "4px 10px", fontSize: 11 }}>
            <Icon name="book" size={11} /> Đọc
          </button>
        </Link>
        <button
          className="btn btn-sm btn-ghost"
          onClick={onRemove}
          style={{ padding: "4px 8px", color: "var(--accent)" }}
          title="Xoá bookmark"
          aria-label="Xoá bookmark"
        >
          <Icon name="trash" size={12} />
        </button>
      </div>
    </motion.div>
  );
}

export default function BookmarksPage() {
  const { bookmarks, toggleBookmark, refreshStats } = useWibu();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    refreshStats();
  }, [refreshStats]);

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="bookmarks" />
        <div className="page-shell">
          <FadeIn direction="up" distance={20} delay={0.1}>
            <SectionHeader
              kanji="栞"
              label="Bookmark · Trang Yêu Thích"
              title="Những trang đã lưu lại"
              subtitle="Đánh dấu các trang ấn tượng trong reader để quay lại bất cứ lúc nào."
              stamp="SAVED"
            />
          </FadeIn>

          {!mounted ? null : bookmarks.length === 0 ? (
            <FadeIn direction="up" distance={15} delay={0.2}>
              <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--muted)" }}>
                <div className="serif" style={{ fontSize: 56, opacity: 0.25 }}>栞</div>
                <div style={{ marginTop: 12, fontSize: 14 }}>
                  Chưa có bookmark nào. Mở reader và nhấn nút{" "}
                  <Icon name="bookmark" size={13} /> để lưu trang yêu thích.
                </div>
                <Link href="/reader" style={{ display: "inline-block", marginTop: 16 }}>
                  <button className="btn btn-sm btn-primary">
                    <Icon name="book" size={13} /> Mở Reader
                  </button>
                </Link>
              </div>
            </FadeIn>
          ) : (
            <>
              <FadeIn direction="up" distance={10} delay={0.15}>
                <div style={{ marginBottom: 20, color: "var(--muted)", fontSize: 12 }}>
                  {bookmarks.length} trang đã bookmark
                </div>
              </FadeIn>
              <AnimatePresence>
                <StaggerContainer
                  staggerDelay={0.05}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: 16,
                  }}
                >
                  {bookmarks.map(bm => (
                    <StaggerItem key={bm.pageId} direction="up" distance={15}>
                      <BookmarkCard
                        bm={bm}
                        onRemove={() => toggleBookmark(bm)}
                      />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
