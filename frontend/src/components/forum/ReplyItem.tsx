"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/contexts/I18nContext";
import { APIError, deleteForumReply, type ForumReply } from "@/lib/api";
import { MentionText } from "./MentionText";
import { VoteButtons } from "./VoteButtons";
import { ReplyComposer } from "./ReplyComposer";

function timeAgo(iso: string): string {
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
    return iso;
  }
}

interface Props {
  reply: ForumReply;
  threadId: string;
  threadLocked: boolean;
  nestedReplies?: ForumReply[];
  /** Show "Trả lời" button (only for top-level replies; nested replies cannot be nested again). */
  allowReplyButton: boolean;
  onChildPosted: (parentId: string, child: ForumReply) => void;
  onDeleted: (replyId: string) => void;
}

export function ReplyItem({
  reply,
  threadId,
  threadLocked,
  nestedReplies = [],
  allowReplyButton,
  onChildPosted,
  onDeleted,
}: Props) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [showComposer, setShowComposer] = useState(false);

  const handleDelete = async () => {
    if (!confirm(t("forum.delete_confirm"))) return;
    try {
      await deleteForumReply(reply.reply_id);
      onDeleted(reply.reply_id);
      toast(t("common.delete"), "info");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không xoá được.";
      toast(msg, "error");
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="stroke-ink"
      style={{
        background: "var(--panel)",
        padding: "10px 12px",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <VoteButtons
        targetType="reply"
        targetId={reply.reply_id}
        initialScore={reply.score}
        initialVote={reply.my_vote}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          {reply.username ? (
            <Link
              href={`/u/${encodeURIComponent(reply.username)}`}
              style={{ fontWeight: 700, color: "var(--accent)", fontSize: 12, textDecoration: "none" }}
            >
              @{reply.username}
            </Link>
          ) : (
            <span style={{ fontWeight: 700, color: "var(--fg-soft)", fontSize: 12 }}>(ẩn danh)</span>
          )}
          <span style={{ fontSize: 10, color: "var(--muted)" }}>· {timeAgo(reply.created_at)}</span>
          <div style={{ flex: 1 }} />
          {reply.can_delete && (
            <button
              onClick={handleDelete}
              title={t("common.delete")}
              style={{
                padding: "2px 5px",
                fontSize: 10,
                background: "transparent",
                color: "var(--muted)",
                border: "1px solid var(--border-soft)",
                cursor: "pointer",
              }}
            >
              <Icon name="trash" size={9} />
            </button>
          )}
        </div>

        <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          <MentionText text={reply.body} />
        </div>

        {allowReplyButton && !threadLocked && (
          <div style={{ marginTop: 6 }}>
            <button
              onClick={() => setShowComposer(v => !v)}
              style={{
                padding: "2px 8px",
                fontSize: 10,
                background: "transparent",
                color: "var(--muted)",
                border: "1px solid var(--border-soft)",
                cursor: "pointer",
              }}
            >
              {showComposer ? t("common.cancel") : t("forum.reply")}
            </button>
          </div>
        )}

        {showComposer && (
          <div style={{ marginTop: 8 }}>
            <ReplyComposer
              threadId={threadId}
              parentReplyId={reply.reply_id}
              parentUsername={reply.username}
              autoFocus
              onCancel={() => setShowComposer(false)}
              onPosted={child => {
                onChildPosted(reply.reply_id, child);
                setShowComposer(false);
              }}
            />
          </div>
        )}

        {nestedReplies.length > 0 && (
          <div
            style={{
              marginTop: 10,
              paddingLeft: 12,
              borderLeft: "2px solid var(--border-soft)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {nestedReplies.map(child => (
              <ReplyItem
                key={child.reply_id}
                reply={child}
                threadId={threadId}
                threadLocked={threadLocked}
                allowReplyButton={false}
                onChildPosted={onChildPosted}
                onDeleted={onDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
