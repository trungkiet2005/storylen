"use client";
import React, { useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { SectionHeader } from '@/components/SectionHeader';
import { Icon } from '@/components/Icons';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedPage, FadeIn, ScaleIn, StaggerContainer, StaggerItem } from '@/components/Animations';

interface Series {
  kanji: string;
  title: string;
  jp: string;
  chapters: number;
  pages: number;
  progress: number;
  last: string;
  qaReady: boolean;
}

const ALL_SERIES: Series[] = [
  { kanji: "M", title: "Kiếm Nguyệt Ảnh",   jp: "Moonlight Blade",   chapters: 12, pages: 124, progress: 0.78, last: "2 giờ trước",    qaReady: true },
  { kanji: "S", title: "Bước Chân Mùa Xuân", jp: "Spring Whispers",   chapters: 4,  pages: 78,  progress: 0.42, last: "hôm qua",       qaReady: true },
  { kanji: "R", title: "Lời Thề Son Đỏ",     jp: "Red Vow",           chapters: 21, pages: 210, progress: 1.0,  last: "3 ngày trước", qaReady: true },
  { kanji: "S", title: "Biển Lặng",           jp: "Silent Sea",        chapters: 7,  pages: 56,  progress: 0.28, last: "1 tuần trước", qaReady: false },
  { kanji: "W", title: "Ký Ức Của Gió",       jp: "Wind Memories",     chapters: 9,  pages: 92,  progress: 0.64, last: "1 tuần trước", qaReady: true },
  { kanji: "S", title: "Bóng Của Người",       jp: "Shadow Person",     chapters: 15, pages: 150, progress: 0.12, last: "2 tuần trước", qaReady: false },
];

type Filter = "all" | "reading" | "done";
type ViewLayout = "grid" | "list";

export default function HistoryPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [layout, setLayout] = useState<ViewLayout>("grid");
  const [search, setSearch] = useState("");

  const filtered = ALL_SERIES.filter(s => {
    const matchesFilter =
      filter === "all" ? true :
      filter === "done" ? s.progress === 1.0 :
      filter === "reading" ? s.progress < 1.0 : true;
    const matchesSearch = search.trim() === "" ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.jp.includes(search);
    return matchesFilter && matchesSearch;
  });

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="history" />
        <div style={{ padding: "40px 56px" }}>
          <FadeIn direction="up" distance={20} delay={0.1}>
            <SectionHeader
              kanji="H"
              label="Lịch Sử · History"
              title="Bộ truyện đã đọc"
              subtitle="Tất cả truyện tranh bạn đã upload, dịch, và thảo luận với AI. Dữ liệu lưu trong session hoặc tài khoản."
              stamp="ARCHIVE"
            />
          </FadeIn>

          {/* Filter bar */}
          <FadeIn direction="up" distance={15} delay={0.2}>
            <div style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
              {/* Search */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "2px solid var(--border)", background: "var(--panel)", flex: 1, maxWidth: 360 }}>
                <Icon name="search" size={14}/>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo tên bộ truyện…"
                  style={{ border: "none", background: "transparent", flex: 1, fontSize: 13, outline: "none", color: "var(--fg)" }}
                  aria-label="Tìm kiếm bộ truyện"
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}>
                    <Icon name="x" size={13}/>
                  </button>
                )}
              </div>

              {/* Filter chips */}
              {(["all", "reading", "done"] as Filter[]).map(f => {
                const labels = { all: `Tất cả ${ALL_SERIES.length}`, reading: "Đang đọc", done: "Đã xong" };
                return (
                  <motion.button
                    key={f}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                  >
                    {labels[f]}
                  </motion.button>
                );
              })}

              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`btn btn-sm ${layout === "grid" ? "" : "btn-ghost"}`}
                  onClick={() => setLayout("grid")}
                  aria-label="Dạng lưới" aria-pressed={layout === "grid"}
                >
                  <Icon name="grid" size={14}/>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`btn btn-sm ${layout === "list" ? "" : "btn-ghost"}`}
                  onClick={() => setLayout("list")}
                  aria-label="Dạng danh sách" aria-pressed={layout === "list"}
                >
                  <Icon name="menu" size={14}/>
                </motion.button>
              </div>
            </div>
          </FadeIn>

          {/* Empty search result */}
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}
              >
                <div className="serif" style={{ fontSize: 48, opacity: 0.3 }}>∅</div>
                <div style={{ marginTop: 8 }}>Không tìm thấy bộ truyện nào phù hợp</div>
              </motion.div>
            ) : (
              <motion.div
                key={layout}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Grid layout */}
                {layout === "grid" && (
                  <StaggerContainer staggerDelay={0.06} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                    {filtered.map(s => (
                      <StaggerItem key={s.title} direction="up" distance={15}>
                        <motion.div
                          whileHover={{ y: -4, x: -2, boxShadow: "6px 6px 0 0 var(--border)" }}
                          className="stroke-ink panel-shadow"
                          style={{ background: "var(--panel)", overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s" }}
                        >
                          <div style={{ display: "flex" }}>
                            {/* Cover art */}
                            <div className="halftone-coarse" style={{ width: 120, height: 160, background: "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "2px solid var(--border)", color: "var(--ink)", flexShrink: 0 }}>
                              <span className="serif" style={{ fontSize: 80, color: "var(--accent)", fontWeight: 800, lineHeight: 1 }}>{s.kanji}</span>
                            </div>
                            {/* Info */}
                            <div style={{ flex: 1, padding: 14 }}>
                              <div className="serif" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{s.title}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.jp}</div>
                              <div style={{ display: "flex", gap: 10, marginTop: 10, fontSize: 11, color: "var(--fg-soft)" }}>
                                <span>📖 {s.chapters} chương</span>
                                <span>{s.pages} trang</span>
                              </div>
                              {/* Progress */}
                              <div style={{ marginTop: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>
                                  <span>Đã đọc</span>
                                  <span className="mono">{Math.round(s.progress * 100)}%</span>
                                </div>
                                <div style={{ height: 6, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${s.progress * 100}%` }}
                                    transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                                    style={{ height: "100%", background: s.progress === 1 ? "var(--jade)" : "var(--accent)" }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Footer */}
                          <div style={{ padding: "8px 14px", borderTop: "1px dashed var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                              <Icon name="clock" size={10}/> {s.last}
                            </span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {s.qaReady && (
                                <Link href="/qa" style={{ textDecoration: "none" }} onClick={e => e.stopPropagation()}>
                                  <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="chip" style={{ padding: "2px 8px", fontSize: 10, cursor: "pointer" }}>Q&amp;A</motion.span>
                                </Link>
                              )}
                              {s.progress === 1.0 && <span className="chip chip-accent" style={{ padding: "2px 8px", fontSize: 10 }}>✓ Xong</span>}
                              <Link href="/reader" style={{ textDecoration: "none" }} onClick={e => e.stopPropagation()}>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-sm" style={{ padding: "4px 10px", fontSize: 11 }}>
                                  <Icon name="book" size={12}/> Đọc
                                </motion.button>
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                )}

                {/* List layout */}
                {layout === "list" && (
                  <div className="stroke-ink" style={{ background: "var(--panel)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 120px 120px 100px 140px", padding: "10px 16px", background: "var(--bg-2)", borderBottom: "2px solid var(--border)" }} className="caps-xs">
                      <span/>
                      <span>Tên bộ truyện</span>
                      <span>Chương</span>
                      <span>Tiến độ</span>
                      <span>Cập nhật</span>
                      <span/>
                    </div>
                    <StaggerContainer staggerDelay={0.04}>
                      {filtered.map((s, i) => (
                        <StaggerItem key={s.title} direction="none">
                          <motion.div 
                            whileHover={{ background: "var(--bg-2)" }}
                            style={{ display: "grid", gridTemplateColumns: "52px 1fr 120px 120px 100px 140px", padding: "12px 16px", borderBottom: i < filtered.length - 1 ? "1px dashed var(--border-soft)" : "none", alignItems: "center", fontSize: 13, transition: "background 0.15s" }}
                          >
                            <span className="serif" style={{ fontSize: 24, color: "var(--accent)", fontWeight: 800 }}>{s.kanji}</span>
                            <div>
                              <div style={{ fontWeight: 600 }}>{s.title}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.jp}</div>
                            </div>
                            <span style={{ color: "var(--muted)", fontSize: 12 }}>{s.chapters} ch · {s.pages} tr</span>
                            <div>
                              <div style={{ height: 6, background: "var(--bg-2)", border: "1px solid var(--border)", marginBottom: 3 }}>
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${s.progress * 100}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                  style={{ height: "100%", background: s.progress === 1 ? "var(--jade)" : "var(--accent)" }}
                                />
                              </div>
                              <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{Math.round(s.progress * 100)}%</div>
                            </div>
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>{s.last}</span>
                            <div style={{ display: "flex", gap: 6 }}>
                              <Link href="/reader"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-sm"><Icon name="book" size={12}/> Đọc</motion.button></Link>
                              {s.qaReady && <Link href="/qa"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-sm btn-ghost"><Icon name="chat" size={12}/></motion.button></Link>}
                            </div>
                          </motion.div>
                        </StaggerItem>
                      ))}
                    </StaggerContainer>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats footer */}
          <StaggerContainer staggerDelay={0.08} style={{ marginTop: 28, display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { label: "Tổng bộ truyện", value: ALL_SERIES.length, icon: "stack" },
              { label: "Tổng trang đã dịch", value: ALL_SERIES.reduce((a, s) => a + s.pages, 0), icon: "book" },
              { label: "Hoàn thành", value: ALL_SERIES.filter(s => s.progress === 1).length, icon: "check" },
              { label: "Sẵn sàng Q&A", value: ALL_SERIES.filter(s => s.qaReady).length, icon: "sparkle" },
            ].map(stat => (
              <StaggerItem key={stat.label} direction="up" distance={12}>
                <motion.div 
                  whileHover={{ y: -2, boxShadow: "4px 4px 0 0 var(--border)" }}
                  className="stroke-ink" 
                  style={{ background: "var(--panel)", padding: "12px 20px", display: "flex", gap: 12, alignItems: "center", transition: "box-shadow 0.2s" }}
                >
                  <Icon name={stat.icon} size={18}/>
                  <div>
                    <div className="display" style={{ fontSize: 22, lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{stat.label}</div>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </AnimatedPage>
  );
}
