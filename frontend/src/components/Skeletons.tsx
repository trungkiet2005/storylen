"use client";
import React from "react";

// Tiny animated placeholder. Uses the same `pulse` keyframes that already
// exist in globals.css (browse page uses it). Centralised so layout-shift
// during cold-start (Render free tier can take 30s) feels intentional, not
// broken.

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = "100%", height = 16, radius = 4, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        background: "var(--bg-2)",
        borderRadius: radius,
        animation: "pulse 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/** A card-shaped placeholder matching MangaCard / SeriesCard dimensions. */
export function CardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        background: "var(--bg-2)",
        border: "2px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        animation: "pulse 1.4s ease-in-out infinite",
        animationDelay: `${delay}s`,
      }}
    >
      <div style={{ height: 200, background: "var(--bg-3, var(--bg-2))" }} />
      <div style={{ padding: "12px 14px" }}>
        <Skeleton height={14} style={{ marginBottom: 8 }} />
        <Skeleton height={11} width="60%" />
      </div>
    </div>
  );
}

/** Grid of card skeletons. Use while the list endpoint is in flight. */
export function CardGridSkeleton({ count = 12, minCardWidth = 160 }: { count?: number; minCardWidth?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill,minmax(${minCardWidth}px,1fr))`,
        gap: 16,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} delay={i * 0.04} />
      ))}
    </div>
  );
}

/** List-row skeleton — for /history page (image left, text right). */
export function RowSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        gap: 14,
        padding: 12,
        border: "2px solid var(--border)",
        background: "var(--panel)",
        borderRadius: "var(--radius)",
        animation: "pulse 1.4s ease-in-out infinite",
        animationDelay: `${delay}s`,
      }}
    >
      <div style={{ width: 72, height: 96, background: "var(--bg-2)", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
        <Skeleton height={14} width="60%" />
        <Skeleton height={11} width="40%" />
        <Skeleton height={11} width="80%" />
      </div>
    </div>
  );
}

export function RowListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <RowSkeleton key={i} delay={i * 0.06} />
      ))}
    </div>
  );
}

// Generic "empty state" component so every list page uses the same look.
export function EmptyState({
  icon = "📭",
  title,
  hint,
  cta,
}: {
  icon?: string;
  title: string;
  hint?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "64px 16px",
        color: "var(--muted)",
        border: "2px dashed var(--border-soft)",
        borderRadius: "var(--radius)",
        background: "var(--panel)",
      }}
    >
      <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 6 }}>
        {title}
      </div>
      {hint && <div style={{ fontSize: 13, marginBottom: cta ? 18 : 0 }}>{hint}</div>}
      {cta}
    </div>
  );
}
