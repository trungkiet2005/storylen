"use client";
import React, { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import {
  useAuth,
  getAvatarInitial,
  getDisplayName,
  type ProfileUpdate,
  type User,
} from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem, ScaleIn } from "@/components/Animations";
import Cropper, { type Area } from "react-easy-crop";

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = url;
  });
}

const AVATAR_SIZE = 400;

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, AVATAR_SIZE, AVATAR_SIZE,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas empty"))), "image/webp", 0.92);
  });
}

function AvatarCropModal({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedArea) return;
    const blob = await getCroppedBlob(src, croppedArea);
    onConfirm(blob);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="stroke-ink panel-shadow"
        style={{ background: "var(--panel)", width: 400, maxWidth: "calc(100vw - 32px)", borderRadius: "var(--radius)" }}
      >
        <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid var(--border-soft)" }}>
          <div className="display" style={{ fontSize: 18 }}>Chỉnh avatar</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Kéo để chọn vùng, cuộn để zoom</div>
        </div>

        <div style={{ position: "relative", height: 320, background: "#111" }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div style={{ padding: "12px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--fg-soft)", whiteSpace: "nowrap" }}>Zoom</span>
            <input
              type="range" min={1} max={3} step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ flex: 1, accentColor: "var(--accent)" }}
            />
          </div>
        </div>

        <div style={{ padding: "0 20px 18px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <motion.button whileTap={{ scale: 0.95 }} className="btn btn-sm" onClick={onCancel}>
            Hủy
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} className="btn btn-sm btn-primary" onClick={handleConfirm}>
            Xác nhận
          </motion.button>
        </div>
      </div>
    </div>
  );
}

type TabId = "profile" | "preferences" | "security";

const LOCALES: Array<{ value: string; label: string }> = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" },
];

const TARGET_LANGS: Array<{ value: string; label: string }> = [
  { value: "VIN", label: "Tiếng Việt" },
  { value: "ENG", label: "English" },
  { value: "JPN", label: "日本語" },
  { value: "CHS", label: "中文 (简体)" },
  { value: "KOR", label: "한국어" },
];

const GENDERS: Array<{ value: NonNullable<User["gender"]>; label: string }> = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
  { value: "prefer_not_to_say", label: "Không muốn nói" },
];

const COMMON_TIMEZONES = [
  "Asia/Ho_Chi_Minh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

type FormState = {
  full_name: string;
  display_name: string;
  bio: string;
  locale: string;
  timezone: string;
  date_of_birth: string;
  gender: string;
  country: string;
  phone: string;
  preferred_target_lang: string;
};

function toFormState(user: User): FormState {
  return {
    full_name: user.full_name ?? "",
    display_name: user.display_name ?? "",
    bio: user.bio ?? "",
    locale: user.locale ?? "vi",
    timezone: user.timezone ?? "UTC",
    date_of_birth: user.date_of_birth ?? "",
    gender: user.gender ?? "",
    country: user.country ?? "",
    phone: user.phone ?? "",
    preferred_target_lang: user.preferred_target_lang ?? "VIN",
  };
}

export default function ProfilePage() {
  const { user, logout, updateProfile, uploadAvatar, removeAvatar } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [form, setForm] = useState<FormState | null>(() => (user ? toFormState(user) : null));
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep form synced when the user object changes (e.g. after avatar upload).
  React.useEffect(() => {
    if (user) setForm(toFormState(user));
  }, [user]);

  const initial = useMemo(() => (user ? getAvatarInitial(user) : "?"), [user]);
  const displayName = useMemo(() => (user ? getDisplayName(user) : ""), [user]);

  if (!user || !form) {
    return (
      <AnimatedPage>
        <div className="paper-grain" style={{ minHeight: "100vh" }}>
          <TopBar active="" />
          <div style={{ padding: "80px 40px", textAlign: "center" }}>
            <ScaleIn delay={0.2}>
              <div className="serif" style={{ fontSize: 48, color: "var(--accent)", marginBottom: 16 }}>🔒</div>
            </ScaleIn>
            <FadeIn direction="up" distance={15} delay={0.3}>
              <h1 className="display" style={{ fontSize: 32, marginBottom: 16 }}>Vui lòng đăng nhập</h1>
              <p style={{ color: "var(--fg-soft)", marginBottom: 28 }}>
                Bạn cần đăng nhập để truy cập trang hồ sơ.
              </p>
            </FadeIn>
            <FadeIn direction="up" distance={10} delay={0.4}>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <Link href="/login" passHref legacyBehavior>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-primary" style={{ padding: "12px 28px", display: "flex", gap: 8, alignItems: "center" }}>
                    Đăng nhập <Icon name="arrow-right" size={14} />
                  </motion.button>
                </Link>
                <Link href="/register" passHref legacyBehavior>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn" style={{ padding: "12px 28px" }}>Đăng ký</motion.button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  async function handleLogout() {
    await logout();
    toast("Đã đăng xuất. Hẹn gặp lại! 👋", "info");
    router.push("/");
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      const patch: ProfileUpdate = {
        full_name: form.full_name.trim() || null,
        display_name: form.display_name.trim() || null,
        bio: form.bio.trim() || null,
        locale: form.locale,
        timezone: form.timezone.trim() || "UTC",
        date_of_birth: form.date_of_birth || null,
        gender: (form.gender || null) as User["gender"],
        country: form.country.trim() || null,
        phone: form.phone.trim() || null,
        preferred_target_lang: form.preferred_target_lang,
      };
      await updateProfile(patch);
      toast("Đã lưu hồ sơ.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể lưu hồ sơ.";
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarFile(file: File) {
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.type)) {
      toast("Avatar phải là JPG, PNG hoặc WebP.", "error");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast("File không vượt quá 20 MB.", "error");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
  }

  async function handleCropConfirm(blob: Blob) {
    setCropSrc((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setAvatarBusy(true);
    try {
      const file = new File([blob], "avatar.webp", { type: "image/webp" });
      await uploadAvatar(file);
      toast("Đã cập nhật avatar.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Tải avatar thất bại.", "error");
    } finally {
      setAvatarBusy(false);
    }
  }

  function handleCropCancel() {
    setCropSrc((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
  }

  async function handleAvatarRemove() {
    setAvatarBusy(true);
    try {
      await removeAvatar();
      toast("Đã gỡ avatar.", "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Không thể gỡ avatar.", "error");
    } finally {
      setAvatarBusy(false);
    }
  }

  const tabs: Array<{ id: TabId; label: string; icon: string }> = [
    { id: "profile", label: "Hồ sơ", icon: "home" },
    { id: "preferences", label: "Tùy chọn", icon: "layers" },
    { id: "security", label: "Bảo mật", icon: "check" },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "2px solid var(--border)",
    background: "var(--bg-2)",
    color: "var(--fg)",
    fontSize: 14,
    fontFamily: "var(--font-sans)",
    borderRadius: "var(--radius-sm)",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    color: "var(--fg-soft)",
  };

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="" />

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
          <FadeIn direction="up" distance={15} delay={0.1}>
            <div style={{ marginBottom: 32 }}>
              <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 8 }}>
                HỒ SƠ
              </div>
              <h1 className="display" style={{ fontSize: 40 }}>Tài khoản của tôi</h1>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 28, alignItems: "start" }}>
            {/* ── Sidebar ── */}
            <div>
              <FadeIn direction="right" distance={20} delay={0.2}>
                <div
                  className="stroke-ink panel-shadow"
                  style={{ background: "var(--panel)", padding: 24, textAlign: "center", marginBottom: 16 }}
                >
                  <motion.div
                    initial={{ scale: 0.8, rotate: -5 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.3 }}
                    style={{
                      position: "relative",
                      width: 96, height: 96,
                      borderRadius: "50%",
                      background: user.avatar_url ? "transparent" : "var(--accent)",
                      backgroundImage: user.avatar_url ? `url(${user.avatar_url})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-serif)",
                      fontWeight: 800,
                      fontSize: 40,
                      margin: "0 auto 12px",
                      border: "3px solid var(--border)",
                      boxShadow: "3px 3px 0 0 var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    {!user.avatar_url && initial}
                  </motion.div>

                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleAvatarFile(file);
                        e.target.value = "";
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="btn btn-sm"
                      disabled={avatarBusy}
                      onClick={() => fileInputRef.current?.click()}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px" }}
                    >
                      <Icon name="upload" size={12} />
                      {avatarBusy ? "Đang xử lý..." : "Đổi ảnh"}
                    </motion.button>
                    {user.avatar_url && (
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="btn btn-sm"
                        disabled={avatarBusy}
                        onClick={handleAvatarRemove}
                        style={{ padding: "6px 12px", color: "var(--accent)", borderColor: "var(--accent)" }}
                      >
                        Gỡ
                      </motion.button>
                    )}
                  </div>

                  <div className="display" style={{ fontSize: 20, marginBottom: 4 }}>{displayName}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>@{user.username}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{user.email}</div>
                  <div className="chip" style={{ marginTop: 12, fontSize: 10 }}>
                    <span className="chip-dot" />
                    {user.role === "admin" ? "Quản trị" : "Người dùng"}
                  </div>
                </div>
              </FadeIn>

              <FadeIn direction="right" distance={20} delay={0.25}>
                <div className="stroke-ink" style={{ background: "var(--panel)", overflow: "hidden" }}>
                  {tabs.map(tab => (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      whileHover={{ background: activeTab === tab.id ? "var(--bg-2)" : "rgba(0,0,0,0.02)" }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        width: "100%",
                        padding: "13px 16px",
                        background: activeTab === tab.id ? "var(--bg-2)" : "none",
                        border: "none",
                        borderLeft: activeTab === tab.id ? "3px solid var(--accent)" : "3px solid transparent",
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        fontWeight: activeTab === tab.id ? 700 : 500,
                        color: activeTab === tab.id ? "var(--fg)" : "var(--fg-soft)",
                        textAlign: "left",
                        transition: "border-color 0.2s",
                      }}
                    >
                      <Icon name={tab.icon} size={14} />
                      {tab.label}
                    </motion.button>
                  ))}
                  <div style={{ height: 1, background: "var(--border-soft)" }} />
                  <motion.button
                    onClick={handleLogout}
                    whileHover={{ background: "rgba(200,16,46,0.06)" }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%",
                      padding: "13px 16px",
                      background: "none",
                      border: "none",
                      borderLeft: "3px solid transparent",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--accent)",
                      textAlign: "left",
                    }}
                  >
                    <Icon name="close" size={14} />
                    Đăng xuất
                  </motion.button>
                </div>
              </FadeIn>
            </div>

            {/* ── Main content ── */}
            <FadeIn direction="left" distance={20} delay={0.3}>
              <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: 28, minHeight: 400 }}>
                <AnimatePresence mode="wait">
                  {activeTab === "profile" && (
                    <motion.div
                      key="tab-profile"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <h2 className="display" style={{ fontSize: 24, marginBottom: 6 }}>Thông tin cá nhân</h2>
                      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
                        Các trường này hiển thị công khai dưới dạng tên gọi và avatar.
                      </p>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <label htmlFor="pf-fullname" className="caps-xs" style={labelStyle}>Họ và tên</label>
                          <input id="pf-fullname" type="text" maxLength={120}
                            value={form.full_name}
                            onChange={(e) => setField("full_name", e.target.value)}
                            style={inputStyle} placeholder="VD: Nguyễn Văn A" />
                        </div>
                        <div>
                          <label htmlFor="pf-display" className="caps-xs" style={labelStyle}>Tên hiển thị</label>
                          <input id="pf-display" type="text" maxLength={64}
                            value={form.display_name}
                            onChange={(e) => setField("display_name", e.target.value)}
                            style={inputStyle} placeholder="Tên hiển thị công khai" />
                        </div>

                        <div>
                          <label htmlFor="pf-username" className="caps-xs" style={labelStyle}>Tên đăng nhập</label>
                          <input id="pf-username" type="text" value={user.username} readOnly
                            style={{ ...inputStyle, opacity: 0.7, cursor: "not-allowed" }} />
                        </div>
                        <div>
                          <label htmlFor="pf-email" className="caps-xs" style={labelStyle}>Email</label>
                          <input id="pf-email" type="email" value={user.email} readOnly
                            style={{ ...inputStyle, opacity: 0.7, cursor: "not-allowed" }} />
                        </div>

                        <div>
                          <label htmlFor="pf-dob" className="caps-xs" style={labelStyle}>Ngày sinh</label>
                          <input id="pf-dob" type="date"
                            value={form.date_of_birth}
                            onChange={(e) => setField("date_of_birth", e.target.value)}
                            style={inputStyle} />
                        </div>
                        <div>
                          <label htmlFor="pf-gender" className="caps-xs" style={labelStyle}>Giới tính</label>
                          <select id="pf-gender"
                            value={form.gender}
                            onChange={(e) => setField("gender", e.target.value)}
                            style={inputStyle}>
                            <option value="">— Không chọn —</option>
                            {GENDERS.map((g) => (
                              <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="pf-country" className="caps-xs" style={labelStyle}>Quốc gia</label>
                          <input id="pf-country" type="text" maxLength={64}
                            value={form.country}
                            onChange={(e) => setField("country", e.target.value)}
                            style={inputStyle} placeholder="VD: Vietnam" />
                        </div>
                        <div>
                          <label htmlFor="pf-phone" className="caps-xs" style={labelStyle}>Số điện thoại</label>
                          <input id="pf-phone" type="tel" maxLength={32}
                            value={form.phone}
                            onChange={(e) => setField("phone", e.target.value)}
                            style={inputStyle} placeholder="+84..." />
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label htmlFor="pf-bio" className="caps-xs" style={labelStyle}>Giới thiệu</label>
                          <textarea id="pf-bio" rows={4} maxLength={500}
                            value={form.bio}
                            onChange={(e) => setField("bio", e.target.value)}
                            style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-sans)" }}
                            placeholder="Vài dòng giới thiệu bản thân..." />
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, textAlign: "right" }}>
                            {form.bio.length}/500
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="btn btn-primary"
                          style={{ padding: "10px 24px" }}
                          disabled={saving}
                          onClick={handleSave}
                        >
                          {saving ? "Đang lưu..." : "Lưu thay đổi"}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="btn"
                          style={{ padding: "10px 20px" }}
                          disabled={saving}
                          onClick={() => setForm(toFormState(user))}
                        >
                          Hoàn tác
                        </motion.button>
                      </div>

                      {/* Stats */}
                      <div style={{ marginTop: 36 }}>
                        <div className="caps-xs" style={{ color: "var(--muted)", marginBottom: 16 }}>THỐNG KÊ SỬ DỤNG</div>
                        <StaggerContainer>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                            {[
                              { label: "Trang đã dịch", value: "0", kanji: "P" },
                              { label: "Câu hỏi Q&A", value: "0", kanji: "Q" },
                              { label: "Batch upload", value: "0", kanji: "B" },
                            ].map(stat => (
                              <StaggerItem key={stat.label} direction="up" distance={10}>
                                <motion.div
                                  whileHover={{ y: -4, borderColor: "var(--accent)", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}
                                  style={{ padding: "14px", background: "var(--bg-2)", border: "1.5px solid var(--border-soft)", textAlign: "center", transition: "border-color 0.2s, y 0.2s" }}
                                >
                                  <div style={{ fontSize: 28, fontFamily: "var(--font-serif)", color: "var(--accent)", marginBottom: 4 }}>{stat.kanji}</div>
                                  <div className="display" style={{ fontSize: 22 }}>{stat.value}</div>
                                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{stat.label}</div>
                                </motion.div>
                              </StaggerItem>
                            ))}
                          </div>
                        </StaggerContainer>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "preferences" && (
                    <motion.div
                      key="tab-preferences"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <h2 className="display" style={{ fontSize: 24, marginBottom: 6 }}>Tùy chọn</h2>
                      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
                        Ngôn ngữ giao diện và mặc định dịch sẽ áp dụng cho mọi lần upload mới.
                      </p>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <label htmlFor="pf-locale" className="caps-xs" style={labelStyle}>Ngôn ngữ giao diện</label>
                          <select id="pf-locale" value={form.locale}
                            onChange={(e) => setField("locale", e.target.value)}
                            style={inputStyle}>
                            {LOCALES.map((l) => (
                              <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="pf-target" className="caps-xs" style={labelStyle}>Ngôn ngữ dịch mặc định</label>
                          <select id="pf-target" value={form.preferred_target_lang}
                            onChange={(e) => setField("preferred_target_lang", e.target.value)}
                            style={inputStyle}>
                            {TARGET_LANGS.map((l) => (
                              <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label htmlFor="pf-tz" className="caps-xs" style={labelStyle}>Múi giờ</label>
                          <input id="pf-tz" type="text" list="tz-list"
                            value={form.timezone}
                            onChange={(e) => setField("timezone", e.target.value)}
                            style={inputStyle} placeholder="VD: Asia/Ho_Chi_Minh" />
                          <datalist id="tz-list">
                            {COMMON_TIMEZONES.map((tz) => <option key={tz} value={tz} />)}
                          </datalist>
                        </div>
                      </div>

                      <div style={{ marginTop: 24 }}>
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="btn btn-primary"
                          style={{ padding: "10px 24px" }}
                          disabled={saving}
                          onClick={handleSave}
                        >
                          {saving ? "Đang lưu..." : "Lưu tùy chọn"}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "security" && (
                    <motion.div
                      key="tab-security"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <h2 className="display" style={{ fontSize: 24, marginBottom: 24 }}>Bảo mật</h2>
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div>
                          <label className="caps-xs" style={labelStyle}>Mật khẩu hiện tại</label>
                          <motion.input
                            whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 2px rgba(200,16,46,0.1)" }}
                            type="password"
                            placeholder="••••••••"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label className="caps-xs" style={labelStyle}>Mật khẩu mới</label>
                          <motion.input
                            whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 2px rgba(200,16,46,0.1)" }}
                            type="password"
                            placeholder="Tối thiểu 8 ký tự..."
                            style={inputStyle}
                          />
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="btn btn-primary"
                          style={{ alignSelf: "flex-start", padding: "10px 20px" }}
                          onClick={() => toast("Đổi mật khẩu sẽ khả dụng sớm!", "info")}
                        >
                          Đổi mật khẩu
                        </motion.button>

                        <motion.div
                          initial={{ scale: 0.98, opacity: 0.9 }}
                          whileHover={{ scale: 1, opacity: 1 }}
                          style={{ marginTop: 8, padding: "16px", background: "rgba(200,16,46,0.06)", border: "2px solid rgba(200,16,46,0.3)", borderRadius: "var(--radius-sm)", transition: "transform 0.2s" }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>Vùng nguy hiểm</div>
                          <div style={{ fontSize: 13, color: "var(--fg-soft)", marginBottom: 12 }}>Xóa tài khoản là hành động không thể hoàn tác. Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.</div>
                          <motion.button
                            whileHover={{ scale: 1.05, background: "rgba(200,16,46,0.1)" }}
                            whileTap={{ scale: 0.95 }}
                            className="btn btn-sm"
                            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                            onClick={() => toast("Tính năng xóa tài khoản cần xác nhận email. Sẽ được hỗ trợ sớm.", "error")}
                          >
                            Xóa tài khoản
                          </motion.button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
      {cropSrc && (
        <AvatarCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </AnimatedPage>
  );
}
