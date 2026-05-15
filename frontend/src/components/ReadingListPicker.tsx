"use client";
import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/Icons";
import { READING_LIST_META } from "@/lib/localStore";
import type { ReadingListStatus } from "@/lib/localStore";

interface ReadingListPickerProps {
  seriesId: string;
  current: ReadingListStatus | null;
  onChange: (status: ReadingListStatus | null) => void;
}

export function ReadingListPicker({ seriesId: _seriesId, current, onChange }: ReadingListPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const meta = current ? READING_LIST_META[current] : null;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        className="btn btn-sm btn-ghost"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          color: meta?.color ?? "var(--muted)",
          borderColor: meta ? meta.color : undefined,
        }}
        aria-label="Danh sách đọc"
        title="Thêm vào danh sách đọc"
      >
        <Icon name={meta?.icon ?? "bookmark"} size={13} />
        <span style={{ fontSize: 12 }}>{meta?.label ?? "Danh sách"}</span>
        <Icon name="chevron-down" size={11} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 200,
              background: "var(--panel)",
              border: "2px solid var(--border)",
              boxShadow: "4px 4px 0 0 var(--border)",
              minWidth: 160,
            }}
          >
            {(Object.entries(READING_LIST_META) as [ReadingListStatus, typeof READING_LIST_META[ReadingListStatus]][]).map(
              ([status, m]) => (
                <button
                  key={status}
                  onClick={() => {
                    onChange(current === status ? null : status);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "9px 14px",
                    background: current === status ? "var(--bg-2)" : "transparent",
                    border: "none", cursor: "pointer",
                    fontSize: 13, color: m.color,
                    fontFamily: "var(--font-sans)", fontWeight: 600,
                    textAlign: "left",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = current === status ? "var(--bg-2)" : "transparent"; }}
                >
                  <Icon name={m.icon} size={13} />
                  {m.label}
                  {current === status && (
                    <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.6 }}>✓</span>
                  )}
                </button>
              )
            )}
            {current && (
              <>
                <div style={{ height: 1, background: "var(--border-soft)", margin: "2px 0" }} />
                <button
                  onClick={() => { onChange(null); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "9px 14px",
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 12, color: "var(--muted)",
                    fontFamily: "var(--font-sans)",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Icon name="x" size={12} /> Bỏ khỏi danh sách
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
