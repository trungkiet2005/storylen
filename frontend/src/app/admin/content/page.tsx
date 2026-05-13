"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import {
  AdminPageItem,
  AdminQAItem,
  adminBulkDeletePages,
  adminBulkDeleteQA,
  adminDeletePage,
  adminDeleteQA,
  adminListPages,
  adminListQA,
} from "@/lib/api";
import { errorMessage, formatDateTime } from "../_shared";

type Tab = "pages" | "qa";
const PAGE_SIZE = 20;

export default function AdminContentPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("pages");

  return (
    <div>
      <SectionHeader
        kanji="本"
        label="Admin · Nội dung"
        title="Quản lý nội dung"
        subtitle="Xem & xoá trang manga, lịch sử Q&A của bất kỳ người dùng nào."
        stamp="CONTENT"
      />

      <div role="tablist" style={{ display: "flex", gap: 4, borderBottom: "2px solid var(--border)", marginBottom: 18 }}>
        {(["pages", "qa"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{
              padding: "9px 18px",
              border: "none",
              borderBottom: tab === t ? "3px solid var(--accent)" : "3px solid transparent",
              background: "none",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 13,
              color: tab === t ? "var(--fg)" : "var(--muted)",
              cursor: "pointer",
            }}
          >
            {t === "pages" ? "Trang manga" : "Q&A"}
          </button>
        ))}
      </div>

      {tab === "pages" ? <PagesTab toast={toast} /> : <QATab toast={toast} />}
    </div>
  );
}

// ─── Pages tab ───────────────────────────────────────────────────────────────

function PagesTab({ toast }: { toast: (msg: string, type?: "success" | "error" | "info") => void }) {
  const [items, setItems] = useState<AdminPageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [userFilter, setUserFilter] = useState("");
  const [userFilterInput, setUserFilterInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListPages({
        limit: PAGE_SIZE,
        offset,
        user_id: userFilter || undefined,
        status: statusFilter || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
      setSelected(new Set());
    } catch (err) {
      setError(errorMessage(err, "Không thể tải danh sách trang."));
    } finally {
      setLoading(false);
    }
  }, [offset, userFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [userFilter, statusFilter]);

  const onApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFilter(userFilterInput.trim());
  };

  const handleDelete = async (page: AdminPageItem) => {
    if (!window.confirm(`Xoá trang của ${page.username || page.user_id || "?"}? Bubble & bản dịch của trang này cũng sẽ bị xoá.`)) return;
    try {
      await adminDeletePage(page.page_id);
      toast("Đã xoá trang.", "success");
      await load();
    } catch (err) {
      toast(errorMessage(err, "Xoá trang thất bại."), "error");
    }
  };

  const handleBulk = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Xoá ${selected.size} trang đã chọn?`)) return;
    setBulkBusy(true);
    try {
      const res = await adminBulkDeletePages([...selected]);
      toast(`Xoá ${res.succeeded.length}/${selected.size} trang.`, res.failed.length ? "info" : "success");
      await load();
    } catch (err) {
      toast(errorMessage(err, "Bulk delete thất bại."), "error");
    } finally {
      setBulkBusy(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.page_id))));
  };

  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <div>
      <form onSubmit={onApplyFilters} style={{ display: "grid", gridTemplateColumns: "2fr 160px auto", gap: 10, marginBottom: 14 }}>
        <input
          value={userFilterInput}
          onChange={(e) => setUserFilterInput(e.target.value)}
          placeholder="Lọc theo user_id (UUID)…"
          className="stroke-ink"
          style={{ padding: "9px 12px", fontSize: 13, background: "var(--panel)", fontFamily: "var(--font-mono)" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="stroke-ink"
          style={{ padding: "9px 10px", fontSize: 12, background: "var(--panel)" }}
        >
          <option value="">Mọi trạng thái</option>
          <option value="pending">pending</option>
          <option value="ocr_running">ocr_running</option>
          <option value="ocr_failed">ocr_failed</option>
          <option value="translating">translating</option>
          <option value="translated">translated</option>
          <option value="completed">completed</option>
          <option value="failed">failed</option>
        </select>
        <button type="submit" className="btn btn-sm">
          Áp dụng
        </button>
      </form>

      {error && (
        <div className="stroke-ink" style={{ background: "var(--bg-2)", color: "var(--accent)", padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span className="caps-xs" style={{ color: "var(--muted)" }}>
          {loading ? "Đang tải…" : `${total.toLocaleString("vi-VN")} trang`}
          {selected.size > 0 && ` · đã chọn ${selected.size}`}
        </span>
        {selected.size > 0 && (
          <button className="btn btn-sm" style={{ background: "var(--accent)", color: "#fff" }} onClick={handleBulk} disabled={bulkBusy}>
            <Icon name="trash" size={12} /> Xoá {selected.size}
          </button>
        )}
      </div>

      <div className="stroke-ink" style={{ background: "var(--panel)", overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "32px 60px 1.6fr 1fr 110px 60px 160px",
            padding: "10px 14px",
            background: "var(--bg-2)",
            borderBottom: "2px solid var(--border)",
            alignItems: "center",
          }}
          className="caps-xs"
        >
          <input type="checkbox" checked={items.length > 0 && selected.size === items.length} onChange={toggleAll} />
          <span>Thumb</span>
          <span>Page ID</span>
          <span>Chủ sở hữu</span>
          <span>Trạng thái</span>
          <span>Trang #</span>
          <span>Hành động</span>
        </div>

        {items.length === 0 && !loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>Không có trang nào.</div>
        ) : (
          items.map((p, i) => (
            <div
              key={p.page_id}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 60px 1.6fr 1fr 110px 60px 160px",
                padding: "10px 14px",
                borderBottom: i < items.length - 1 ? "1px dashed var(--border-soft)" : "none",
                alignItems: "center",
                fontSize: 12,
                background: selected.has(p.page_id) ? "var(--bg-2)" : "transparent",
              }}
            >
              <input type="checkbox" checked={selected.has(p.page_id)} onChange={() => toggle(p.page_id)} />
              {p.thumbnail_url ? (
                <a href={p.original_image_url || p.thumbnail_url} target="_blank" rel="noreferrer">
                  <img
                    src={p.thumbnail_url}
                    alt=""
                    style={{ width: 42, height: 42, objectFit: "cover", border: "1.5px solid var(--border)" }}
                  />
                </a>
              ) : (
                <div style={{ width: 42, height: 42, background: "var(--bg-2)", border: "1.5px solid var(--border-soft)" }} />
              )}
              <div style={{ minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.page_id}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>{formatDateTime(p.uploaded_at)}</div>
              </div>
              <div style={{ minWidth: 0, fontSize: 12 }}>
                {p.user_id ? (
                  <Link href={`/admin/users/${p.user_id}`} style={{ color: "var(--fg)" }}>
                    {p.username || p.user_id.slice(0, 8)}
                  </Link>
                ) : (
                  <span style={{ color: "var(--muted)" }}>(không có owner)</span>
                )}
              </div>
              <span className="chip" style={{ fontSize: 10, padding: "1px 8px", justifySelf: "start" }}>
                {p.status}
              </span>
              <span className="mono" style={{ color: "var(--muted)" }}>
                {p.page_number ?? "—"}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {p.original_image_url && (
                  <a href={p.original_image_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" style={{ fontSize: 11 }}>
                    <Icon name="external" size={11} /> Mở
                  </a>
                )}
                <button className="btn btn-sm btn-ghost" style={{ color: "var(--accent)", fontSize: 11 }} onClick={() => handleDelete(p)}>
                  <Icon name="trash" size={11} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination offset={offset} total={total} pageSize={PAGE_SIZE} size={items.length} hasPrev={hasPrev} hasNext={hasNext} setOffset={setOffset} loading={loading} />
    </div>
  );
}

// ─── QA tab ───────────────────────────────────────────────────────────────────

function QATab({ toast }: { toast: (msg: string, type?: "success" | "error" | "info") => void }) {
  const [items, setItems] = useState<AdminQAItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [userFilter, setUserFilter] = useState("");
  const [userInput, setUserInput] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListQA({ limit: PAGE_SIZE, offset, user_id: userFilter || undefined });
      setItems(res.items);
      setTotal(res.total);
      setSelected(new Set());
    } catch (err) {
      setError(errorMessage(err, "Không thể tải Q&A."));
    } finally {
      setLoading(false);
    }
  }, [offset, userFilter]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setOffset(0);
  }, [userFilter]);

  const handleDelete = async (qa: AdminQAItem) => {
    if (!window.confirm("Xoá câu hỏi này?")) return;
    try {
      await adminDeleteQA(qa.qa_id);
      toast("Đã xoá Q&A.", "success");
      await load();
    } catch (err) {
      toast(errorMessage(err, "Xoá thất bại."), "error");
    }
  };

  const handleBulk = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Xoá ${selected.size} Q&A đã chọn?`)) return;
    try {
      const res = await adminBulkDeleteQA([...selected]);
      toast(`Xoá ${res.succeeded.length}/${selected.size} Q&A.`, res.failed.length ? "info" : "success");
      await load();
    } catch (err) {
      toast(errorMessage(err, "Bulk delete thất bại."), "error");
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.qa_id))));

  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setUserFilter(userInput.trim());
        }}
        style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 14 }}
      >
        <input
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Lọc theo user_id (UUID)…"
          className="stroke-ink"
          style={{ padding: "9px 12px", fontSize: 13, background: "var(--panel)", fontFamily: "var(--font-mono)" }}
        />
        <button type="submit" className="btn btn-sm">Lọc</button>
      </form>

      {error && (
        <div className="stroke-ink" style={{ background: "var(--bg-2)", color: "var(--accent)", padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span className="caps-xs" style={{ color: "var(--muted)" }}>
          {loading ? "Đang tải…" : `${total.toLocaleString("vi-VN")} câu hỏi`}
          {selected.size > 0 && ` · đã chọn ${selected.size}`}
        </span>
        {selected.size > 0 && (
          <button className="btn btn-sm" style={{ background: "var(--accent)", color: "#fff" }} onClick={handleBulk}>
            <Icon name="trash" size={12} /> Xoá {selected.size}
          </button>
        )}
      </div>

      <div className="stroke-ink" style={{ background: "var(--panel)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "32px 160px 1.5fr 1.5fr 160px 80px",
            padding: "10px 14px",
            background: "var(--bg-2)",
            borderBottom: "2px solid var(--border)",
            alignItems: "center",
          }}
          className="caps-xs"
        >
          <input type="checkbox" checked={items.length > 0 && selected.size === items.length} onChange={toggleAll} />
          <span>Người hỏi</span>
          <span>Câu hỏi</span>
          <span>Trả lời</span>
          <span>Hỏi lúc</span>
          <span>Hành động</span>
        </div>
        {items.length === 0 && !loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>Không có câu hỏi nào.</div>
        ) : (
          items.map((q, i) => (
            <div
              key={q.qa_id}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 160px 1.5fr 1.5fr 160px 80px",
                padding: "10px 14px",
                borderBottom: i < items.length - 1 ? "1px dashed var(--border-soft)" : "none",
                alignItems: "start",
                fontSize: 12,
                background: selected.has(q.qa_id) ? "var(--bg-2)" : "transparent",
              }}
            >
              <input type="checkbox" checked={selected.has(q.qa_id)} onChange={() => toggle(q.qa_id)} />
              <div style={{ minWidth: 0, fontSize: 11 }}>
                {q.user_id ? (
                  <Link href={`/admin/users/${q.user_id}`} style={{ color: "var(--fg)" }}>
                    {q.username || q.user_id.slice(0, 8)}
                  </Link>
                ) : (
                  <span style={{ color: "var(--muted)" }}>(không rõ)</span>
                )}
              </div>
              <span style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                {q.user_question}
              </span>
              <span style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", color: "var(--fg-soft)" }}>
                {q.ai_answer || "—"}
              </span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{formatDateTime(q.asked_at)}</span>
              <button className="btn btn-sm btn-ghost" style={{ color: "var(--accent)", fontSize: 11 }} onClick={() => handleDelete(q)}>
                <Icon name="trash" size={11} />
              </button>
            </div>
          ))
        )}
      </div>

      <Pagination offset={offset} total={total} pageSize={PAGE_SIZE} size={items.length} hasPrev={hasPrev} hasNext={hasNext} setOffset={setOffset} loading={loading} />
    </div>
  );
}

function Pagination({
  offset,
  total,
  pageSize,
  size,
  hasPrev,
  hasNext,
  setOffset,
  loading,
}: {
  offset: number;
  total: number;
  pageSize: number;
  size: number;
  hasPrev: boolean;
  hasNext: boolean;
  setOffset: (n: number) => void;
  loading: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, fontSize: 12, color: "var(--muted)" }}>
      <div>
        Hiển thị {size === 0 ? 0 : offset + 1}–{offset + size} / {total.toLocaleString("vi-VN")}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-sm btn-ghost" disabled={!hasPrev || loading} onClick={() => setOffset(Math.max(0, offset - pageSize))}>
          ← Trước
        </button>
        <button className="btn btn-sm btn-ghost" disabled={!hasNext || loading} onClick={() => setOffset(offset + pageSize)}>
          Tiếp →
        </button>
      </div>
    </div>
  );
}
