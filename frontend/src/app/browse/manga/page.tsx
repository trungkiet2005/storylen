"use client";
import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { FadeIn } from "@/components/Animations";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import {
  mdxManga,
  mdxChapters,
  mdxCoverFromManga,
  mdxMangaTitle,
  mdxLanguageFlag,
  type MdxManga,
  type MdxChapter,
} from "@/lib/api";

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

function mangaDescription(manga: MdxManga): string {
  const d = manga.attributes.description ?? {};
  return d["vi"] || d["en"] || Object.values(d)[0] || "";
}

function mangaAuthor(manga: MdxManga): string {
  const rel = manga.relationships.find(
    (r) => r.type === "author" || r.type === "artist",
  ) as { attributes?: { name?: string } } | undefined;
  return rel?.attributes?.name ?? "";
}

// ── Chapter selection block ─────────────────────────────────────────────────────

function ChapterSelector({ manga }: { manga: MdxManga }) {
  const router = useRouter();
  const [chapters, setChapters] = useState<MdxChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [langFilter, setLangFilter] = useState("");

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

  const goRead = (mode: "scroll" | "page") => {
    if (!selected) return;
    const ch = chapters.find((c) => c.id === selected);
    const label = ch ? `Chương ${ch.attributes.chapter ?? "?"}` : "";
    router.push(
      `/browse/read?chapterId=${selected}&mangaId=${manga.id}&mangaTitle=${encodeURIComponent(mdxMangaTitle(manga))}&chapterLabel=${encodeURIComponent(label)}&mode=${mode}`,
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)" }}>
        <span style={{ animation: "spin 1s linear infinite", display: "inline-flex" }}>
          <Icon name="refresh" size={20} />
        </span>
        <div style={{ marginTop: 8, fontSize: 13 }}>Đang tải danh sách chương...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: "var(--accent)" }}>
        <Icon name="alert" size={20} />
        <div style={{ marginTop: 8, fontSize: 13 }}>{error}</div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>😔</div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Chưa có chương nào</div>
        <div style={{ fontSize: 11 }}>Truyện này chưa được upload chương nào trên MangaDex.</div>
      </div>
    );
  }

  return (
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

      {/* Chapter selector + read buttons */}
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
          maxHeight: 420,
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
            ch.relationships.find((r) => r.type === "scanlation_group")?.attributes?.name ||
            "Không rõ nhóm dịch";
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
  );
}

// ── Page content ────────────────────────────────────────────────────────────────

function MangaDetailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";

  const [manga, setManga] = useState<MdxManga | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Thiếu mã truyện.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    mdxManga(id)
      .then((res) => setManga(res.data))
      .catch((e) => setError(e?.message || "Không tải được thông tin truyện"))
      .finally(() => setLoading(false));
  }, [id]);

  const title = manga ? mdxMangaTitle(manga) : "";
  const coverUrl = manga ? mdxCoverFromManga(manga) : null;
  const genres = manga
    ? manga.attributes.tags
        .filter((t) => t.attributes.group === "genre")
        .map((t) => t.attributes.name.en)
        .join(" · ")
    : "";
  const author = manga ? mangaAuthor(manga) : "";
  const description = manga ? mangaDescription(manga) : "";

  return (
    <div className="browse-anim-wrap" style={{ minHeight: "100vh" }}>
      <AnimatedBackground playlist="cultivation" intervalMs={28_000} overlay={0.82} hideOnMobile />
      <TopBar active="browse" />

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "clamp(16px,3vw,32px)", position: "relative", zIndex: 1 }}>
        <FadeIn>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => router.push("/browse")}
            style={{ marginBottom: 16, color: "var(--paper)" }}
          >
            <Icon name="chevron-left" size={14} /> Kho Truyện
          </button>

          {loading && (
            <div style={{ textAlign: "center", padding: "64px 0", color: "var(--paper)" }}>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-flex" }}>
                <Icon name="refresh" size={24} />
              </span>
              <div style={{ marginTop: 10, fontSize: 13 }}>Đang tải truyện...</div>
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                color: "var(--accent)",
                background: "var(--panel)",
                border: "2px solid var(--border)",
                borderRadius: "var(--radius)",
                boxShadow: "4px 4px 0 var(--border)",
              }}
            >
              <Icon name="alert" size={28} />
              <div style={{ marginTop: 10, fontWeight: 700, fontSize: 15 }}>{error}</div>
              <button className="btn btn-primary btn-sm" onClick={() => router.push("/browse")} style={{ marginTop: 16 }}>
                Quay lại Kho Truyện
              </button>
            </div>
          )}

          {!loading && manga && (
            <div
              style={{
                border: "2px solid var(--border)",
                borderRadius: "var(--radius)",
                background: "var(--panel)",
                boxShadow: "4px 4px 0 var(--border)",
                overflow: "hidden",
              }}
            >
              {/* Hero: cover + meta */}
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  padding: 20,
                  borderBottom: "1.5px solid var(--border-soft)",
                  background: "var(--bg-2)",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: 160,
                    height: 230,
                    flexShrink: 0,
                    border: "2px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    background: "linear-gradient(135deg,#2a2a35,#1a1a22)",
                  }}
                >
                  {coverUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={coverUrl}
                      alt={title}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 10 }}>
                  <h1 className="display" style={{ fontSize: "clamp(20px,2.6vw,28px)", lineHeight: 1.2, margin: 0 }}>
                    {title}
                  </h1>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <MangaStatusBadge status={manga.attributes.status} />
                    {manga.attributes.lastChapter && (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        {manga.attributes.lastChapter} chương
                      </span>
                    )}
                  </div>
                  {author && (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      Tác giả: <strong style={{ color: "var(--text)" }}>{author}</strong>
                    </div>
                  )}
                  {genres && (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{genres}</div>
                  )}
                  {description && (
                    <p
                      style={{
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "var(--text)",
                        margin: 0,
                        maxHeight: 120,
                        overflowY: "auto",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {description}
                    </p>
                  )}
                </div>
              </div>

              {/* Chapters */}
              <div style={{ padding: 20 }}>
                <ChapterSelector manga={manga} />
              </div>
            </div>
          )}
        </FadeIn>
      </main>
    </div>
  );
}

export default function MangaDetailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-flex" }}>
            <Icon name="refresh" size={24} />
          </span>
        </div>
      }
    >
      <MangaDetailContent />
    </Suspense>
  );
}
