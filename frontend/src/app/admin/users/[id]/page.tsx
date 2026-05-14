"use client";

import React, { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  AdminProfilePatch,
  AdminUserDetail,
  adminBanUser,
  adminDeleteUser,
  adminGetUser,
  adminResendVerification,
  adminSendPasswordReset,
  adminUnbanUser,
  adminUpdateUserProfile,
  adminUpdateUserRole,
  adminUpgradePlan,
} from "@/lib/api";
import { errorMessage, formatDateTime } from "../../_shared";

const BAN_DURATIONS = [
  { label: "1 giờ", value: "1h" },
  { label: "24 giờ", value: "24h" },
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "Vĩnh viễn (~114 năm)", value: "999999h" },
];

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user: me } = useAuth();
  const { toast } = useToast();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<AdminProfilePatch>({});
  const [banDuration, setBanDuration] = useState("24h");
  const [banReason, setBanReason] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [planNote, setPlanNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const u = await adminGetUser(id);
      setUser(u);
      setForm({
        full_name: u.full_name,
        display_name: u.display_name,
        bio: u.bio,
        locale: u.locale ?? undefined,
        timezone: u.timezone ?? undefined,
        country: u.country,
        phone: u.phone,
        preferred_target_lang: u.preferred_target_lang ?? undefined,
      });
    } catch (err) {
      setError(errorMessage(err, "Không thể tải hồ sơ người dùng."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onField = <K extends keyof AdminProfilePatch>(key: K, value: AdminProfilePatch[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await adminUpdateUserProfile(id, form);
      setUser(updated);
      toast("Đã cập nhật hồ sơ.", "success");
    } catch (err) {
      toast(errorMessage(err, "Không cập nhật được hồ sơ."), "error");
    } finally {
      setBusy(false);
    }
  };

  const isSelf = me?.id === id;
  const isBanned = !!user?.banned_until && new Date(user.banned_until).getTime() > Date.now();

  const doUpgradePlan = async () => {
    if (!window.confirm(`Chuyển ${user?.email} sang gói ${selectedPlan.toUpperCase()}?`)) return;
    setBusy(true);
    try {
      const res = await adminUpgradePlan(id, selectedPlan, planNote || undefined);
      toast(res.message, "success");
      setPlanNote("");
      await load();
    } catch (err) {
      toast(errorMessage(err, "Nâng cấp gói thất bại."), "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = async () => {
    if (!user) return;
    if (isSelf && user.role === "admin") {
      toast("Không thể tự gỡ quyền admin của chính mình.", "error");
      return;
    }
    const next = user.role === "admin" ? "user" : "admin";
    setBusy(true);
    try {
      await adminUpdateUserRole(id, next);
      toast(next === "admin" ? "Đã cấp quyền admin." : "Đã hạ quyền về user.", "success");
      await load();
    } catch (err) {
      toast(errorMessage(err, "Đổi quyền thất bại."), "error");
    } finally {
      setBusy(false);
    }
  };

  const doBan = async () => {
    if (isSelf) {
      toast("Không thể tự khoá tài khoản của chính mình.", "error");
      return;
    }
    if (!window.confirm(`Khoá tài khoản ${user?.email} trong ${banDuration}?`)) return;
    setBusy(true);
    try {
      await adminBanUser(id, { duration: banDuration, reason: banReason || undefined });
      toast("Đã khoá tài khoản.", "success");
      setBanReason("");
      await load();
    } catch (err) {
      toast(errorMessage(err, "Khoá thất bại."), "error");
    } finally {
      setBusy(false);
    }
  };

  const doUnban = async () => {
    setBusy(true);
    try {
      await adminUnbanUser(id);
      toast("Đã mở khoá tài khoản.", "success");
      await load();
    } catch (err) {
      toast(errorMessage(err, "Mở khoá thất bại."), "error");
    } finally {
      setBusy(false);
    }
  };

  const doResetPassword = async () => {
    if (!window.confirm(`Gửi email đặt lại mật khẩu cho ${user?.email}?`)) return;
    setBusy(true);
    try {
      const res = await adminSendPasswordReset(id);
      toast(res.message, "success");
    } catch (err) {
      toast(errorMessage(err, "Gửi link thất bại."), "error");
    } finally {
      setBusy(false);
    }
  };

  const doResendVerification = async () => {
    setBusy(true);
    try {
      const res = await adminResendVerification(id);
      toast(res.message, "success");
    } catch (err) {
      toast(errorMessage(err, "Gửi email thất bại."), "error");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (isSelf) {
      toast("Không thể tự xoá tài khoản.", "error");
      return;
    }
    if (!window.confirm(`Xoá vĩnh viễn ${user?.email}? Toàn bộ dữ liệu của họ sẽ bị xoá theo.`)) return;
    setBusy(true);
    try {
      await adminDeleteUser(id);
      toast("Đã xoá người dùng.", "success");
      router.replace("/admin/users");
    } catch (err) {
      toast(errorMessage(err, "Xoá thất bại."), "error");
      setBusy(false);
    }
  };

  if (loading && !user) {
    return <div style={{ padding: 40, color: "var(--muted)" }}>Đang tải hồ sơ…</div>;
  }
  if (error && !user) {
    return (
      <div>
        <div className="stroke-ink" style={{ background: "var(--bg-2)", color: "var(--accent)", padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
        <Link href="/admin/users" className="btn btn-sm btn-ghost">
          <Icon name="arrow-left" size={12} /> Quay lại
        </Link>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link href="/admin/users" style={{ fontSize: 12, color: "var(--accent)" }}>
          ← Danh sách người dùng
        </Link>
      </div>

      <SectionHeader
        kanji="人"
        label="Admin · Chi tiết người dùng"
        title={user.username || user.email || user.id}
        subtitle={user.email || undefined}
        stamp={user.role === "admin" ? "ADMIN" : "USER"}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Identity card */}
        <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 20 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Thông tin tài khoản</h3>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: user.avatar_url ? undefined : (user.role === "admin" ? "var(--accent)" : "var(--bg-3)"),
                backgroundImage: user.avatar_url ? `url(${user.avatar_url})` : undefined,
                backgroundSize: "cover",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-serif)",
                fontWeight: 800,
                fontSize: 24,
                border: "2px solid var(--border)",
              }}
            >
              {!user.avatar_url && (user.username?.[0] || user.email?.[0] || "?").toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{user.id}</div>
              <div style={{ fontSize: 13 }}>{user.email}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <span className="chip" style={{ fontSize: 10, background: user.role === "admin" ? "var(--accent)" : "var(--bg-2)", color: user.role === "admin" ? "#fff" : "var(--fg-soft)" }}>
                  {user.role.toUpperCase()}
                </span>
                {isBanned && <span className="chip" style={{ fontSize: 10, background: "var(--accent)", color: "#fff" }}>ĐANG KHOÁ</span>}
                {!user.email_confirmed && <span className="chip" style={{ fontSize: 10 }}>CHƯA XÁC THỰC</span>}
              </div>
            </div>
          </div>

          <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 12px", fontSize: 12, margin: 0 }}>
            <dt style={{ color: "var(--muted)" }}>Tạo lúc</dt><dd style={{ margin: 0 }}>{formatDateTime(user.created_at)}</dd>
            <dt style={{ color: "var(--muted)" }}>Đăng nhập gần nhất</dt><dd style={{ margin: 0 }}>{formatDateTime(user.last_sign_in_at)}</dd>
            <dt style={{ color: "var(--muted)" }}>Hoạt động gần nhất</dt><dd style={{ margin: 0 }}>{formatDateTime(user.last_seen_at)}</dd>
            <dt style={{ color: "var(--muted)" }}>Xác thực email</dt><dd style={{ margin: 0 }}>{formatDateTime(user.email_confirmed_at)}</dd>
            <dt style={{ color: "var(--muted)" }}>Khoá đến</dt><dd style={{ margin: 0 }}>{formatDateTime(user.banned_until)}</dd>
          </dl>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
            <div className="stroke-ink" style={{ background: "var(--bg-2)", padding: 10, textAlign: "center" }}>
              <div className="display" style={{ fontSize: 20, lineHeight: 1 }}>{user.pages_count}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>Trang</div>
            </div>
            <div className="stroke-ink" style={{ background: "var(--bg-2)", padding: 10, textAlign: "center" }}>
              <div className="display" style={{ fontSize: 20, lineHeight: 1 }}>{user.qa_count}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>Q&amp;A</div>
            </div>
            <div className="stroke-ink" style={{ background: "var(--bg-2)", padding: 10, textAlign: "center" }}>
              <div className="display" style={{ fontSize: 20, lineHeight: 1 }}>{user.translations_count}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>Bản dịch</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 20 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Hành động quản trị</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn btn-sm" onClick={toggleRole} disabled={busy || (isSelf && user.role === "admin")}>
              <Icon name="key" size={12} />
              {user.role === "admin" ? "Hạ quyền về User" : "Cấp quyền Admin"}
            </button>

            {isBanned ? (
              <button className="btn btn-sm" onClick={doUnban} disabled={busy}>
                <Icon name="check" size={12} /> Mở khoá tài khoản
              </button>
            ) : (
              <div className="stroke-ink" style={{ padding: 10, background: "var(--bg-2)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Khoá tài khoản</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <select
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value)}
                    className="stroke-ink"
                    style={{ padding: 7, fontSize: 12, background: "var(--panel)" }}
                  >
                    {BAN_DURATIONS.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                  <input
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Lý do (tuỳ chọn)"
                    className="stroke-ink"
                    style={{ padding: 7, fontSize: 12, background: "var(--panel)" }}
                  />
                </div>
                <button className="btn btn-sm" style={{ background: "var(--accent)", color: "#fff" }} onClick={doBan} disabled={busy || isSelf}>
                  Khoá
                </button>
              </div>
            )}

            <button className="btn btn-sm btn-ghost" onClick={doResetPassword} disabled={busy || !user.email}>
              <Icon name="send" size={12} /> Gửi link đặt lại mật khẩu
            </button>
            {!user.email_confirmed && (
              <button className="btn btn-sm btn-ghost" onClick={doResendVerification} disabled={busy || !user.email}>
                <Icon name="send" size={12} /> Gửi lại email xác thực
              </button>
            )}

            <button
              className="btn btn-sm"
              style={{ background: "var(--accent)", color: "#fff", marginTop: 6 }}
              onClick={doDelete}
              disabled={busy || isSelf}
            >
              <Icon name="trash" size={12} /> Xoá tài khoản vĩnh viễn
            </button>
          </div>
        </div>
      </div>

      {/* Plan & Credits */}
      <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 20, marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Gói đăng ký & Credits</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
          <div className="stroke-ink" style={{ background: "var(--bg-2)", padding: "10px 16px", minWidth: 120 }}>
            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>GÓI HIỆN TẠI</div>
            <div style={{ fontWeight: 800, fontSize: 16, textTransform: "uppercase" }}>{user.plan_tier ?? "free"}</div>
          </div>
          <div className="stroke-ink" style={{ background: "var(--bg-2)", padding: "10px 16px", minWidth: 120 }}>
            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>SỐ DƯ CREDITS</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{user.credits_balance ?? 0}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Chuyển sang gói</span>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="stroke-ink"
              style={{ width: "100%", padding: 8, fontSize: 13, background: "var(--bg-2)" }}
            >
              {["free", "basic", "pro", "premium"].map((p) => (
                <option key={p} value={p}>{p.toUpperCase()}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Ghi chú (tuỳ chọn)</span>
            <input
              value={planNote}
              onChange={(e) => setPlanNote(e.target.value)}
              placeholder="VD: Thanh toán chuyển khoản tháng 5"
              className="stroke-ink"
              style={{ width: "100%", padding: 8, fontSize: 13, background: "var(--bg-2)" }}
            />
          </label>
          <button
            className="btn btn-sm btn-primary"
            onClick={doUpgradePlan}
            disabled={busy || selectedPlan === (user.plan_tier ?? "free")}
            style={{ whiteSpace: "nowrap" }}
          >
            Áp dụng gói
          </button>
        </div>
        {selectedPlan !== (user.plan_tier ?? "free") && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
            Credits tháng sẽ được cộng ngay vào tài khoản khi xác nhận.
          </div>
        )}
      </div>

      {/* Profile edit form */}
      <form onSubmit={saveProfile} className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 20 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Chỉnh sửa hồ sơ</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tên đầy đủ" value={form.full_name ?? ""} onChange={(v) => onField("full_name", v || null)} />
          <Field label="Display name" value={form.display_name ?? ""} onChange={(v) => onField("display_name", v || null)} />
          <Field label="Quốc gia" value={form.country ?? ""} onChange={(v) => onField("country", v || null)} />
          <Field label="Số điện thoại" value={form.phone ?? ""} onChange={(v) => onField("phone", v || null)} />
          <Field label="Locale" value={form.locale ?? ""} onChange={(v) => onField("locale", v || undefined)} placeholder="vi, en, ja…" />
          <Field label="Timezone" value={form.timezone ?? ""} onChange={(v) => onField("timezone", v || undefined)} />
          <Field
            label="Ngôn ngữ dịch ưa thích"
            value={form.preferred_target_lang ?? ""}
            onChange={(v) => onField("preferred_target_lang", v || undefined)}
            placeholder="VIN, ENG, JPN…"
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Bio</label>
          <textarea
            value={form.bio ?? ""}
            onChange={(e) => onField("bio", e.target.value || null)}
            className="stroke-ink"
            rows={3}
            style={{ width: "100%", padding: 8, fontSize: 13, background: "var(--bg-2)", fontFamily: "var(--font-sans)", resize: "vertical" }}
          />
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
            <Icon name="check" size={12} /> Lưu thay đổi
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={load} disabled={busy}>
            <Icon name="refresh" size={12} /> Reset
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="stroke-ink"
        style={{ width: "100%", padding: 8, fontSize: 13, background: "var(--bg-2)", fontFamily: "var(--font-sans)" }}
      />
    </label>
  );
}
