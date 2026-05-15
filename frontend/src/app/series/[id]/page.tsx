"use client";
import React, { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Reorder } from "framer-motion";

import { TopBar } from "@/components/TopBar";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from "@/components/Animations";
import {
  APIError,
  createChapter,
  deleteChapter,
  deleteSeries,
  getSeries,
  reorderPages,
  type ChapterPage,
  type ChapterResponse,
  type SeriesDetail,
} from "@/lib/api";

const STATUS_META: Record<string, { label: string; color: string }> = {
  ongoing: { label: "Đang tiến hành", color: "var(--accent)" },
  completed: { label: "Đã hoàn thành", color: "var(--jade)" },
  paused: { label: "Tạm dừng", color: "var(--muted)" },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [reorderingChapter, setReorderingChapter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // New chapter inline form
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?next=/series/${id}`);
    }
  }, [authLoading, isAuthenticated, router, id]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSeries(id);
      setSeries(data);
      // Auto-expand first chapter if any
      if (data.chapters.length > 0 && !expandedChapter) {
        setExpandedChapter(data.chapters[0].chapter_id);
      }
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không tải được bộ truyện.";
      setError(msg);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const handleCreateChapter = async () => {
    if (!series) return;
    setBusy(true);
    try {
      const chapter = await createChapter(series.series_id, {
        title: newChapterTitle.trim() || null,
      });
      toast(`Đã tạo chương ${chapter.chapter_number}.`, "success");
      setNewChapterTitle("");
      setShowNewChapter(false);
      setExpandedChapter(chapter.chapter_id);
      await load();
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Tạo chương thất bại.";
      toast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteChapter = async (chapter: ChapterResponse) => {
    const ok = window.confirm(
      `Xoá chương ${chapter.chapter_number}${chapter.title ? ` (${chapter.title})` : ""}?\n\nCác trang đã dịch trong chương sẽ được giữ trong Lịch sử nhưng không còn thuộc bộ truyện này.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteChapter(chapter.chapter_id);
      toast("Đã xoá chương.", "success");
      await load();
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Xoá chương thất bại.";
      toast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleReorderPages = async (chapterId: string, newPages: ChapterPage[]) => {
    if (!series) return;
    // Optimistic update
    setSeries(prev =>
      prev
        ? {
            ...prev,
            chapters: prev.chapters.map(c =>
              c.chapter_id === chapterId
                ? { ...c, pages: newPages.map((p, i) => ({ ...p, page_number: i + 1 })) }
                : c,
            ),
          }
        : prev,
    );
    setBusy(true);
    try {
      await reorderPages(
        chapterId,
        newPages.map((p, i) => ({ id: p.page_id, order: i + 1 })),
      );
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Sắp xếp lại thất bại.";
      toast(msg, "error");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (!series) return;
    const ok = window.confirm(
      `Xoá vĩnh viễn bộ truyện "${series.title}"?\n\nCác chương sẽ bị xoá, các trang đã dịch vẫn còn trong Lịch sử.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteSeries(series.series_id);
      toast("Đã xoá bộ truyện.", "success");
      router.push("/series");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Xoá thất bại.";
      toast(msg, "error");
      setBusy(false);
    }
  };

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="series" />
        <div style={{ padding: "40px 56px", maxWidth: 1100, margin: "0 auto" }}>
          <Link href="/series" style={{ textDecoration: "none", display: "inline-block", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="arrow-left" size={11} /> Bộ truyện
            </span>
          </Link>

          {loading ? (
            <div style={{ textAlign: "center", padding: 80, color: "var(--muted)" }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                style={{ display: "inline-flex" }}
              >
                <Icon name="refresh" size={28} />
              </motion.div>
              <div style={{ marginTop: 10 }}>Đang tải…</div>
            </div>
          ) : error ? (
            <div
              className="stroke-ink"
              style={{
                background: "var(--panel)",
                padding: "20px 24px",
                display: "flex",
                gap: 12,
                alignItems: "center",
                color: "var(--accent)",
              }}
            >
              <Icon name="alert" size={18} />
              <div style={{ flex: 1, fontSize: 13 }}>{error}</div>
              <button className="btn btn-sm" onClick={load}>Thử lại</button>
            </div>
          ) : series ? (
            <>
              {/* Header: cover + meta */}
              <FadeIn direction="up" distance={15}>
                <div
                  className="stroke-ink panel-shadow"
                  style={{
                    background: "var(--panel)",
                    display: "grid",
                    gridTemplateColumns: "200px 1fr",
                    gap: 24,
                    padding: 24,
                    marginBottom: 24,
                  }}
                >
                  <div
                    className="stroke-ink halftone-coarse"
                    style={{
                      aspectRatio: "3/4",
                      background: "var(--bg-3)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {series.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={series.cover_image_url}
                        alt={series.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Icon name="stack" size={42} />
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span
                        className="chip"
                        style={{
                          padding: "3px 9px",
                          fontSize: 10,
                          color: STATUS_META[series.status]?.color || "var(--muted)",
                          borderColor: STATUS_META[series.status]?.color || "var(--muted)",
                        }}
                      >
                        {STATUS_META[series.status]?.label || series.status}
                      </span>
                      {series.target_language && (
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          {series.source_language ? `${series.source_language} → ` : ""}{series.target_language}
                        </span>
                      )}
                    </div>

                    <h1
                      className="display"
                      style={{
                        fontSize: 32,
                        margin: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      {series.title}
                    </h1>

                    {series.description && (
                      <p style={{ fontSize: 13, color: "var(--fg-soft)", marginTop: 10, lineHeight: 1.6 }}>
                        {series.description}
                      </p>
                    )}

                    {series.tags.length > 0 && (
                      <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
                        {series.tags.map(t => (
                          <span
                            key={t}
                            style={{
                              fontSize: 10,
                              padding: "2px 7px",
                              background: "var(--bg-2)",
                              border: "1px solid var(--border-soft)",
                              borderRadius: 3,
                              color: "var(--fg-soft)",
                            }}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: "auto",
                        paddingTop: 16,
                        fontSize: 11,
                        color: "var(--muted)",
                        display: "flex",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <span><Icon name="stack" size={11} /> {series.chapter_count} chương</span>
                      <span><Icon name="file" size={11} /> {series.page_count} trang</span>
                      <span><Icon name="clock" size={11} /> Tạo {formatDate(series.created_at)}</span>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                      {series.page_count > 0 && (
                        <Link href={`/series/${series.series_id}/read`} style={{ textDecoration: "none" }}>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="btn btn-sm btn-primary"
                          >
                            <Icon name="book" size={12} /> Đọc từ đầu
                          </motion.button>
                        </Link>
                      )}
                      <Link
                        href={`/upload?series_id=${series.series_id}`}
                        style={{ textDecoration: "none" }}
                      >
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn btn-sm">
                          <Icon name="upload" size={12} /> Upload trang mới
                        </motion.button>
                      </Link>
                      <Link href={`/series/${series.series_id}/glossary`} style={{ textDecoration: "none" }}>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn btn-sm btn-ghost">
                          <Icon name="tag" size={12} /> Từ điển
                        </motion.button>
                      </Link>
                      <Link href={`/series/${series.series_id}/edit`} style={{ textDecoration: "none" }}>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn btn-sm btn-ghost">
                          <Icon name="settings" size={12} /> Chỉnh sửa
                        </motion.button>
                      </Link>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleDeleteSeries}
                        className="btn btn-sm btn-ghost"
                        style={{ color: "var(--accent)" }}
                        disabled={busy}
                      >
                        <Icon name="trash" size={12} /> Xoá
                      </motion.button>
                    </div>
                  </div>
                </div>
              </FadeIn>

              {/* Chapters section */}
              <FadeIn direction="up" distance={15} delay={0.1}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 14, gap: 10 }}>
                  <h2 className="display" style={{ fontSize: 22, margin: 0 }}>Chương</h2>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    {series.chapter_count} chương
                  </span>
                  <div style={{ marginLeft: "auto" }}>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="btn btn-sm"
                      onClick={() => setShowNewChapter(v => !v)}
                    >
                      <Icon name="plus" size={12} /> Thêm chương
                    </motion.button>
                  </div>
                </div>

                <AnimatePresence>
                  {showNewChapter && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="stroke-ink"
                      style={{
                        background: "var(--panel)",
                        padding: 14,
                        marginBottom: 14,
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <input
                        value={newChapterTitle}
                        onChange={e => setNewChapterTitle(e.target.value)}
                        placeholder="Tên chương (tùy chọn — để trống nếu chỉ đánh số)"
                        maxLength={200}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          fontSize: 13,
                          border: "2px solid var(--border)",
                          background: "var(--bg-2)",
                          outline: "none",
                          color: "var(--fg)",
                        }}
                      />
                      <button
                        onClick={handleCreateChapter}
                        className="btn btn-sm btn-primary"
                        disabled={busy}
                      >
                        <Icon name="check" size={11} /> Tạo
                      </button>
                      <button
                        onClick={() => { setShowNewChapter(false); setNewChapterTitle(""); }}
                        className="btn btn-sm btn-ghost"
                      >
                        <Icon name="x" size={11} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {series.chapters.length === 0 ? (
                  <div
                    className="stroke-ink"
                    style={{
                      background: "var(--panel)",
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "var(--muted)",
                    }}
                  >
                    <div className="serif" style={{ fontSize: 36, opacity: 0.3 }}>章</div>
                    <div style={{ marginTop: 6, fontSize: 13 }}>
                      Chưa có chương nào. Thêm chương đầu tiên hoặc{" "}
                      <Link href={`/upload?series_id=${series.series_id}`} style={{ color: "var(--accent)" }}>
                        upload trang mới
                      </Link>{" "}
                      để bắt đầu.
                    </div>
                  </div>
                ) : (
                  <StaggerContainer staggerDelay={0.04} style={{ display: "grid", gap: 10 }}>
                    {series.chapters.map(chapter => {
                      const isExpanded = expandedChapter === chapter.chapter_id;
                      return (
                        <StaggerItem key={chapter.chapter_id} direction="up" distance={12}>
                          <div
                            className="stroke-ink"
                            style={{
                              background: "var(--panel)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              role="button"
                              onClick={() => setExpandedChapter(isExpanded ? null : chapter.chapter_id)}
                              style={{
                                padding: "12px 16px",
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                cursor: "pointer",
                              }}
                            >
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ display: "inline-flex" }}
                              >
                                <Icon name="chevron-down" size={14} />
                              </motion.div>
                              <div
                                className="serif"
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  background: "var(--accent)",
                                  color: "var(--paper)",
                                  padding: "2px 8px",
                                  flexShrink: 0,
                                }}
                              >
                                Ch.{chapter.chapter_number}
                              </div>
                              <div
                                className="serif"
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  flex: 1,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {chapter.title || <span style={{ color: "var(--muted)", fontStyle: "italic", fontWeight: 400 }}>Chưa đặt tên</span>}
                              </div>
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                                {chapter.page_count} trang
                              </span>
                              {isExpanded && chapter.pages.length > 1 && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setReorderingChapter(
                                      reorderingChapter === chapter.chapter_id ? null : chapter.chapter_id,
                                    );
                                  }}
                                  className="btn btn-sm btn-ghost"
                                  style={{
                                    padding: "4px 8px",
                                    color: reorderingChapter === chapter.chapter_id ? "var(--jade)" : "var(--muted)",
                                  }}
                                  title="Sắp xếp trang"
                                >
                                  <Icon name="dots" size={11} />
                                </button>
                              )}
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDeleteChapter(chapter);
                                }}
                                className="btn btn-sm btn-ghost"
                                style={{ padding: "4px 8px", color: "var(--accent)" }}
                                aria-label="Xoá chương"
                                title="Xoá chương"
                                disabled={busy}
                              >
                                <Icon name="trash" size={11} />
                              </button>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  style={{
                                    overflow: "hidden",
                                    borderTop: "1px dashed var(--border-soft)",
                                  }}
                                >
                                  <div style={{ padding: 14 }}>
                                    {chapter.pages.length === 0 ? (
                                      <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 14 }}>
                                        Chưa có trang nào. Upload trang vào chương này{" "}
                                        <Link
                                          href={`/upload?series_id=${series.series_id}&chapter_id=${chapter.chapter_id}`}
                                          style={{ color: "var(--accent)" }}
                                        >
                                          tại đây
                                        </Link>.
                                      </div>
                                    ) : reorderingChapter === chapter.chapter_id ? (
                                      <>
                                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                          <Icon name="dots" size={11} />
                                          Kéo thả để sắp xếp thứ tự trang
                                          {busy && (
                                            <motion.span
                                              animate={{ rotate: 360 }}
                                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                              style={{ display: "inline-flex" }}
                                            >
                                              <Icon name="refresh" size={10} />
                                            </motion.span>
                                          )}
                                        </div>
                                        <Reorder.Group
                                          axis="x"
                                          values={chapter.pages}
                                          onReorder={pages => handleReorderPages(chapter.chapter_id, pages)}
                                          style={{
                                            listStyle: "none",
                                            padding: "4px 0 8px",
                                            margin: 0,
                                            display: "flex",
                                            gap: 8,
                                            overflowX: "auto",
                                          }}
                                        >
                                          {chapter.pages.map((p, idx) => (
                                            <Reorder.Item
                                              key={p.page_id}
                                              value={p}
                                              style={{ listStyle: "none", flexShrink: 0 }}
                                            >
                                              <div
                                                style={{
                                                  width: 90,
                                                  cursor: "grab",
                                                  userSelect: "none",
                                                }}
                                              >
                                                {/* drag handle bar */}
                                                <div
                                                  style={{
                                                    background: "var(--accent)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    padding: "3px 0",
                                                    gap: 3,
                                                  }}
                                                >
                                                  <Icon name="dots" size={10} className="text-[var(--paper)]" />
                                                  <span style={{ fontSize: 9, color: "var(--paper)", fontFamily: "var(--font-mono)", opacity: 0.85 }}>
                                                    #{idx + 1}
                                                  </span>
                                                </div>
                                                <div
                                                  className="stroke-ink"
                                                  style={{
                                                    aspectRatio: "3/4",
                                                    background: "var(--bg-3)",
                                                    position: "relative",
                                                    overflow: "hidden",
                                                    border: "2px solid var(--accent)",
                                                    borderTop: "none",
                                                  }}
                                                >
                                                  {p.thumbnail_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                      src={p.thumbnail_url}
                                                      alt={`Trang ${idx + 1}`}
                                                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                      loading="lazy"
                                                      draggable={false}
                                                    />
                                                  ) : (
                                                    <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                                                      <Icon name="image" size={18} />
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </Reorder.Item>
                                          ))}
                                        </Reorder.Group>
                                      </>
                                    ) : (
                                      <div
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                                          gap: 8,
                                        }}
                                      >
                                        {chapter.pages.map(p => (
                                          <Link
                                            key={p.page_id}
                                            href={`/reader?page=${p.page_id}`}
                                            style={{ textDecoration: "none" }}
                                          >
                                            <motion.div
                                              whileHover={{ y: -2 }}
                                              className="stroke-ink"
                                              style={{
                                                aspectRatio: "3/4",
                                                background: "var(--bg-3)",
                                                position: "relative",
                                                overflow: "hidden",
                                                cursor: "pointer",
                                              }}
                                            >
                                              {p.thumbnail_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                  src={p.thumbnail_url}
                                                  alt={`Trang ${p.page_number}`}
                                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                  loading="lazy"
                                                />
                                              ) : (
                                                <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                                                  <Icon name="image" size={22} />
                                                </div>
                                              )}
                                              <div
                                                style={{
                                                  position: "absolute",
                                                  bottom: 0,
                                                  left: 0,
                                                  right: 0,
                                                  background: "rgba(17,17,17,0.7)",
                                                  color: "var(--paper)",
                                                  fontSize: 10,
                                                  padding: "2px 6px",
                                                  fontFamily: "var(--font-mono)",
                                                }}
                                              >
                                                #{p.page_number}
                                              </div>
                                            </motion.div>
                                          </Link>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </StaggerItem>
                      );
                    })}
                  </StaggerContainer>
                )}
              </FadeIn>
            </>
          ) : null}
        </div>
      </div>
    </AnimatedPage>
  );
}
