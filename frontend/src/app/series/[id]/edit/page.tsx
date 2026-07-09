"use client";
import React, { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Reorder } from "framer-motion";

import { TopBar } from "@/components/TopBar";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedPage, FadeIn } from "@/components/Animations";
import {
  APIError,
  getSeries,
  removePageFromChapter,
  reorderChapters,
  reorderPages,
  updateChapter,
  updateSeries,
  uploadSeriesCover,
  type ChapterResponse,
  type ChapterPage,
  type SeriesDetail,
  type SeriesStatus,
} from "@/lib/api";
import { buildSeriesReadPageHref } from "@/lib/seriesReader";

const STATUS_OPTIONS: { value: SeriesStatus; label: string }[] = [
  { value: "ongoing", label: "Đang tiến hành" },
  { value: "completed", label: "Đã hoàn thành" },
  { value: "paused", label: "Tạm dừng" },
];

export default function SeriesEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [chapters, setChapters] = useState<ChapterResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);

  // Edit metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<SeriesStatus>("ongoing");
  const [tagsInput, setTagsInput] = useState("");

  // Chapter inline edit
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [chapterTitleDraft, setChapterTitleDraft] = useState("");

  // Cover replace
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?next=/series/${id}/edit`);
    }
  }, [authLoading, isAuthenticated, router, id]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSeries(id);
      setSeries(data);
      setChapters(data.chapters);
      setTitle(data.title);
      setDescription(data.description ?? "");
      setStatus((data.status as SeriesStatus) || "ongoing");
      setTagsInput(data.tags.join(", "));
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không tải được bộ truyện.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const parsedTags = useMemo(
    () =>
      tagsInput
        .split(/[,\n]/)
        .map(t => t.trim().toLowerCase())
        .filter(Boolean),
    [tagsInput],
  );

  const handleSaveMeta = async () => {
    if (!series) return;
    if (!title.trim()) {
      toast("Hãy nhập tên bộ truyện.", "error");
      return;
    }
    setSavingMeta(true);
    try {
      const updated = await updateSeries(series.series_id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        tags: parsedTags,
      });
      setSeries(updated);
      toast("Đã lưu thay đổi.", "success");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Lưu thất bại.";
      toast(msg, "error");
    } finally {
      setSavingMeta(false);
    }
  };

  const handleUploadCover = async () => {
    if (!series || !coverFile) return;
    setCoverUploading(true);
    try {
      const updated = await uploadSeriesCover(series.series_id, coverFile);
      setSeries(updated);
      setCoverFile(null);
      toast("Đã cập nhật ảnh bìa.", "success");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Tải ảnh bìa thất bại.";
      toast(msg, "error");
    } finally {
      setCoverUploading(false);
    }
  };

  const handleReorderChapters = async (newOrder: ChapterResponse[]) => {
    // Optimistic update
    setChapters(newOrder);
    if (!series) return;
    setBusy(true);
    try {
      await reorderChapters(
        series.series_id,
        newOrder.map((c, i) => ({ id: c.chapter_id, order: i + 1 })),
      );
      // Reflect new chapter_number locally without a refetch
      setChapters(prev => prev.map((c, i) => ({ ...c, chapter_number: i + 1 })));
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Sắp xếp lại thất bại.";
      toast(msg, "error");
      // Revert by reloading
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleReorderPages = async (chapterId: string, newPages: ChapterPage[]) => {
    setChapters(prev =>
      prev.map(c =>
        c.chapter_id === chapterId
          ? { ...c, pages: newPages.map((p, i) => ({ ...p, page_number: i + 1 })) }
          : c,
      ),
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

  const handleRemovePage = async (chapterId: string, pageId: string) => {
    const ok = window.confirm(
      "Gỡ trang này khỏi chương? Trang vẫn còn trong Lịch sử, có thể thêm lại sau.",
    );
    if (!ok) return;
    setBusy(true);
    try {
      await removePageFromChapter(chapterId, pageId);
      setChapters(prev =>
        prev.map(c =>
          c.chapter_id === chapterId
            ? { ...c, pages: c.pages.filter(p => p.page_id !== pageId), page_count: c.page_count - 1 }
            : c,
        ),
      );
      toast("Đã gỡ trang khỏi chương.", "success");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Gỡ trang thất bại.";
      toast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveChapterTitle = async (chapter: ChapterResponse) => {
    if (chapterTitleDraft.trim() === (chapter.title || "").trim()) {
      setEditingChapter(null);
      return;
    }
    setBusy(true);
    try {
      const updated = await updateChapter(chapter.chapter_id, {
        title: chapterTitleDraft.trim() || null,
      });
      setChapters(prev =>
        prev.map(c => (c.chapter_id === chapter.chapter_id ? { ...c, ...updated, pages: c.pages } : c)),
      );
      setEditingChapter(null);
      toast("Đã đổi tên chương.", "success");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Lưu chương thất bại.";
      toast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="series" />
        <div style={{ padding: "40px 56px", maxWidth: 1100, margin: "0 auto" }}>
          <Link href={`/series/${id}`} style={{ textDecoration: "none", display: "inline-block", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="arrow-left" size={11} /> Quay lại bộ truyện
            </span>
          </Link>

          <FadeIn direction="up" distance={15}>
            <SectionHeader
              kanji="編"
              label="Chỉnh Sửa · Edit Series"
              title="Quản lý chương và trang"
              subtitle="Kéo thả để sắp xếp chương / trang. Đổi tên, gỡ trang, hoặc cập nhật thông tin chung."
              stamp="EDIT"
            />
          </FadeIn>

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
            <div className="stroke-ink" style={{ background: "var(--panel)", padding: "20px 24px", color: "var(--accent)" }}>
              {error}
            </div>
          ) : series ? (
            <>
              {/* Metadata form */}
              <FadeIn direction="up" distance={15} delay={0.1}>
                <div
                  className="stroke-ink panel-shadow"
                  style={{ background: "var(--panel)", padding: 20, marginBottom: 20, display: "grid", gap: 14 }}
                >
                  <h2 className="display" style={{ fontSize: 18, margin: 0 }}>Thông tin chung</h2>

                  {/* Cover */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Ảnh bìa
                    </label>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div
                        className="stroke-ink halftone-coarse"
                        style={{
                          width: 100,
                          aspectRatio: "3/4",
                          background: "var(--bg-3)",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {coverPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={coverPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : series.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={series.cover_image_url} alt={series.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <Icon name="stack" size={28} />
                        )}
                      </div>
                      <div style={{ flex: 1, fontSize: 12, color: "var(--muted)" }}>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f && f.size > 5 * 1024 * 1024) {
                              toast("Ảnh quá 5MB.", "error");
                              return;
                            }
                            setCoverFile(f || null);
                          }}
                          style={{ fontSize: 12, display: "block", marginBottom: 8 }}
                        />
                        {coverFile && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={handleUploadCover}
                              className="btn btn-sm btn-primary"
                              disabled={coverUploading}
                            >
                              {coverUploading ? "Đang tải…" : "Cập nhật ảnh bìa"}
                            </button>
                            <button onClick={() => setCoverFile(null)} className="btn btn-sm btn-ghost">
                              Huỷ
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Tên bộ truyện <span style={{ color: "var(--accent)" }}>*</span>
                    </label>
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      maxLength={200}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: 14,
                        background: "var(--bg-2)",
                        border: "2px solid var(--border)",
                        outline: "none",
                        color: "var(--fg)",
                        fontFamily: "var(--font-serif)",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Mô tả
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      maxLength={5000}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: 13,
                        background: "var(--bg-2)",
                        border: "2px solid var(--border)",
                        outline: "none",
                        color: "var(--fg)",
                        resize: "vertical",
                        fontFamily: "var(--font-sans)",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Trạng thái</label>
                      <select
                        value={status}
                        onChange={e => setStatus(e.target.value as SeriesStatus)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: 13,
                          background: "var(--bg-2)",
                          border: "2px solid var(--border)",
                          outline: "none",
                          color: "var(--fg)",
                        }}
                      >
                        {STATUS_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        Thẻ <span style={{ fontWeight: 400, color: "var(--muted)" }}>(phân cách dấu phẩy)</span>
                      </label>
                      <input
                        value={tagsInput}
                        onChange={e => setTagsInput(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: 13,
                          background: "var(--bg-2)",
                          border: "2px solid var(--border)",
                          outline: "none",
                          color: "var(--fg)",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={handleSaveMeta}
                      className="btn btn-sm btn-primary"
                      disabled={savingMeta}
                    >
                      {savingMeta ? "Đang lưu…" : (<><Icon name="check" size={12} /> Lưu thay đổi</>)}
                    </button>
                  </div>
                </div>
              </FadeIn>

              {/* Chapters reorder */}
              <FadeIn direction="up" distance={15} delay={0.2}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 14, gap: 10 }}>
                  <h2 className="display" style={{ fontSize: 22, margin: 0 }}>Chương & Trang</h2>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>Kéo thả để sắp xếp</span>
                  {busy && (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      style={{ display: "inline-flex", color: "var(--muted)" }}
                    >
                      <Icon name="refresh" size={12} />
                    </motion.span>
                  )}
                </div>

                {chapters.length === 0 ? (
                  <div
                    className="stroke-ink"
                    style={{
                      background: "var(--panel)",
                      padding: "30px 20px",
                      textAlign: "center",
                      color: "var(--muted)",
                      fontSize: 13,
                    }}
                  >
                    Chưa có chương nào.{" "}
                    <Link href={`/series/${id}`} style={{ color: "var(--accent)" }}>
                      Thêm chương ở đây
                    </Link>
                    .
                  </div>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={chapters}
                    onReorder={handleReorderChapters}
                    style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}
                  >
                    {chapters.map(chapter => (
                      <Reorder.Item
                        key={chapter.chapter_id}
                        value={chapter}
                        style={{ listStyle: "none" }}
                      >
                        <div
                          className="stroke-ink"
                          style={{
                            background: "var(--panel)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "12px 16px",
                              cursor: "grab",
                              userSelect: "none",
                            }}
                          >
                            <Icon name="dots" size={14} />
                            <div
                              className="serif"
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                background: "var(--accent)",
                                color: "var(--paper)",
                                padding: "2px 8px",
                              }}
                            >
                              Ch.{chapter.chapter_number}
                            </div>
                            {editingChapter === chapter.chapter_id ? (
                              <input
                                value={chapterTitleDraft}
                                onChange={e => setChapterTitleDraft(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => {
                                  if (e.key === "Enter") handleSaveChapterTitle(chapter);
                                  if (e.key === "Escape") setEditingChapter(null);
                                }}
                                autoFocus
                                style={{
                                  flex: 1,
                                  padding: "4px 8px",
                                  fontSize: 13,
                                  background: "var(--bg-2)",
                                  border: "2px solid var(--border)",
                                  outline: "none",
                                  color: "var(--fg)",
                                }}
                              />
                            ) : (
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
                            )}
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>
                              {chapter.page_count} trang
                            </span>
                            {editingChapter === chapter.chapter_id ? (
                              <>
                                <button
                                  onClick={() => handleSaveChapterTitle(chapter)}
                                  className="btn btn-sm btn-primary"
                                  style={{ padding: "3px 8px", fontSize: 11 }}
                                  disabled={busy}
                                >
                                  <Icon name="check" size={10} /> Lưu
                                </button>
                                <button
                                  onClick={() => setEditingChapter(null)}
                                  className="btn btn-sm btn-ghost"
                                  style={{ padding: "3px 8px" }}
                                >
                                  <Icon name="x" size={10} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingChapter(chapter.chapter_id);
                                  setChapterTitleDraft(chapter.title || "");
                                }}
                                className="btn btn-sm btn-ghost"
                                style={{ padding: "3px 8px" }}
                                title="Đổi tên chương"
                              >
                                <Icon name="settings" size={11} />
                              </button>
                            )}
                          </div>

                          {chapter.pages.length > 0 && (
                            <div style={{ padding: 12, borderTop: "1px dashed var(--border-soft)" }}>
                              <Reorder.Group
                                axis="y"
                                values={chapter.pages}
                                onReorder={pages => handleReorderPages(chapter.chapter_id, pages)}
                                style={{
                                  listStyle: "none",
                                  padding: 0,
                                  margin: 0,
                                  display: "grid",
                                  gap: 6,
                                }}
                              >
                                {chapter.pages.map((page, idx) => (
                                  <Reorder.Item
                                    key={page.page_id}
                                    value={page}
                                    style={{ listStyle: "none" }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        padding: "6px 10px",
                                        background: "var(--bg-2)",
                                        border: "1px solid var(--border-soft)",
                                        cursor: "grab",
                                        userSelect: "none",
                                      }}
                                    >
                                      <Icon name="dots" size={11} />
                                      <span
                                        className="mono"
                                        style={{
                                          fontSize: 10,
                                          color: "var(--muted)",
                                          minWidth: 24,
                                        }}
                                      >
                                        #{idx + 1}
                                      </span>
                                      <div
                                        style={{
                                          width: 36,
                                          height: 48,
                                          background: "var(--bg-3)",
                                          flexShrink: 0,
                                          overflow: "hidden",
                                          border: "1px solid var(--border-soft)",
                                        }}
                                      >
                                        {page.thumbnail_url ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={page.thumbnail_url}
                                            alt={`Trang ${idx + 1}`}
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                                            <Icon name="image" size={14} />
                                          </div>
                                        )}
                                      </div>
                                      <span
                                        className="mono"
                                        style={{
                                          fontSize: 10,
                                          color: "var(--muted)",
                                          flex: 1,
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {page.page_id.slice(0, 8)}…
                                      </span>
                                      <Link
                                        href={buildSeriesReadPageHref(id, page.page_id)}
                                        onClick={e => e.stopPropagation()}
                                        style={{ textDecoration: "none" }}
                                      >
                                        <button className="btn btn-sm btn-ghost" style={{ padding: "2px 6px" }} title="Mở trang">
                                          <Icon name="external" size={10} />
                                        </button>
                                      </Link>
                                      <button
                                        onClick={() => handleRemovePage(chapter.chapter_id, page.page_id)}
                                        className="btn btn-sm btn-ghost"
                                        style={{ padding: "2px 6px", color: "var(--accent)" }}
                                        title="Gỡ khỏi chương"
                                      >
                                        <Icon name="trash" size={10} />
                                      </button>
                                    </div>
                                  </Reorder.Item>
                                ))}
                              </Reorder.Group>
                            </div>
                          )}
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </FadeIn>
            </>
          ) : null}
        </div>
      </div>
    </AnimatedPage>
  );
}
