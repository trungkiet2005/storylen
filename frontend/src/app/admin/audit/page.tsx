"use client";

import React, { useCallback, useEffect, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import { AdminAuditEntry, adminGetAudit } from "@/lib/api";
import { errorMessage, formatDateTime } from "../_shared";

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  "user.update_role": "Đổi quyền",
  "user.update_profile": "Sửa hồ sơ",
  "user.ban": "Khoá tài khoản",
  "user.unban": "Mở khoá",
  "user.delete": "Xoá user",
  "user.bulk_delete": "Xoá hàng loạt user",
  "user.password_reset": "Gửi link reset password",
  "user.resend_verification": "Gửi lại email xác thực",
  "content.delete_page": "Xoá trang",
  "content.bulk_delete_page": "Xoá hàng loạt trang",
  "content.delete_qa": "Xoá Q&A",
  "content.bulk_delete_qa": "Xoá hàng loạt Q&A",
  "settings.update": "Sửa cấu hình",
  "settings.delete": "Xoá cấu hình",
};

export default function AdminAuditPage() {
  const [items, setItems] = useState<AdminAuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetAudit({
        limit: PAGE_SIZE,
        offset,
        action: action || undefined,
        target_type: targetType || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(errorMessage(err, "Không thể tải audit log."));
    } finally {
      setLoading(false);
    }
  }, [offset, action, targetType]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setOffset(0);
  }, [action, targetType]);

  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <div>
      <SectionHeader
        kanji="記"
        label="Admin · Nhật ký"
        title="Audit log"
        subtitle="Mọi hành động admin đều được ghi lại tại đây."
        stamp="AUDIT"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 14 }}>
        <select value={action} onChange={(e) => setAction(e.target.value)} className="stroke-ink" style={{ padding: "9px 10px", fontSize: 12, background: "var(--panel)" }}>
          <option value="">Mọi hành động</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="stroke-ink" style={{ padding: "9px 10px", fontSize: 12, background: "var(--panel)" }}>
          <option value="">Mọi đối tượng</option>
          <option value="user">User</option>
          <option value="page">Page</option>
          <option value="qa">Q&A</option>
          <option value="setting">Setting</option>
        </select>
        <button className="btn btn-sm btn-ghost" onClick={load} disabled={loading}>
          <Icon name="refresh" size={12} /> Làm mới
        </button>
      </div>

      {error && (
        <div className="stroke-ink" style={{ background: "var(--bg-2)", color: "var(--accent)", padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="stroke-ink" style={{ background: "var(--panel)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 220px 1.6fr 1fr 32px",
            padding: "10px 14px",
            background: "var(--bg-2)",
            borderBottom: "2px solid var(--border)",
            alignItems: "center",
          }}
          className="caps-xs"
        >
          <span>Thời gian</span>
          <span>Hành động</span>
          <span>Mô tả</span>
          <span>Thực hiện bởi</span>
          <span></span>
        </div>

        {items.length === 0 && !loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
            Không có bản ghi audit nào. Đảm bảo migration <code>supabase_migration_admin.sql</code> đã được chạy.
          </div>
        ) : (
          items.map((entry, i) => (
            <div key={entry.id}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 220px 1.6fr 1fr 32px",
                  padding: "10px 14px",
                  borderBottom: "1px dashed var(--border-soft)",
                  alignItems: "center",
                  fontSize: 12,
                  cursor: "pointer",
                  background: expanded === entry.id ? "var(--bg-2)" : "transparent",
                }}
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              >
                <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {formatDateTime(entry.created_at)}
                </span>
                <span className="chip" style={{ fontSize: 10, padding: "2px 8px", justifySelf: "start" }}>
                  {ACTION_LABELS[entry.action] || entry.action}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.summary || <span style={{ color: "var(--muted)" }}>(không có mô tả)</span>}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--fg-soft)" }}>
                  {entry.actor_email || entry.actor_id?.slice(0, 8) || "—"}
                </span>
                <Icon name={expanded === entry.id ? "chevron-up" : "chevron-down"} size={12} />
              </div>
              {expanded === entry.id && (
                <div style={{ padding: "14px 18px", background: "var(--bg-2)", borderBottom: "1px dashed var(--border-soft)" }}>
                  <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "4px 14px", fontSize: 12, margin: 0 }}>
                    <dt style={{ color: "var(--muted)" }}>ID</dt><dd style={{ margin: 0 }} className="mono">{entry.id}</dd>
                    <dt style={{ color: "var(--muted)" }}>Action</dt><dd style={{ margin: 0 }} className="mono">{entry.action}</dd>
                    <dt style={{ color: "var(--muted)" }}>Target</dt>
                    <dd style={{ margin: 0 }} className="mono">{entry.target_type}{entry.target_id ? `:${entry.target_id}` : ""}</dd>
                    <dt style={{ color: "var(--muted)" }}>IP</dt><dd style={{ margin: 0 }} className="mono">{entry.ip_address || "—"}</dd>
                    <dt style={{ color: "var(--muted)" }}>User-Agent</dt><dd style={{ margin: 0, fontSize: 11 }}>{entry.user_agent || "—"}</dd>
                    <dt style={{ color: "var(--muted)" }}>Metadata</dt>
                    <dd style={{ margin: 0 }}>
                      <pre style={{ margin: 0, fontSize: 11, fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {JSON.stringify(entry.metadata ?? {}, null, 2)}
                      </pre>
                    </dd>
                  </dl>
                </div>
              )}
              {i === items.length - 1 && null}
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, fontSize: 12, color: "var(--muted)" }}>
        <div>
          Hiển thị {items.length === 0 ? 0 : offset + 1}–{offset + items.length} / {total.toLocaleString("vi-VN")}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-sm btn-ghost" disabled={!hasPrev || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
            ← Trước
          </button>
          <button className="btn btn-sm btn-ghost" disabled={!hasNext || loading} onClick={() => setOffset(offset + PAGE_SIZE)}>
            Tiếp →
          </button>
        </div>
      </div>
    </div>
  );
}
