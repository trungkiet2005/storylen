"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import {
  AdminActivityResponse,
  AdminBreakdownItem,
  AdminTopUser,
  adminGetActivity,
  adminGetStatusBreakdown,
  adminGetTargetLangBreakdown,
  adminGetTopUsers,
} from "@/lib/api";
import { errorMessage } from "../_shared";

const RANGES: { label: string; days: number }[] = [
  { label: "7 ngày",  days: 7 },
  { label: "14 ngày", days: 14 },
  { label: "30 ngày", days: 30 },
  { label: "90 ngày", days: 90 },
];

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [activity, setActivity] = useState<AdminActivityResponse | null>(null);
  const [topMetric, setTopMetric] = useState<"pages" | "qa" | "total">("pages");
  const [topUsers, setTopUsers] = useState<AdminTopUser[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<AdminBreakdownItem[]>([]);
  const [langBreakdown, setLangBreakdown] = useState<AdminBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, t, sb, lb] = await Promise.all([
        adminGetActivity(days),
        adminGetTopUsers(topMetric, 20),
        adminGetStatusBreakdown(),
        adminGetTargetLangBreakdown(),
      ]);
      setActivity(a);
      setTopUsers(t.items);
      setStatusBreakdown(sb.items);
      setLangBreakdown(lb.items);
    } catch (err) {
      setError(errorMessage(err, "Không thể tải phân tích."));
    } finally {
      setLoading(false);
    }
  }, [days, topMetric]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <SectionHeader
        kanji="析"
        label="Admin · Phân tích"
        title="Analytics"
        subtitle="Hoạt động theo thời gian, người dùng tích cực, phân bố trạng thái và ngôn ngữ."
        stamp="ANALYTICS"
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center" }}>
        <span className="caps-xs" style={{ color: "var(--muted)" }}>Khoảng thời gian:</span>
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setDays(r.days)}
            className={`btn btn-sm ${days === r.days ? "btn-primary" : "btn-ghost"}`}
          >
            {r.label}
          </button>
        ))}
        <button className="btn btn-sm btn-ghost" onClick={load} disabled={loading} style={{ marginLeft: "auto" }}>
          <Icon name="refresh" size={12} /> Làm mới
        </button>
      </div>

      {error && (
        <div className="stroke-ink" style={{ background: "var(--bg-2)", color: "var(--accent)", padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 20, marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Hoạt động theo ngày</h3>
        <ActivityChart activity={activity} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Top người dùng</h3>
            <div style={{ display: "flex", gap: 4 }}>
              {(["pages", "qa", "total"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setTopMetric(m)}
                  className={`btn btn-sm ${topMetric === m ? "" : "btn-ghost"}`}
                  style={{ fontSize: 11 }}
                >
                  {m === "pages" ? "Trang" : m === "qa" ? "Q&A" : "Tổng"}
                </button>
              ))}
            </div>
          </div>
          {topUsers.length === 0 ? (
            <div style={{ padding: 16, color: "var(--muted)", fontSize: 12 }}>Chưa có dữ liệu.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {topUsers.map((u, idx) => (
                <Link key={u.user_id} href={`/admin/users/${u.user_id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px 1fr 60px 60px",
                      gap: 10,
                      alignItems: "center",
                      padding: "6px 8px",
                      borderRadius: 4,
                      color: "var(--fg)",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-2)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>#{idx + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.username || u.user_id.slice(0, 8)}
                    </span>
                    <span className="mono" style={{ fontSize: 11, textAlign: "right", color: "var(--muted)" }}>{u.pages_count}p</span>
                    <span className="mono" style={{ fontSize: 11, textAlign: "right", color: "var(--muted)" }}>{u.qa_count}q</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Trạng thái trang</h3>
          <BarList items={statusBreakdown} />
        </div>
      </div>

      <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 20 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Ngôn ngữ dịch ưa thích</h3>
        <BarList items={langBreakdown} accent="#2A6FDB" />
      </div>
    </div>
  );
}

function ActivityChart({ activity }: { activity: AdminActivityResponse | null }) {
  if (!activity || activity.points.length === 0) {
    return <div style={{ padding: 32, color: "var(--muted)", fontSize: 12 }}>Chưa có dữ liệu.</div>;
  }
  const points = activity.points;
  const max = Math.max(1, ...points.flatMap((p) => [p.pages_uploaded, p.qa_asked, p.new_users]));
  const W = 880;
  const H = 240;
  const stepX = W / Math.max(1, points.length - 1);
  const py = (v: number) => H - (v / max) * (H - 24) - 12;
  const path = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(1)} ${py(v).toFixed(1)}`).join(" ");

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H + 28}`} width="100%" style={{ display: "block", minWidth: 700 }}>
        {[0.25, 0.5, 0.75].map((r) => (
          <g key={r}>
            <line x1={0} x2={W} y1={H * r} y2={H * r} stroke="var(--border-soft)" strokeDasharray="3 3" />
            <text x={4} y={H * r - 2} fontSize={9} fill="var(--muted)">
              {Math.round(max * (1 - r))}
            </text>
          </g>
        ))}
        <path d={path(points.map((p) => p.pages_uploaded))} fill="none" stroke="var(--accent)" strokeWidth={2.4} />
        <path d={path(points.map((p) => p.qa_asked))} fill="none" stroke="#2A6FDB" strokeWidth={2} />
        <path d={path(points.map((p) => p.new_users))} fill="none" stroke="#1E8F4E" strokeWidth={2} />
        {points.map((p, i) => (
          <g key={p.day}>
            <circle cx={i * stepX} cy={py(p.pages_uploaded)} r={2.5} fill="var(--accent)" />
            <circle cx={i * stepX} cy={py(p.qa_asked)} r={2.5} fill="#2A6FDB" />
            <circle cx={i * stepX} cy={py(p.new_users)} r={2.5} fill="#1E8F4E" />
            {(i % Math.max(1, Math.floor(points.length / 12)) === 0 || i === points.length - 1) && (
              <text x={i * stepX} y={H + 18} textAnchor="middle" fontSize={9} fill="var(--muted)" style={{ fontFamily: "var(--font-mono)" }}>
                {p.day.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 22, marginTop: 10, fontSize: 11, color: "var(--muted)", flexWrap: "wrap" }}>
        <Legend color="var(--accent)" label={`Trang upload (Σ ${sum(points.map((p) => p.pages_uploaded))})`} />
        <Legend color="#2A6FDB" label={`Q&A (Σ ${sum(points.map((p) => p.qa_asked))})`} />
        <Legend color="#1E8F4E" label={`User mới (Σ ${sum(points.map((p) => p.new_users))})`} />
      </div>
    </div>
  );
}

function sum(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0).toLocaleString("vi-VN");
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 12, height: 12, background: color, display: "inline-block" }} />
      {label}
    </span>
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
            <div style={{ width: `${(item.count / max) * 100}%`, height: "100%", background: accent }} />
          </div>
        </div>
      ))}
    </div>
  );
}
