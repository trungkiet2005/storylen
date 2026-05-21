"use client";

import React from "react";
import { useI18n } from "@/contexts/I18nContext";
import type { ForumCategory } from "@/lib/api";

const STYLES: Record<ForumCategory, { bg: string; fg: string }> = {
  discussion:   { bg: "var(--panel)", fg: "var(--ink)" },
  qna:          { bg: "var(--beni)",  fg: "#fff" },
  recommend:    { bg: "#1f6e3a",      fg: "#fff" },
  feedback:     { bg: "#c89329",      fg: "var(--ink)" },
  announcement: { bg: "var(--ink)",   fg: "var(--paper)" },
};

export function CategoryBadge({ category }: { category: ForumCategory }) {
  const { t } = useI18n();
  const s = STYLES[category];
  return (
    <span
      className="caps-xs stroke-ink"
      style={{
        background: s.bg,
        color: s.fg,
        padding: "2px 8px",
        fontSize: 10,
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {t(`forum.category.${category}`)}
    </span>
  );
}
