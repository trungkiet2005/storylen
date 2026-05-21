"use client";

import React, { useRef, useState } from "react";
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
import { AttachmentPicker, type AttachmentPickerHandle } from "./AttachmentPicker";
import { MentionTextarea } from "./MentionTextarea";

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
  // Collapsed-by-default for the top-level composer (Facebook-style). Nested-reply usages
  // pass autoFocus=true after the user clicks "Trả lời", so those start expanded.
  // onCancel is also a signal that the parent owns the lifecycle (already expanded).
  const [expanded, setExpanded] = useState<boolean>(autoFocus || !!onCancel);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<AttachmentPickerHandle>(null);

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

  // Collapsed pill: only shown for the top-level composer before the user engages.
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => {
          setExpanded(true);
          // Focus the textarea after the next paint so the cursor lands inside it.
          requestAnimationFrame(() => textareaRef.current?.focus());
        }}
        className="stroke-ink"
        style={{
          width: "100%",
          background: "var(--bg-2)",
          padding: "10px 14px",
          fontSize: 13,
          color: "var(--muted)",
          textAlign: "left",
          fontFamily: "inherit",
          cursor: "text",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon name="chat" size={14} />
        <span>{t("forum.reply_placeholder")}</span>
      </button>
    );
  }

  const collapseIfTopLevel = () => {
    // Only the top-level composer self-collapses; nested-reply usages let the parent
    // unmount the composer via onCancel.
    if (onCancel) {
      onCancel();
    } else {
      setExpanded(false);
      setDraft("");
      setAttachments([]);
    }
  };

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
      if (onCancel) {
        onCancel();
      } else {
        // Collapse the top-level composer back to the pill so it stays out of the way
        // after sending — matches Facebook/IG behavior.
        setExpanded(false);
      }
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

      {/* Thumbnails strip — only renders when there are attachments. */}
      <AttachmentPicker
        ref={pickerRef}
        value={attachments}
        onChange={setAttachments}
        disabled={posting}
        compact
      />

      <MentionTextarea
        ref={textareaRef}
        value={draft}
        onChange={setDraft}
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
          width: "100%",
          boxSizing: "border-box",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={() => pickerRef.current?.open()}
            disabled={posting || attachments.length >= 10}
            title={t("forum.attach.label", "Đính kèm ảnh / video")}
            aria-label={t("forum.attach.label", "Đính kèm ảnh / video")}
            style={{
              width: 30,
              height: 30,
              padding: 0,
              background: "transparent",
              color: "var(--muted)",
              border: "1.5px solid var(--border)",
              cursor: posting || attachments.length >= 10 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="image" size={14} />
          </button>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>
            {draft.length} / {MAX}
            {attachments.length > 0 && ` · ${attachments.length}/10 file`}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={collapseIfTopLevel} className="btn btn-sm" style={{ fontSize: 12 }}>
            {t("common.cancel")}
          </button>
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
      <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.4 }}>
        {t("forum.mention_hint")}
      </div>
    </div>
  );
}
