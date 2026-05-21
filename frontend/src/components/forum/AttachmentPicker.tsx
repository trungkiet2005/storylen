"use client";

import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/contexts/I18nContext";
import {
  APIError,
  uploadForumAttachment,
  type ForumAttachment,
} from "@/lib/api";

const MAX = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";

interface Props {
  value: ForumAttachment[];
  onChange: (next: ForumAttachment[]) => void;
  disabled?: boolean;
  /**
   * Compact mode hides the panel chrome (border, padding, label, hint, "Chọn file" button).
   * Use when the parent composer renders its own attach trigger via the imperative ref
   * and just needs the thumbnail strip + drag-drop wiring (Facebook-style composer).
   */
  compact?: boolean;
}

export interface AttachmentPickerHandle {
  /** Programmatically open the OS file picker. Used by compact mode where the trigger lives in the parent toolbar. */
  open: () => void;
}

interface PendingItem {
  id: string;
  file: File;
  previewUrl: string;
  progress: "uploading" | "done" | "error";
  attachment?: ForumAttachment;
  error?: string;
}

export const AttachmentPicker = forwardRef<AttachmentPickerHandle, Props>(function AttachmentPicker(
  { value, onChange, disabled, compact = false },
  ref,
) {
  const { toast } = useToast();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  // Track only in-flight uploads here; finalized files move into `value` (parent).
  const [pending, setPending] = useState<PendingItem[]>([]);

  useImperativeHandle(ref, () => ({
    open: () => inputRef.current?.click(),
  }), []);

  const remaining = MAX - value.length - pending.filter(p => p.progress === "uploading").length;

  const validate = (file: File): string | null => {
    if (file.type.startsWith("image/")) {
      if (file.size > MAX_IMAGE_BYTES) return t("forum.attach.too_large_image", "Ảnh vượt quá 10MB.");
    } else if (file.type.startsWith("video/")) {
      if (file.size > MAX_VIDEO_BYTES) return t("forum.attach.too_large_video", "Video vượt quá 50MB.");
    } else {
      return t("forum.attach.unsupported", "Loại file không hỗ trợ.");
    }
    return null;
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (!arr.length) return;
      if (arr.length > remaining) {
        toast(t("forum.attach.over_limit", `Tối đa ${MAX} file/post.`), "error");
        arr.splice(remaining);
      }
      // Validate up-front so the user sees errors immediately, not after a server roundtrip.
      const accepted: File[] = [];
      for (const f of arr) {
        const err = validate(f);
        if (err) {
          toast(`${f.name}: ${err}`, "error");
          continue;
        }
        accepted.push(f);
      }
      if (!accepted.length) return;

      const newPending: PendingItem[] = accepted.map(f => ({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        progress: "uploading",
      }));
      setPending(prev => [...prev, ...newPending]);

      await Promise.all(
        newPending.map(async item => {
          try {
            const att = await uploadForumAttachment(item.file);
            setPending(prev => prev.map(p => (p.id === item.id ? { ...p, progress: "done", attachment: att } : p)));
            // Append to parent's committed list and drop from local pending.
            onChange([...value, att].slice(0, MAX));
            // Free the blob URL — the parent now owns the public URL.
            URL.revokeObjectURL(item.previewUrl);
            // Use setTimeout to avoid racing with the previous setPending in the parent.
            setTimeout(() => setPending(prev => prev.filter(p => p.id !== item.id)), 50);
          } catch (err) {
            const msg = err instanceof APIError ? err.message : "Upload failed.";
            setPending(prev => prev.map(p => (p.id === item.id ? { ...p, progress: "error", error: msg } : p)));
            toast(`${item.file.name}: ${msg}`, "error");
          }
        }),
      );
    },
    // Stable closure; `value` is captured but onChange is called with the up-to-date copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remaining, value, onChange, toast, t],
  );

  const removeAttachment = (url: string) => {
    onChange(value.filter(a => a.url !== url));
  };

  const removePending = (id: string) => {
    setPending(prev => {
      const item = prev.find(p => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const allItems: Array<{ key: string; url: string; type: "image" | "video"; isPending: boolean; pendingId?: string; status?: string }> = [
    ...value.map(a => ({ key: a.url, url: a.url, type: a.type, isPending: false })),
    ...pending.map(p => ({
      key: p.id,
      url: p.previewUrl,
      type: p.file.type.startsWith("video/") ? ("video" as const) : ("image" as const),
      isPending: true,
      pendingId: p.id,
      status: p.progress,
    })),
  ];

  const onDrop: React.DragEventHandler<HTMLDivElement> = e => {
    e.preventDefault();
    if (disabled) return;
    if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
  };

  // In compact mode with no attachments, render only the hidden <input> — the parent's
  // toolbar owns the trigger button, so we don't want any visible chrome here.
  if (compact && allItems.length === 0) {
    return (
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={e => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={e => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          // Reset so re-selecting the same file fires onChange again.
          e.target.value = "";
        }}
      />

      <div
        onDragOver={e => { e.preventDefault(); }}
        onDrop={onDrop}
        className={compact ? undefined : "stroke-ink"}
        style={
          compact
            ? { display: "flex", flexDirection: "column", gap: 8 }
            : { padding: 10, background: "var(--bg-2)", display: "flex", flexDirection: "column", gap: 8 }
        }
      >
        {!compact && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {t("forum.attach.label", "Đính kèm ảnh / video")} ({value.length}/{MAX})
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || remaining <= 0}
              className="btn btn-sm"
              style={{ fontSize: 11 }}
            >
              + {t("forum.attach.add", "Chọn file")}
            </button>
          </div>
        )}

        {allItems.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", padding: "8px 4px" }}>
            {t("forum.attach.hint", "Kéo thả hoặc chọn file. Ảnh tối đa 10MB, video tối đa 50MB.")}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
              gap: 6,
            }}
          >
            {allItems.map(item => (
              <div
                key={item.key}
                className="stroke-ink"
                style={{
                  position: "relative",
                  paddingBottom: "100%",
                  background: "var(--panel)",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", inset: 0 }}>
                  {item.type === "image" ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.url}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <video
                      src={item.url}
                      style={{ width: "100%", height: "100%", objectFit: "cover", background: "#000" }}
                      muted
                      playsInline
                    />
                  )}
                </div>
                {item.isPending && item.status === "uploading" && (
                  <div
                    style={{
                      position: "absolute", inset: 0,
                      background: "rgba(0,0,0,0.55)", color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                    }}
                  >
                    {t("common.loading", "Đang tải...").toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => (item.isPending ? removePending(item.pendingId!) : removeAttachment(item.url))}
                  aria-label="remove"
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 22,
                    height: 22,
                    padding: 0,
                    background: "var(--ink)",
                    color: "var(--paper)",
                    border: "1.5px solid var(--paper)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="close" size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
