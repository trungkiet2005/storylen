"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  APIError,
  createForumReply,
  type ForumAttachment,
  type ForumReply,
} from "@/lib/api";
import { AttachmentPicker } from "./AttachmentPicker";

interface Props {
  threadId: string;
  parentReplyId?: string | null;
  parentUsername?: string | null;
  locked?: boolean;
  autoFocus?: boolean;
  onPosted: (reply: ForumReply) => void;
  onCancel?: () => void;
}

const MAX = 5000;

export function ReplyComposer({
  threadId,
  parentReplyId = null,
  parentUsername = null,
  locked = false,
  autoFocus = false,
  onPosted,
  onCancel,
}: Props) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [draft, setDraft] = useState(parentUsername ? `@${parentUsername} ` : "");
  const [attachments, setAttachments] = useState<ForumAttachment[]>([]);
  const [posting, setPosting] = useState(false);

  if (!isAuthenticated) {
    return (
      <div
        className="stroke-ink"
        style={{
          background: "var(--panel)",
          padding: "12px 14px",
          fontSize: 13,
          color: "var(--fg-soft)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span>{t("forum.login_required")}</span>
        <Link href="/login" className="btn btn-sm">{t("nav.login")}</Link>
      </div>
    );
  }

  if (locked) {
    return (
      <div
        className="stroke-ink"
        style={{
          background: "var(--panel)",
          padding: "12px 14px",
          fontSize: 13,
          color: "var(--muted)",
        }}
      >
        🔒 {t("forum.locked_notice")}
      </div>
    );
  }

  const submit = async () => {
    const body = draft.trim();
    if ((!body && attachments.length === 0) || posting) return;
    setPosting(true);
    try {
      const created = await createForumReply(threadId, {
        body: body || " ",  // backend requires non-empty body; placeholder when only attachments
        parent_reply_id: parentReplyId,
        attachments,
      });
      onPosted(created);
      setDraft("");
      setAttachments([]);
      if (onCancel) onCancel();
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không gửi được trả lời.";
      toast(msg, "error");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div
      className="stroke-ink"
      style={{
        background: "var(--panel)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {parentUsername && (
        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          {t("forum.reply_to")}: <strong>@{parentUsername}</strong>
        </div>
      )}
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder={t("forum.reply_placeholder")}
        rows={3}
        maxLength={MAX}
        autoFocus={autoFocus}
        style={{
          padding: "8px 10px",
          fontSize: 13,
          background: "var(--bg-2)",
          border: "1.5px solid var(--border)",
          color: "var(--fg)",
          resize: "vertical",
          fontFamily: "inherit",
        }}
      />
      <AttachmentPicker value={attachments} onChange={setAttachments} disabled={posting} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, color: "var(--muted)" }}>
          {draft.length} / {MAX} · {t("forum.mention_hint")}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn btn-sm" style={{ fontSize: 12 }}>
              {t("common.cancel")}
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={(!draft.trim() && attachments.length === 0) || posting}
            className="btn btn-sm btn-primary"
            style={{ fontSize: 12 }}
          >
            <Icon name="send" size={11} /> {posting ? t("common.loading") : t("forum.reply_submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
