"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { TopBar } from "@/components/TopBar";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWibu, READING_LIST_META, type ReadingListStatus } from "@/contexts/WibuContext";
import { StarRating } from "@/components/StarRating";
import { ReadingListPicker } from "@/components/ReadingListPicker";
import {
  AnimatedPage,
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/components/Animations";
import {
  APIError,
  deleteSeries,
  listSeries,
  type SeriesListItem,
  type SeriesStatus,
} from "@/lib/api";
import { getSeriesProgress } from "@/lib/localStore";

type StatusFilter = "all" | SeriesStatus;

const STATUS_META: Record<
  string,
  { label: string; color: string }
> = {
  ongoing:   { label: "Đang tiến hành", color: "var(--accent)" },
  completed: { label: "Đã hoàn thành",  color: "var(--jade)"   },
  paused:    { label: "Tạm dừng",       color: "var(--muted)"  },
};

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.ongoing;
  return (
    <span
      className="chip"
      style={{
        padding: "3px 9px",
        fontSize: 10,
        color: meta.color,
        borderColor: meta.color,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <Icon name={status === "completed" ? "check" : status === "paused" ? "clock" : "refresh"} size={9} />
      {meta.label}
    </span>
  );
}

// Genre presets for quick filter
const GENRE_CHIPS = ["Isekai", "Shounen", "Romance", "Action", "Fantasy", "Horror", "Slice of Life", "Mecha", "Sports"];

export default function SeriesListPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const wibu = useWibu();

  const [items, setItems] = useState<SeriesListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<ReadingListStatus | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?next=/series");
    }
  }, [authLoading, isAuthenticated, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listSeries({ limit: 100, offset: 0 });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không tải được danh sách bộ truyện.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const handleDelete = useCallback(
    async (item: SeriesListItem) => {
      const ok = window.confirm(
        `Xoá bộ truyện "${item.title}"?\n\nCác chương sẽ bị xoá, nhưng các trang đã dịch vẫn được giữ trong Lịch sử. Hành động này không thể hoàn tác.`,
      );
      if (!ok) return;
      setDeletingId(item.series_id);
      try {
        await deleteSeries(item.series_id);
        setItems(prev => prev.filter(it => it.series_id !== item.series_id));
        setTotal(prev => Math.max(0, prev - 1));
        toast("Đã xoá bộ truyện.", "success");
      } catch (err) {
        const msg = err instanceof APIError ? err.message : "Xoá thất bại.";
        toast(msg, "error");
      } finally {
        setDeletingId(null);
      }
    },
    [toast],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(it => {
      const matchesFilter = filter === "all" ? true : it.status === filter;
      const matchesSearch =
        q === "" ||
        it.title.toLowerCase().includes(q) ||
        (it.description?.toLowerCase().includes(q) ?? false) ||
        (it.tags ?? []).some(t => t.toLowerCase().includes(q));
      const matchesGenre = !genreFilter ||
        (it.tags ?? []).some(t => t.toLowerCase() === genreFilter.toLowerCase());
      const matchesList = !listFilter || wibu.getListStatus(it.series_id) === listFilter;
      return matchesFilter && matchesSearch && matchesGenre && matchesList;
    });
  }, [items, filter, search, genreFilter, listFilter, wibu]);

  const counts = useMemo(() => {
    let ongoing = 0;
    let completed = 0;
    let paused = 0;
    for (const it of items) {
      if (it.status === "completed") completed++;
      else if (it.status === "paused") paused++;
      else ongoing++;
    }
    return { ongoing, completed, paused };
  }, [items]);

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="series" />
        <div style={{ padding: "40px 56px" }}>
          <FadeIn direction="up" distance={20} delay={0.1}>
            <SectionHeader
              kanji="本"
              label="Bộ Truyện · Manga Series"
              title="Sắp xếp truyện của bạn thành bộ liền mạch"
              subtitle="Tạo bộ truyện, gom các trang đã dịch theo chương, đọc một mạch không gián đoạn."
              stamp="LIBRARY"
            />
          </FadeIn>

          {/* Filter bar */}
          <FadeIn direction="up" distance={15} delay={0.2}>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 24,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  border: "2px solid var(--border)",
                  background: "var(--panel)",
                  flex: 1,
                  maxWidth: 360,
                }}
              >
                <Icon name="search" size={14} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm tên bộ truyện, mô tả, tag…"
                  style={{
                    border: "none",
                    background: "transparent",
                    flex: 1,
                    fontSize: 13,
                    outline: "none",
                    color: "var(--fg)",
                  }}
                  aria-label="Tìm kiếm bộ truyện"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                      padding: 0,
                    }}
                    aria-label="Xoá tìm kiếm"
                  >
                    <Icon name="x" size={13} />
                  </button>
                )}
              </div>

              {(
                [
                  { id: "all", label: `Tất cả ${items.length}` },
                  { id: "ongoing", label: `Đang tiến hành ${counts.ongoing}` },
                  { id: "completed", label: `Hoàn thành ${counts.completed}` },
                  { id: "paused", label: `Tạm dừng ${counts.paused}` },
                ] as { id: StatusFilter; label: string }[]
              ).map(f => (
                <motion.button
                  key={f.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`btn btn-sm ${filter === f.id ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                >
                  {f.label}
                </motion.button>
              ))}

              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="btn btn-sm btn-ghost"
                  onClick={load}
                  disabled={loading}
                  aria-label="Tải lại"
                  title="Tải lại"
                >
                  <Icon name="refresh" size={13} />
                </motion.button>
                <Link href="/series/new">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="btn btn-sm btn-primary"
                  >
                    <Icon name="plus" size={13} /> Tạo bộ truyện mới
                  </motion.button>
                </Link>
              </div>
            </div>

            {/* Reading list quick-filter chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center", marginRight: 4, fontWeight: 600 }}>
                <Icon name="bookmark" size={11} /> Danh sách:
              </span>
              {(Object.keys(READING_LIST_META) as ReadingListStatus[]).map(s => {
                const m = READING_LIST_META[s];
                const active = listFilter === s;
                return (
                  <motion.button
                    key={s}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setListFilter(v => v === s ? null : s)}
                    className="chip"
                    style={{
                      cursor: "pointer",
                      border: `1.5px solid ${active ? m.color : "var(--border-soft)"}`,
                      background: active ? m.color : "transparent",
                      color: active ? "#fff" : m.color,
                      fontSize: 10,
                      padding: "3px 9px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Icon name={m.icon} size={10} /> {m.label}
                  </motion.button>
                );
              })}
              {listFilter && (
                <button
                  onClick={() => setListFilter(null)}
                  className="btn btn-sm btn-ghost"
                  style={{ padding: "2px 8px", fontSize: 10 }}
                >
                  <Icon name="x" size={10} /> Xoá
                </button>
              )}
            </div>

            {/* Genre quick-filter chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center", marginRight: 4, fontWeight: 600 }}>
                <Icon name="tag" size={11} /> Genre:
              </span>
              {GENRE_CHIPS.map(g => (
                <motion.button
                  key={g}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setGenreFilter(v => v === g ? null : g)}
                  className={`chip ${genreFilter === g ? "chip-accent" : ""}`}
                  style={{ cursor: "pointer", border: "none", fontSize: 10 }}
                >
                  {g}
                </motion.button>
              ))}
              {genreFilter && (
                <button
                  onClick={() => setGenreFilter(null)}
                  className="btn btn-sm btn-ghost"
                  style={{ padding: "2px 8px", fontSize: 10 }}
                >
                  <Icon name="x" size={10} /> Xoá
                </button>
              )}
            </div>
          </FadeIn>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "var(--muted)",
                }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  style={{ display: "inline-flex" }}
                >
                  <Icon name="refresh" size={28} />
                </motion.div>
                <div style={{ marginTop: 10 }}>Đang tải bộ truyện…</div>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
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
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "var(--muted)",
                }}
              >
                <div className="serif" style={{ fontSize: 48, opacity: 0.3 }}>本</div>
                <div style={{ marginTop: 8 }}>
                  {items.length === 0
                    ? "Bạn chưa có bộ truyện nào. Tạo bộ truyện đầu tiên để bắt đầu sắp xếp."
                    : "Không có bộ truyện nào phù hợp."}
                </div>
                {items.length === 0 && (
                  <Link href="/series/new" style={{ display: "inline-block", marginTop: 14 }}>
                    <button className="btn btn-sm btn-primary">
                      <Icon name="plus" size={13} /> Tạo bộ truyện đầu tiên
                    </button>
                  </Link>
                )}
              </motion.div>
            ) : (
              <StaggerContainer
                key="grid"
                staggerDelay={0.05}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {filtered.map(item => {
                  const isDeleting = deletingId === item.series_id;
                  return (
                    <StaggerItem key={item.series_id} direction="up" distance={15}>
                      <motion.div
                        whileHover={{ y: -3, boxShadow: "6px 6px 0 0 var(--border)" }}
                        className="stroke-ink panel-shadow"
                        style={{
                          background: "var(--panel)",
                          overflow: "hidden",
                          transition: "box-shadow 0.2s",
                          display: "flex",
                          flexDirection: "column",
                          opacity: isDeleting ? 0.5 : 1,
                        }}
                      >
                        <Link
                          href={`/series/${item.series_id}`}
                          style={{ textDecoration: "none", color: "inherit", display: "block" }}
                        >
                          <div
                            style={{
                              width: "100%",
                              aspectRatio: "3/4",
                              background: "var(--bg-3)",
                              borderBottom: "2px solid var(--border)",
                              position: "relative",
                              overflow: "hidden",
                            }}
                            className="halftone-coarse"
                          >
                            {item.cover_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.cover_image_url}
                                alt={item.title}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                                loading="lazy"
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "var(--muted)",
                                }}
                              >
                                <Icon name="stack" size={36} />
                              </div>
                            )}
                            <div style={{ position: "absolute", top: 8, left: 8 }}>
                              <StatusBadge status={item.status} />
                            </div>
                            <div
                              style={{
                                position: "absolute",
                                bottom: 8,
                                right: 8,
                                background: "rgba(17,17,17,0.7)",
                                color: "var(--paper)",
                                padding: "3px 8px",
                                fontSize: 10,
                                fontFamily: "var(--font-mono)",
                                letterSpacing: "0.04em",
                              }}
                            >
                              {item.chapter_count} chương · {item.page_count} trang
                            </div>
                          </div>

                          <div style={{ padding: 12, flex: 1 }}>
                            <div
                              className="serif"
                              style={{
                                fontSize: 15,
                                fontWeight: 700,
                                lineHeight: 1.3,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={item.title}
                            >
                              {item.title}
                            </div>
                            {item.description && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--muted)",
                                  marginTop: 4,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {item.description}
                              </div>
                            )}
                            {/* Star rating + list status row */}
                            {mounted && (
                              <div
                                style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
                                onClick={e => e.preventDefault()}
                              >
                                <StarRating
                                  value={wibu.getRating(item.series_id)}
                                  onChange={r => wibu.setRating(item.series_id, r)}
                                  size={13}
                                  showClear={false}
                                />
                                <ReadingListPicker
                                  value={wibu.getListStatus(item.series_id)}
                                  onChange={s => wibu.setListStatus(item.series_id, s)}
                                />
                              </div>
                            )}
                            {item.tags && item.tags.length > 0 && (
                              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                                {item.tags.slice(0, 4).map(tag => (
                                  <span
                                    key={tag}
                                    style={{
                                      fontSize: 9,
                                      padding: "1px 6px",
                                      background: "var(--bg-2)",
                                      border: "1px solid var(--border-soft)",
                                      borderRadius: 2,
                                      color: "var(--fg-soft)",
                                    }}
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--muted)",
                                marginTop: 8,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Icon name="clock" size={10} />
                              {formatRelativeTime(item.updated_at)}
                            </div>
                          </div>
                        </Link>

                        {/* Progress bar */}
                        {mounted && (() => {
                          const prog = getSeriesProgress(item.series_id);
                          if (!prog) return null;
                          const pct = prog.totalPages > 0 ? Math.round((prog.pageNumber / prog.totalPages) * 100) : 0;
                          return (
                            <div style={{ padding: "6px 12px 0", marginTop: -4 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--muted)", marginBottom: 3 }}>
                                <span>Đã đọc {pct}%</span>
                                <span>Tr.{prog.pageNumber}/{prog.totalPages}</span>
                              </div>
                              <div style={{ height: 3, background: "var(--bg-2)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
                              </div>
                            </div>
                          );
                        })()}

                        <div
                          style={{
                            padding: "8px 12px",
                            borderTop: "1px dashed var(--border-soft)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {mounted && getSeriesProgress(item.series_id) ? (
                            <Link href={`/series/${item.series_id}/read?page_id=${getSeriesProgress(item.series_id)!.pageId}`} style={{ textDecoration: "none" }}>
                              <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                className="btn btn-sm btn-primary"
                                style={{ padding: "4px 10px", fontSize: 11 }}
                              >
                                <Icon name="arrow-right" size={12} /> Tiếp tục
                              </motion.button>
                            </Link>
                          ) : (
                          <Link href={`/series/${item.series_id}`} style={{ textDecoration: "none" }}>
                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              className="btn btn-sm"
                              style={{ padding: "4px 10px", fontSize: 11 }}
                            >
                              <Icon name="book" size={12} /> Mở
                            </motion.button>
                          </Link>
                          )}
                          <div style={{ display: "flex", gap: 6 }}>
                            <Link href={`/series/${item.series_id}/edit`} style={{ textDecoration: "none" }}>
                              <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                className="btn btn-sm btn-ghost"
                                style={{ padding: "4px 8px" }}
                                aria-label="Chỉnh sửa"
                                title="Chỉnh sửa"
                              >
                                <Icon name="settings" size={12} />
                              </motion.button>
                            </Link>
                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleDelete(item)}
                              disabled={isDeleting}
                              aria-label={`Xoá ${item.title}`}
                              title="Xoá bộ truyện"
                              style={{ padding: "4px 8px", color: "var(--accent)" }}
                            >
                              <Icon name="trash" size={12} />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            )}
          </AnimatePresence>

          {!loading && !error && items.length > 0 && (
            <div style={{ marginTop: 28, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
              Tổng {total} bộ truyện
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
