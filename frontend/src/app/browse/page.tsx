"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/Animations";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { motion } from "framer-motion";
import {
  mdxPopular,
  mdxSearch,
  mdxCoverFromManga,
  mdxMangaTitle,
  type MdxManga,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// ── Genre filters (same UUIDs as MangaDex tags) ───────────────────────────────

const GENRES: { id: string; label: string }[] = [
  { id: "", label: "Tất cả" },
  { id: "391b0423-d847-456f-aff0-8b0cfc03066b", label: "Action" },
  { id: "cdc58593-87dd-415e-bbc0-2ec27bf404cc", label: "Fantasy" },
  { id: "423e2eae-a7a2-4a8b-ac03-a8351462d71d", label: "Romance" },
  { id: "4d32cc48-9f00-4cca-9b5a-a839f0764984", label: "Comedy" },
  { id: "ace04997-f6bd-436e-b261-779182193d3d", label: "Isekai" },
  { id: "87cc87cd-a395-47af-b27a-93258283bbc6", label: "Adventure" },
  { id: "e5301a23-ebd9-49dd-a0cb-2add944c7fe9", label: "Slice of Life" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function MangaStatusBadge({ status }: { status: string }) {
  const done = status === "completed";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 7px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        borderRadius: 3,
        border: "1.5px solid",
        borderColor: done ? "var(--success, #16a34a)" : "var(--accent)",
        color: done ? "var(--success, #16a34a)" : "var(--accent)",
        background: done ? "rgba(22,163,74,0.08)" : "rgba(200,16,46,0.08)",
      }}
    >
      {done ? "Hoàn thành" : "Đang ra"}
    </span>
  );
}

function MangaCard({ manga }: { manga: MdxManga }) {
  const title = mdxMangaTitle(manga);
  const coverUrl = mdxCoverFromManga(manga);
  const genres = manga.attributes.tags
    .filter((t) => t.attributes.group === "genre")
    .map((t) => t.attributes.name.en)
    .slice(0, 2)
    .join(" · ");

  return (
    <motion.a
      href={`/browse/manga?id=${manga.id}`}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ y: -3, boxShadow: "5px 5px 0 var(--border)" }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      style={{
        background: "var(--panel)",
        border: "2px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        boxShadow: "3px 3px 0 var(--border)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {/* Cover */}
      <div
        style={{
          height: 200,
          position: "relative",
          flexShrink: 0,
          overflow: "hidden",
          background: "linear-gradient(135deg,#2a2a35,#1a1a22)",
        }}
      >
        {coverUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={coverUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "absolute", bottom: 8, left: 8 }}>
          <MangaStatusBadge status={manga.attributes.status} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: "auto" }}>
          {genres || "Manga"}
          {manga.attributes.lastChapter && ` · ${manga.attributes.lastChapter} ch`}
        </div>
      </div>
    </motion.a>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BrowsePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [mangas, setMangas] = useState<MdxManga[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [genreId, setGenreId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMangas = useCallback(async (q: string, tagId: string) => {
    setLoading(true);
    try {
      const title = q.trim();
      const tags = tagId ? [tagId] : undefined;
      const res = title || tags
        ? await mdxSearch({ title: title || undefined, tags })
        : await mdxPopular();
      setMangas(res.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi kết nối";
      toast(`Không thể tải dữ liệu MangaDex: ${msg}`, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadMangas("", ""); }, [loadMangas]);

  const handleSearch = () => loadMangas(query, genreId);
  const handlePickGenre = (id: string) => {
    setGenreId(id);
    loadMangas(query, id);
  };

  return (
    <div className="browse-anim-wrap" style={{ minHeight: "100vh" }}>
      <AnimatedBackground playlist="cultivation" intervalMs={28_000} overlay={0.82} hideOnMobile />
      <TopBar active="browse" />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(16px,3vw,32px)", position: "relative", zIndex: 1 }}>
        <FadeIn>
          {/* Page header — sits on top of animated bg, so use paper text + shadow */}
          <div style={{ marginBottom: 24 }}>
            <div
              className="display"
              style={{
                fontSize: "clamp(22px,3vw,32px)",
                letterSpacing: "-0.02em",
                marginBottom: 6,
                color: "var(--paper)",
                textShadow: "0 2px 12px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.9)",
              }}
            >
              Kho Truyện
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(245,239,227,0.85)",
                textShadow: "0 1px 6px rgba(0,0,0,0.7)",
                fontWeight: 500,
              }}
            >
              Dữ liệu thực từ MangaDex · Mọi ngôn ngữ · Nhấn vào truyện để mở tab mới
            </div>
          </div>

          {/* Search bar */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 12,
              background: "var(--panel)",
              border: "2px solid var(--border)",
              padding: "10px 14px",
              borderRadius: "var(--radius)",
              boxShadow: "3px 3px 0 var(--border)",
            }}
          >
            <span style={{ color: "var(--muted)", flexShrink: 0, marginTop: 2, display: "flex" }}>
              <Icon name="search" size={18} />
            </span>
            <input
              ref={inputRef}
              className="form-input"
              placeholder="Tìm tên truyện..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              style={{ flex: 1, border: "none", background: "transparent", padding: 0, outline: "none" }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? <Icon name="refresh" size={13} /> : "Tìm"}
            </button>
            {query && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setQuery(""); loadMangas("", genreId); }}
              >
                <Icon name="x" size={13} />
              </button>
            )}
          </div>

          {/* Genre chips */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 28,
            }}
          >
            {GENRES.map((g) => {
              const active = g.id === genreId;
              return (
                <button
                  key={g.id || "all"}
                  onClick={() => handlePickGenre(g.id)}
                  disabled={loading}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    border: "1.5px solid",
                    borderColor: active ? "var(--accent)" : "var(--border)",
                    background: active ? "var(--accent)" : "var(--panel)",
                    color: active ? "var(--accent-fg, #fff)" : "var(--text)",
                    borderRadius: 99,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1,
                    transition: "all 0.12s",
                  }}
                >
                  {g.label}
                </button>
              );
            })}
          </div>

          {/* Loading state */}
          {loading && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
                gap: 16,
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 260,
                    background: "var(--bg-2)",
                    border: "2px solid var(--border)",
                    borderRadius: "var(--radius)",
                    animation: "pulse 1.4s ease-in-out infinite",
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && mangas.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 0", color: "var(--muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>😔</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                Không tìm thấy truyện nào
              </div>
              <div style={{ fontSize: 13 }}>Thử từ khoá khác hoặc xoá bộ lọc</div>
            </div>
          )}

          {/* Manga grid */}
          {!loading && mangas.length > 0 && (
            <StaggerContainer>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
                  gap: 16,
                }}
              >
                {mangas.map((m) => (
                  <StaggerItem key={m.id}>
                    <MangaCard manga={m} />
                  </StaggerItem>
                ))}
              </div>
            </StaggerContainer>
          )}
        </FadeIn>
      </main>
    </div>
  );
}
