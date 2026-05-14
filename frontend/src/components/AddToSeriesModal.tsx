"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Icon } from "./Icons";
import { useToast } from "./Toast";
import {
  APIError,
  addPagesToChapter,
  createChapter,
  createSeries,
  listSeries,
  getSeries,
  type ChapterResponse,
  type SeriesDetail,
  type SeriesListItem,
} from "@/lib/api";

interface Props {
  open: boolean;
  pageIds: string[];
  onClose: () => void;
  onSuccess?: (info: { series_id: string; chapter_id: string; added: number }) => void;
}

type Step = "select-series" | "select-chapter";

export function AddToSeriesModal({ open, pageIds, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("select-series");

  // Series state
  const [seriesList, setSeriesList] = useState<SeriesListItem[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<SeriesListItem | null>(null);

  // New series inline
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState("");

  // Chapter state
  const [seriesDetail, setSeriesDetail] = useState<SeriesDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<ChapterResponse | null>(null);
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");

  const [busy, setBusy] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (!open) return;
    setStep("select-series");
    setSelectedSeries(null);
    setSeriesDetail(null);
    setSelectedChapter(null);
    setShowNewSeries(false);
    setShowNewChapter(false);
    setNewSeriesTitle("");
    setNewChapterTitle("");
    setSearch("");
  }, [open]);

  // Load series list when opening
  useEffect(() => {
    if (!open) return;
    setLoadingSeries(true);
    listSeries({ limit: 200 })
      .then(res => setSeriesList(res.items))
      .catch(() => setSeriesList([]))
      .finally(() => setLoadingSeries(false));
  }, [open]);

  // Load series detail when selected
  useEffect(() => {
    if (!selectedSeries) {
      setSeriesDetail(null);
      return;
    }
    setLoadingDetail(true);
    getSeries(selectedSeries.series_id)
      .then(d => {
        setSeriesDetail(d);
        // Auto-select last chapter if any
        if (d.chapters.length > 0) {
          setSelectedChapter(d.chapters[d.chapters.length - 1]);
        } else {
          setSelectedChapter(null);
        }
      })
      .catch(() => setSeriesDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [selectedSeries]);

  const filteredSeries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return seriesList;
    return seriesList.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        (s.tags ?? []).some(t => t.toLowerCase().includes(q)),
    );
  }, [seriesList, search]);

  const handleCreateSeries = useCallback(async () => {
    if (!newSeriesTitle.trim()) {
      toast("Hãy nhập tên bộ truyện.", "error");
      return;
    }
    setBusy(true);
    try {
      const series = await createSeries({ title: newSeriesTitle.trim() });
      const listItem: SeriesListItem = {
        series_id: series.series_id,
        title: series.title,
        description: series.description,
        status: series.status,
        tags: series.tags,
        cover_image_url: series.cover_image_url,
        source_language: series.source_language,
        target_language: series.target_language,
        created_at: series.created_at,
        updated_at: series.updated_at,
        chapter_count: series.chapter_count,
        page_count: series.page_count,
      };
      setSeriesList(prev => [listItem, ...prev]);
      setSelectedSeries(listItem);
      setNewSeriesTitle("");
      setShowNewSeries(false);
      setStep("select-chapter");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Tạo bộ truyện thất bại.";
      toast(msg, "error");
    } finally {
      setBusy(false);
    }
  }, [newSeriesTitle, toast]);

  const handleCreateChapter = useCallback(async () => {
    if (!selectedSeries) return;
    setBusy(true);
    try {
      const chapter = await createChapter(selectedSeries.series_id, {
        title: newChapterTitle.trim() || null,
      });
      setSeriesDetail(prev =>
        prev
          ? {
              ...prev,
              chapters: [...prev.chapters, chapter],
              chapter_count: prev.chapter_count + 1,
            }
          : prev,
      );
      setSelectedChapter(chapter);
      setShowNewChapter(false);
      setNewChapterTitle("");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Tạo chương thất bại.";
      toast(msg, "error");
    } finally {
      setBusy(false);
    }
  }, [selectedSeries, newChapterTitle, toast]);

  const handleConfirm = useCallback(async () => {
    if (!selectedChapter || !selectedSeries) return;
    setBusy(true);
    try {
      await addPagesToChapter(selectedChapter.chapter_id, pageIds);
      toast(
        `Đã thêm ${pageIds.length} trang vào "${selectedSeries.title} / Ch.${selectedChapter.chapter_number}".`,
        "success",
      );
      onSuccess?.({
        series_id: selectedSeries.series_id,
        chapter_id: selectedChapter.chapter_id,
        added: pageIds.length,
      });
      onClose();
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Thêm trang thất bại.";
      toast(msg, "error");
    } finally {
      setBusy(false);
    }
  }, [selectedChapter, selectedSeries, pageIds, toast, onClose, onSuccess]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(17,17,17,0.5)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="stroke-ink"
          style={{
            background: "var(--panel)",
            boxShadow: "5px 5px 0 var(--border)",
            width: "100%",
            maxWidth: 540,
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "2px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Icon name="stack" size={16} />
            <h3 className="display" style={{ margin: 0, fontSize: 16, flex: 1 }}>
              {step === "select-series" ? "Chọn bộ truyện" : "Chọn chương"}
            </h3>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              {pageIds.length} trang
            </span>
            <button
              onClick={onClose}
              className="btn btn-sm btn-ghost"
              style={{ padding: "3px 6px" }}
              aria-label="Đóng"
            >
              <Icon name="x" size={12} />
            </button>
          </div>

          {/* Step indicator */}
          <div
            style={{
              padding: "8px 18px",
              borderBottom: "1px dashed var(--border-soft)",
              fontSize: 11,
              color: "var(--muted)",
              display: "flex",
              gap: 8,
            }}
          >
            <span style={{ color: step === "select-series" ? "var(--accent)" : "var(--muted)", fontWeight: 600 }}>
              1. Bộ truyện
            </span>
            {selectedSeries && (
              <>
                <span>›</span>
                <span style={{ color: step === "select-chapter" ? "var(--accent)" : "var(--muted)", fontWeight: 600 }}>
                  2. Chương ({selectedSeries.title})
                </span>
              </>
            )}
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
            {step === "select-series" && (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    border: "2px solid var(--border)",
                    background: "var(--bg-2)",
                    marginBottom: 10,
                  }}
                >
                  <Icon name="search" size={12} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm bộ truyện…"
                    style={{
                      flex: 1,
                      border: "none",
                      background: "transparent",
                      outline: "none",
                      fontSize: 12,
                      color: "var(--fg)",
                    }}
                  />
                </div>

                {/* New series */}
                {!showNewSeries ? (
                  <button
                    onClick={() => setShowNewSeries(true)}
                    className="btn btn-sm"
                    style={{ width: "100%", marginBottom: 10 }}
                  >
                    <Icon name="plus" size={11} /> Tạo bộ truyện mới
                  </button>
                ) : (
                  <div
                    className="stroke-ink"
                    style={{ padding: 10, marginBottom: 10, display: "flex", gap: 6, background: "var(--bg-2)" }}
                  >
                    <input
                      autoFocus
                      value={newSeriesTitle}
                      onChange={e => setNewSeriesTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleCreateSeries();
                        if (e.key === "Escape") setShowNewSeries(false);
                      }}
                      placeholder="Tên bộ truyện mới…"
                      maxLength={200}
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        border: "1px solid var(--border)",
                        background: "var(--panel)",
                        outline: "none",
                        fontSize: 13,
                        color: "var(--fg)",
                      }}
                    />
                    <button onClick={handleCreateSeries} disabled={busy} className="btn btn-sm btn-primary">
                      <Icon name="check" size={10} /> Tạo
                    </button>
                    <button onClick={() => setShowNewSeries(false)} className="btn btn-sm btn-ghost">
                      <Icon name="x" size={10} />
                    </button>
                  </div>
                )}

                {/* Series list */}
                {loadingSeries ? (
                  <div style={{ padding: 30, textAlign: "center", color: "var(--muted)" }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ display: "inline-flex" }}>
                      <Icon name="refresh" size={18} />
                    </motion.div>
                  </div>
                ) : filteredSeries.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                    {seriesList.length === 0 ? "Chưa có bộ truyện nào. Tạo mới ở trên." : "Không tìm thấy."}
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {filteredSeries.map(s => (
                      <button
                        key={s.series_id}
                        onClick={() => {
                          setSelectedSeries(s);
                          setStep("select-chapter");
                        }}
                        className="stroke-ink"
                        style={{
                          background: "var(--panel)",
                          padding: "10px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "inherit",
                        }}
                      >
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
                          {s.cover_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.cover_image_url} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                          ) : (
                            <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                              <Icon name="stack" size={14} />
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            className="serif"
                            style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {s.title}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--muted)" }}>
                            {s.chapter_count} chương · {s.page_count} trang
                          </div>
                        </div>
                        <Icon name="chevron-right" size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {step === "select-chapter" && selectedSeries && (
              <>
                <button
                  onClick={() => setStep("select-series")}
                  className="btn btn-sm btn-ghost"
                  style={{ marginBottom: 10 }}
                >
                  <Icon name="arrow-left" size={11} /> Đổi bộ truyện
                </button>

                {/* New chapter */}
                {!showNewChapter ? (
                  <button
                    onClick={() => setShowNewChapter(true)}
                    className="btn btn-sm"
                    style={{ width: "100%", marginBottom: 10 }}
                  >
                    <Icon name="plus" size={11} /> Tạo chương mới
                  </button>
                ) : (
                  <div
                    className="stroke-ink"
                    style={{ padding: 10, marginBottom: 10, display: "flex", gap: 6, background: "var(--bg-2)" }}
                  >
                    <input
                      autoFocus
                      value={newChapterTitle}
                      onChange={e => setNewChapterTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleCreateChapter();
                        if (e.key === "Escape") setShowNewChapter(false);
                      }}
                      placeholder="Tên chương (tùy chọn)…"
                      maxLength={200}
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        border: "1px solid var(--border)",
                        background: "var(--panel)",
                        outline: "none",
                        fontSize: 13,
                        color: "var(--fg)",
                      }}
                    />
                    <button onClick={handleCreateChapter} disabled={busy} className="btn btn-sm btn-primary">
                      <Icon name="check" size={10} /> Tạo
                    </button>
                    <button onClick={() => setShowNewChapter(false)} className="btn btn-sm btn-ghost">
                      <Icon name="x" size={10} />
                    </button>
                  </div>
                )}

                {loadingDetail ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ display: "inline-flex" }}>
                      <Icon name="refresh" size={18} />
                    </motion.div>
                  </div>
                ) : !seriesDetail || seriesDetail.chapters.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                    Bộ truyện chưa có chương nào. Tạo chương mới ở trên.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 4 }}>
                    {seriesDetail.chapters.map(c => {
                      const isSelected = selectedChapter?.chapter_id === c.chapter_id;
                      return (
                        <button
                          key={c.chapter_id}
                          onClick={() => setSelectedChapter(c)}
                          className="stroke-ink"
                          style={{
                            background: isSelected ? "var(--accent)" : "var(--panel)",
                            color: isSelected ? "var(--paper)" : "var(--fg)",
                            padding: "8px 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            cursor: "pointer",
                            textAlign: "left",
                            fontFamily: "inherit",
                            transition: "background 0.1s",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              background: isSelected ? "var(--paper)" : "var(--accent)",
                              color: isSelected ? "var(--accent)" : "var(--paper)",
                              padding: "2px 7px",
                              minWidth: 40,
                              textAlign: "center",
                            }}
                          >
                            Ch.{c.chapter_number}
                          </span>
                          <div
                            className="serif"
                            style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {c.title || <span style={{ fontStyle: "italic", opacity: 0.7 }}>Chưa đặt tên</span>}
                          </div>
                          <span style={{ fontSize: 10, opacity: 0.7 }}>{c.page_count} trang</span>
                          {isSelected && <Icon name="check" size={12} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "12px 18px",
              borderTop: "2px solid var(--border)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              background: "var(--bg-2)",
            }}
          >
            <button onClick={onClose} className="btn btn-sm btn-ghost">
              Huỷ
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedChapter || busy}
              className="btn btn-sm btn-primary"
            >
              {busy ? "Đang thêm…" : `Thêm ${pageIds.length} trang`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
