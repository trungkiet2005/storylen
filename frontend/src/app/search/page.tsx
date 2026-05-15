"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/Animations";
import { motion } from "framer-motion";
import {
  mdxSearch,
  mdxCoverFromManga,
  mdxMangaTitle,
  type MdxManga,
} from "@/lib/api";

// ── Genre chip data ───────────────────────────────────────────────────────────

const GENRES = [
  { id: "", label: "Tất cả" },
  { id: "391b0423-d847-456f-aff0-8b0cfc03066b", label: "Action" },
  { id: "cdc58593-87dd-415e-bbc0-2ec27bf404cc", label: "Fantasy" },
  { id: "423e2eae-a7a2-4a8b-ac03-a8351462d71d", label: "Romance" },
  { id: "4d32cc48-9f00-4cca-9b5a-a839f0764984", label: "Comedy" },
  { id: "ace04997-f6bd-436e-b261-779182193d3d", label: "Isekai" },
  { id: "87cc87cd-a395-47af-b27a-93258283bbc6", label: "Adventure" },
  { id: "e5301a23-ebd9-49dd-a0cb-2add944c7fe9", label: "Slice of Life" },
  { id: "caaa44eb-cd40-4177-b930-79d3ef2afe87", label: "School Life" },
  { id: "3bb26d85-09d5-4d2e-880c-c34b974339e9", label: "Sports" },
  { id: "33771934-028e-4cb3-8744-691e866a923e", label: "Historical" },
  { id: "b29d6a3d-1569-4e7a-8caf-7557bc92cd5d", label: "Thriller" },
];

// ── Manga result card ─────────────────────────────────────────────────────────

function ResultCard({ manga, onRead }: { manga: MdxManga; onRead: (m: MdxManga) => void }) {
  const title = mdxMangaTitle(manga);
  const coverUrl = mdxCoverFromManga(manga);
  const genres = manga.attributes.tags
    .filter((t) => t.attributes.group === "genre")
    .map((t) => t.attributes.name.en)
    .slice(0, 2)
    .join(" · ");
  const done = manga.attributes.status === "completed";

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "5px 5px 0 var(--border)" }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      style={{
        background: "var(--panel)",
        border: "2px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "3px 3px 0 var(--border)",
      }}
    >
      {/* Cover */}
      <div
        style={{
          height: 190,
          backgroundImage: coverUrl ? `url('${coverUrl}')` : undefined,
          background: coverUrl
            ? undefined
            : "linear-gradient(135deg,var(--bg-2),var(--bg-3,var(--bg-2)))",
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)",
          }}
        />
        <div style={{ position: "absolute", bottom: 8, left: 8 }}>
          <span
            style={{
              display: "inline-block",
              padding: "2px 7px",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              borderRadius: 3,
              border: "1.5px solid",
              borderColor: done ? "var(--success,#16a34a)" : "var(--accent)",
              color: done ? "var(--success,#16a34a)" : "var(--accent)",
              background: done ? "rgba(22,163,74,0.1)" : "rgba(200,16,46,0.1)",
            }}
          >
            {done ? "Hoàn thành" : "Đang ra"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
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
        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          {genres || "Manga"}
          {manga.attributes.lastChapter && ` · ${manga.attributes.lastChapter} ch`}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginTop: "auto",
            paddingTop: 4,
          }}
        >
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onRead(manga)}
            style={{ flex: 1 }}
          >
            <Icon name="book" size={12} /> Đọc
          </button>
          <a
            className="btn btn-ghost btn-sm"
            href={`https://mangadex.org/title/${manga.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ whiteSpace: "nowrap" }}
          >
            <Icon name="external" size={12} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("");
  const [mangas, setMangas] = useState<MdxManga[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const LIMIT = 24;

  const doSearch = useCallback(
    async (q: string, genre: string, off = 0) => {
      setLoading(true);
      try {
        const res = await mdxSearch({
          title: q.trim() || undefined,
          tags: genre ? [genre] : undefined,
          limit: LIMIT,
          offset: off,
        });
        if (off === 0) {
          setMangas(res.data);
        } else {
          setMangas((prev) => [...prev, ...res.data]);
        }
        setTotal(res.total);
        setOffset(off);
        setHasMore(off + LIMIT < res.total);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Lỗi kết nối";
        toast(`Lỗi tìm kiếm: ${msg}`, "error");
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // Load popular on first render
  useEffect(() => { doSearch("", ""); }, [doSearch]);

  const handleSearch = () => doSearch(query, activeGenre, 0);

  const handleGenre = (id: string) => {
    setActiveGenre(id);
    doSearch(query, id, 0);
  };

  const handleRead = (manga: MdxManga) => {
    router.push(`/browse?mangaId=${manga.id}&mangaTitle=${encodeURIComponent(mdxMangaTitle(manga))}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <TopBar active="search" />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(16px,3vw,32px)" }}>
        <FadeIn>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 24,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <div
                className="display"
                style={{ fontSize: "clamp(22px,3vw,32px)", letterSpacing: "-0.02em", marginBottom: 4 }}
              >
                Tìm Truyện
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Dữ liệu thực từ MangaDex · Lọc theo thể loại
              </div>
            </div>
            {!loading && total > 0 && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {total.toLocaleString()} kết quả
              </div>
            )}
          </div>

          {/* Search input */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 16,
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
              placeholder="Nhập tên truyện..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              style={{ flex: 1, border: "none", background: "transparent", padding: 0, outline: "none" }}
            />
            {query && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setQuery(""); doSearch("", activeGenre, 0); }}
              >
                <Icon name="x" size={13} />
              </button>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? <Icon name="refresh" size={13} /> : "Tìm"}
            </button>
          </div>

          {/* Genre chips */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 28,
            }}
          >
            {GENRES.map((g) => (
              <button
                key={g.id}
                onClick={() => handleGenre(g.id)}
                style={{
                  padding: "5px 13px",
                  fontSize: 12,
                  fontWeight: activeGenre === g.id ? 700 : 500,
                  borderRadius: 20,
                  border: "1.5px solid",
                  borderColor: activeGenre === g.id ? "var(--accent)" : "var(--border)",
                  background: activeGenre === g.id ? "var(--accent)" : "var(--panel)",
                  color: activeGenre === g.id ? "#fff" : "var(--fg-soft)",
                  cursor: "pointer",
                  transition: "all 0.12s",
                  whiteSpace: "nowrap",
                }}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Loading skeleton */}
          {loading && mangas.length === 0 && (
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
                    height: 270,
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
              <div style={{ fontSize: 13 }}>Thử từ khoá khác hoặc đổi thể loại</div>
            </div>
          )}

          {/* Results grid */}
          {mangas.length > 0 && (
            <>
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
                      <ResultCard manga={m} onRead={handleRead} />
                    </StaggerItem>
                  ))}
                </div>
              </StaggerContainer>

              {/* Load more */}
              {hasMore && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
                  <button
                    className="btn btn-ghost"
                    disabled={loading}
                    onClick={() => doSearch(query, activeGenre, offset + LIMIT)}
                    style={{ minWidth: 160 }}
                  >
                    {loading ? (
                      <><Icon name="refresh" size={14} /> Đang tải...</>
                    ) : (
                      <>Tải thêm ({total - mangas.length} còn lại)</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </FadeIn>
      </main>
    </div>
  );
}
