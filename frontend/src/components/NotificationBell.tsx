"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { useAuth } from "@/contexts/AuthContext";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type Notification,
} from "@/lib/api";

const POLL_MS = 60_000;

function timeAgo(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - t);
    const m = Math.floor(diff / 60_000);
    if (m < 1) return "vừa xong";
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} ngày trước`;
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await listNotifications(20);
      setItems(res.items);
      setUnread(res.unread);
    } catch {
      // non-critical
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]); setUnread(0); return;
    }
    void refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (open && wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!isAuthenticated) return null;

  async function onClickItem(n: Notification) {
    if (!n.read) {
      try { await markNotificationRead(n.id); } catch { /* ignore */ }
      setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true } : p)));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.url && typeof window !== "undefined") {
      window.location.href = n.url;
    }
  }

  async function onMarkAll() {
    try { await markAllNotificationsRead(); } catch { /* ignore */ }
    setItems((prev) => prev.map((p) => ({ ...p, read: true })));
    setUnread(0);
  }

  async function onDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try { await deleteNotification(id); } catch { /* ignore */ }
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Thông báo"
        style={{
          position: "relative",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 8,
          color: "var(--fg)",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              background: "var(--accent)",
              color: "#fff",
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="stroke-ink panel-shadow"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 360,
            maxHeight: 480,
            overflowY: "auto",
            background: "var(--panel)",
            borderRadius: "var(--radius)",
            zIndex: 200,
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: 14 }}>Thông báo</strong>
            {unread > 0 && (
              <button type="button" onClick={onMarkAll} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div style={{ padding: 24, color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
              Chưa có thông báo nào
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {items.map((n) => (
                <li
                  key={n.id}
                  onClick={() => void onClickItem(n)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border-soft)",
                    cursor: n.url ? "pointer" : "default",
                    background: n.read ? "transparent" : "rgba(200,16,46,0.05)",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 12, color: "var(--fg-soft)", lineHeight: 1.5 }}>{n.body}</div>}
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  <button type="button" onClick={(e) => void onDelete(n.id, e)} aria-label="Xoá" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}>
                    <Icon name="x" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div style={{ padding: 10, textAlign: "center", borderTop: "1px solid var(--border-soft)" }}>
            <Link href="/notifications" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
              Xem tất cả
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
