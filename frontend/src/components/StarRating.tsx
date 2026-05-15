"use client";
import React, { useState } from "react";

interface StarRatingProps {
  rating: number;
  onChange?: (r: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ rating, onChange, size = 18, readonly = false }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const display = hover || rating;

  return (
    <div
      style={{ display: "inline-flex", gap: 2, lineHeight: 1 }}
      onMouseLeave={() => !readonly && setHover(0)}
      aria-label={`Xếp hạng ${rating}/5 sao`}
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
            cursor: readonly ? "default" : "pointer",
            transition: "color 0.1s, transform 0.1s",
            transform: n <= display && !readonly ? "scale(1.15)" : "scale(1)",
          }}
          onMouseEnter={() => !readonly && setHover(n)}
          onClick={() => {
            if (readonly || !onChange) return;
            onChange(n === rating ? 0 : n);
          }}
          aria-label={`${n} sao`}
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  );
}
