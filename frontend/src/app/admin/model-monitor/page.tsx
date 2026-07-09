"use client";

import React, { useCallback, useEffect, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import {
  adminGetModelMonitorSummary,
  adminGetModelMonitorAB,
  adminSetModelMonitorAB,
  type ModelMonitorSummary as MetricsSummary,
  type ModelMonitorABResults as ABResults,
  type ModelMonitorTimeSeries as TimeSeries,
  type ModelMonitorABVariantName,
} from "@/lib/api";

// ─── Utilities ────────────────────────────────────────────────────────────────

function pct(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return (v * 100).toFixed(1) + "%";
}

function ms(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toFixed(0) + " ms";
}

function driftColor(status: string): string {
  if (status === "ok") return "#1E8F4E";
  if (status === "warning") return "#D97706";
  if (status === "critical") return "var(--accent)";
  return "var(--muted)";
}

function driftLabel(status: string): string {
  if (status === "ok") return "✓ Bình thường";
  if (status === "warning") return "⚠ Cảnh báo";
  if (status === "critical") return "✕ Nghiêm trọng";
  return "– Chưa đủ dữ liệu";
}

// ─── Inline simple bar chart ──────────────────────────────────────────────────

function MiniBarChart({ data, field, label, max }: { data: TimeSeries[]; field: keyof TimeSeries; label: string; max: number }) {
  if (!data.length) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
        {data.map((d) => {
          const val = Number(d[field]);
          const h = Math.max(4, (val / max) * 60);
          return (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{ width: "100%", height: h, background: "var(--accent)", opacity: 0.8 }}
                title={`${d.date}: ${val}`}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--muted)" }}>
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: "16px 20px" }}>
      <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>{label}</div>
      <div className="display" style={{ fontSize: 28, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminModelMonitorPage() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [abResults, setAbResults] = useState<ABResults | null>(null);
  const [abVariant, setAbVariant] = useState<ModelMonitorABVariantName>("off");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abSaving, setAbSaving] = useState(false);
  const [abNotice, setAbNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, ab] = await Promise.all([
        adminGetModelMonitorSummary(days),
        adminGetModelMonitorAB(),
      ]);
      setSummary(sum);
      setAbResults(ab);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  async function handleSetAB() {
    setAbSaving(true);
    setAbNotice(null);
    try {
      await adminSetModelMonitorAB(abVariant);
      setAbNotice(`✓ Đã đặt variant A/B: ${abVariant}`);
    } catch (e: unknown) {
      setAbNotice(`✕ Lưu thất bại: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAbSaving(false);
    }
  }

  const maxOcr = summary?.time_series.length
    ? Math.max(...summary.time_series.map((d) => d.avg_ocr_confidence), 1)
    : 1;
  const maxLat = summary?.time_series.length
    ? Math.max(...summary.time_series.map((d) => d.avg_latency_ms), 1)
    : 1;

  return (
    <div>
      <SectionHeader
        kanji="監"
        label="Admin · Giám sát AI"
        title="Model Monitor (MLOps)"
        subtitle="Theo dõi chất lượng mô hình AI: OCR confidence, latency, tỉ lệ thành công, drift detection và A/B testing."
        stamp="MLOPS"
      />

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <label className="caps-xs" style={{ color: "var(--muted)" }}>Khoảng thời gian:</label>
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            id={`days-btn-${d}`}
            className={`btn btn-sm ${days === d ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setDays(d)}
          >
            {d} ngày
          </button>
        ))}
        <button id="refresh-btn" className="btn btn-sm btn-ghost" onClick={load} disabled={loading}>
          ↺ Làm mới
        </button>
      </div>

      {error && (
        <div className="stroke-ink" style={{ background: "var(--bg-2)", color: "var(--accent)", padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Drift Status Banner */}
      {summary && (
        <div
          className="stroke-ink panel-shadow"
          style={{
            background: "var(--panel)",
            borderLeft: `4px solid ${driftColor(summary.drift_status)}`,
            padding: "14px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 24, color: driftColor(summary.drift_status) }}>
            {summary.drift_status === "ok" ? "✓" : summary.drift_status === "warning" ? "⚠" : summary.drift_status === "critical" ? "✕" : "○"}
          </div>
          <div>
            <div className="display" style={{ fontSize: 16, lineHeight: 1, color: driftColor(summary.drift_status) }}>
              Model Drift: {driftLabel(summary.drift_status)}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
              So sánh 50 trang gần nhất với 50 trang trước đó. Dựa trên OCR confidence, tỉ lệ phát hiện bong bóng và tỉ lệ dịch thành công.
            </div>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Tổng trang đã xử lý" value={loading ? "…" : String(summary?.total_pages ?? "—")} sub={`${days} ngày qua`} />
        <KpiCard label="OCR Confidence TB" value={loading ? "…" : pct(summary?.avg_ocr_confidence ?? null)} sub="Confidence manga-ocr" />
        <KpiCard label="Latency TB" value={loading ? "…" : ms(summary?.avg_latency_ms ?? null)} sub="Thời gian xử lý pipeline" />
        <KpiCard label="Tỉ lệ dịch thành công" value={loading ? "…" : pct(summary?.translation_success_rate ?? null)} sub="Translation success rate" />
        <KpiCard label="Tỉ lệ phát hiện bong bóng" value={loading ? "…" : pct(summary?.bubble_detection_rate ?? null)} sub="YOLO detection rate" />
        <KpiCard label="Số bong bóng TB/trang" value={loading ? "…" : String(summary?.avg_bubble_count?.toFixed(1) ?? "—")} sub="Avg bubbles per page" />
      </div>

      {/* Drift Details Table */}
      {summary?.drift_details && summary.drift_details.length > 0 && (
        <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 20, marginBottom: 24 }}>
          <div className="display" style={{ fontSize: 16, marginBottom: 12 }}>📊 Chi tiết Drift Detection</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted)", fontWeight: 400 }}>Metric</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--muted)", fontWeight: 400 }}>Baseline (trước)</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--muted)", fontWeight: 400 }}>Gần đây</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: "var(--muted)", fontWeight: 400 }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {summary.drift_details.map((d) => (
                <tr key={d.metric} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 8px" }}><code style={{ fontSize: 12 }}>{d.metric}</code></td>
                  <td style={{ textAlign: "right", padding: "8px 8px", fontFamily: "var(--font-mono)" }}>{(d.baseline * 100).toFixed(1)}%</td>
                  <td style={{ textAlign: "right", padding: "8px 8px", fontFamily: "var(--font-mono)" }}>{(d.recent * 100).toFixed(1)}%</td>
                  <td style={{ textAlign: "center", padding: "8px 8px" }}>
                    <span style={{ color: driftColor(d.status), fontWeight: 600 }}>{driftLabel(d.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Charts */}
      {summary && summary.time_series.length > 0 && (
        <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 20, marginBottom: 24 }}>
          <div className="display" style={{ fontSize: 16, marginBottom: 16 }}>📈 Biểu đồ theo thời gian</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <MiniBarChart data={summary.time_series} field="avg_ocr_confidence" label="OCR Confidence (0→1)" max={maxOcr} />
            <MiniBarChart data={summary.time_series} field="avg_latency_ms" label="Pipeline Latency (ms)" max={maxLat} />
            <MiniBarChart data={summary.time_series} field="success_rate" label="Translation Success Rate (0→1)" max={1} />
            <MiniBarChart data={summary.time_series} field="page_count" label="Số trang xử lý / ngày" max={Math.max(...summary.time_series.map((d) => d.page_count), 1)} />
          </div>
        </div>
      )}

      {/* A/B Test Results */}
      {abResults && (
        <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 20, marginBottom: 24 }}>
          <div className="display" style={{ fontSize: 16, marginBottom: 4 }}>🧪 A/B Testing — So sánh Model</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>{abResults.recommendation}</div>
          {abResults.variants.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Chưa có đủ dữ liệu A/B. Xử lý thêm trang để bắt đầu so sánh.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["Translator/Variant", "Số trang", "OCR Confidence", "Latency TB", "Success Rate"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted)", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {abResults.variants.map((v, i) => (
                  <tr key={v.translator} style={{ borderBottom: "1px solid var(--border)", background: i === 0 ? "rgba(30,143,78,0.07)" : undefined }}>
                    <td style={{ padding: "8px 8px" }}>
                      <code style={{ fontSize: 12 }}>{v.translator}</code>
                      {i === 0 && <span className="chip" style={{ marginLeft: 8, fontSize: 9, padding: "2px 6px", background: "#1E8F4E", color: "#fff" }}>BEST</span>}
                    </td>
                    <td style={{ padding: "8px 8px" }}>{v.sample_count}</td>
                    <td style={{ padding: "8px 8px", fontFamily: "var(--font-mono)" }}>{pct(v.avg_ocr_confidence)}</td>
                    <td style={{ padding: "8px 8px", fontFamily: "var(--font-mono)" }}>{ms(v.avg_latency_ms)}</td>
                    <td style={{ padding: "8px 8px", fontFamily: "var(--font-mono)" }}>{pct(v.success_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* A/B Config */}
      <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 20 }}>
        <div className="display" style={{ fontSize: 16, marginBottom: 4 }}>⚙️ Cấu hình A/B Test</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
          Chọn variant để chia lưu lượng người dùng ra 2 nhóm thử nghiệm model AI khác nhau.
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            id="ab-variant-select"
            value={abVariant}
            onChange={(e) => setAbVariant(e.target.value as ModelMonitorABVariantName)}
            style={{ padding: "6px 10px", fontSize: 13, background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--ink)" }}
          >
            <option value="off">off — Tắt A/B (tất cả dùng config mặc định)</option>
            <option value="experiment_50">experiment_50 — 50% người dùng dùng config thử nghiệm</option>
          </select>
          <button id="ab-save-btn" className="btn btn-sm btn-primary" onClick={handleSetAB} disabled={abSaving}>
            {abSaving ? "Đang lưu…" : "Lưu cấu hình"}
          </button>
          {abNotice && (
            <span
              style={{
                fontSize: 12,
                color: abNotice.startsWith("✓") ? "#1E8F4E" : "var(--accent)",
              }}
            >
              {abNotice}
            </span>
          )}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted)" }}>
          Khi bật experiment_50, 50% user (hash by user_id) sẽ dùng detector=yolov8x thay vì default. Hiệu năng và chất lượng sẽ được so sánh tự động trong bảng A/B ở trên.
        </div>
      </div>
    </div>
  );
}
