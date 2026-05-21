"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { AttachmentPicker } from "@/components/forum/AttachmentPicker";
import { MentionTextarea } from "@/components/forum/MentionTextarea";
import {
  APIError,
  createForumThread,
  type ForumAttachment,
  type ForumCategory,
} from "@/lib/api";

const CATEGORIES: ForumCategory[] = ["discussion", "qna", "recommend", "feedback", "announcement"];
const MAX_TITLE = 200;
const MAX_BODY = 10000;

export default function NewForumThreadPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const [category, setCategory] = useState<ForumCategory>("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<ForumAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login?next=/forum/new");
  }, [isLoading, user, router]);

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const visibleCategories = CATEGORIES.filter(c => c !== "announcement" || isAdmin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (cleanTitle.length < 5) {
      toast("Tiêu đề tối thiểu 5 ký tự.", "error");
      return;
    }
    if (cleanBody.length < 1) {
      toast("Nội dung không được trống.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createForumThread({ category, title: cleanTitle, body: cleanBody, attachments });
      router.replace(`/forum/${encodeURIComponent(created.thread_id)}`);
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không tạo được thread.";
      toast(msg, "error");
      setSubmitting(false);
    }
  };

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 80px" }}>
        <Link
          href="/forum"
          style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none", marginBottom: 10, display: "inline-block" }}
        >
          ← {t("forum.back_to_list")}
        </Link>

        <h1 className="display" style={{ fontSize: 28, marginBottom: 16 }}>
          {t("forum.new_thread")}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="stroke-ink"
          style={{
            background: "var(--panel)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="caps-xs" style={{ fontSize: 11 }}>{t("forum.category_label")}</span>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ForumCategory)}
              style={{
                padding: "8px 10px",
                fontSize: 13,
                background: "var(--bg-2)",
                border: "1.5px solid var(--border)",
                color: "var(--fg)",
                fontFamily: "inherit",
              }}
            >
              {visibleCategories.map(c => (
                <option key={c} value={c}>{t(`forum.category.${c}`)}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="caps-xs" style={{ fontSize: 11 }}>
              {t("forum.title_label")} ({title.length}/{MAX_TITLE})
            </span>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t("forum.title_placeholder")}
              maxLength={MAX_TITLE}
              minLength={5}
              required
              style={{
                padding: "8px 10px",
                fontSize: 14,
                background: "var(--bg-2)",
                border: "1.5px solid var(--border)",
                color: "var(--fg)",
                fontFamily: "inherit",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="caps-xs" style={{ fontSize: 11 }}>
              {t("forum.body_label")} ({body.length}/{MAX_BODY})
            </span>
            <MentionTextarea
              value={body}
              onChange={setBody}
              placeholder={t("forum.body_placeholder")}
              maxLength={MAX_BODY}
              rows={10}
              style={{
                padding: "10px 12px",
                fontSize: 13,
                background: "var(--bg-2)",
                border: "1.5px solid var(--border)",
                color: "var(--fg)",
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.55,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{t("forum.mention_hint")}</span>
          </label>

          <AttachmentPicker value={attachments} onChange={setAttachments} disabled={submitting} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Link href="/forum" className="btn">{t("common.cancel")}</Link>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? t("common.loading") : t("forum.new_thread")}
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
}
