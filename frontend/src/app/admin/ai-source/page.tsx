"use client";

import React, { useCallback, useEffect, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import {
  AISourceProvider,
  AISourceState,
  AISourceTestResult,
  adminGetAISource,
  adminTestAISource,
  adminUpdateAISource,
} from "@/lib/api";
import { errorMessage } from "../_shared";

const PROVIDER_LABEL: Record<AISourceProvider, string> = {
  huggingface: "HuggingFace Space (mặc định)",
  kaggle: "Kaggle / Cloudflare tunnel",
};

export default function AdminAISourcePage() {
  const { toast } = useToast();
  const [state, setState] = useState<AISourceState | null>(null);
  const [provider, setProvider] = useState<AISourceProvider>("huggingface");
  const [kaggleUrl, setKaggleUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<"hf" | "kaggle" | null>(null);
  const [testResult, setTestResult] = useState<{ which: "hf" | "kaggle"; result: AISourceTestResult } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetAISource();
      setState(res);
      setProvider(res.provider);
      setKaggleUrl(res.kaggle_url);
    } catch (err) {
      toast(errorMessage(err, "Không thể tải cấu hình AI source."), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    const trimmed = kaggleUrl.trim();
    if (provider === "kaggle" && !trimmed) {
      toast("Cần nhập URL Kaggle khi chọn provider Kaggle.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await adminUpdateAISource(provider, trimmed);
      setState(res);
      setProvider(res.provider);
      setKaggleUrl(res.kaggle_url);
      toast(`Đã chuyển AI source sang ${PROVIDER_LABEL[res.provider]}.`, "success");
    } catch (err) {
      toast(errorMessage(err, "Lưu thất bại."), "error");
    } finally {
      setSaving(false);
    }
  };

  const testUrl = async (which: "hf" | "kaggle") => {
    const url = which === "hf" ? state?.huggingface_url ?? "" : kaggleUrl.trim();
    if (!url) {
      toast("Chưa có URL để kiểm tra.", "error");
      return;
    }
    setTesting(which);
    setTestResult(null);
    try {
      const result = await adminTestAISource(url);
      setTestResult({ which, result });
      if (result.ok) {
        toast(`OK · HTTP ${result.http_status} · ${result.latency_ms}ms`, "success");
      } else {
        toast(result.detail ?? "Probe thất bại.", "error");
      }
    } catch (err) {
      toast(errorMessage(err, "Probe thất bại."), "error");
    } finally {
      setTesting(null);
    }
  };

  const dirty =
    state !== null &&
    (state.provider !== provider || state.kaggle_url !== kaggleUrl.trim());

  return (
    <div>
      <SectionHeader
        kanji="源"
        label="Admin · AI source"
        title="AI module backend"
        subtitle="Chuyển nhanh giữa HuggingFace Space và URL Kaggle/Cloudflare. URL Kaggle thay đổi mỗi phiên — dán vào đây để cả backend trỏ sang ngay lập tức."
        stamp="SWITCH"
      />

      {loading && (
        <div style={{ padding: 24, color: "var(--muted)" }}>Đang tải…</div>
      )}

      {!loading && state && (
        <>
          {/* Active source banner */}
          <div
            className="stroke-ink panel-shadow"
            style={{
              background: "var(--panel)",
              padding: 18,
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div>
              <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 4 }}>
                Đang sử dụng
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {PROVIDER_LABEL[state.provider]}
              </div>
              <div
                className="mono"
                style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, wordBreak: "break-all" }}
              >
                {state.active_url || "(chưa cấu hình)"}
              </div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={load} disabled={loading}>
              <Icon name="refresh" size={12} /> Làm mới
            </button>
          </div>

          {/* Provider toggle */}
          <div
            className="stroke-ink"
            style={{ background: "var(--panel)", padding: 18, marginBottom: 16 }}
          >
            <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 10 }}>
              Nguồn AI module
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ProviderCard
                value="huggingface"
                active={provider === "huggingface"}
                title="HuggingFace Space"
                subtitle="URL từ biến môi trường AI_MODULE_URL — luôn sẵn sàng, dùng làm mặc định."
                onClick={() => setProvider("huggingface")}
              />
              <ProviderCard
                value="kaggle"
                active={provider === "kaggle"}
                title="Kaggle tunnel"
                subtitle="Cloudflare/trycloudflare URL được tạo từ notebook Kaggle. Mỗi phiên cần dán URL mới."
                onClick={() => setProvider("kaggle")}
              />
            </div>
          </div>

          {/* URL fields */}
          <div
            className="stroke-ink"
            style={{ background: "var(--panel)", padding: 18, marginBottom: 16 }}
          >
            <UrlRow
              label="HuggingFace URL (từ env)"
              value={state.huggingface_url}
              readOnly
              onTest={() => testUrl("hf")}
              testing={testing === "hf"}
              testResult={testResult?.which === "hf" ? testResult.result : null}
            />
            <div style={{ height: 14 }} />
            <UrlRow
              label="Kaggle URL (chỉnh được)"
              value={kaggleUrl}
              onChange={setKaggleUrl}
              placeholder="https://animal-cyber-strange-pentium.trycloudflare.com"
              onTest={() => testUrl("kaggle")}
              testing={testing === "kaggle"}
              testResult={testResult?.which === "kaggle" ? testResult.result : null}
            />
          </div>

          {/* Save */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                if (state) {
                  setProvider(state.provider);
                  setKaggleUrl(state.kaggle_url);
                }
              }}
              disabled={saving || !dirty}
            >
              Huỷ thay đổi
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={save}
              disabled={saving || !dirty}
            >
              <Icon name="check" size={12} /> {saving ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>

          <div
            style={{
              marginTop: 24,
              padding: "12px 14px",
              border: "1.5px dashed var(--border-soft)",
              background: "var(--bg-2)",
              fontSize: 12,
              color: "var(--muted)",
              lineHeight: 1.6,
            }}
          >
            Backend cache giá trị này trong ~5 giây. Sau khi lưu, lần gọi pipeline kế tiếp sẽ
            tự trỏ sang URL mới — không cần restart Render. Thao tác được ghi vào{" "}
            <code>admin_audit_log</code>.
          </div>
        </>
      )}
    </div>
  );
}

function ProviderCard({
  value,
  active,
  title,
  subtitle,
  onClick,
}: {
  value: AISourceProvider;
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-value={value}
      className="stroke-ink"
      style={{
        textAlign: "left",
        padding: 14,
        background: active ? "var(--accent)" : "var(--bg-2)",
        color: active ? "#fff" : "var(--fg)",
        cursor: "pointer",
        boxShadow: active ? "3px 3px 0 0 var(--border)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            border: "2px solid currentColor",
            background: active ? "#fff" : "transparent",
          }}
        />
        <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
      </div>
      <div style={{ fontSize: 11.5, opacity: 0.85, lineHeight: 1.5 }}>{subtitle}</div>
    </button>
  );
}

function UrlRow({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  onTest,
  testing,
  testResult,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  onTest: () => void;
  testing: boolean;
  testResult: AISourceTestResult | null;
}) {
  return (
    <div>
      <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className="stroke-ink"
          style={{
            padding: 9,
            fontSize: 13,
            background: readOnly ? "var(--bg-1)" : "var(--bg-2)",
            color: readOnly ? "var(--muted)" : "var(--fg)",
            fontFamily: "var(--font-mono)",
          }}
        />
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={onTest}
          disabled={testing || !value.trim()}
        >
          <Icon name="zap" size={12} /> {testing ? "Đang test…" : "Test"}
        </button>
      </div>
      {testResult && (
        <div
          style={{
            marginTop: 6,
            fontSize: 11.5,
            color: testResult.ok ? "var(--success, #047857)" : "var(--accent)",
          }}
        >
          {testResult.ok
            ? `OK · HTTP ${testResult.http_status} · ${testResult.latency_ms}ms`
            : `Lỗi: ${testResult.detail ?? "không phản hồi"}`}
        </div>
      )}
    </div>
  );
}
