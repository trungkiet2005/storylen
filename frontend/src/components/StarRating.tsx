"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icons";

export function StarRating({
  value,
  onChange,
  size = 14,
  readOnly = false,
  showClear = true,
  ariaLabel = "Đánh giá bộ truyện",
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  readOnly?: boolean;
  showClear?: boolean;
  ariaLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  const interactive = !readOnly && !!onChange;

  return (
    <div
      role={interactive ? "radiogroup" : undefined}
      aria-label={ariaLabel}
      style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map(i => {
        const filled = display >= i;
        if (interactive) {
          return (
            <motion.button
              key={i}
              type="button"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              onMouseEnter={() => setHover(i)}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onChange?.(value === i ? 0 : i);
              }}
              role="radio"
              aria-checked={value === i}
              aria-label={`${i} sao`}
              style={{
                background: "none",
                border: "none",
                padding: 1,
                cursor: "pointer",
                color: filled ? "var(--gold, #d6a52a)" : "var(--border-soft)",
                display: "inline-flex",
                lineHeight: 0,
              }}
            >
              <Icon name={filled ? "star-fill" : "star"} size={size} />
            </motion.button>
          );
        }
        return (
          <div
            key={i}
            style={{
              color: filled ? "var(--gold, #d6a52a)" : "var(--border-soft)",
              display: "inline-flex",
              lineHeight: 0,
              padding: 1,
            }}
          >
            <Icon name={filled ? "star-fill" : "star"} size={size} />
          </div>
        );
      })}
      {interactive && showClear && value > 0 && (
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); onChange?.(0); }}
          aria-label="Xoá đánh giá"
          title="Xoá đánh giá"
          style={{
            background: "none",
            border: "none",
            padding: 2,
            marginLeft: 4,
            cursor: "pointer",
            color: "var(--muted)",
            display: "inline-flex",
            lineHeight: 0,
          }}
        >
          <Icon name="x" size={size - 2} />
        </button>
      )}
    </div>
  );
}
