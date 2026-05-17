"use client";

/**
 * DailyCheckin — Tier B #12.
 *
 * Card showing "Điểm danh hôm nay" with a button awarding daily credits.
 * Streak grows by 1 each consecutive day, with a streak bonus capped at +5.
 * After redemption, shows the new balance + countdown until tomorrow's reset.
 */

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  APIError,
  dailyCheckin,
  getCheckinStatus,
  type CheckinStatus,
} from "@/lib/api";

function relTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const target = new Date(iso).getTime();
    const diff = target - Date.now();
    if (diff <= 0) return "đã sẵn sàng";
    const hours = Math.floor(diff / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    if (hours > 0) return `${hours} giờ ${minutes} phút`;
    return `${minutes} phút`;
  } catch {
    return "";
  }
}

export function DailyCheckin() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }
    getCheckinStatus()
      .then(setStatus)
      .catch(err => {
        // Suppress 503 (migration not run) — the widget just hides itself.
        if (err instanceof APIError && err.status === 503) setError("disabled");
        else setError(err instanceof Error ? err.message : "Lỗi không xác định");
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, isLoading]);

  if (!isAuthenticated || loading || error === "disabled") return null;
  if (!status) return null;

  const handleCheckin = async () => {
    if (redeeming || !status.eligible) return;
    setRedeeming(true);
    try {
      const res = await dailyCheckin();
      toast(res.message, "success");
      setStatus({
        eligible: false,
        streak: res.streak,
        next_eligible_at: res.next_eligible_at,
        last_checkin_at: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof APIError ? err.message : "Không điểm danh được.";
      toast(msg, "error");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="stroke-ink panel-shadow"
      style={{
        background: "var(--panel)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          width: 44, height: 44, flexShrink: 0,
          background: status.eligible ? "var(--accent)" : "var(--bg-3)",
          color: status.eligible ? "#fff" : "var(--muted)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon name="trophy" size={20} />
      </div>

      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          {status.eligible ? "Điểm danh hôm nay" : "Đã điểm danh hôm nay"}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
          {status.eligible
            ? `Nhận 2 credit + bonus chuỗi ${status.streak > 0 ? `(đang ${status.streak} ngày)` : ""}`
            : status.next_eligible_at
              ? `Quay lại sau ${relTime(status.next_eligible_at)} · chuỗi ${status.streak} ngày`
              : `Chuỗi hiện tại: ${status.streak} ngày`}
        </div>
      </div>

      {status.eligible && (
        <button
          onClick={handleCheckin}
          disabled={redeeming}
          className="btn btn-sm btn-primary"
          style={{ fontSize: 12, padding: "6px 14px" }}
        >
          {redeeming ? "Đang nhận…" : "Nhận credit"}
        </button>
      )}
    </motion.div>
  );
}
