"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/Icons";

// Next.js calls this for ANY unhandled error thrown in a route segment below.
// Must be a client component. The `reset` function lets the user retry the
// failing segment without a full page reload.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    document.title = "Đã xảy ra lỗi | StoryLens";
    // Forward to Sentry only if it's loaded (silently no-ops otherwise).
    type SentryGlobal = { captureException?: (e: unknown) => void };
    const sentry = (globalThis as unknown as { Sentry?: SentryGlobal }).Sentry;
    sentry?.captureException?.(error);
    // Also log to console so devs see it during local dev when Sentry is off.
    console.error("[RouteError]", error);
  }, [error]);

  return (
    <div
      className="paper-grain"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 40,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 110, damping: 14 }}
        className="display"
        style={{
          fontSize: 160,
          lineHeight: 0.9,
          color: "var(--border-soft)",
          userSelect: "none",
          letterSpacing: "-0.06em",
          marginBottom: 16,
        }}
      >
        500
      </motion.div>

      <div className="caps-sm" style={{ color: "var(--accent)", marginBottom: 10 }}>
        LỖI HỆ THỐNG
      </div>
      <h1 className="display" style={{ fontSize: 36, margin: "0 0 12px" }}>
        Có gì đó hỏng rồi
      </h1>
      <p style={{ color: "var(--fg-soft)", maxWidth: 460, lineHeight: 1.6, marginBottom: 24 }}>
        Lỗi này đã được ghi nhận. Anh thử lại — nếu vẫn không được, quay về trang chủ hoặc thử
        làm mới trang sau ít phút.
      </p>

      {/* Show the digest only — never the raw stack, that leaks server internals. */}
      {error.digest && (
        <code
          style={{
            fontSize: 11,
            color: "var(--muted)",
            background: "var(--bg-2)",
            padding: "4px 10px",
            border: "1px solid var(--border-soft)",
            borderRadius: 4,
            marginBottom: 24,
            fontFamily: "var(--font-mono)",
          }}
        >
          ref: {error.digest}
        </code>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="btn btn-primary"
          onClick={() => reset()}
          style={{ padding: "14px 26px", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Icon name="refresh" size={14} /> Thử lại
        </motion.button>
        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="btn"
            style={{ padding: "14px 26px" }}
          >
            Về trang chủ
          </motion.button>
        </Link>
      </div>
    </div>
  );
}
