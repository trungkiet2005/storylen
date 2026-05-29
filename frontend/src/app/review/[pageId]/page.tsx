"use client";

import React, { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icons";
import { useAuth } from "@/contexts/AuthContext";
import { getPage, type BubbleData, type PageData } from "@/lib/api";

type Hover = { id: string; x: number; y: number } | null;

export default function ReviewPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = use(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [page, setPage] = useState<PageData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<Hover>(null);
  const [showOriginal, setShowOriginal] = useState(true);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace(`/login?next=/review/${pageId}`);
  }, [isLoading, user, router, pageId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPage(pageId);
        if (!cancelled) setPage(data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Không tải được trang.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pageId]);

  const stats = useMemo(() => {
    if (!page?.processed_data?.length) return null;
    const bubbles = page.processed_data;
    const confidences = bubbles.map((b) => b.confidence).filter((c) => c > 0);
    const avg = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
    const low = bubbles.filter((b) => b.confidence > 0 && b.confidence < 0.6).length;
    const approved = bubbles.filter((b) => b.review_status === "approved").length;
    const rejected = bubbles.filter((b) => b.review_status === "rejected").length;
    return { total: bubbles.length, avg, low, approved, rejected };
  }, [page]);

  if (!user) return null;

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px 80px" }}>
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/reader/${pageId}`} style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
            ← Quay lại reader
          </Link>
          <span className="caps-xs" style={{ color: "var(--muted)" }}>· REVIEW MODE</span>
        </div>

        <header style={{ marginBottom: 20 }}>
          <h1 className="display" style={{ fontSize: "clamp(24px,3vw,32px)", letterSpacing: "-0.02em" }}>
            Kiểm tra OCR · Bubble Overlay
          </h1>
          <p style={{ fontSize: 13, color: "var(--fg-soft)", marginTop: 4 }}>
            Di chuột vào ô bóng thoại để xem text gốc và bản dịch. Bbox màu đỏ = độ tin cậy thấp.
          </p>
        </header>

        {loading && <div style={{ color: "var(--muted)" }}>Đang tải...</div>}

        {err && (
          <div className="stroke-ink" style={{ padding: 16, background: "rgba(200,16,46,0.05)", color: "var(--accent)" }}>
            {err}
          </div>
        )}

        {page && !loading && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 20, alignItems: "flex-start" }}>
            {/* Image + overlay */}
            <div
              ref={wrapRef}
              className="stroke-ink-thick panel-shadow"
              style={{ position: "relative", background: "#000", overflow: "hidden", borderRadius: "var(--radius-sm)" }}
            >
              {(() => {
                const src = showOriginal ? page.original_image_url : (page.translated_image_url || page.original_image_url);
                if (!src) return null;
                return (
                  <Image
                    src={src}
                    alt={showOriginal ? "Trang gốc" : "Trang đã dịch"}
                    width={1200}
                    height={1700}
                    unoptimized
                    onLoadingComplete={(img) => setImgDims({ w: img.naturalWidth, h: img.naturalHeight })}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                );
              })()}

              {imgDims && (
                <svg
                  viewBox={`0 0 ${imgDims.w} ${imgDims.h}`}
                  preserveAspectRatio="none"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                >
                  {page.processed_data.map((b) => {
                    const [x, y, w, h] = b.bbox;
                    const low = b.confidence > 0 && b.confidence < 0.6;
                    const stroke = b.review_status === "rejected" ? "#dc2626"
                                 : b.review_status === "approved" ? "#16a34a"
                                 : low ? "#f59e0b"
                                 : "#c8102e";
                    return (
                      <g key={b.bubble_id} style={{ pointerEvents: "all", cursor: "help" }}
                         onMouseEnter={(e) => {
                           const rect = wrapRef.current?.getBoundingClientRect();
                           setHover({ id: b.bubble_id, x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) });
                         }}
                         onMouseMove={(e) => {
                           const rect = wrapRef.current?.getBoundingClientRect();
                           setHover({ id: b.bubble_id, x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) });
                         }}
                         onMouseLeave={() => setHover(null)}>
                        <rect
                          x={x} y={y} width={w} height={h}
                          fill={low ? "rgba(245,158,11,0.12)" : "rgba(200,16,46,0.06)"}
                          stroke={stroke}
                          strokeWidth={3}
                          vectorEffect="non-scaling-stroke"
                        />
                        <text
                          x={x + 4} y={y + 14}
                          fontSize={11}
                          fontFamily="monospace"
                          fill={stroke}
                          style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.6)", strokeWidth: 2, fontWeight: 700 }}
                        >
                          #{page.processed_data.indexOf(b) + 1} · {(b.confidence * 100).toFixed(0)}%
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Hover tooltip */}
              {hover && (() => {
                const b = page.processed_data.find((x) => x.bubble_id === hover.id);
                if (!b) return null;
                return (
                  <div
                    style={{
                      position: "absolute",
                      left: Math.min(hover.x + 16, (wrapRef.current?.clientWidth ?? 0) - 320),
                      top: Math.min(hover.y + 16, (wrapRef.current?.clientHeight ?? 0) - 160),
                      width: 300,
                      background: "rgba(15,12,10,0.95)",
                      color: "var(--paper)",
                      padding: "10px 12px",
                      fontSize: 12,
                      lineHeight: 1.5,
                      pointerEvents: "none",
                      zIndex: 10,
                      border: "1.5px solid var(--accent)",
                      boxShadow: "3px 3px 0 0 rgba(0,0,0,0.4)",
                    }}
                  >
                    <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 4 }}>
                      Bubble #{page.processed_data.indexOf(b) + 1} · conf {(b.confidence * 100).toFixed(0)}%
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ color: "rgba(245,239,227,0.6)" }}>Gốc:</span> {b.original_text || "(rỗng)"}
                    </div>
                    <div>
                      <span style={{ color: "rgba(245,239,227,0.6)" }}>Dịch:</span>{" "}
                      <strong>{b.translated_text || "(rỗng)"}</strong>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Sidebar — stats + bubble list */}
            <aside className="stroke-ink" style={{ background: "var(--panel)", padding: 16, position: "sticky", top: 20 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setShowOriginal(true)}
                  className="btn btn-sm"
                  style={{ flex: 1, background: showOriginal ? "var(--ink)" : "var(--panel)", color: showOriginal ? "var(--paper)" : "var(--fg)" }}
                >
                  Gốc
                </button>
                <button
                  type="button"
                  onClick={() => setShowOriginal(false)}
                  className="btn btn-sm"
                  style={{ flex: 1, background: !showOriginal ? "var(--ink)" : "var(--panel)", color: !showOriginal ? "var(--paper)" : "var(--fg)" }}
                  disabled={!page.translated_image_url}
                >
                  Đã dịch
                </button>
              </div>

              {stats && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, fontSize: 13 }}>
                  <Row label="Tổng bubble" value={String(stats.total)} />
                  <Row label="Confidence TB" value={`${(stats.avg * 100).toFixed(0)}%`} />
                  <Row label="Thấp (<60%)" value={String(stats.low)} color={stats.low > 0 ? "#f59e0b" : undefined} />
                  <Row label="Đã duyệt" value={String(stats.approved)} color="#16a34a" />
                  <Row label="Từ chối" value={String(stats.rejected)} color="#dc2626" />
                </div>
              )}

              <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 8 }}>Chú thích bbox</div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
                <Legend color="#c8102e" label="Bình thường" />
                <Legend color="#f59e0b" label="Confidence thấp" />
                <Legend color="#16a34a" label="Đã duyệt" />
                <Legend color="#dc2626" label="Từ chối" />
              </ul>

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
                <Link href={`/reader/${pageId}`} className="btn btn-sm btn-secondary" style={{ width: "100%", justifyContent: "center", display: "flex", gap: 6 }}>
                  <Icon name="arrow-left" size={13} /> Quay lại reader
                </Link>
              </div>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <strong style={{ color: color || "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{value}</strong>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 14, height: 14, border: `2px solid ${color}`, background: `${color}22`, display: "inline-block" }} />
      <span style={{ color: "var(--fg-soft)" }}>{label}</span>
    </li>
  );
}
