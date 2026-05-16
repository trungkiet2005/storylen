"use client";
import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import {
  APIError,
  getPage,
  updateBubbleReview,
  type BubbleData,
  type PageData,
  type ReviewStatus,
} from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<ReviewStatus, { stroke: string; fill: string; chip: string; text: string }> = {
  pending:  { stroke: "#d4a017", fill: "rgba(212,160,23,0.10)",  chip: "rgba(212,160,23,0.12)",  text: "#7c5a00" },
  approved: { stroke: "#16a34a", fill: "rgba(22,163,74,0.10)",   chip: "rgba(22,163,74,0.12)",   text: "#0a6b2c" },
  rejected: { stroke: "#dc2626", fill: "rgba(220,38,38,0.10)",   chip: "rgba(220,38,38,0.12)",   text: "#8b0f0f" },
};

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending:  "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

function statusOf(b: BubbleData): ReviewStatus {
  return (b.review_status ?? "pending") as ReviewStatus;
}

// ─── Bubble overlay on image ──────────────────────────────────────────────────

function BubbleOverlay({
  bubbles,
  imageW,
  imageH,
  selectedId,
  onSelect,
  draftStatuses,
}: {
  bubbles: BubbleData[];
  imageW: number;
  imageH: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  draftStatuses: Map<string, ReviewStatus>;
}) {
  if (!imageW || !imageH) return null;
  return (
    <svg
      viewBox={`0 0 ${imageW} ${imageH}`}
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {bubbles.map((b, i) => {
        const [x, y, w, h] = b.bbox;
        const status = draftStatuses.get(b.bubble_id) ?? statusOf(b);
        const isSelected = b.bubble_id === selectedId;
        const c = STATUS_COLOR[status];
        return (
          <g key={b.bubble_id} style={{ pointerEvents: "auto", cursor: "pointer" }} onClick={() => onSelect(b.bubble_id)}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={isSelected ? "rgba(200,16,46,0.18)" : c.fill}
              stroke={isSelected ? "var(--accent, #c8102e)" : c.stroke}
              strokeWidth={isSelected ? 4 : 2}
              rx={4}
            />
            <text
              x={x + 6}
              y={y + 18}
              fontSize={14}
              fontWeight={800}
              fill={isSelected ? "var(--accent, #c8102e)" : c.stroke}
              style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Bubble card ──────────────────────────────────────────────────────────────

function BubbleCard({
  index,
  bubble,
  isSelected,
  draftText,
  onSelect,
  onEdit,
  onAction,
  saving,
  onRef,
}: {
  index: number;
  bubble: BubbleData;
  isSelected: boolean;
  draftText: string;
  onSelect: () => void;
  onEdit: (text: string) => void;
  onAction: (status: ReviewStatus) => void;
  saving: boolean;
  onRef: (el: HTMLDivElement | null) => void;
}) {
  const status = statusOf(bubble);
  const c = STATUS_COLOR[status];
  const dirty = draftText !== bubble.translated_text;

  return (
    <div
      ref={onRef}
      onClick={onSelect}
      style={{
        border: `2px solid ${isSelected ? "var(--accent, #c8102e)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        background: "var(--panel)",
        padding: 14,
        marginBottom: 10,
        boxShadow: isSelected ? "3px 3px 0 var(--border)" : "none",
        transition: "border-color 0.12s, box-shadow 0.12s",
        scrollMarginTop: 80,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: c.stroke,
              color: "#fff",
              fontWeight: 800,
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {index + 1}
          </div>
          <span
            style={{
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 99,
              background: c.chip,
              color: c.text,
            }}
          >
            {STATUS_LABEL[status]}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>
            OCR {Math.round(bubble.confidence * 100)}%
          </span>
        </div>
        {dirty && <span style={{ fontSize: 11, color: "var(--accent, #c8102e)" }}>● chưa lưu</span>}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
          Nguyên bản
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.4, padding: "8px 10px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", whiteSpace: "pre-wrap" }}>
          {bubble.original_text || "—"}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
          Bản dịch
        </div>
        <textarea
          value={draftText}
          onChange={(e) => onEdit(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onFocus={onSelect}
          rows={Math.max(2, Math.min(6, draftText.split("\n").length))}
          placeholder="Nhập bản dịch…"
          style={{
            width: "100%",
            fontSize: 13,
            lineHeight: 1.4,
            padding: "8px 10px",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg)",
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
        <button
          className="btn btn-sm"
          onClick={() => onAction("approved")}
          disabled={saving}
          style={{
            background: status === "approved" ? "#16a34a" : "transparent",
            color: status === "approved" ? "#fff" : "#16a34a",
            border: "1.5px solid #16a34a",
            fontWeight: 700,
          }}
        >
          <Icon name="check" size={12} /> Duyệt
        </button>
        <button
          className="btn btn-sm"
          onClick={() => onAction("rejected")}
          disabled={saving}
          style={{
            background: status === "rejected" ? "#dc2626" : "transparent",
            color: status === "rejected" ? "#fff" : "#dc2626",
            border: "1.5px solid #dc2626",
            fontWeight: 700,
          }}
        >
          <Icon name="x" size={12} /> Từ chối
        </button>
        <button
          className="btn btn-sm"
          onClick={() => onAction("pending")}
          disabled={saving || status === "pending"}
          style={{
            background: "transparent",
            color: "var(--muted)",
            border: "1.5px solid var(--border)",
          }}
        >
          <Icon name="refresh" size={12} /> Reset
        </button>
        {saving && (
          <span style={{ fontSize: 11, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-flex" }}>
              <Icon name="refresh" size={12} />
            </span>
            Đang lưu…
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Filter = "all" | ReviewStatus;

function StudioContent({ pageId }: { pageId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ── Load page data ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getPage(pageId)
      .then((data) => {
        if (cancelled) return;
        setPage(data);
        setDrafts(
          Object.fromEntries(data.processed_data.map((b) => [b.bubble_id, b.translated_text])),
        );
        if (data.processed_data.length) setSelectedId(data.processed_data[0].bubble_id);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof APIError && e.status === 401
          ? "Cần đăng nhập để mở Studio."
          : e instanceof Error ? e.message : "Không tải được trang.";
        setError(msg);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pageId]);

  const bubbles = page?.processed_data ?? [];

  const counts = useMemo(() => {
    const c = { all: bubbles.length, pending: 0, approved: 0, rejected: 0 };
    for (const b of bubbles) c[statusOf(b)]++;
    return c;
  }, [bubbles]);

  const visibleBubbles = useMemo(
    () => (filter === "all" ? bubbles : bubbles.filter((b) => statusOf(b) === filter)),
    [bubbles, filter],
  );

  const completion = bubbles.length === 0 ? 0 : Math.round((counts.approved / bubbles.length) * 100);

  // ── Persist review action ──────────────────────────────────────────────────
  const persistReview = useCallback(async (bubbleId: string, status: ReviewStatus) => {
    if (!page) return;
    const draftText = drafts[bubbleId] ?? "";
    const original = bubbles.find((b) => b.bubble_id === bubbleId);
    if (!original) return;

    const textChanged = draftText.trim() && draftText.trim() !== original.translated_text;
    setSavingId(bubbleId);
    try {
      const updated = await updateBubbleReview(pageId, bubbleId, {
        review_status: status,
        translated_text: textChanged ? draftText.trim() : undefined,
      });
      setPage((p) => p && {
        ...p,
        processed_data: p.processed_data.map((b) =>
          b.bubble_id === bubbleId
            ? { ...b, ...updated, translated_text: updated.translated_text || b.translated_text }
            : b,
        ),
      });
      if (textChanged) {
        setDrafts((d) => ({ ...d, [bubbleId]: updated.translated_text || draftText.trim() }));
      }
      toast(`#${bubbles.findIndex((b) => b.bubble_id === bubbleId) + 1}: ${STATUS_LABEL[status]}`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lưu thất bại";
      toast(msg, "error");
    } finally {
      setSavingId(null);
    }
  }, [page, pageId, drafts, bubbles, toast]);

  // ── Scroll selected card into view + flash image rect ──────────────────────
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    cardRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) return;
      if (!visibleBubbles.length) return;
      const idx = selectedId ? visibleBubbles.findIndex((b) => b.bubble_id === selectedId) : -1;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = visibleBubbles[Math.min(visibleBubbles.length - 1, idx + 1)] ?? visibleBubbles[0];
        handleSelect(next.bubble_id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = visibleBubbles[Math.max(0, idx - 1)] ?? visibleBubbles[0];
        handleSelect(next.bubble_id);
      } else if ((e.key === "a" || e.key === "A") && selectedId) {
        e.preventDefault();
        persistReview(selectedId, "approved");
      } else if ((e.key === "r" || e.key === "R") && selectedId) {
        e.preventDefault();
        persistReview(selectedId, "rejected");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visibleBubbles, selectedId, handleSelect, persistReview]);

  const draftStatuses = useMemo(() => new Map<string, ReviewStatus>(), []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <TopBar active="studio" />

      <main style={{ maxWidth: 1600, margin: "0 auto", padding: "16px clamp(12px, 2vw, 24px)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <div className="display" style={{ fontSize: "clamp(20px, 2.4vw, 28px)", letterSpacing: "-0.02em" }}>
              🎬 Studio QC
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              Duyệt / sửa từng bubble · Phím tắt: <kbd>J</kbd>/<kbd>K</kbd> chuyển, <kbd>A</kbd> duyệt, <kbd>R</kbd> từ chối
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>
            <Icon name="arrow-left" size={13} /> Quay lại
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--muted)" }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-flex" }}>
              <Icon name="refresh" size={24} />
            </span>
            <div style={{ marginTop: 10, fontSize: 13 }}>Đang tải trang…</div>
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--accent)" }}>
            <Icon name="alert" size={28} />
            <div style={{ marginTop: 12, fontSize: 14 }}>{error}</div>
          </div>
        )}

        {!loading && !error && page && bubbles.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--muted)" }}>
            <Icon name="alert" size={28} />
            <div style={{ marginTop: 12, fontSize: 14 }}>Trang này không có bubble nào để duyệt.</div>
          </div>
        )}

        {!loading && !error && page && bubbles.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gap: 20,
              alignItems: "flex-start",
            }}
          >
            {/* ── Left pane: image + overlay (sticky) ─────────────────── */}
            <div style={{ position: "sticky", top: 80, alignSelf: "flex-start" }}>
              <div
                style={{
                  position: "relative",
                  background: "var(--panel)",
                  border: "2px solid var(--border)",
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                  boxShadow: "3px 3px 0 var(--border)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.original_image_url}
                  alt="Trang gốc"
                  onLoad={(e) => setImgSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                  style={{ width: "100%", display: "block" }}
                />
                <BubbleOverlay
                  bubbles={bubbles}
                  imageW={imgSize.w}
                  imageH={imgSize.h}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  draftStatuses={draftStatuses}
                />
              </div>
            </div>

            {/* ── Right pane: filters + cards ─────────────────────────── */}
            <div>
              {/* Progress + filter */}
              <div
                style={{
                  background: "var(--panel)",
                  border: "2px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: 14,
                  marginBottom: 12,
                  boxShadow: "3px 3px 0 var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    Tiến độ duyệt: <span style={{ color: "var(--accent, #c8102e)" }}>{completion}%</span>
                    <span style={{ color: "var(--muted)", fontWeight: 500, marginLeft: 8 }}>
                      ({counts.approved}/{counts.all})
                    </span>
                  </div>
                </div>

                <div style={{ height: 6, background: "var(--bg-2)", borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
                  <div
                    style={{
                      width: `${completion}%`,
                      height: "100%",
                      background: "#16a34a",
                      transition: "width 0.3s",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["all", "pending", "approved", "rejected"] as Filter[]).map((f) => {
                    const active = f === filter;
                    const n = counts[f];
                    const label = f === "all" ? "Tất cả" : STATUS_LABEL[f];
                    return (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                          padding: "5px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 99,
                          border: "1.5px solid",
                          borderColor: active ? "var(--accent, #c8102e)" : "var(--border)",
                          background: active ? "var(--accent, #c8102e)" : "var(--panel)",
                          color: active ? "#fff" : "var(--text)",
                          cursor: "pointer",
                        }}
                      >
                        {label} ({n})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cards */}
              {visibleBubbles.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>
                  Không có bubble nào trong nhóm này.
                </div>
              ) : (
                visibleBubbles.map((b) => {
                  const realIndex = bubbles.findIndex((x) => x.bubble_id === b.bubble_id);
                  return (
                    <motion.div
                      key={b.bubble_id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <BubbleCard
                        index={realIndex}
                        bubble={b}
                        isSelected={b.bubble_id === selectedId}
                        draftText={drafts[b.bubble_id] ?? ""}
                        onSelect={() => setSelectedId(b.bubble_id)}
                        onEdit={(text) => setDrafts((d) => ({ ...d, [b.bubble_id]: text }))}
                        onAction={(s) => persistReview(b.bubble_id, s)}
                        saving={savingId === b.bubble_id}
                        onRef={(el) => {
                          if (el) cardRefs.current.set(b.bubble_id, el);
                          else cardRefs.current.delete(b.bubble_id);
                        }}
                      />
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function StudioPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = use(params);
  return <StudioContent pageId={pageId} />;
}
