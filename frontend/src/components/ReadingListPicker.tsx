"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "./Icons";
import { READING_LIST_META, type ReadingListStatus } from "@/contexts/WibuContext";

const STATUSES: ReadingListStatus[] = ["reading", "want", "done", "dropped"];

export function ReadingListPicker({
  value,
  onChange,
  size = "sm",
}: {
  value: ReadingListStatus | null;
  onChange: (status: ReadingListStatus | null) => void;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const meta = value ? READING_LIST_META[value] : null;
  const triggerPad = size === "md" ? "5px 10px" : "3px 8px";
  const triggerFont = size === "md" ? 12 : 11;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }} onClick={e => e.stopPropagation()}>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        type="button"
        onClick={e => { e.preventDefault(); setOpen(v => !v); }}
        style={{
          border: meta ? `1.5px solid ${meta.color}` : "1.5px dashed var(--border-soft)",
          background: meta ? "var(--panel)" : "transparent",
          color: meta ? meta.color : "var(--muted)",
          padding: triggerPad,
          fontSize: triggerFont,
          fontWeight: 700,
          letterSpacing: "0.02em",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon name={meta?.icon ?? "plus"} size={triggerFont - 1} />
        {meta?.label ?? "Thêm vào danh sách"}
        <Icon name="chevron-down" size={triggerFont - 2} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            role="listbox"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              minWidth: 160,
              background: "var(--panel)",
              border: "2px solid var(--border)",
              boxShadow: "3px 3px 0 0 var(--border)",
              zIndex: 50,
            }}
          >
            {STATUSES.map(s => {
              const m = READING_LIST_META[s];
              const selected = value === s;
              return (
                <button
                  key={s}
                  role="option"
                  aria-selected={selected}
                  onClick={e => { e.preventDefault(); onChange(selected ? null : s); setOpen(false); }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: selected ? 700 : 500,
                    color: selected ? m.color : "var(--fg)",
                    background: selected ? "var(--bg-2)" : "transparent",
                    border: "none",
                    borderBottom: "1px dashed var(--border-soft)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <Icon name={m.icon} size={12} />
                  {m.label}
                  {selected && <Icon name="check" size={11} />}
                </button>
              );
            })}
            {value && (
              <button
                onClick={e => { e.preventDefault(); onChange(null); setOpen(false); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  fontSize: 11,
                  color: "var(--muted)",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <Icon name="x" size={11} /> Bỏ khỏi danh sách
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
