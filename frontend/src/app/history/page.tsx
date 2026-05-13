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
import {
  AnimatedPage,
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/components/Animations";
import {
  APIError,
  deleteHistoryItem,
  getHistory,
  type HistoryItem,
  type PageStatus,
} from "@/lib/api";

type StatusFilter = "all" | "ready" | "processing" | "failed";

const STATUS_META: Record<
  PageStatus["status"],
  { label: string; tone: "ready" | "processing" | "failed"; color: string }
> = {
  pending:      { label: "Đang chờ",   tone: "processing", color: "var(--muted)" },
  ocr_running:  { label: "Đang OCR",   tone: "processing", color: "var(--accent)" },
  translating:  { label: "Đang dịch",  tone: "processing", color: "var(--accent)" },
  translated:   { label: "Đã dịch",    tone: "ready",      color: "var(--jade)" },
  completed:    { label: "Hoàn tất",   tone: "ready",      color: "var(--jade)" },
  ocr_failed:   { label: "Lỗi OCR",    tone: "failed",     color: "var(--accent)" },
  failed:       { label: "Thất bại",   tone: "failed",     color: "var(--accent)" },
  error:        { label: "Lỗi",        tone: "failed",     color: "var(--accent)" },
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

function StatusBadge({ status }: { status: PageStatus["status"] }) {
  const meta = STATUS_META[status] ?? STATUS_META.failed;
  const isProcessing = meta.tone === "processing";
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
      {isProcessing && (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          style={{ display: "inline-flex" }}
        >
          <Icon name="refresh" size={9} />
        </motion.span>
      )}
      {meta.tone === "ready" && <Icon name="check" size={9} />}
      {meta.tone === "failed" && <Icon name="alert" size={9} />}
      {meta.label}
    </span>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?next=/history");
    }
  }, [authLoading, isAuthenticated, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getHistory({ limit: 100, offset: 0 });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      const msg =
        err instanceof APIError
          ? err.message
          : "Không tải được lịch sử dịch. Hãy thử lại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const handleDelete = useCallback(
    async (item: HistoryItem) => {
      const ok = window.confirm(
        `Xoá "${item.title}" khỏi lịch sử dịch? Hành động này không thể hoàn tác.`,
      );
      if (!ok) return;
      setDeletingId(item.id);
      try {
        await deleteHistoryItem(item.id);
        setItems(prev => prev.filter(it => it.id !== item.id));
        setTotal(prev => Math.max(0, prev - 1));
        toast("Đã xoá khỏi lịch sử.", "success");
      } catch (err) {
        const msg =
          err instanceof APIError ? err.message : "Xoá thất bại. Hãy thử lại.";
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
      const tone = STATUS_META[it.status]?.tone ?? "failed";
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "ready"
            ? tone === "ready"
            : filter === "processing"
              ? tone === "processing"
              : tone === "failed";
      const matchesSearch =
        q === "" ||
        it.title.toLowerCase().includes(q) ||
        it.id.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [items, filter, search]);

  const counts = useMemo(() => {
    let ready = 0;
    let processing = 0;
    let failed = 0;
    for (const it of items) {
      const tone = STATUS_META[it.status]?.tone ?? "failed";
      if (tone === "ready") ready++;
      else if (tone === "processing") processing++;
      else failed++;
    }
    return { ready, processing, failed };
  }, [items]);

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="history" />
        <div style={{ padding: "40px 56px" }}>
          <FadeIn direction="up" distance={20} delay={0.1}>
            <SectionHeader
              kanji="訳"
              label="Lịch Sử Dịch · Translation History"
              title="Các trang bạn đã dịch bằng AI"
              subtitle="Toàn bộ ảnh manga bạn đã tải lên và để AI dịch. Mở để đọc lại, hoặc xoá khỏi lịch sử."
              stamp="ARCHIVE"
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
                  placeholder="Tìm theo tên trang hoặc ID…"
                  style={{
                    border: "none",
                    background: "transparent",
                    flex: 1,
                    fontSize: 13,
                    outline: "none",
                    color: "var(--fg)",
                  }}
                  aria-label="Tìm kiếm lịch sử dịch"
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
                  { id: "ready", label: `Đã dịch ${counts.ready}` },
                  { id: "processing", label: `Đang xử lý ${counts.processing}` },
                  { id: "failed", label: `Thất bại ${counts.failed}` },
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
                <Link href="/upload">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="btn btn-sm btn-primary"
                  >
                    <Icon name="upload" size={13} /> Dịch ảnh mới
                  </motion.button>
                </Link>
              </div>
            </div>
          </FadeIn>

          {/* Content */}
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
                <div style={{ marginTop: 10 }}>Đang tải lịch sử…</div>
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
                <button className="btn btn-sm" onClick={load}>
                  Thử lại
                </button>
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
                <div className="serif" style={{ fontSize: 48, opacity: 0.3 }}>∅</div>
                <div style={{ marginTop: 8 }}>
                  {items.length === 0
                    ? "Bạn chưa dịch ảnh nào. Hãy bắt đầu bằng cách tải ảnh lên."
                    : "Không có mục nào phù hợp."}
                </div>
                {items.length === 0 && (
                  <Link href="/upload" style={{ display: "inline-block", marginTop: 14 }}>
                    <button className="btn btn-sm btn-primary">
                      <Icon name="upload" size={13} /> Tải ảnh lên
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
                  const meta = STATUS_META[item.status] ?? STATUS_META.failed;
                  const isReady = meta.tone === "ready";
                  const isDeleting = deletingId === item.id;
                  return (
                    <StaggerItem key={item.id} direction="up" distance={15}>
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
                        {/* Thumbnail */}
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
                          {item.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.thumbnail_url}
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
                              <Icon name="image" size={32} />
                            </div>
                          )}
                          <div
                            style={{
                              position: "absolute",
                              top: 8,
                              left: 8,
                            }}
                          >
                            <StatusBadge status={item.status} />
                          </div>
                        </div>

                        {/* Info */}
                        <div style={{ padding: 12, flex: 1 }}>
                          <div
                            className="serif"
                            style={{
                              fontSize: 14,
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
                          <div
                            className="mono"
                            style={{
                              fontSize: 10,
                              color: "var(--muted)",
                              marginTop: 3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={item.id}
                          >
                            {item.id}
                          </div>
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
                            {formatRelativeTime(item.last_accessed)}
                          </div>
                        </div>

                        {/* Footer actions */}
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
                          {isReady ? (
                            <Link
                              href={`/reader?page=${item.id}`}
                              style={{ textDecoration: "none" }}
                            >
                              <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                className="btn btn-sm"
                                style={{ padding: "4px 10px", fontSize: 11 }}
                              >
                                <Icon name="book" size={12} /> Mở
                              </motion.button>
                            </Link>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>
                              {meta.tone === "processing"
                                ? "Đang chờ AI…"
                                : "Không khả dụng"}
                            </span>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleDelete(item)}
                            disabled={isDeleting}
                            aria-label={`Xoá ${item.title}`}
                            title="Xoá khỏi lịch sử"
                            style={{
                              padding: "4px 8px",
                              color: "var(--accent)",
                            }}
                          >
                            <Icon name="trash" size={12} />
                          </motion.button>
                        </div>
                      </motion.div>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            )}
          </AnimatePresence>

          {/* Stats footer */}
          {!loading && !error && items.length > 0 && (
            <StaggerContainer
              staggerDelay={0.08}
              style={{ marginTop: 28, display: "flex", gap: 20, flexWrap: "wrap" }}
            >
              {[
                { label: "Tổng số trang đã dịch", value: total, icon: "stack" },
                { label: "Đã hoàn tất", value: counts.ready, icon: "check" },
                { label: "Đang xử lý", value: counts.processing, icon: "refresh" },
                { label: "Thất bại", value: counts.failed, icon: "alert" },
              ].map(stat => (
                <StaggerItem key={stat.label} direction="up" distance={12}>
                  <motion.div
                    whileHover={{ y: -2, boxShadow: "4px 4px 0 0 var(--border)" }}
                    className="stroke-ink"
                    style={{
                      background: "var(--panel)",
                      padding: "12px 20px",
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      transition: "box-shadow 0.2s",
                    }}
                  >
                    <Icon name={stat.icon} size={18} />
                    <div>
                      <div className="display" style={{ fontSize: 22, lineHeight: 1 }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                        {stat.label}
                      </div>
                    </div>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
