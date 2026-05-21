"use client";

import React, { useCallback, useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { CategoryBadge } from "@/components/forum/CategoryBadge";
import { MentionText } from "@/components/forum/MentionText";
import { ReplyComposer } from "@/components/forum/ReplyComposer";
import { ReplyItem } from "@/components/forum/ReplyItem";
import { VoteButtons } from "@/components/forum/VoteButtons";
import {
  APIError,
  deleteForumThread,
  getForumThread,
  toggleForumLock,
  toggleForumPin,
  type ForumReply,
  type ForumThread,
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

interface PageProps {
  params: Promise<{ threadId: string }>;
}

export default function ForumThreadDetailPage({ params }: PageProps) {
  const { threadId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const [thread, setThread] = useState<ForumThread | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getForumThread(threadId);
      setThread(res.thread);
      setReplies(res.replies);
    } catch (err) {
      setError(err instanceof APIError ? err.message : "Không tải được thread.");
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => { void load(); }, [load]);

  // Group replies into top-level + children-by-parent-id (depth max 1).
  const { topLevel, childrenByParent } = useMemo(() => {
    const top: ForumReply[] = [];
    const childMap: Record<string, ForumReply[]> = {};
    for (const r of replies) {
      if (r.parent_reply_id) {
        (childMap[r.parent_reply_id] ||= []).push(r);
      } else {
        top.push(r);
      }
    }
    return { topLevel: top, childrenByParent: childMap };
  }, [replies]);

  const handleTopLevelPosted = (created: ForumReply) => {
    setReplies(prev => [...prev, created]);
    setThread(prev => prev ? { ...prev, reply_count: prev.reply_count + 1 } : prev);
  };
  const handleChildPosted = (_parentId: string, child: ForumReply) => {
    setReplies(prev => [...prev, child]);
    setThread(prev => prev ? { ...prev, reply_count: prev.reply_count + 1 } : prev);
  };
  const handleReplyDeleted = (replyId: string) => {
    setReplies(prev => prev.filter(r => r.reply_id !== replyId && r.parent_reply_id !== replyId));
    setThread(prev => prev ? { ...prev, reply_count: Math.max(0, prev.reply_count - 1) } : prev);
  };

  const handleDeleteThread = async () => {
    if (!thread) return;
    if (!confirm(t("forum.delete_confirm"))) return;
    try {
      await deleteForumThread(thread.thread_id);
      toast(t("common.delete"), "info");
      router.replace("/forum");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không xoá được thread.";
      toast(msg, "error");
    }
  };

  const handleTogglePin = async () => {
    if (!thread) return;
    try {
      const updated = await toggleForumPin(thread.thread_id);
      setThread(updated);
      toast(updated.is_pinned ? t("forum.admin_pin") : t("forum.admin_unpin"), "info");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không cập nhật được.";
      toast(msg, "error");
    }
  };

  const handleToggleLock = async () => {
    if (!thread) return;
    try {
      const updated = await toggleForumLock(thread.thread_id);
      setThread(updated);
      toast(updated.is_locked ? t("forum.admin_lock") : t("forum.admin_unlock"), "info");
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không cập nhật được.";
      toast(msg, "error");
    }
  };

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 80px" }}>
        <Link
          href="/forum"
          style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none", marginBottom: 10, display: "inline-block" }}
        >
          ← {t("forum.back_to_list")}
        </Link>

        {loading ? (
          <div style={{ color: "var(--muted)" }}>{t("common.loading")}</div>
        ) : error || !thread ? (
          <div className="stroke-ink" style={{ background: "var(--panel)", padding: 20, color: "var(--accent)" }}>
            {error ?? "Không tìm thấy thread."}
          </div>
        ) : (
          <>
            {/* Thread block */}
            <article
              className="stroke-ink"
              style={{
                background: "var(--panel)",
                padding: 16,
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
                marginBottom: 20,
              }}
            >
              <VoteButtons
                targetType="thread"
                targetId={thread.thread_id}
                initialScore={thread.score}
                initialVote={thread.my_vote}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
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

                <h1 className="display" style={{ fontSize: 24, marginBottom: 10, lineHeight: 1.3, wordBreak: "break-word" }}>
                  {thread.title}
                </h1>

                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 14,
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
                </div>

                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "var(--fg)",
                  }}
                >
                  <MentionText text={thread.body} />
                </div>

                {/* Action row */}
                <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
                  {thread.can_delete && (
                    <button onClick={handleDeleteThread} className="btn btn-sm" style={{ fontSize: 11 }}>
                      🗑 {t("common.delete")}
                    </button>
                  )}
                  {user?.role === "admin" && (
                    <>
                      <button onClick={handleTogglePin} className="btn btn-sm" style={{ fontSize: 11 }}>
                        {thread.is_pinned ? t("forum.admin_unpin") : t("forum.admin_pin")}
                      </button>
                      <button onClick={handleToggleLock} className="btn btn-sm" style={{ fontSize: 11 }}>
                        {thread.is_locked ? t("forum.admin_unlock") : t("forum.admin_lock")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>

            {/* Reply composer (top-level) */}
            <div style={{ marginBottom: 20 }}>
              <ReplyComposer
                threadId={thread.thread_id}
                locked={thread.is_locked}
                onPosted={handleTopLevelPosted}
              />
            </div>

            {/* Replies */}
            <section>
              <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>
                {t("forum.replies").toUpperCase()} ({thread.reply_count})
              </div>
              {topLevel.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
                  {t("forum.empty")}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {topLevel.map(r => (
                    <ReplyItem
                      key={r.reply_id}
                      reply={r}
                      threadId={thread.thread_id}
                      threadLocked={thread.is_locked}
                      allowReplyButton
                      nestedReplies={childrenByParent[r.reply_id] ?? []}
                      onChildPosted={handleChildPosted}
                      onDeleted={handleReplyDeleted}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
