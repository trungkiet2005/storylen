"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/Animations";
import { motion, AnimatePresence } from "framer-motion";
import {
  mdxPopular,
  mdxSearch,
  mdxChapters,
  mdxCoverFromManga,
  mdxMangaTitle,
  type MdxManga,
  type MdxChapter,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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
          backgroundImage: coverUrl ? `url('${coverUrl}')` : undefined,
          background: coverUrl ? undefined : "linear-gradient(135deg,var(--bg-2),var(--bg-3,var(--bg-2)))",
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
            background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)",
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
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    mdxChapters(manga.id)
      .then((res) => {
        setChapters(res.data);
        if (res.data.length) setSelected(res.data[res.data.length - 1].id);
      })
      .catch((e) => setError(e.message || "Lỗi tải chương"))
      .finally(() => setLoading(false));
  }, [manga.id]);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const goRead = () => {
    if (!selected) return;
    const ch = chapters.find((c) => c.id === selected);
    const label = ch ? `Chương ${ch.attributes.chapter ?? "?"}` : "";
    router.push(
      `/browse/read?chapterId=${selected}&mangaTitle=${encodeURIComponent(mdxMangaTitle(manga))}&chapterLabel=${encodeURIComponent(label)}`,
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
              Chưa có chương tiếng Việt
            </div>
            <div style={{ fontSize: 11 }}>
              Truyện này chưa được dịch sang tiếng Việt trên MangaDex.
            </div>
          </div>
        )}

        {!loading && chapters.length > 0 && (
          <>
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
                  Chọn chương
                </label>
                <select
                  className="form-select"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  style={{ width: "100%" }}
                >
                  {chapters.map((ch) => {
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
              <button
                className="btn btn-primary"
                onClick={goRead}
                disabled={!selected}
                style={{ whiteSpace: "nowrap" }}
              >
                <Icon name="book" size={14} /> Đọc ngay
              </button>
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
              {chapters.map((ch) => {
                const num = ch.attributes.chapter ?? "?";
                const chTitle = ch.attributes.title ? ` — ${ch.attributes.title}` : "";
                const group =
                  ch.relationships.find((r) => r.type === "scanlation_group")?.attributes
                    ?.name || "Không rõ nhóm dịch";
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
                      <span style={{ fontSize: 16 }}>🇻🇳</span>
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
  const [selectedManga, setSelectedManga] = useState<MdxManga | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMangas = useCallback(async (q: string) => {
    setLoading(true);
    setSelectedManga(null);
    try {
      const res = q.trim()
        ? await mdxSearch({ title: q.trim() })
        : await mdxPopular();
      setMangas(res.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi kết nối";
      toast(`Không thể tải dữ liệu MangaDex: ${msg}`, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadMangas(""); }, [loadMangas]);

  const handleSearch = () => loadMangas(query);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <TopBar active="browse" />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(16px,3vw,32px)" }}>
        <FadeIn>
          {/* Page header */}
          <div style={{ marginBottom: 24 }}>
            <div
              className="display"
              style={{ fontSize: "clamp(22px,3vw,32px)", letterSpacing: "-0.02em", marginBottom: 4 }}
            >
              Kho Truyện
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Dữ liệu thực từ MangaDex · Dịch tiếng Việt · Nhấn vào truyện để chọn chương
            </div>
          </div>

          {/* Search bar */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 28,
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
                onClick={() => { setQuery(""); loadMangas(""); }}
              >
                <Icon name="x" size={13} />
              </button>
            )}
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
