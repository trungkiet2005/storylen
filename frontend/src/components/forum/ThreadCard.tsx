"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/contexts/I18nContext";
import { CategoryBadge } from "./CategoryBadge";
import { VoteButtons } from "./VoteButtons";
import type { ForumThread } from "@/lib/api";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return "vừa xong";
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d} ngày trước`;
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso ?? "";
  }
}

export function ThreadCard({ thread }: { thread: ForumThread }) {
  const { t } = useI18n();
  const dim = thread.is_locked ? 0.65 : 1;

  return (
    <article
      className="stroke-ink"
      style={{
        background: "var(--panel)",
        padding: 14,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        opacity: dim,
      }}
    >
      <VoteButtons
        targetType="thread"
        targetId={thread.thread_id}
        initialScore={thread.score}
        initialVote={thread.my_vote}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <CategoryBadge category={thread.category} />
          {thread.is_pinned && (
            <span className="caps-xs" style={{ fontSize: 10, color: "var(--accent)" }}>
              📌 {t("forum.pinned")}
            </span>
          )}
          {thread.is_locked && (
            <span className="caps-xs" style={{ fontSize: 10, color: "var(--muted)" }}>
              🔒 {t("forum.locked")}
            </span>
          )}
        </div>

        <Link
          href={`/forum/${encodeURIComponent(thread.thread_id)}`}
          style={{
            display: "block",
            fontSize: 16,
            fontWeight: 800,
            color: "var(--fg)",
            textDecoration: "none",
            lineHeight: 1.3,
            marginBottom: 6,
            wordBreak: "break-word",
          }}
        >
          {thread.title}
        </Link>

        <div
          style={{
            fontSize: 12,
            color: "var(--muted)",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span>
            {t("forum.by")}{" "}
            {thread.username ? (
              <Link
                href={`/u/${encodeURIComponent(thread.username)}`}
                style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}
              >
                @{thread.username}
              </Link>
            ) : (
              <span style={{ fontStyle: "italic" }}>(ẩn danh)</span>
            )}
          </span>
          <span>· {timeAgo(thread.created_at)}</span>
          <span>· {thread.reply_count} {t("forum.replies")}</span>
          {thread.attachments && thread.attachments.length > 0 && (
            <span>· 📎 {thread.attachments.length}</span>
          )}
        </div>
      </div>
    </article>
  );
}
