"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from "@/components/Animations";
import {
  adminListUsers,
  adminUpdateUserRole,
  adminDeleteUser,
  adminGetStats,
  APIError,
  AdminStats,
  AdminUserItem,
  UserRole,
} from "@/lib/api";

const PAGE_SIZE = 20;

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading, isAdmin } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      toast("Bạn không có quyền truy cập khu vực quản trị.", "error");
      router.replace("/");
    }
  }, [isAdmin, isLoading, router, toast]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, listRes] = await Promise.all([
        adminGetStats(),
        adminListUsers({ limit: PAGE_SIZE, offset }),
      ]);
      setStats(statsRes);
      setUsers(listRes.items);
      setTotal(listRes.total);
    } catch (err) {
      const msg =
        err instanceof APIError ? err.message :
        err instanceof Error ? err.message :
        "Không thể tải dữ liệu quản trị.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    if (isAdmin) {
      void loadData();
    }
  }, [isAdmin, loadData]);

  const handleRoleChange = async (target: AdminUserItem, newRole: UserRole) => {
    if (target.role === newRole) return;
    if (target.id === user?.id && newRole !== "admin") {
      toast("Không thể tự gỡ quyền quản trị của chính mình.", "error");
      return;
    }
    setBusyUserId(target.id);
    try {
      await adminUpdateUserRole(target.id, newRole);
      toast(
        newRole === "admin"
          ? `Đã cấp quyền admin cho ${target.username || target.email}.`
          : `Đã hạ quyền ${target.username || target.email} về user.`,
        "success",
      );
      await loadData();
    } catch (err) {
      const msg =
        err instanceof APIError ? err.message :
        err instanceof Error ? err.message :
        "Không cập nhật được quyền.";
      toast(msg, "error");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDelete = async (target: AdminUserItem) => {
    if (target.id === user?.id) {
      toast("Không thể tự xóa tài khoản của chính mình.", "error");
      return;
    }
    const label = target.username || target.email || target.id;
    const confirmed = window.confirm(
      `Xóa vĩnh viễn người dùng "${label}"?\nMọi trang truyện và lịch sử Q&A của họ cũng sẽ bị xóa.`,
    );
    if (!confirmed) return;

    setBusyUserId(target.id);
    try {
      await adminDeleteUser(target.id);
      toast(`Đã xóa người dùng "${label}".`, "success");
      await loadData();
    } catch (err) {
      const msg =
        err instanceof APIError ? err.message :
        err instanceof Error ? err.message :
        "Không xóa được người dùng.";
      toast(msg, "error");
    } finally {
      setBusyUserId(null);
    }
  };

  if (isLoading || !isAdmin) {
    return (
      <AnimatedPage>
        <div className="paper-grain" style={{ minHeight: "100vh" }}>
          <TopBar active="" />
          <div style={{ padding: 56, textAlign: "center", color: "var(--muted)" }}>
            Đang kiểm tra quyền truy cập…
          </div>
        </div>
      </AnimatedPage>
    );
  }

  const statCards: Array<{ label: string; value: number; icon: string }> = stats
    ? [
        { label: "Tổng người dùng", value: stats.total_users, icon: "user" },
        { label: "Quản trị viên", value: stats.total_admins, icon: "key" },
        { label: "Tổng trang đã upload", value: stats.total_pages, icon: "book" },
        { label: "Tổng câu hỏi Q&A", value: stats.total_qa, icon: "chat" },
      ]
    : [];

  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="admin" />
        <div style={{ padding: "40px 56px" }}>
          <FadeIn direction="up" distance={20} delay={0.1}>
            <SectionHeader
              kanji="管"
              label="Admin · Quản trị hệ thống"
              title="Quản lý người dùng"
              subtitle="Xem danh sách tài khoản, cấp/hạ quyền quản trị và xóa người dùng cùng toàn bộ dữ liệu của họ."
              stamp="ADMIN"
            />
          </FadeIn>

          {/* Stats */}
          {stats && (
            <StaggerContainer
              staggerDelay={0.06}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                marginBottom: 28,
              }}
            >
              {statCards.map((stat) => (
                <StaggerItem key={stat.label} direction="up" distance={12}>
                  <div
                    className="stroke-ink panel-shadow"
                    style={{
                      background: "var(--panel)",
                      padding: "16px 20px",
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                    }}
                  >
                    <Icon name={stat.icon} size={22} />
                    <div>
                      <div className="display" style={{ fontSize: 26, lineHeight: 1 }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                        {stat.label}
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}

          {/* Error banner */}
          {error && (
            <div
              className="stroke-ink"
              style={{
                background: "var(--bg-2)",
                color: "var(--accent)",
                padding: "10px 14px",
                marginBottom: 20,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div className="caps-xs" style={{ color: "var(--muted)" }}>
              {loading ? "Đang tải…" : `${total} người dùng`}
            </div>
            <button className="btn btn-sm btn-ghost" onClick={loadData} disabled={loading}>
              <Icon name="refresh" size={12} /> Làm mới
            </button>
          </div>

          {/* Users table */}
          <div className="stroke-ink" style={{ background: "var(--panel)", overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1.8fr 110px 90px 90px 170px 220px",
                padding: "10px 16px",
                background: "var(--bg-2)",
                borderBottom: "2px solid var(--border)",
              }}
              className="caps-xs"
            >
              <span>Người dùng</span>
              <span>Email</span>
              <span>Quyền</span>
              <span>Trang</span>
              <span>Q&amp;A</span>
              <span>Đăng nhập gần nhất</span>
              <span>Hành động</span>
            </div>

            {users.length === 0 && !loading ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
                Chưa có người dùng nào.
              </div>
            ) : (
              users.map((u, i) => {
                const isSelf = u.id === user?.id;
                const isBusy = busyUserId === u.id;
                return (
                  <div
                    key={u.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1.8fr 110px 90px 90px 170px 220px",
                      padding: "12px 16px",
                      borderBottom: i < users.length - 1 ? "1px dashed var(--border-soft)" : "none",
                      alignItems: "center",
                      fontSize: 13,
                      opacity: isBusy ? 0.55 : 1,
                      transition: "opacity 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: u.role === "admin" ? "var(--accent)" : "var(--bg-3)",
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
                        {(u.username?.[0] || u.email?.[0] || "?").toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {u.username || "—"}
                          {isSelf && (
                            <span
                              className="chip"
                              style={{ marginLeft: 8, padding: "1px 6px", fontSize: 10 }}
                            >
                              Bạn
                            </span>
                          )}
                        </div>
                        <div
                          className="mono"
                          style={{
                            fontSize: 10,
                            color: "var(--muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {u.id.slice(0, 8)}…
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        color: "var(--fg-soft)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingRight: 12,
                      }}
                    >
                      {u.email || "—"}
                    </span>

                    <span
                      className="chip"
                      style={{
                        padding: "2px 10px",
                        fontSize: 10,
                        background: u.role === "admin" ? "var(--accent)" : "var(--bg-2)",
                        color: u.role === "admin" ? "#fff" : "var(--fg-soft)",
                        borderColor: "var(--border)",
                        justifySelf: "start",
                      }}
                    >
                      {u.role === "admin" ? "ADMIN" : "USER"}
                    </span>

                    <span className="mono" style={{ color: "var(--muted)" }}>
                      {u.pages_count}
                    </span>
                    <span className="mono" style={{ color: "var(--muted)" }}>
                      {u.qa_count}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      {formatDate(u.last_sign_in_at)}
                    </span>

                    <div style={{ display: "flex", gap: 6 }}>
                      {u.role === "admin" ? (
                        <button
                          className="btn btn-sm btn-ghost"
                          disabled={isBusy || isSelf}
                          onClick={() => handleRoleChange(u, "user")}
                          title={isSelf ? "Không thể tự hạ quyền" : "Hạ quyền về user"}
                          style={{ fontSize: 11 }}
                        >
                          <Icon name="arrow-right" size={11} /> User
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm"
                          disabled={isBusy}
                          onClick={() => handleRoleChange(u, "admin")}
                          title="Cấp quyền admin"
                          style={{ fontSize: 11 }}
                        >
                          <Icon name="key" size={11} /> Admin
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-ghost"
                        disabled={isBusy || isSelf}
                        onClick={() => handleDelete(u)}
                        title={isSelf ? "Không thể tự xóa" : "Xóa người dùng"}
                        style={{ color: "var(--accent)", fontSize: 11 }}
                      >
                        <Icon name="trash" size={11} /> Xóa
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 16,
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            <div>
              Hiển thị {users.length === 0 ? 0 : offset + 1}–{offset + users.length} /{" "}
              {total}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-sm btn-ghost"
                disabled={!hasPrev || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                ← Trước
              </button>
              <button
                className="btn btn-sm btn-ghost"
                disabled={!hasNext || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Tiếp →
              </button>
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
