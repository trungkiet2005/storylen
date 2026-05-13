"use client";
import React from 'react';
import { TopBar } from '@/components/TopBar';
import { SectionHeader } from '@/components/SectionHeader';
import { Icon } from '@/components/Icons';
import { motion } from 'framer-motion';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from '@/components/Animations';

export default function BatchPage() {
  const files = [
    { name: "ch12_p01.jpg", size: "2.8 MB", status: "done", bubbles: 12, time: "3.2s" },
    { name: "ch12_p02.jpg", size: "3.1 MB", status: "done", bubbles: 8, time: "2.8s" },
    { name: "ch12_p03.jpg", size: "2.9 MB", status: "processing", bubbles: 10, time: "…" },
    { name: "ch12_p04.jpg", size: "3.4 MB", status: "queued", bubbles: null, time: "—" },
    { name: "ch12_p05.jpg", size: "2.7 MB", status: "queued", bubbles: null, time: "—" },
    { name: "ch12_p06.jpg", size: "3.0 MB", status: "queued", bubbles: null, time: "—" },
    { name: "ch12_p07.jpg", size: "2.5 MB", status: "error", bubbles: null, time: "—" },
    { name: "ch12_p08.jpg", size: "2.9 MB", status: "queued", bubbles: null, time: "—" },
  ];
  const done = files.filter(f => f.status === "done").length;

  return (
    <AnimatedPage>
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="batch" />
        <div style={{ padding: "40px 56px" }}>
          <FadeIn direction="up" distance={20} delay={0.1}>
            <SectionHeader kanji="B" label="Batch Upload · Content Creator" title="Tải nguyên chương truyện"
                           subtitle="Xử lý tuần tự nhiều trang để tiết kiệm quota Gemini (500 RPD/key × 4 keys)."
                           stamp="BATCH"/>
          </FadeIn>

          {/* Progress header */}
          <FadeIn direction="up" distance={15} delay={0.2}>
            <div className="stroke-ink-thick panel-shadow" style={{ background: "var(--panel)", padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div className="caps-sm" style={{ color: "var(--accent)" }}>Moonlight Blade · Chapter 12</div>
                  <div className="display" style={{ fontSize: 24, marginTop: 4 }}>{done} / {files.length} trang đã xử lý</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-sm"><Icon name="x" size={12}/> Hủy tất cả</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-sm btn-primary">Tiếp tục</motion.button>
                </div>
              </div>
              {/* Progress bar manga-style */}
              <div style={{ height: 18, border: "2px solid var(--border)", background: "var(--bg-2)", position: "relative", overflow: "hidden" }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(done/files.length)*100}%` }}
                  transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                  className="halftone" 
                  style={{ height: "100%", background: "var(--accent)", color: "var(--paper)", borderRight: "2px solid var(--border)" }}
                />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{Math.round(done/files.length*100)}%</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                <span>ETA · 28 giây</span>
                <span>Quota: 1,842 / 2,000 RPD</span>
              </div>
            </div>
          </FadeIn>

          {/* File list */}
          <FadeIn direction="up" distance={15} delay={0.25}>
            <div className="stroke-ink" style={{ background: "var(--panel)", marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 120px 100px 80px 40px", padding: "10px 16px", background: "var(--bg-2)", borderBottom: "2px solid var(--border)" }} className="caps-xs">
                <span>#</span><span>File</span><span>Kích thước</span><span>Bubbles</span><span>Thời gian</span><span>Trạng thái</span><span/>
              </div>
              <StaggerContainer staggerDelay={0.04}>
                {files.map((f, i) => {
                  const statusMap: any = {
                    done: { label: "✓ Xong", color: "var(--jade)", bg: "transparent" },
                    processing: { label: "● Đang xử lý", color: "var(--accent)", bg: "var(--bg-2)" },
                    queued: { label: "○ Chờ", color: "var(--muted)", bg: "transparent" },
                    error: { label: "✕ Lỗi", color: "var(--beni-deep)", bg: "rgba(200,16,46,0.08)" },
                  };
                  const s = statusMap[f.status];
                  return (
                    <StaggerItem key={f.name} direction="none">
                      <motion.div 
                        whileHover={{ background: "var(--bg-2)" }}
                        style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 120px 100px 80px 40px", padding: "12px 16px", borderBottom: i < files.length - 1 ? "1px dashed var(--border-soft)" : "none", fontSize: 13, alignItems: "center", background: s.bg, transition: "background 0.15s" }}
                      >
                        <span className="mono" style={{ color: "var(--muted)" }}>{String(i+1).padStart(2, "0")}</span>
                        <span style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                          <Icon name="image" size={14}/> {f.name}
                        </span>
                        <span className="mono" style={{ color: "var(--muted)" }}>{f.size}</span>
                        <span>{f.bubbles ?? "—"}</span>
                        <span className="mono" style={{ color: "var(--muted)" }}>{f.time}</span>
                        <span style={{ color: s.color, fontWeight: 700, fontSize: 11, letterSpacing: "0.08em" }}>{s.label}</span>
                        <Icon name="dots" size={14}/>
                      </motion.div>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            </div>
          </FadeIn>

          {/* Console log */}
          <FadeIn direction="up" distance={15} delay={0.3}>
            <div className="stroke-ink" style={{ background: "var(--ink)", color: "var(--paper)", padding: 16, fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.7, maxHeight: 160, overflow: "auto" }}>
              <div style={{ color: "#b58a3b" }}>[12:04:18] Starting batch — 8 files queued</div>
              <div style={{ color: "#9fbfa8" }}>[12:04:19] ✓ ch12_p01.jpg — 12 bubbles detected, 12 translated (3.2s)</div>
              <div style={{ color: "#9fbfa8" }}>[12:04:22] ✓ ch12_p02.jpg — 8 bubbles detected, 8 translated (2.8s)</div>
              <div style={{ color: "#e5dbc4" }}>[12:04:25] ● ch12_p03.jpg — bubble detection done, awaiting Gemini response…</div>
              <div style={{ color: "#e04156" }}>[12:04:27] ✕ ch12_p07.jpg — OCR confidence &lt; 0.6, skipped (manual review needed)</div>
            </div>
          </FadeIn>
        </div>
      </div>
    </AnimatedPage>
  );
}
