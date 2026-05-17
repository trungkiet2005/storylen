"use client";

/**
 * ChapterComments — Tier C.
 *
 * Lightweight comment thread for a published chapter. Anonymous-readable,
 * authenticated-writable. Soft-delete via the API; UI just removes the row.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  APIError,
  deleteChapterComment,
  listChapterComments,
  postChapterComment,
  type ChapterComment,
} from "@/lib/api";

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

export function ChapterComments({ chapterId }: { chapterId: string }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<ChapterComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listChapterComments(chapterId, { limit: 50 })
      .then(res => {
        if (cancelled) return;
        setComments(res.items);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof APIError ? err.message : "Không tải được bình luận.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [chapterId]);

  const handlePost = async () => {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      const created = await postChapterComment(chapterId, body);
      setComments(prev => [created, ...prev]);
      setDraft("");
      toast("Đã đăng bình luận.", "success");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không đăng được bình luận.";
      toast(msg, "error");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá bình luận này?")) return;
    try {
      await deleteChapterComment(chapterId, id);
      setComments(prev => prev.filter(c => c.comment_id !== id));
      toast("Đã xoá.", "info");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không xoá được.";
      toast(msg, "error");
    }
  };

  return (
    <section style={{ marginTop: 32 }}>
      <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>
        BÌNH LUẬN {comments.length > 0 && `(${comments.length})`}
      </div>

      {/* Compose */}
      {isAuthenticated ? (
        <div
          className="stroke-ink"
          style={{
            background: "var(--panel)",
            padding: 12,
            marginBottom: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Chia sẻ cảm nhận của bạn về chương này…"
            rows={3}
            maxLength={2000}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>{draft.length} / 2000</span>
            <button
              onClick={handlePost}
              disabled={!draft.trim() || posting}
              className="btn btn-sm btn-primary"
              style={{ fontSize: 12 }}
            >
              <Icon name="send" size={11} /> {posting ? "Đang gửi…" : "Đăng"}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="stroke-ink"
          style={{
            background: "var(--panel)",
            padding: "12px 14px",
            marginBottom: 14,
            fontSize: 13,
            color: "var(--fg-soft)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span>Đăng nhập để bình luận.</span>
          <Link href="/login" className="btn btn-sm">Đăng nhập</Link>
        </div>
      )}

      {/* Thread */}
      {loading ? (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Đang tải…</div>
      ) : error ? (
        <div style={{ fontSize: 12, color: "var(--accent)" }}>{error}</div>
      ) : comments.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
          Chưa có bình luận. Hãy là người đầu tiên!
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <AnimatePresence initial={false}>
            {comments.map(c => (
              <motion.li
                key={c.comment_id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="stroke-ink"
                style={{
                  background: "var(--panel)",
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {c.username ? (
                    <Link href={`/u/${c.username}`} style={{ fontWeight: 700, color: "var(--accent)", fontSize: 12, textDecoration: "none" }}>
                      @{c.username}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 700, color: "var(--fg-soft)", fontSize: 12 }}>(ẩn danh)</span>
                  )}
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>· {timeAgo(c.created_at)}</span>
                  <div style={{ flex: 1 }} />
                  {c.can_delete && (
                    <button
                      onClick={() => handleDelete(c.comment_id)}
                      title="Xoá bình luận"
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
                <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{c.body}</div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
