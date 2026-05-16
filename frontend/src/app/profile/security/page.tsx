"use client";

import React, { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";
import {
  changePassword,
  changeEmail,
  deleteAccount,
  exportUserDataUrl,
} from "@/lib/api";

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 24, borderRadius: "var(--radius)", marginBottom: 20 }}>
      <h2 className="display" style={{ fontSize: 20, marginBottom: 6 }}>{title}</h2>
      {desc && <p style={{ fontSize: 13, color: "var(--fg-soft)", marginBottom: 18, lineHeight: 1.6 }}>{desc}</p>}
      {children}
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "2px solid var(--border)",
  background: "var(--panel)",
  color: "var(--fg)",
  fontSize: 14,
  borderRadius: "var(--radius-sm)",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  color: "var(--fg-soft)",
};

export default function SecurityPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { toast } = useToast();

  const [pwCur, setPwCur] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [delPw, setDelPw] = useState("");
  const [delConfirm, setDelConfirm] = useState("");
  const [delLoading, setDelLoading] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  if (isLoading) return null;
  if (!user) {
    if (typeof window !== "undefined") router.replace("/login");
    return null;
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwLoading(true);
    try {
      const res = await changePassword(pwCur, pwNew);
      toast(res.message, "success");
      setPwCur(""); setPwNew("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Có lỗi xảy ra.", "error");
    } finally {
      setPwLoading(false);
    }
  }

  async function onChangeEmail(e: FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    try {
      const res = await changeEmail(newEmail.trim().toLowerCase(), emailPw);
      toast(res.message, "success");
      setNewEmail(""); setEmailPw("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Có lỗi xảy ra.", "error");
    } finally {
      setEmailLoading(false);
    }
  }

  async function onDelete(e: FormEvent) {
    e.preventDefault();
    setDelLoading(true);
    try {
      await deleteAccount(delPw, delConfirm);
      toast("Tài khoản đã được xoá. Tạm biệt!", "success");
      await logout();
      router.replace("/");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Có lỗi xảy ra.", "error");
    } finally {
      setDelLoading(false);
    }
  }

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/profile" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>← Hồ sơ</Link>
          <h1 className="display" style={{ fontSize: 32, marginTop: 8 }}>Bảo mật & Tài khoản</h1>
          <p style={{ fontSize: 14, color: "var(--fg-soft)" }}>Quản lý mật khẩu, email, dữ liệu cá nhân và quyền xoá tài khoản.</p>
        </div>

        <Card title="Đổi mật khẩu" desc="Khuyến nghị dùng mật khẩu mạnh, tối thiểu 8 ký tự.">
          <form onSubmit={onChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="caps-xs" style={labelStyle}>Mật khẩu hiện tại</label>
              <input type="password" required minLength={8} value={pwCur} onChange={(e) => setPwCur(e.target.value)} style={inputStyle} disabled={pwLoading} />
            </div>
            <div>
              <label className="caps-xs" style={labelStyle}>Mật khẩu mới</label>
              <input type="password" required minLength={8} value={pwNew} onChange={(e) => setPwNew(e.target.value)} style={inputStyle} disabled={pwLoading} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={pwLoading || !pwCur || !pwNew} style={{ alignSelf: "flex-start" }}>
              {pwLoading ? "Đang lưu..." : "Đổi mật khẩu"}
            </button>
          </form>
        </Card>

        <Card title="Đổi email" desc={`Email hiện tại: ${user.email}. Sau khi xác nhận, bạn cần nhấn vào liên kết được gửi đến email mới để hoàn tất.`}>
          <form onSubmit={onChangeEmail} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="caps-xs" style={labelStyle}>Email mới</label>
              <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={inputStyle} disabled={emailLoading} />
            </div>
            <div>
              <label className="caps-xs" style={labelStyle}>Mật khẩu hiện tại để xác minh</label>
              <input type="password" required minLength={8} value={emailPw} onChange={(e) => setEmailPw(e.target.value)} style={inputStyle} disabled={emailLoading} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={emailLoading || !newEmail || !emailPw} style={{ alignSelf: "flex-start" }}>
              {emailLoading ? "Đang gửi..." : "Gửi xác nhận"}
            </button>
          </form>
        </Card>

        <Card title="Tải về dữ liệu cá nhân" desc="Tải toàn bộ dữ liệu chúng tôi lưu về bạn dưới dạng JSON (theo quy định GDPR).">
          <a href={exportUserDataUrl()} download className="btn btn-secondary" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <Icon name="download" size={14} /> Tải dữ liệu (.json)
          </a>
        </Card>

        <Card title="Xoá tài khoản vĩnh viễn" desc="Thao tác này không thể hoàn tác. Mọi truyện đã upload, lịch sử dịch, bookmark, và credits sẽ bị xoá.">
          {!delOpen ? (
            <button type="button" onClick={() => setDelOpen(true)} className="btn btn-secondary" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
              Tôi muốn xoá tài khoản
            </button>
          ) : (
            <form onSubmit={onDelete} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: 12, background: "rgba(200,16,46,0.06)", border: "2px solid var(--accent)", color: "var(--accent)", fontSize: 13, lineHeight: 1.5 }}>
                <strong>Cảnh báo:</strong> Tài khoản và toàn bộ dữ liệu sẽ bị xoá vĩnh viễn ngay lập tức.
              </div>
              <div>
                <label className="caps-xs" style={labelStyle}>Mật khẩu để xác minh</label>
                <input type="password" required minLength={8} value={delPw} onChange={(e) => setDelPw(e.target.value)} style={inputStyle} disabled={delLoading} />
              </div>
              <div>
                <label className="caps-xs" style={labelStyle}>
                  Gõ chính xác <code style={{ background: "var(--bg-2)", padding: "2px 6px" }}>XÓA TÀI KHOẢN</code> để xác nhận
                </label>
                <input type="text" required value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} style={inputStyle} disabled={delLoading} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={delLoading || delConfirm !== "XÓA TÀI KHOẢN"} style={{ background: "var(--accent)", color: "#fff" }}>
                  {delLoading ? "Đang xoá..." : "Xoá vĩnh viễn"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setDelOpen(false)} disabled={delLoading}>
                  Huỷ
                </button>
              </div>
            </form>
          )}
        </Card>
      </main>
      <Footer />
    </>
  );
}
