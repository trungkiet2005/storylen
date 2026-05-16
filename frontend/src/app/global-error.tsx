"use client";
// Last-resort error boundary — catches errors that escape the root layout
// (extremely rare; usually only if `layout.tsx` itself throws). Must render
// its own <html>/<body>.
import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    type SentryGlobal = { captureException?: (e: unknown) => void };
    const sentry = (globalThis as unknown as { Sentry?: SentryGlobal }).Sentry;
    sentry?.captureException?.(error);
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="vi">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 32, lineHeight: 1.5 }}>
        <div style={{ maxWidth: 480, margin: "10vh auto", textAlign: "center" }}>
          <div style={{ fontSize: 64, fontWeight: 700, color: "#c8102e", marginBottom: 8 }}>500</div>
          <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>Ứng dụng gặp lỗi nghiêm trọng</h1>
          <p style={{ color: "#555", marginBottom: 20 }}>
            Lỗi đã được ghi nhận. Anh thử tải lại trang.
          </p>
          {error.digest && (
            <code style={{ fontSize: 11, color: "#888" }}>ref: {error.digest}</code>
          )}
          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 22px",
                background: "#c8102e",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Thử lại
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
