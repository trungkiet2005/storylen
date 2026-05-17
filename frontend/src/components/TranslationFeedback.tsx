"use client";

/**
 * TranslationFeedback — Tier B #10.
 *
 * Compact 👍 / 👎 widget for the reader. Records vote per page; re-voting
 * overwrites. When the down vote is selected, expand a small textarea
 * so the user can type what went wrong.
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import {
  APIError,
  getTranslationFeedback,
  submitTranslationFeedback,
  type FeedbackVote,
} from "@/lib/api";

export function TranslationFeedback({ pageId }: { pageId: string }) {
  const { toast } = useToast();
  const [vote, setVote] = useState<FeedbackVote | null>(null);
  const [comment, setComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    getTranslationFeedback(pageId)
      .then(res => {
        if (cancelled) return;
        if (res && (res.vote === "up" || res.vote === "down")) {
          setVote(res.vote);
        } else {
          setVote(null);
        }
      })
      .catch(() => { /* anonymous — no existing vote, ignore */ })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [pageId]);

  const handleVote = async (v: FeedbackVote) => {
    if (submitting) return;
    setSubmitting(true);
    const prevVote = vote;
    setVote(v);  // optimistic
    if (v === "down") setShowCommentInput(true);
    else setShowCommentInput(false);
    try {
      const res = await submitTranslationFeedback(pageId, { vote: v });
      if (!res.persisted) {
        toast("Đã ghi nhận (DB chưa migrate, lưu vào log).", "info");
      } else if (v === "up") {
        toast("Cảm ơn bạn đã đánh giá tốt!", "success");
      } else {
        toast("Cảm ơn — bạn có muốn ghi rõ điểm chưa ổn không?", "info");
      }
    } catch (err) {
      setVote(prevVote);
      const msg = err instanceof APIError ? err.message : "Không lưu được phản hồi.";
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitTranslationFeedback(pageId, { vote: "down", comment: comment.trim() });
      toast("Cảm ơn phản hồi chi tiết!", "success");
      setShowCommentInput(false);
      setComment("");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không lưu được nhận xét.";
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) return null;

  return (
    <div
      className="stroke-ink"
      style={{
        background: "var(--panel)",
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Bản dịch trang này có ổn không?</span>

        <button
          onClick={() => handleVote("up")}
          disabled={submitting}
          aria-pressed={vote === "up"}
          title="Bản dịch tốt"
          style={{
            padding: "6px 10px",
            fontSize: 13,
            background: vote === "up" ? "var(--jade)" : "transparent",
            color: vote === "up" ? "#fff" : "var(--fg)",
            border: "1.5px solid var(--border)",
            cursor: submitting ? "wait" : "pointer",
          }}
        >
          👍 Tốt
        </button>

        <button
          onClick={() => handleVote("down")}
          disabled={submitting}
          aria-pressed={vote === "down"}
          title="Bản dịch chưa ổn"
          style={{
            padding: "6px 10px",
            fontSize: 13,
            background: vote === "down" ? "var(--accent)" : "transparent",
            color: vote === "down" ? "#fff" : "var(--fg)",
            border: "1.5px solid var(--border)",
            cursor: submitting ? "wait" : "pointer",
          }}
        >
          👎 Chưa ổn
        </button>

        {vote === "down" && !showCommentInput && (
          <button
            onClick={() => setShowCommentInput(true)}
            className="btn btn-sm btn-ghost"
            style={{ fontSize: 11 }}
          >
            <Icon name="chat" size={11} /> Ghi rõ vấn đề
          </button>
        )}
      </div>

      <AnimatePresence>
        {showCommentInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Vd: tên nhân vật dịch sai, sắc thái quá trang trọng, có lỗi grammar…"
                rows={2}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  fontSize: 12,
                  background: "var(--bg-2)",
                  border: "1.5px solid var(--border)",
                  color: "var(--fg)",
                  resize: "vertical",
                }}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!comment.trim() || submitting}
                className="btn btn-sm btn-primary"
                style={{ fontSize: 11 }}
              >
                Gửi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
