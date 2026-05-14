"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  AdminCreateUserPayload,
  AdminUserItem,
  UserRole,
  UserStatusFilter,
  adminBulkDeleteUsers,
  adminCreateUser,
  adminDeleteUser,
  adminListUsers,
  adminUpdateUserRole,
} from "@/lib/api";
import { errorMessage, formatDateTime } from "../_shared";

const PAGE_SIZE = 20;
type SortKey = "created_at" | "email" | "username" | "role" | "last_sign_in_at";

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [offset, setOffset] = useState(0);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<AdminCreateUserPayload>({
    email: "",
    password: "",
    username: "",
    role: "user",
    full_name: "",
    email_confirm: true,
  });
  const [createBusy, setCreateBusy] = useState(false);

  const sortParam = useMemo(() => `${sortKey}:${sortDir}`, [sortKey, sortDir]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListUsers({
        limit: PAGE_SIZE,
        offset,
        search: search || undefined,
        role: roleFilter,
        status: statusFilter,
        sort: sortParam,
      });
      setUsers(res.items);
      setTotal(res.total);
      setSelected((prev) => {
        const next = new Set<string>();
        for (const u of res.items) if (prev.has(u.id)) next.add(u.id);
        return next;
      });
    } catch (err) {
      setError(errorMessage(err, "Không thể tải danh sách người dùng."));
    } finally {
      setLoading(false);
    }
  }, [offset, search, roleFilter, statusFilter, sortParam]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset to page 0 when filter/search changes
  useEffect(() => {
    setOffset(0);
  }, [search, roleFilter, statusFilter, sortParam]);

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (prev.size === users.length) return new Set();
      return new Set(users.map((u) => u.id));
    });
  };

  const changeSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created_at" || key === "last_sign_in_at" ? "desc" : "asc");
    }
  };

  const handleRoleChange = async (target: AdminUserItem, role: UserRole) => {
    if (target.id === me?.id && role !== "admin") {
      toast("Không thể tự gỡ quyền của chính mình.", "error");
      return;
    }
    setBusyId(target.id);
    try {
      await adminUpdateUserRole(target.id, role);
      toast(
        role === "admin"
          ? `Đã cấp quyền admin cho ${target.username || target.email}.`
          : `Đã hạ quyền ${target.username || target.email} về user.`,
        "success",
      );
      await load();
    } catch (err) {
      toast(errorMessage(err, "Không cập nhật được quyền."), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (target: AdminUserItem) => {
    if (target.id === me?.id) {
      toast("Không thể tự xoá tài khoản của chính mình.", "error");
      return;
    }
    const label = target.username || target.email || target.id;
    if (!window.confirm(`Xoá vĩnh viễn người dùng "${label}"? Toàn bộ trang & Q&A của họ sẽ bị xoá.`)) return;

    setBusyId(target.id);
    try {
      await adminDeleteUser(target.id);
      toast(`Đã xoá "${label}".`, "success");
      await load();
    } catch (err) {
      toast(errorMessage(err, "Không xoá được người dùng."), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selected].filter((id) => id !== me?.id);
    if (ids.length === 0) {
      toast("Chưa chọn người dùng nào (tài khoản của bạn không thể tự xoá).", "info");
      return;
    }
    if (!window.confirm(`Xoá ${ids.length} người dùng được chọn? Hành động không thể hoàn tác.`)) return;

    setBulkBusy(true);
    try {
      const res = await adminBulkDeleteUsers(ids);
      toast(`Xoá ${res.succeeded.length}/${ids.length} người dùng.`, res.failed.length ? "info" : "success");
      setSelected(new Set());
      await load();
    } catch (err) {
      toast(errorMessage(err, "Bulk delete thất bại."), "error");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password || !createForm.username) {
      toast("Vui lòng điền đầy đủ email, mật khẩu và username.", "error");
      return;
    }
    setCreateBusy(true);
    try {
      const payload: AdminCreateUserPayload = {
        ...createForm,
        full_name: createForm.full_name?.trim() || null,
      };
      await adminCreateUser(payload);
      toast(`Đã tạo tài khoản "${createForm.username}" thành công.`, "success");
      setShowCreateModal(false);
      setCreateForm({ email: "", password: "", username: "", role: "user", full_name: "", email_confirm: true });
      await load();
    } catch (err) {
      toast(errorMessage(err, "Không thể tạo tài khoản."), "error");
    } finally {
      setCreateBusy(false);
    }
  };

  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;
  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  return (
    <div>
      <SectionHeader
        kanji="人"
        label="Admin · Người dùng"
        title="Quản lý người dùng"
        subtitle="Tìm kiếm, lọc, phân quyền, khoá, xoá tài khoản và xem chi tiết hoạt động."
        stamp="USERS"
      />

      <form
        onSubmit={applySearch}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 140px 160px auto",
          gap: 10,
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative" }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo email, username, tên hiển thị, ID…"
            className="stroke-ink"
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              fontSize: 13,
              background: "var(--panel)",
              fontFamily: "var(--font-sans)",
            }}
            aria-label="Tìm kiếm người dùng"
          />
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
            <Icon name="search" size={14} />
          </span>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
          className="stroke-ink"
          style={{ padding: "9px 10px", fontSize: 12, background: "var(--panel)" }}
          aria-label="Lọc theo quyền"
        >
          <option value="all">Mọi quyền</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as UserStatusFilter)}
          className="stroke-ink"
          style={{ padding: "9px 10px", fontSize: 12, background: "var(--panel)" }}
          aria-label="Lọc theo trạng thái"
        >
          <option value="all">Mọi trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="banned">Đang khoá</option>
          <option value="unverified">Chưa xác thực email</option>
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-sm">
            <Icon name="search" size={12} /> Tìm
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={load} disabled={loading}>
            <Icon name="refresh" size={12} /> Làm mới
          </button>
        </div>
      </form>

      {error && (
        <div className="stroke-ink" style={{ background: "var(--bg-2)", color: "var(--accent)", padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span className="caps-xs" style={{ color: "var(--muted)" }}>
          {loading ? "Đang tải…" : `${total.toLocaleString("vi-VN")} người dùng`}
          {selected.size > 0 && ` · đã chọn ${selected.size}`}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {selected.size > 0 && (
            <button className="btn btn-sm" style={{ background: "var(--accent)", color: "#fff" }} disabled={bulkBusy} onClick={handleBulkDelete}>
              <Icon name="trash" size={12} /> Xoá {selected.size}
            </button>
          )}
          <button className="btn btn-sm" style={{ background: "var(--fg)", color: "var(--bg)" }} onClick={() => setShowCreateModal(true)}>
            + Tạo tài khoản
          </button>
        </div>
      </div>

      <div className="stroke-ink" style={{ background: "var(--panel)", overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "32px 1.6fr 1.7fr 110px 80px 70px 70px 160px 160px",
            padding: "10px 14px",
            background: "var(--bg-2)",
            borderBottom: "2px solid var(--border)",
            alignItems: "center",
          }}
          className="caps-xs"
        >
          <input
            type="checkbox"
            checked={users.length > 0 && selected.size === users.length}
            onChange={toggleSelectAll}
            aria-label="Chọn tất cả"
          />
          <button onClick={() => changeSort("username")} className="caps-xs" style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", color: "inherit" }}>
            Người dùng{sortArrow("username")}
          </button>
          <button onClick={() => changeSort("email")} className="caps-xs" style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", color: "inherit" }}>
            Email{sortArrow("email")}
          </button>
          <button onClick={() => changeSort("role")} className="caps-xs" style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", color: "inherit" }}>
            Quyền{sortArrow("role")}
          </button>
          <span>Trạng thái</span>
          <span>Trang</span>
          <span>Q&amp;A</span>
          <button onClick={() => changeSort("last_sign_in_at")} className="caps-xs" style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", color: "inherit" }}>
            Đăng nhập gần nhất{sortArrow("last_sign_in_at")}
          </button>
          <span>Hành động</span>
        </div>

        {users.length === 0 && !loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>Không có người dùng phù hợp.</div>
        ) : (
          users.map((u, i) => {
            const isSelf = u.id === me?.id;
            const busy = busyId === u.id;
            const isBanned = !!u.banned_until && new Date(u.banned_until).getTime() > Date.now();
            return (
              <div
                key={u.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1.6fr 1.7fr 110px 80px 70px 70px 160px 160px",
                  padding: "12px 14px",
                  borderBottom: i < users.length - 1 ? "1px dashed var(--border-soft)" : "none",
                  alignItems: "center",
                  fontSize: 13,
                  opacity: busy ? 0.55 : 1,
                  background: selected.has(u.id) ? "var(--bg-2)" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() => toggleSelect(u.id)}
                  disabled={isSelf}
                  aria-label={`Chọn ${u.username || u.email}`}
                />
                <Link href={`/admin/users/${u.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: u.avatar_url ? undefined : (u.role === "admin" ? "var(--accent)" : "var(--bg-3)"),
                      backgroundImage: u.avatar_url ? `url(${u.avatar_url})` : undefined,
                      backgroundSize: "cover",
                      color: u.role === "admin" ? "#fff" : "var(--fg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-serif)",
                      fontWeight: 800,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {!u.avatar_url && (u.username?.[0] || u.email?.[0] || "?").toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.username || "—"}
                      {isSelf && <span className="chip" style={{ marginLeft: 8, padding: "1px 6px", fontSize: 10 }}>Bạn</span>}
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.id.slice(0, 8)}…
                    </div>
                  </div>
                </Link>
                <span style={{ color: "var(--fg-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>
                  {u.email || "—"}
                </span>
                <span
                  className="chip"
                  style={{
                    padding: "2px 10px",
                    fontSize: 10,
                    background: u.role === "admin" ? "var(--accent)" : "var(--bg-2)",
                    color: u.role === "admin" ? "#fff" : "var(--fg-soft)",
                    justifySelf: "start",
                  }}
                >
                  {u.role === "admin" ? "ADMIN" : "USER"}
                </span>
                <span style={{ fontSize: 11 }}>
                  {isBanned ? (
                    <span style={{ color: "var(--accent)" }}>Khoá</span>
                  ) : !u.email_confirmed ? (
                    <span style={{ color: "#B68900" }}>Chưa xác thực</span>
                  ) : (
                    <span style={{ color: "#1E8F4E" }}>Active</span>
                  )}
                </span>
                <span className="mono" style={{ color: "var(--muted)" }}>{u.pages_count}</span>
                <span className="mono" style={{ color: "var(--muted)" }}>{u.qa_count}</span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{formatDateTime(u.last_sign_in_at)}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <Link href={`/admin/users/${u.id}`}>
                    <button className="btn btn-sm btn-ghost" style={{ fontSize: 11 }}>
                      <Icon name="eye" size={11} /> Xem
                    </button>
                  </Link>
                  {u.role === "admin" ? (
                    <button className="btn btn-sm btn-ghost" disabled={busy || isSelf} onClick={() => handleRoleChange(u, "user")} style={{ fontSize: 11 }}>
                      User
                    </button>
                  ) : (
                    <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => handleRoleChange(u, "admin")} style={{ fontSize: 11 }}>
                      Admin
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-ghost"
                    disabled={busy || isSelf}
                    onClick={() => handleDelete(u)}
                    style={{ color: "var(--accent)", fontSize: 11 }}
                    title={isSelf ? "Không thể tự xoá" : "Xoá người dùng"}
                  >
                    <Icon name="trash" size={11} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, fontSize: 12, color: "var(--muted)" }}>
        <div>
          Hiển thị {users.length === 0 ? 0 : offset + 1}–{offset + users.length} / {total.toLocaleString("vi-VN")}
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

      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div
            className="stroke-ink"
            style={{
              background: "var(--panel)",
              width: "100%",
              maxWidth: 480,
              padding: "28px 28px 24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontFamily: "var(--font-serif)", fontWeight: 800 }}>
                Tạo tài khoản mới
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted)", lineHeight: 1 }}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="caps-xs" style={{ display: "block", marginBottom: 5, color: "var(--muted)" }}>
                  Email <span style={{ color: "var(--accent)" }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  className="stroke-ink"
                  style={{ width: "100%", padding: "9px 12px", fontSize: 13, background: "var(--bg)", fontFamily: "var(--font-sans)" }}
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="caps-xs" style={{ display: "block", marginBottom: 5, color: "var(--muted)" }}>
                  Mật khẩu <span style={{ color: "var(--accent)" }}>*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="stroke-ink"
                  style={{ width: "100%", padding: "9px 12px", fontSize: 13, background: "var(--bg)", fontFamily: "var(--font-sans)" }}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Tối thiểu 8 ký tự"
                />
              </div>

              <div>
                <label className="caps-xs" style={{ display: "block", marginBottom: 5, color: "var(--muted)" }}>
                  Username <span style={{ color: "var(--accent)" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={32}
                  autoComplete="off"
                  className="stroke-ink"
                  style={{ width: "100%", padding: "9px 12px", fontSize: 13, background: "var(--bg)", fontFamily: "var(--font-sans)" }}
                  value={createForm.username}
                  onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="Chữ cái, số, gạch dưới (3–32 ký tự)"
                />
              </div>

              <div>
                <label className="caps-xs" style={{ display: "block", marginBottom: 5, color: "var(--muted)" }}>
                  Họ tên đầy đủ
                </label>
                <input
                  type="text"
                  maxLength={120}
                  autoComplete="off"
                  className="stroke-ink"
                  style={{ width: "100%", padding: "9px 12px", fontSize: 13, background: "var(--bg)", fontFamily: "var(--font-sans)" }}
                  value={createForm.full_name ?? ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Không bắt buộc"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="caps-xs" style={{ display: "block", marginBottom: 5, color: "var(--muted)" }}>
                    Quyền
                  </label>
                  <select
                    className="stroke-ink"
                    style={{ width: "100%", padding: "9px 10px", fontSize: 13, background: "var(--bg)" }}
                    value={createForm.role}
                    onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as "user" | "admin" }))}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={createForm.email_confirm}
                      onChange={(e) => setCreateForm((f) => ({ ...f, email_confirm: e.target.checked }))}
                    />
                    <span>Xác nhận email ngay</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createBusy}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="btn btn-sm"
                  style={{ background: "var(--fg)", color: "var(--bg)", minWidth: 110 }}
                  disabled={createBusy}
                >
                  {createBusy ? "Đang tạo…" : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
