"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import {
  AdminActivityResponse,
  AdminBreakdownItem,
  AdminStats,
  AdminTopUser,
  adminGetActivity,
  adminGetStats,
  adminGetStatusBreakdown,
  adminGetTargetLangBreakdown,
  adminGetTopUsers,
} from "@/lib/api";
import { errorMessage } from "./_shared";

const ACTIVITY_DAYS = 14;

function StatCard({ label, value, icon, sub }: { label: string; value: number; icon: string; sub?: string }) {
  return (
    <div
      className="stroke-ink panel-shadow"
      style={{
        background: "var(--panel)",
        padding: "16px 18px",
        display: "flex",
        gap: 14,
        alignItems: "center",
      }}
    >
      <Icon name={icon} size={22} />
      <div>
        <div className="display" style={{ fontSize: 26, lineHeight: 1 }}>
          {value.toLocaleString("vi-VN")}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function ActivitySparkline({ activity }: { activity: AdminActivityResponse | null }) {
  if (!activity || activity.points.length === 0) {
    return <div style={{ padding: 32, color: "var(--muted)", fontSize: 12 }}>Chưa có dữ liệu.</div>;
  }
  const points = activity.points;
  const max = Math.max(1, ...points.flatMap((p) => [p.pages_uploaded, p.qa_asked, p.new_users]));
  const W = 720;
  const H = 160;
  const stepX = W / Math.max(1, points.length - 1);

  function path(values: number[]): string {
    return values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(1)} ${(H - (v / max) * (H - 12) - 6).toFixed(1)}`)
      .join(" ");
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H + 24}`} width="100%" style={{ display: "block", minWidth: 600 }} aria-label="Hoạt động 14 ngày">
        {[0.25, 0.5, 0.75].map((r) => (
          <line key={r} x1={0} x2={W} y1={H * r} y2={H * r} stroke="var(--border-soft)" strokeDasharray="3 3" />
        ))}
        <path d={path(points.map((p) => p.pages_uploaded))} fill="none" stroke="var(--accent)" strokeWidth={2.4} />
        <path d={path(points.map((p) => p.qa_asked))} fill="none" stroke="#2A6FDB" strokeWidth={2} />
        <path d={path(points.map((p) => p.new_users))} fill="none" stroke="#1E8F4E" strokeWidth={2} />
        {points.map((p, i) => (
          <text
            key={p.day}
            x={i * stepX}
            y={H + 18}
            textAnchor="middle"
            fontSize={9}
            fill="var(--muted)"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {p.day.slice(5)}
          </text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "var(--accent)", marginRight: 6 }} />Trang</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#2A6FDB", marginRight: 6 }} />Q&amp;A</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#1E8F4E", marginRight: 6 }} />User mới</span>
      </div>
    </div>
  );
}

function BarList({ items, accent = "var(--accent)" }: { items: AdminBreakdownItem[]; accent?: string }) {
  if (items.length === 0) {
    return <div style={{ padding: 16, color: "var(--muted)", fontSize: 12 }}>Chưa có dữ liệu.</div>;
  }
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <div key={item.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "var(--fg-soft)" }}>{item.label}</span>
            <span className="mono" style={{ color: "var(--muted)" }}>{item.count.toLocaleString("vi-VN")}</span>
          </div>
          <div style={{ background: "var(--bg-2)", height: 8, borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                width: `${(item.count / max) * 100}%`,
                height: "100%",
                background: accent,
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<AdminActivityResponse | null>(null);
  const [topUsers, setTopUsers] = useState<AdminTopUser[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<AdminBreakdownItem[]>([]);
  const [langBreakdown, setLangBreakdown] = useState<AdminBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, a, t, sb, lb] = await Promise.all([
        adminGetStats(),
        adminGetActivity(ACTIVITY_DAYS),
        adminGetTopUsers("total", 8),
        adminGetStatusBreakdown(),
        adminGetTargetLangBreakdown(),
      ]);
      setStats(s);
      setActivity(a);
      setTopUsers(t.items);
      setStatusBreakdown(sb.items);
      setLangBreakdown(lb.items);
    } catch (err) {
      setError(errorMessage(err, "Không thể tải dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <SectionHeader
        kanji="管"
        label="Admin · Tổng quan"
        title="Dashboard"
        subtitle="Toàn cảnh hệ thống StoryLens: người dùng, nội dung, hoạt động gần đây."
        stamp="ADMIN"
      />

      {error && (
        <div className="stroke-ink" style={{ background: "var(--bg-2)", color: "var(--accent)", padding: "10px 14px", marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className="caps-xs" style={{ color: "var(--muted)" }}>{loading ? "Đang tải…" : "Cập nhật thời gian thực"}</span>
        <button className="btn btn-sm btn-ghost" onClick={load} disabled={loading}>
          <Icon name="refresh" size={12} /> Làm mới
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <StatCard label="Tổng người dùng"  value={stats?.total_users ?? 0}        icon="user"  sub={stats ? `+${stats.new_users_today} hôm nay` : undefined} />
        <StatCard label="Quản trị viên"    value={stats?.total_admins ?? 0}       icon="key" />
        <StatCard label="Tổng trang"       value={stats?.total_pages ?? 0}        icon="book"  sub={stats ? `+${stats.pages_today} hôm nay` : undefined} />
        <StatCard label="Tổng Q&A"         value={stats?.total_qa ?? 0}           icon="chat"  sub={stats ? `+${stats.qa_today} hôm nay` : undefined} />
        <StatCard label="Bản dịch đã lưu"  value={stats?.total_translations ?? 0} icon="translate" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, marginBottom: 28 }}>
        <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Hoạt động {ACTIVITY_DAYS} ngày gần nhất</h3>
            <Link href="/admin/analytics" style={{ fontSize: 12, color: "var(--accent)" }}>
              Xem chi tiết →
            </Link>
          </div>
          <ActivitySparkline activity={activity} />
        </div>

        <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 18 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Top người dùng tích cực</h3>
          {topUsers.length === 0 ? (
            <div style={{ padding: 16, color: "var(--muted)", fontSize: 12 }}>Chưa có dữ liệu.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topUsers.map((u, idx) => (
                <Link key={u.user_id} href={`/admin/users/${u.user_id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "20px 1fr auto",
                      gap: 10,
                      alignItems: "center",
                      padding: "6px 8px",
                      borderRadius: 4,
                      color: "var(--fg)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-2)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>#{idx + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.username || u.user_id.slice(0, 8)}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                      {u.pages_count}p · {u.qa_count}q
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 18 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Phân bố theo trạng thái trang</h3>
          <BarList items={statusBreakdown} accent="var(--accent)" />
        </div>
        <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 18 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Ngôn ngữ dịch ưa thích</h3>
          <BarList items={langBreakdown} accent="#2A6FDB" />
        </div>
      </div>
    </div>
  );
}
