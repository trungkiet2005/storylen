"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/components/Icons";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type Notification,
} from "@/lib/api";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login?next=/notifications");
  }, [isLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listNotifications(100);
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) void load(); }, [user, load]);

  async function onRead(id: string) {
    await markNotificationRead(id);
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, read: true } : p)));
  }
  async function onDel(id: string) {
    await deleteNotification(id);
    setItems((prev) => prev.filter((p) => p.id !== id));
  }
  async function onReadAll() {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((p) => ({ ...p, read: true })));
  }

  if (!user) return null;

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h1 className="display" style={{ fontSize: 28 }}>Thông báo</h1>
          <button type="button" onClick={onReadAll} className="btn btn-sm btn-secondary">Đánh dấu tất cả đã đọc</button>
        </div>

        {loading ? (
          <div style={{ color: "var(--muted)" }}>Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="stroke-ink" style={{ background: "var(--panel)", padding: 32, borderRadius: "var(--radius)", textAlign: "center", color: "var(--muted)" }}>
            Chưa có thông báo nào
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((n) => (
              <li
                key={n.id}
                className="stroke-ink"
                style={{
                  display: "flex",
                  gap: 12,
                  padding: 16,
                  background: n.read ? "var(--panel)" : "rgba(200,16,46,0.04)",
                  borderRadius: "var(--radius-sm)",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: 13, color: "var(--fg-soft)" }}>{n.body}</div>}
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{new Date(n.created_at).toLocaleString("vi-VN")}</div>
                  {n.url && <Link href={n.url} style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>Xem chi tiết →</Link>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {!n.read && (
                    <button type="button" onClick={() => void onRead(n.id)} className="btn btn-sm btn-ghost" aria-label="Đánh dấu đã đọc">
                      <Icon name="check" size={14} />
                    </button>
                  )}
                  <button type="button" onClick={() => void onDel(n.id)} className="btn btn-sm btn-ghost" aria-label="Xoá">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </>
  );
}
