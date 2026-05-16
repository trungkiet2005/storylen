"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { loadNativeReading, clearNativeReading, type NativeReadingState } from "@/lib/api";

/** Small pill that shows where the user left off and offers to resume. */
export function ResumeReading() {
  const [state, setState] = useState<NativeReadingState | null>(null);

  useEffect(() => {
    setState(loadNativeReading());
  }, []);

  if (!state) return null;

  const href =
    state.kind === "page"
      ? `/reader?page=${encodeURIComponent(state.ref)}`
      : state.kind === "chapter"
      ? `/reader?chapter=${encodeURIComponent(state.ref)}`
      : `/series/${encodeURIComponent(state.ref)}`;

  let when = "";
  try {
    const diff = Math.max(0, Date.now() - new Date(state.at).getTime());
    const m = Math.floor(diff / 60_000);
    if (m < 1) when = "vừa xong";
    else if (m < 60) when = `${m} phút trước`;
    else {
      const h = Math.floor(m / 60);
      when = h < 24 ? `${h} giờ trước` : `${Math.floor(h / 24)} ngày trước`;
    }
  } catch { /* ignore */ }

  return (
    <div
      className="stroke-ink panel-shadow"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        background: "var(--panel)",
        borderRadius: "var(--radius-sm)",
        margin: "0 clamp(16px, 4vw, 40px) 16px",
      }}
    >
      {state.cover_url && (
        <span
          aria-hidden
          style={{
            width: 44, height: 44, flexShrink: 0,
            backgroundImage: `url('${state.cover_url}')`,
            backgroundSize: "cover", backgroundPosition: "center",
            border: "1.5px solid var(--border)",
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 2 }}>
          ĐANG ĐỌC DỞ
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {state.label}
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
          {when}
        </div>
      </div>
      <Link href={href} className="btn btn-sm btn-primary" style={{ display: "inline-flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
        Tiếp tục <Icon name="arrow-right" size={13} />
      </Link>
      <button
        type="button"
        onClick={() => { clearNativeReading(); setState(null); }}
        aria-label="Bỏ qua"
        style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 6 }}
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}
