"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { SectionHeader } from "@/components/SectionHeader";
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from "@/components/Animations";
import { useWibu, ACHIEVEMENTS } from "@/contexts/WibuContext";
import { type ReadingStats } from "@/lib/localStore";

// ── Goal card (today / week) ────────────────────────────────────────────────
function GoalCard({
  label,
  iconName,
  pages,
  target,
  onChange,
  unitLabel,
  reachedMessage,
  pendingMessage,
  inputMax = 500,
}: {
  label: string;
  iconName: string;
  pages: number;
  target: number;
  onChange: (t: number) => void;
  unitLabel: string;
  reachedMessage: string;
  pendingMessage: (remaining: number) => string;
  inputMax?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(target));
  const pct = target > 0 ? Math.min(100, Math.round((pages / target) * 100)) : 0;
  const reached = pages >= target && target > 0;

  const commit = () => {
    const n = Math.max(1, Math.min(inputMax, parseInt(draft, 10) || target));
    onChange(n);
    setEditing(false);
  };

  return (
    <div
      className="stroke-ink panel-shadow"
      style={{ background: "var(--panel)", padding: "18px 24px" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name={iconName} size={16} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg)" }}>
            {label}
          </span>
          {reached && (
            <span
              className="chip"
              style={{ background: "var(--jade)", color: "#fff", border: "none", fontSize: 10, padding: "2px 8px", fontWeight: 800, letterSpacing: "0.05em" }}
            >
              ĐẠT ✓
            </span>
          )}
        </div>
        {editing ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="number"
              min={1}
              max={inputMax}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
              autoFocus
              style={{
                width: 64, padding: "4px 6px", fontSize: 13,
                border: "1.5px solid var(--border)", background: "var(--bg-2)",
                color: "var(--fg)", outline: "none", fontFamily: "var(--font-mono)",
              }}
            />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{unitLabel}</span>
            <button onClick={commit} className="btn btn-sm btn-primary" style={{ padding: "3px 8px", fontSize: 11 }}>
              <Icon name="check" size={11} />
            </button>
            <button onClick={() => { setEditing(false); setDraft(String(target)); }} className="btn btn-sm btn-ghost" style={{ padding: "3px 8px", fontSize: 11 }}>
              <Icon name="x" size={11} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setDraft(String(target)); setEditing(true); }}
            className="btn btn-sm btn-ghost"
            style={{ fontSize: 11, padding: "3px 8px" }}
          >
            <Icon name="settings" size={11} /> Đổi mục tiêu
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span className="display" style={{ fontSize: 32, color: reached ? "var(--jade)" : "var(--accent)" }}>{pages}</span>
        <span style={{ fontSize: 14, color: "var(--muted)" }}>/ {target} trang</span>
        <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, color: reached ? "var(--jade)" : "var(--muted)" }}>{pct}%</span>
      </div>

      <div style={{ height: 8, background: "var(--bg-2)", border: "1px solid var(--border-soft)", borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ height: "100%", background: reached ? "var(--jade)" : "var(--accent)" }}
        />
      </div>

      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
        {reached ? reachedMessage : pendingMessage(Math.max(0, target - pages))}
      </div>
    </div>
  );
}

// Last 30 days for the heatmap
function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function StatCard({ label, value, unit, icon, color = "var(--accent)" }: {
  label: string; value: string | number; unit?: string; icon: string; color?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "6px 6px 0 0 var(--border)" }}
      className="stroke-ink panel-shadow"
      style={{ background: "var(--panel)", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, color }}>
        <Icon name={icon} size={18} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="display" style={{ fontSize: 40, color }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: "var(--muted)" }}>{unit}</span>}
      </div>
    </motion.div>
  );
}

function ActivityHeatmap({ dailyHistory }: { dailyHistory: Record<string, number> }) {
  const days = getLast30Days();
  const max = Math.max(...days.map(d => dailyHistory[d] ?? 0), 1);

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
        Hoạt động 30 ngày qua
      </div>
      <div className="heatmap-row" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {days.map(day => {
          const count = dailyHistory[day] ?? 0;
          const intensity = count === 0 ? 0 : Math.max(0.15, count / max);
          return (
            <motion.div
              key={day}
              title={`${day}: ${count} trang`}
              whileHover={{ scale: 1.3 }}
              style={{
                width: 18, height: 18,
                background: count === 0 ? "var(--bg-2)" : `rgba(200,16,46,${intensity})`,
                border: "1px solid var(--border-soft)",
                borderRadius: 2,
                cursor: "default",
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "center", fontSize: 10, color: "var(--muted)" }}>
        <span>Ít</span>
        {[0.15, 0.35, 0.6, 0.85, 1].map(v => (
          <div key={v} style={{ width: 14, height: 14, background: `rgba(200,16,46,${v})`, borderRadius: 2 }} />
        ))}
        <span>Nhiều</span>
      </div>
    </div>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  const tiers = [
    { min: 30, label: "Truyện Thần", icon: "trophy", color: "#b58a3b" },
    { min: 14, label: "Wibu Cháy", icon: "fire", color: "#e04156" },
    { min: 7,  label: "Thành Viên Nhiệt", icon: "star", color: "#3f6b5a" },
    { min: 3,  label: "Đang Vào Guồng", icon: "zap", color: "var(--accent)" },
    { min: 1,  label: "Mới Bắt Đầu", icon: "book", color: "var(--muted)" },
    { min: 0,  label: "Chưa Đọc Hôm Nay", icon: "clock", color: "var(--muted)" },
  ];
  const tier = tiers.find(t => streak >= t.min) ?? tiers[tiers.length - 1];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 48, height: 48,
        borderRadius: "50%",
        background: tier.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", boxShadow: `0 0 0 3px ${tier.color}33`,
      }}>
        <Icon name={tier.icon} size={22} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: tier.color }}>{tier.label}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{streak} ngày liên tiếp</div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { stats, refreshStats, bookmarks, allProgress, goals, setGoals, todayPages, weekPages, unlockedAchievements, level } = useWibu();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    refreshStats();
  }, [refreshStats]);

  const hours = Math.floor(stats.totalMinutesRead / 60);
  const mins = stats.totalMinutesRead % 60;
  const timeStr = hours > 0 ? `${hours}g ${mins}p` : `${mins}p`;
  const avgPerDay = stats.totalPagesRead > 0
    ? (stats.totalPagesRead / Math.max(1, Object.keys(stats.dailyHistory).length)).toFixed(1)
    : "0";

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="stats" />
        <div className="page-shell">
          <FadeIn direction="up" distance={20} delay={0.1}>
            <SectionHeader
              kanji="統"
              label="Thống Kê · Reading Stats"
              title="Hành trình đọc truyện của bạn"
              subtitle="Theo dõi tiến độ, streak và thói quen đọc của bản thân."
              stamp="STATS"
            />
          </FadeIn>

          {!mounted ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
              <Icon name="refresh" size={24} />
            </div>
          ) : (
            <>
              {/* Level / rank card */}
              <FadeIn direction="up" distance={15} delay={0.12}>
                <div
                  className="stroke-ink panel-shadow"
                  style={{
                    background: "linear-gradient(135deg, var(--panel) 0%, var(--bg-2) 100%)",
                    padding: "20px 24px",
                    marginBottom: 24,
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: 18,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 72, height: 72,
                      border: "3px solid var(--border)",
                      background: "var(--accent)",
                      color: "#fff",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "4px 4px 0 var(--border)",
                    }}
                  >
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.85 }}>LV</div>
                    <div className="display" style={{ fontSize: 26, lineHeight: 1, color: "#fff" }}>{level.level}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span className="display" style={{ fontSize: 22, color: "var(--fg)" }}>{level.rank}</span>
                      <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                        {level.xp.toLocaleString("vi-VN")} XP
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div style={{ flex: 1, height: 10, background: "var(--bg-2)", border: "1px solid var(--border-soft)", borderRadius: 2, overflow: "hidden" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round(level.pctToNext * 100)}%` }}
                          transition={{ duration: 0.9, ease: "easeOut" }}
                          style={{
                            height: "100%",
                            background: "linear-gradient(90deg, var(--accent), var(--gold))",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted)", fontWeight: 700, minWidth: 60, textAlign: "right" }}>
                        {level.xpInLevel}/{level.xpToNext}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      Còn <strong style={{ color: "var(--fg)" }}>{Math.max(0, level.xpToNext - level.xpInLevel).toLocaleString("vi-VN")}</strong> XP để lên cấp {level.level + 1}. XP = trang × 10 + phút × 2 + bookmark × 5.
                    </div>
                  </div>
                </div>
              </FadeIn>

              {/* Goals: daily + weekly */}
              <FadeIn direction="up" distance={15} delay={0.13}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 16, marginBottom: 24 }}>
                  <GoalCard
                    label="Mục tiêu hôm nay"
                    iconName="zap"
                    pages={todayPages}
                    target={goals.dailyPages}
                    onChange={t => setGoals({ ...goals, dailyPages: t })}
                    unitLabel="trang/ngày"
                    inputMax={500}
                    reachedMessage="Đã đạt mục tiêu hôm nay. Vẫn còn đà, đọc thêm thì cứ đọc 🔥"
                    pendingMessage={r => `Còn ${r} trang nữa là đạt mục tiêu hôm nay.`}
                  />
                  <GoalCard
                    label="Mục tiêu tuần này"
                    iconName="fire"
                    pages={weekPages}
                    target={goals.weeklyPages}
                    onChange={t => setGoals({ ...goals, weeklyPages: t })}
                    unitLabel="trang/tuần"
                    inputMax={3000}
                    reachedMessage="Hoàn thành mục tiêu tuần! Tuần sau reset, tiếp tục giữ phong độ nha 🎯"
                    pendingMessage={r => `Còn ${r} trang nữa là đạt mục tiêu tuần này.`}
                  />
                </div>
              </FadeIn>

              {/* Streak badge */}
              <FadeIn direction="up" distance={15} delay={0.15}>
                <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: "16px 24px", marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 20 }}>
                  <StreakBadge streak={stats.currentStreak} />
                  {stats.longestStreak > stats.currentStreak && (
                    <div style={{ fontSize: 11, color: "var(--muted)", borderLeft: "1px solid var(--border-soft)", paddingLeft: 16 }}>
                      Kỷ lục: <strong>{stats.longestStreak}</strong> ngày
                    </div>
                  )}
                </div>
              </FadeIn>

              {/* Stat cards */}
              <StaggerContainer
                staggerDelay={0.06}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(180px, 100%), 1fr))", gap: 16, marginBottom: 32 }}
              >
                <StaggerItem direction="up" distance={15}>
                  <StatCard label="Trang đã đọc" value={stats.totalPagesRead} unit="trang" icon="book" color="var(--accent)" />
                </StaggerItem>
                <StaggerItem direction="up" distance={15}>
                  <StatCard label="Thời gian đọc" value={timeStr} icon="clock" color="var(--jade)" />
                </StaggerItem>
                <StaggerItem direction="up" distance={15}>
                  <StatCard label="Streak hiện tại" value={stats.currentStreak} unit="ngày" icon="fire" color="#e04156" />
                </StaggerItem>
                <StaggerItem direction="up" distance={15}>
                  <StatCard label="Trung bình/ngày" value={avgPerDay} unit="trang" icon="chart" color="var(--gold)" />
                </StaggerItem>
                <StaggerItem direction="up" distance={15}>
                  <StatCard label="Đã bookmark" value={bookmarks.length} unit="trang" icon="bookmark" color="var(--indigo)" />
                </StaggerItem>
                <StaggerItem direction="up" distance={15}>
                  <StatCard label="Series đang đọc" value={allProgress.length} unit="bộ" icon="stack" color="var(--jade)" />
                </StaggerItem>
              </StaggerContainer>

              {/* Heatmap */}
              <FadeIn direction="up" distance={15} delay={0.3}>
                <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: "24px 28px", marginBottom: 32 }}>
                  <ActivityHeatmap dailyHistory={stats.dailyHistory} />
                </div>
              </FadeIn>

              {/* Recent series progress */}
              {allProgress.length > 0 && (
                <FadeIn direction="up" distance={15} delay={0.35}>
                  <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: "24px 28px" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
                      Đang đọc
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {allProgress.slice(0, 6).map(p => {
                        const pct = p.totalPages > 0 ? Math.round((p.pageNumber / p.totalPages) * 100) : 0;
                        return (
                          <div key={p.seriesId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {p.coverUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.coverUrl} alt={p.seriesTitle} style={{ width: 36, height: 48, objectFit: "cover", border: "1.5px solid var(--border)" }} />
                            ) : (
                              <div style={{ width: 36, height: 48, background: "var(--bg-3)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon name="stack" size={16} />
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{p.seriesTitle}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, height: 5, background: "var(--bg-2)", borderRadius: 2, overflow: "hidden" }}>
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                                    style={{ height: "100%", background: "var(--accent)", borderRadius: 2 }}
                                  />
                                </div>
                                <span style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>{pct}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </FadeIn>
              )}

              {/* Achievements */}
              <FadeIn direction="up" distance={15} delay={0.4}>
                <div className="stroke-ink panel-shadow" style={{ background: "var(--panel)", padding: "24px 28px", marginTop: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon name="trophy" size={16} />
                      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Huy hiệu thành tựu
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
                      {Object.keys(unlockedAchievements).length} / {ACHIEVEMENTS.length}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                    {ACHIEVEMENTS.map(a => {
                      const unlocked = !!unlockedAchievements[a.id];
                      return (
                        <motion.div
                          key={a.id}
                          whileHover={unlocked ? { y: -2, boxShadow: "4px 4px 0 0 var(--border)" } : undefined}
                          title={unlocked ? `Mở khoá: ${new Date(unlockedAchievements[a.id].unlockedAt).toLocaleDateString("vi-VN")}` : "Chưa mở khoá"}
                          style={{
                            border: "1.5px solid var(--border-soft)",
                            background: unlocked ? "var(--bg-2)" : "var(--bg)",
                            padding: "10px 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            opacity: unlocked ? 1 : 0.45,
                            filter: unlocked ? undefined : "grayscale(0.85)",
                            transition: "box-shadow 0.15s",
                          }}
                        >
                          <div
                            style={{
                              width: 36, height: 36, borderRadius: "50%",
                              background: unlocked ? a.color : "var(--border-soft)",
                              color: "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              boxShadow: unlocked ? `0 0 0 3px ${a.color}22` : "none",
                              flexShrink: 0,
                            }}
                          >
                            <Icon name={a.icon} size={16} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: unlocked ? "var(--fg)" : "var(--muted)" }}>{a.label}</div>
                            <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.3 }}>{a.description}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </FadeIn>

              {/* Empty state */}
              {stats.totalPagesRead === 0 && (
                <FadeIn direction="up" distance={15} delay={0.2}>
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                    <div className="serif" style={{ fontSize: 48, opacity: 0.2 }}>統</div>
                    <div style={{ marginTop: 8 }}>Chưa có dữ liệu đọc. Bắt đầu đọc trong Reader để theo dõi thống kê.</div>
                  </div>
                </FadeIn>
              )}
            </>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
