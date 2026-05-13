"use client";

import React, { useCallback, useEffect, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import { AdminHealth, adminGetHealth } from "@/lib/api";
import { errorMessage, formatDateTime } from "../_shared";

export default function AdminHealthPage() {
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHealth(await adminGetHealth());
    } catch (err) {
      setError(errorMessage(err, "Không thể tải health."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const overallOk = !!health && health.services.every((s) => s.ok);

  return (
    <div>
      <SectionHeader
        kanji="健"
        label="Admin · Sức khoẻ"
        title="System health"
        subtitle="Kiểm tra Supabase, ai_module và HuggingFace Space. Tự động làm mới mỗi 30 giây."
        stamp="HEALTH"
      />

      {error && (
        <div className="stroke-ink" style={{ background: "var(--bg-2)", color: "var(--accent)", padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className="caps-xs" style={{ color: "var(--muted)" }}>
          {loading ? "Đang kiểm tra…" : `Kiểm tra lần cuối: ${formatDateTime(health?.checked_at)}`}
        </span>
        <button className="btn btn-sm btn-ghost" onClick={load} disabled={loading}>
          <Icon name="refresh" size={12} /> Làm mới ngay
        </button>
      </div>

      <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: overallOk ? "#1E8F4E" : "var(--accent)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={overallOk ? "check" : "alert"} size={22} />
          </div>
          <div>
            <div className="display" style={{ fontSize: 22, lineHeight: 1 }}>
              {overallOk ? "Tất cả dịch vụ hoạt động" : "Có dịch vụ gặp sự cố"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              {health ? `${health.app_name} v${health.app_version} · ${health.debug ? "DEBUG" : "PRODUCTION"}` : "—"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {health?.services.map((s) => (
          <div key={s.name} className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>{s.name}</code>
              <span
                className="chip"
                style={{
                  fontSize: 10,
                  padding: "2px 10px",
                  background: s.ok ? "#1E8F4E" : "var(--accent)",
                  color: "#fff",
                }}
              >
                {s.ok ? "UP" : "DOWN"}
              </span>
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "4px 12px", fontSize: 12, margin: 0 }}>
              <dt style={{ color: "var(--muted)" }}>Latency</dt>
              <dd style={{ margin: 0 }} className="mono">{s.latency_ms !== null ? `${s.latency_ms} ms` : "—"}</dd>
              <dt style={{ color: "var(--muted)" }}>Detail</dt>
              <dd style={{ margin: 0, color: s.ok ? "var(--muted)" : "var(--accent)" }}>{s.detail || (s.ok ? "OK" : "—")}</dd>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
