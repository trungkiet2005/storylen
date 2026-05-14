"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { TopBar } from "@/components/TopBar";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedPage, FadeIn } from "@/components/Animations";
import { APIError, createSeries, uploadSeriesCover, type SeriesStatus } from "@/lib/api";

const STATUS_OPTIONS: { value: SeriesStatus; label: string }[] = [
  { value: "ongoing", label: "Đang tiến hành" },
  { value: "completed", label: "Đã hoàn thành" },
  { value: "paused", label: "Tạm dừng" },
];

const LANG_OPTIONS = [
  { value: "", label: "— Không chỉ định —" },
  { value: "JPN", label: "Tiếng Nhật" },
  { value: "CHS", label: "Tiếng Trung (giản thể)" },
  { value: "CHT", label: "Tiếng Trung (phồn thể)" },
  { value: "KOR", label: "Tiếng Hàn" },
  { value: "ENG", label: "Tiếng Anh" },
  { value: "VIN", label: "Tiếng Việt" },
];

export default function NewSeriesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<SeriesStatus>("ongoing");
  const [tagsInput, setTagsInput] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?next=/series/new");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast("Ảnh bìa không được vượt quá 5MB.", "error");
      return;
    }
    setCoverFile(f);
  };

  const parsedTags = tagsInput
    .split(/[,\n]/)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast("Hãy nhập tên bộ truyện.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const series = await createSeries({
        title: title.trim(),
        description: description.trim() || null,
        status,
        tags: parsedTags,
        source_language: sourceLanguage || null,
        target_language: targetLanguage || null,
      });

      if (coverFile) {
        try {
          await uploadSeriesCover(series.series_id, coverFile);
        } catch (err) {
          const msg = err instanceof APIError ? err.message : "Tải ảnh bìa thất bại.";
          toast(`Đã tạo bộ truyện nhưng ${msg.toLowerCase()}`, "info");
        }
      }

      toast("Đã tạo bộ truyện!", "success");
      router.push(`/series/${series.series_id}`);
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Tạo bộ truyện thất bại.";
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="series" />
        <div style={{ padding: "40px 56px", maxWidth: 900, margin: "0 auto" }}>
          <FadeIn direction="up" distance={20} delay={0.1}>
            <Link href="/series" style={{ textDecoration: "none", display: "inline-block", marginBottom: 12 }}>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon name="arrow-left" size={11} /> Quay lại danh sách
              </span>
            </Link>
            <SectionHeader
              kanji="新"
              label="Tạo Bộ Truyện · New Series"
              title="Bắt đầu một bộ truyện mới"
              subtitle="Đặt tên, mô tả, chọn thể loại. Có thể thêm chương và trang sau."
              stamp="DRAFT"
            />
          </FadeIn>

          <FadeIn direction="up" distance={15} delay={0.2}>
            <form
              onSubmit={handleSubmit}
              className="stroke-ink panel-shadow"
              style={{
                background: "var(--panel)",
                padding: 24,
                marginTop: 20,
                display: "grid",
                gap: 18,
              }}
            >
              {/* Cover */}
              <div>
                <label
                  style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--fg)" }}
                >
                  Ảnh bìa <span style={{ color: "var(--muted)", fontWeight: 400 }}>(tùy chọn)</span>
                </label>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div
                    className="stroke-ink halftone-coarse"
                    style={{
                      width: 120,
                      aspectRatio: "3/4",
                      background: "var(--bg-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {coverPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Icon name="image" size={32} />
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", flex: 1 }}>
                    <p style={{ margin: 0, marginBottom: 8 }}>
                      Nếu bỏ trống, ảnh bìa sẽ tự lấy từ trang đầu tiên của chương 1. Tối đa 5MB, định dạng JPG / PNG / WebP.
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleCoverChange}
                      style={{ fontSize: 12 }}
                    />
                    {coverFile && (
                      <button
                        type="button"
                        onClick={() => setCoverFile(null)}
                        className="btn btn-sm btn-ghost"
                        style={{ marginTop: 6, fontSize: 11 }}
                      >
                        <Icon name="x" size={11} /> Bỏ ảnh
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Tên bộ truyện <span style={{ color: "var(--accent)" }}>*</span>
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="VD: Vũ trụ của Tanjiro"
                  required
                  maxLength={200}
                  className="stroke-ink"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: 14,
                    background: "var(--bg-2)",
                    border: "2px solid var(--border)",
                    outline: "none",
                    color: "var(--fg)",
                    fontFamily: "var(--font-serif)",
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="desc" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Mô tả
                </label>
                <textarea
                  id="desc"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Tóm tắt ngắn về bộ truyện này…"
                  rows={4}
                  maxLength={5000}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: 13,
                    background: "var(--bg-2)",
                    border: "2px solid var(--border)",
                    outline: "none",
                    color: "var(--fg)",
                    resize: "vertical",
                    fontFamily: "var(--font-sans)",
                  }}
                />
              </div>

              {/* Status & Tags row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label htmlFor="status" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Trạng thái
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={e => setStatus(e.target.value as SeriesStatus)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: 13,
                      background: "var(--bg-2)",
                      border: "2px solid var(--border)",
                      outline: "none",
                      color: "var(--fg)",
                    }}
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tags" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Thẻ <span style={{ color: "var(--muted)", fontWeight: 400 }}>(phân cách bằng dấu phẩy)</span>
                  </label>
                  <input
                    id="tags"
                    value={tagsInput}
                    onChange={e => setTagsInput(e.target.value)}
                    placeholder="action, romance, shounen…"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: 13,
                      background: "var(--bg-2)",
                      border: "2px solid var(--border)",
                      outline: "none",
                      color: "var(--fg)",
                    }}
                  />
                </div>
              </div>

              {parsedTags.length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {parsedTags.slice(0, 20).map(tag => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        background: "var(--bg-2)",
                        border: "1px solid var(--border-soft)",
                        borderRadius: 3,
                        color: "var(--fg-soft)",
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Language row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label htmlFor="src" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Ngôn ngữ gốc
                  </label>
                  <select
                    id="src"
                    value={sourceLanguage}
                    onChange={e => setSourceLanguage(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: 13,
                      background: "var(--bg-2)",
                      border: "2px solid var(--border)",
                      outline: "none",
                      color: "var(--fg)",
                    }}
                  >
                    {LANG_OPTIONS.map(o => (
                      <option key={o.value || "none"} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="tgt" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Ngôn ngữ đích
                  </label>
                  <select
                    id="tgt"
                    value={targetLanguage}
                    onChange={e => setTargetLanguage(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: 13,
                      background: "var(--bg-2)",
                      border: "2px solid var(--border)",
                      outline: "none",
                      color: "var(--fg)",
                    }}
                  >
                    {LANG_OPTIONS.map(o => (
                      <option key={o.value || "none"} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <Link href="/series" style={{ textDecoration: "none" }}>
                  <button type="button" className="btn btn-sm btn-ghost">
                    Huỷ
                  </button>
                </Link>
                <motion.button
                  type="submit"
                  whileHover={{ scale: submitting ? 1 : 1.03 }}
                  whileTap={{ scale: submitting ? 1 : 0.97 }}
                  className="btn btn-sm btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        style={{ display: "inline-flex" }}
                      >
                        <Icon name="refresh" size={12} />
                      </motion.span>
                      Đang tạo…
                    </>
                  ) : (
                    <>
                      <Icon name="plus" size={12} /> Tạo bộ truyện
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </FadeIn>
        </div>
      </div>
    </AnimatedPage>
  );
}
