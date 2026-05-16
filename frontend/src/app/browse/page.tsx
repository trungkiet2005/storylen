"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/Animations";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { motion, AnimatePresence } from "framer-motion";
import {
  mdxPopular,
  mdxSearch,
  mdxChapters,
  mdxCoverFromManga,
  mdxMangaTitle,
  mdxLanguageFlag,
  type MdxManga,
  type MdxChapter,
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

function MangaCard({
  manga,
  onSelect,
}: {
  manga: MdxManga;
  onSelect: (m: MdxManga) => void;
}) {
  const title = mdxMangaTitle(manga);
  const coverUrl = mdxCoverFromManga(manga);
  const genres = manga.attributes.tags
    .filter((t) => t.attributes.group === "genre")
    .map((t) => t.attributes.name.en)
    .slice(0, 2)
    .join(" · ");

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: "5px 5px 0 var(--border)" }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      onClick={() => onSelect(manga)}
      style={{
        background: "var(--panel)",
        border: "2px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        boxShadow: "3px 3px 0 var(--border)",
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
    </motion.div>
  );
}

// ── Chapter panel ─────────────────────────────────────────────────────────────

function ChapterPanel({
  manga,
  onClose,
}: {
  manga: MdxManga;
  onClose: () => void;
}) {
  const router = useRouter();
  const [chapters, setChapters] = useState<MdxChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [langFilter, setLangFilter] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    mdxChapters(manga.id)
      .then((res) => {
        setChapters(res.data);
        // Prefer Vietnamese, then English, otherwise the first language available.
        const langs = Array.from(
          new Set(res.data.map((c) => c.attributes.translatedLanguage ?? "")),
        ).filter(Boolean);
        const initial = langs.includes("vi") ? "vi" : langs.includes("en") ? "en" : (langs[0] ?? "");
        setLangFilter(initial);
      })
      .catch((e) => setError(e.message || "Lỗi tải chương"))
      .finally(() => setLoading(false));
  }, [manga.id]);

  // Languages present in this manga, sorted by chapter count desc.
  const availableLangs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of chapters) {
      const l = c.attributes.translatedLanguage ?? "";
      if (!l) continue;
      counts.set(l, (counts.get(l) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [chapters]);

  const filteredChapters = useMemo(
    () =>
      langFilter
        ? chapters.filter((c) => c.attributes.translatedLanguage === langFilter)
        : chapters,
    [chapters, langFilter],
  );

  // Whenever filter changes, default-select the latest chapter in that language.
  useEffect(() => {
    if (!filteredChapters.length) {
      setSelected("");
      return;
    }
    if (!filteredChapters.find((c) => c.id === selected)) {
      setSelected(filteredChapters[filteredChapters.length - 1].id);
    }
  }, [filteredChapters, selected]);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const goRead = (mode: "scroll" | "page") => {
    if (!selected) return;
    const ch = chapters.find((c) => c.id === selected);
    const label = ch ? `Chương ${ch.attributes.chapter ?? "?"}` : "";
    router.push(
      `/browse/read?chapterId=${selected}&mangaId=${manga.id}&mangaTitle=${encodeURIComponent(mdxMangaTitle(manga))}&chapterLabel=${encodeURIComponent(label)}&mode=${mode}`,
    );
  };

  const title = mdxMangaTitle(manga);

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      style={{
        marginTop: 24,
        border: "2px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--panel)",
        boxShadow: "4px 4px 0 var(--border)",
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1.5px solid var(--border-soft)",
          background: "var(--bg-2)",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Icon name="book" size={16} />
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </span>
        </div>
        <button
          className="btn btn-sm btn-ghost"
          onClick={onClose}
          style={{ flexShrink: 0 }}
        >
          <Icon name="x" size={14} /> Đóng
        </button>
      </div>

      <div style={{ padding: "16px 20px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)" }}>
            <Icon name="refresh" size={20} />
            <div style={{ marginTop: 8, fontSize: 13 }}>Đang tải danh sách chương...</div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--accent)" }}>
            <Icon name="alert" size={20} />
            <div style={{ marginTop: 8, fontSize: 13 }}>{error}</div>
          </div>
        )}

        {!loading && !error && chapters.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>😔</div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              Chưa có chương nào
            </div>
            <div style={{ fontSize: 11 }}>
              Truyện này chưa được upload chương nào trên MangaDex.
            </div>
          </div>
        )}

        {!loading && chapters.length > 0 && (
          <>
            {/* Language filter chips */}
            {availableLangs.length > 1 && (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 6,
                  }}
                >
                  Ngôn ngữ ({availableLangs.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <button
                    onClick={() => setLangFilter("")}
                    style={{
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      border: "1.5px solid",
                      borderColor: !langFilter ? "var(--accent)" : "var(--border)",
                      background: !langFilter ? "var(--accent)" : "var(--panel)",
                      color: !langFilter ? "var(--accent-fg, #fff)" : "var(--text)",
                      borderRadius: 99,
                      cursor: "pointer",
                    }}
                  >
                    Tất cả ({chapters.length})
                  </button>
                  {availableLangs.map(([code, count]) => {
                    const active = code === langFilter;
                    return (
                      <button
                        key={code}
                        onClick={() => setLangFilter(code)}
                        style={{
                          padding: "5px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          border: "1.5px solid",
                          borderColor: active ? "var(--accent)" : "var(--border)",
                          background: active ? "var(--accent)" : "var(--panel)",
                          color: active ? "var(--accent-fg, #fff)" : "var(--text)",
                          borderRadius: 99,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{mdxLanguageFlag(code)}</span>
                        {code.toUpperCase()} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chapter selector + read button */}
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-end",
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 6,
                  }}
                >
                  Chọn chương ({filteredChapters.length})
                </label>
                <select
                  className="form-select"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  disabled={!filteredChapters.length}
                  style={{ width: "100%" }}
                >
                  {filteredChapters.map((ch) => {
                    const num = ch.attributes.chapter ?? "?";
                    const lbl = ch.attributes.title
                      ? `Chương ${num} — ${ch.attributes.title}`
                      : `Chương ${num}`;
                    return (
                      <option key={ch.id} value={ch.id}>
                        {lbl}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => goRead("scroll")}
                  disabled={!selected}
                  style={{ whiteSpace: "nowrap" }}
                  title="Cuộn dọc"
                >
                  <Icon name="layers" size={14} /> Đọc (Cuộn)
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => goRead("page")}
                  disabled={!selected}
                  style={{ whiteSpace: "nowrap" }}
                  title="Lật từng trang"
                >
                  <Icon name="book" size={14} /> Đọc (Trang)
                </button>
              </div>
            </div>

            {/* Chapter list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 360,
                overflowY: "auto",
              }}
            >
              {filteredChapters.length === 0 && (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
                  Không có chương nào trong ngôn ngữ đã chọn.
                </div>
              )}
              {filteredChapters.map((ch) => {
                const num = ch.attributes.chapter ?? "?";
                const chTitle = ch.attributes.title ? ` — ${ch.attributes.title}` : "";
                const group =
                  ch.relationships.find((r) => r.type === "scanlation_group")?.attributes
                    ?.name || "Không rõ nhóm dịch";
                const lang = ch.attributes.translatedLanguage ?? "";
                const flag = mdxLanguageFlag(lang);
                const isSelected = ch.id === selected;
                return (
                  <div
                    key={ch.id}
                    onClick={() => setSelected(ch.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: isSelected ? "rgba(200,16,46,0.07)" : "var(--bg-2)",
                      border: isSelected ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                      cursor: "pointer",
                      gap: 12,
                      transition: "background 0.12s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                      <span
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                        title={lang || "unknown"}
                      >
                        <span style={{ fontSize: 16 }}>{flag}</span>
                        {lang && (
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)" }}>
                            {lang}
                          </span>
                        )}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          Chương {num}{chTitle}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                          {group}
                          {ch.attributes.pages ? ` · ${ch.attributes.pages} trang` : ""}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ color: "var(--accent)" }}>
                        <Icon name="check" size={14} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
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
  const [selectedManga, setSelectedManga] = useState<MdxManga | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMangas = useCallback(async (q: string, tagId: string) => {
    setLoading(true);
    setSelectedManga(null);
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
              Dữ liệu thực từ MangaDex · Mọi ngôn ngữ · Nhấn vào truyện để chọn chương
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
                    <MangaCard
                      manga={m}
                      onSelect={(manga) =>
                        setSelectedManga((prev) =>
                          prev?.id === manga.id ? null : manga,
                        )
                      }
                    />
                  </StaggerItem>
                ))}
              </div>
            </StaggerContainer>
          )}

          {/* Chapter panel */}
          <AnimatePresence>
            {selectedManga && (
              <ChapterPanel
                key={selectedManga.id}
                manga={selectedManga}
                onClose={() => setSelectedManga(null)}
              />
            )}
          </AnimatePresence>
        </FadeIn>
      </main>
    </div>
  );
}
