"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth, getAvatarInitial } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem, ScaleIn } from "@/components/Animations";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "settings" | "security">("profile");

  // Redirect if not logged in
  if (!user) {
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

  const initial = getAvatarInitial(user);

  async function handleLogout() {
    await logout();
    toast("Đã đăng xuất. Hẹn gặp lại! 👋", "info");
    router.push("/");
  }

  const tabs = [
    { id: "profile" as const, label: "Hồ sơ", icon: "home" },
    { id: "settings" as const, label: "Cài đặt", icon: "layers" },
    { id: "security" as const, label: "Bảo mật", icon: "check" },
  ];

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="" />

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
          {/* Page header */}
          <FadeIn direction="up" distance={15} delay={0.1}>
            <div style={{ marginBottom: 32 }}>
              <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 8 }}>
                HỒ SƠ
              </div>
              <h1 className="display" style={{ fontSize: 40 }}>Tài khoản của tôi</h1>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 28, alignItems: "start" }}>
            {/* ── Sidebar ── */}
            <div>
              {/* Avatar card */}
              <FadeIn direction="right" distance={20} delay={0.2}>
                <div
                  className="stroke-ink panel-shadow"
                  style={{ background: "var(--panel)", padding: 24, textAlign: "center", marginBottom: 16 }}
                >
                  {/* Big avatar */}
                  <motion.div
                    initial={{ scale: 0.8, rotate: -5 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.3 }}
                    style={{
                      width: 80, height: 80,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-serif)",
                      fontWeight: 800,
                      fontSize: 36,
                      margin: "0 auto 16px",
                      border: "3px solid var(--border)",
                      boxShadow: "3px 3px 0 0 var(--border)",
                    }}
                  >
                    {initial}
                  </motion.div>
                  <div className="display" style={{ fontSize: 20, marginBottom: 4 }}>{user.username}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{user.email}</div>
                  <div className="chip" style={{ marginTop: 12, fontSize: 10 }}>
                    <span className="chip-dot" />
                    Người dùng
                  </div>
                </div>
              </FadeIn>

              {/* Nav tabs */}
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
                      <h2 className="display" style={{ fontSize: 24, marginBottom: 24 }}>Thông tin cá nhân</h2>
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {[
                          { label: "Tên đăng nhập", value: user.username, id: "pf-username", type: "text" },
                          { label: "Email", value: user.email, id: "pf-email", type: "email" },
                        ].map(field => (
                          <div key={field.id}>
                            <label htmlFor={field.id} className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                              {field.label}
                            </label>
                            <motion.input
                              whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 2px rgba(200,16,46,0.1)" }}
                              id={field.id}
                              type={field.type}
                              defaultValue={field.value}
                              style={{
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
                                transition: "border-color 0.2s, box-shadow 0.2s"
                              }}
                            />
                          </div>
                        ))}
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="btn btn-primary"
                          style={{ alignSelf: "flex-start", padding: "10px 20px" }}
                          onClick={() => toast("Tính năng cập nhật hồ sơ sẽ sớm khả dụng!", "info")}
                        >
                          Lưu thay đổi
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

                  {activeTab === "settings" && (
                    <motion.div
                      key="tab-settings"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <h2 className="display" style={{ fontSize: 24, marginBottom: 24 }}>Cài đặt</h2>
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {[
                          { label: "Ngôn ngữ dịch mặc định", desc: "Chọn ngôn ngữ đích cho bản dịch truyện", value: "Tiếng Việt" },
                          { label: "Số trang mỗi batch", desc: "Giới hạn số trang xử lý trong một lần", value: "10" },
                          { label: "Chất lượng OCR", desc: "Cân bằng giữa tốc độ và độ chính xác", value: "Cao" },
                        ].map(setting => (
                          <div key={setting.label} style={{ padding: "16px", background: "var(--bg-2)", border: "1.5px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>{setting.label}</div>
                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{setting.desc}</div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="btn btn-sm"
                              onClick={() => toast("Cài đặt sẽ khả dụng sớm!", "info")}
                            >
                              {setting.value}
                            </motion.button>
                          </div>
                        ))}
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
                          <label className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                            Mật khẩu hiện tại
                          </label>
                          <motion.input 
                            whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 2px rgba(200,16,46,0.1)" }}
                            type="password" 
                            placeholder="••••••••" 
                            style={{ width: "100%", padding: "10px 14px", border: "2px solid var(--border)", background: "var(--bg-2)", color: "var(--fg)", fontSize: 14, fontFamily: "var(--font-sans)", borderRadius: "var(--radius-sm)", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s" }} 
                          />
                        </div>
                        <div>
                          <label className="caps-xs" style={{ display: "block", marginBottom: 6, color: "var(--fg-soft)" }}>
                            Mật khẩu mới
                          </label>
                          <motion.input 
                            whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 2px rgba(200,16,46,0.1)" }}
                            type="password" 
                            placeholder="Tối thiểu 8 ký tự..." 
                            style={{ width: "100%", padding: "10px 14px", border: "2px solid var(--border)", background: "var(--bg-2)", color: "var(--fg)", fontSize: 14, fontFamily: "var(--font-sans)", borderRadius: "var(--radius-sm)", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s" }} 
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
    </AnimatedPage>
  );
}
