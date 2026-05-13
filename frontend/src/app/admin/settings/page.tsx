"use client";

import React, { useCallback, useEffect, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { AdminSettingItem, adminDeleteSetting, adminListSettings, adminUpsertSetting } from "@/lib/api";
import { errorMessage, formatDateTime } from "../_shared";

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return JSON.stringify(v);
  return JSON.stringify(v);
}

function parseValue(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, error: "Giá trị không được rỗng." };
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (e) {
    return { ok: false, error: `JSON không hợp lệ: ${(e as Error).message}` };
  }
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<AdminSettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // New setting form
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListSettings();
      setItems(res.items);
      setDrafts(Object.fromEntries(res.items.map((s) => [s.key, stringifyValue(s.value)])));
    } catch (err) {
      setError(errorMessage(err, "Không thể tải cấu hình."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (setting: AdminSettingItem) => {
    const parsed = parseValue(drafts[setting.key] ?? "");
    if (!parsed.ok) {
      toast(parsed.error, "error");
      return;
    }
    setBusyKey(setting.key);
    try {
      await adminUpsertSetting(setting.key, parsed.value, setting.description);
      toast(`Đã lưu ${setting.key}.`, "success");
      await load();
    } catch (err) {
      toast(errorMessage(err, "Lưu thất bại."), "error");
    } finally {
      setBusyKey(null);
    }
  };

  const remove = async (setting: AdminSettingItem) => {
    if (!window.confirm(`Xoá cấu hình "${setting.key}"? Hệ thống sẽ trở lại giá trị mặc định.`)) return;
    setBusyKey(setting.key);
    try {
      await adminDeleteSetting(setting.key);
      toast(`Đã xoá ${setting.key}.`, "success");
      await load();
    } catch (err) {
      toast(errorMessage(err, "Xoá thất bại."), "error");
    } finally {
      setBusyKey(null);
    }
  };

  const addNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = newKey.trim();
    if (!key) {
      toast("Cần nhập khoá.", "error");
      return;
    }
    const parsed = parseValue(newValue);
    if (!parsed.ok) {
      toast(parsed.error, "error");
      return;
    }
    try {
      await adminUpsertSetting(key, parsed.value, newDescription || null);
      toast(`Đã thêm cấu hình ${key}.`, "success");
      setNewKey("");
      setNewValue("");
      setNewDescription("");
      await load();
    } catch (err) {
      toast(errorMessage(err, "Thêm thất bại."), "error");
    }
  };

  return (
    <div>
      <SectionHeader
        kanji="設"
        label="Admin · Cấu hình"
        title="Runtime settings"
        subtitle="Feature flags & giới hạn. Giá trị là JSON: dùng true/false, số, hoặc chuỗi trong dấu nháy kép."
        stamp="CONFIG"
      />

      {error && (
        <div className="stroke-ink" style={{ background: "var(--bg-2)", color: "var(--accent)", padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className="caps-xs" style={{ color: "var(--muted)" }}>{loading ? "Đang tải…" : `${items.length} cấu hình`}</span>
        <button className="btn btn-sm btn-ghost" onClick={load} disabled={loading}>
          <Icon name="refresh" size={12} /> Làm mới
        </button>
      </div>

      <div className="stroke-ink" style={{ background: "var(--panel)", marginBottom: 24 }}>
        {items.length === 0 && !loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            Chưa có cấu hình nào. Đảm bảo migration <code>supabase_migration_admin.sql</code> đã chạy để seed các cấu hình mặc định.
          </div>
        ) : (
          items.map((s, i) => (
            <div
              key={s.key}
              style={{
                padding: "14px 18px",
                borderBottom: i < items.length - 1 ? "1px dashed var(--border-soft)" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>{s.key}</code>
                  {s.description && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.description}</div>}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "right" }}>
                  Cập nhật: {formatDateTime(s.updated_at)}
                  {s.updated_by && <div className="mono">bởi {s.updated_by.slice(0, 8)}…</div>}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}>
                <input
                  value={drafts[s.key] ?? ""}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [s.key]: e.target.value }))}
                  className="stroke-ink"
                  style={{ padding: 8, fontSize: 13, background: "var(--bg-2)", fontFamily: "var(--font-mono)" }}
                  placeholder='Ví dụ: true / 20 / "VIN"'
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => save(s)}
                  disabled={busyKey === s.key || (drafts[s.key] ?? "") === stringifyValue(s.value)}
                >
                  <Icon name="check" size={12} /> Lưu
                </button>
                <button className="btn btn-sm btn-ghost" style={{ color: "var(--accent)" }} onClick={() => remove(s)} disabled={busyKey === s.key}>
                  <Icon name="trash" size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={addNew} className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 18 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Thêm cấu hình mới</h3>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr auto", gap: 10, alignItems: "center" }}>
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="key (snake_case)"
            className="stroke-ink"
            style={{ padding: 8, fontSize: 13, background: "var(--bg-2)", fontFamily: "var(--font-mono)" }}
          />
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder='value (JSON, ví dụ: true)'
            className="stroke-ink"
            style={{ padding: 8, fontSize: 13, background: "var(--bg-2)", fontFamily: "var(--font-mono)" }}
          />
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Mô tả (tuỳ chọn)"
            className="stroke-ink"
            style={{ padding: 8, fontSize: 13, background: "var(--bg-2)" }}
          />
          <button type="submit" className="btn btn-sm btn-primary">
            <Icon name="plus" size={12} /> Thêm
          </button>
        </div>
      </form>
    </div>
  );
}
