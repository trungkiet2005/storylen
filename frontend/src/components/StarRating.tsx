"use client";
import React, { useState } from "react";

interface StarRatingProps {
  /** Preferred prop name. */
  rating?: number;
  /** Backwards-compatible alias used by some callers. */
  value?: number;
  onChange?: (r: number) => void;
  size?: number;
  /** Preferred — lowercase to match HTML attribute style. */
  readonly?: boolean;
  /** Backwards-compatible alias. */
  readOnly?: boolean;
  /** Accepted for forward-compat. Currently the clear-rating action lives in
   *  the parent (passing `0` to onChange resets), so this prop is a no-op. */
  showClear?: boolean;
}

export function StarRating({
  rating,
  value,
  onChange,
  size = 18,
  readonly,
  readOnly,
}: StarRatingProps) {
  const ratingValue = rating ?? value ?? 0;
  const isReadonly = Boolean(readonly ?? readOnly ?? false);

  const [hover, setHover] = useState(0);
  const display = hover || ratingValue;

  return (
    <div
      style={{ display: "inline-flex", gap: 2, lineHeight: 1 }}
      onMouseLeave={() => !isReadonly && setHover(0)}
      aria-label={`Xếp hạng ${ratingValue}/5 sao`}
    >
      {[1, 2, 3, 4, 5].map(n => (
        <svg
          key={n}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={n <= display ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: n <= display ? "#b58a3b" : "var(--border-soft)",
            cursor: isReadonly ? "default" : "pointer",
            transition: "color 0.1s, transform 0.1s",
            transform: n <= display && !isReadonly ? "scale(1.15)" : "scale(1)",
          }}
          onMouseEnter={() => !isReadonly && setHover(n)}
          onClick={() => {
            if (isReadonly || !onChange) return;
            onChange(n === ratingValue ? 0 : n);
          }}
          aria-label={`${n} sao`}
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  );
}
