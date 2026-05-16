"use client";
import React, { useState } from "react";

interface StarRatingProps {
  /** Current rating, 0-5. */
  value?: number;
  /** Backwards-compatible alias for `value`. */
  rating?: number;
  /** Fired when the user picks a new rating. Receives 0 when they clear it. */
  onChange?: (r: number) => void;
  /** Star size in px. */
  size?: number;
  /** When true, renders 5 SVGs with no interactivity. */
  readOnly?: boolean;
  /** Backwards-compatible alias for `readOnly`. */
  readonly?: boolean;
  /** When true and `value > 0`, shows an extra "✕" button that clears the rating. */
  showClear?: boolean;
}

/** Interactive 5-star rating component.
 *
 *  - In interactive mode each star is `role="radio"` with `aria-checked`.
 *  - Click handler calls `e.stopPropagation()` so parent <Link> wrappers
 *    in series cards don't navigate when the user just rates.
 *  - Clicking the active star toggles the rating back to 0 (UX shortcut).
 *  - `showClear` adds a dedicated clear button with label "Xoá đánh giá".
 */
export function StarRating({
  value,
  rating,
  onChange,
  size = 18,
  readOnly,
  readonly,
  showClear = false,
}: StarRatingProps) {
  const current = value ?? rating ?? 0;
  const isReadOnly = Boolean(readOnly ?? readonly ?? false);
  const [hover, setHover] = useState(0);
  const display = hover || current;

  if (isReadOnly) {
    return (
      <div
        role="img"
        aria-label={`Xếp hạng ${current}/5 sao`}
        style={{ display: "inline-flex", gap: 2, lineHeight: 1 }}
      >
        {[1, 2, 3, 4, 5].map(n => (
          <Star key={n} filled={n <= current} size={size} />
        ))}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Đánh giá truyện"
      onMouseLeave={() => setHover(0)}
      style={{ display: "inline-flex", gap: 2, lineHeight: 1, alignItems: "center" }}
    >
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === current}
          aria-label={`${n} sao`}
          onMouseEnter={() => setHover(n)}
          onClick={(e) => {
            // Stop propagation so a wrapping <Link> (e.g. on a series card)
            // doesn't navigate away when the user just clicks a star.
            e.stopPropagation();
            e.preventDefault();
            if (!onChange) return;
            onChange(n === current ? 0 : n);
          }}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: n <= display ? "#b58a3b" : "var(--border-soft)",
            transition: "color 0.1s, transform 0.1s",
            transform: n <= display ? "scale(1.15)" : "scale(1)",
            display: "inline-flex",
          }}
        >
          <Star filled={n <= display} size={size} />
        </button>
      ))}
      {showClear && current > 0 && (
        <button
          type="button"
          aria-label="Xoá đánh giá"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onChange?.(0);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--muted)",
            fontSize: size * 0.85,
            marginLeft: 4,
            padding: "0 4px",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
}
