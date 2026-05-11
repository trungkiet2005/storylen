"use client";
import React from 'react';
import { TopBar } from '@/components/TopBar';
import { SectionHeader } from '@/components/SectionHeader';
import { Icon } from '@/components/Icons';

export default function HistoryPage() {
  const series = [
    { kanji: "月", title: "Kiếm Nguyệt Ảnh", jp: "月影の剣", chapters: 12, pages: 124, progress: 0.78, last: "2 giờ trước" },
    { kanji: "春", title: "Bước Chân Mùa Xuân", jp: "春の足音", chapters: 4, pages: 78, progress: 0.42, last: "hôm qua" },
    { kanji: "紅", title: "Lời Thề Son Đỏ", jp: "紅の誓い", chapters: 21, pages: 210, progress: 1.0, last: "3 ngày trước" },
    { kanji: "海", title: "Biển Lặng", jp: "静かな海", chapters: 7, pages: 56, progress: 0.28, last: "1 tuần trước" },
    { kanji: "風", title: "Ký Ức Của Gió", jp: "風の記憶", chapters: 9, pages: 92, progress: 0.64, last: "1 tuần trước" },
    { kanji: "影", title: "Bóng Của Người", jp: "影法師", chapters: 15, pages: 150, progress: 0.12, last: "2 tuần trước" },
  ];

  return (
    <div className="paper-grain" style={{ minHeight: "100vh" }}>
      <TopBar active="history" />
      <div style={{ padding: "40px 56px" }}>
        <SectionHeader kanji="歴" label="Lịch Sử · History" title="Bộ truyện đã đọc" subtitle="Tất cả manga bạn đã upload, dịch, và thảo luận với AI. Dữ liệu lưu trong session hoặc tài khoản." stamp="歴"/>

        <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "2px solid var(--border)", background: "var(--panel)", flex: 1, maxWidth: 360 }}>
            <Icon name="search" size={14}/>
            <input placeholder="Tìm theo tên bộ truyện hoặc nhân vật…" style={{ border: "none", background: "transparent", flex: 1, fontSize: 13, outline: "none", color: "var(--fg)" }}/>
          </div>
          <button className="btn btn-sm">Tất cả <span className="mono" style={{ color: "var(--muted)", marginLeft: 4 }}>{series.length}</span></button>
          <button className="btn btn-sm btn-ghost">Đang đọc</button>
          <button className="btn btn-sm btn-ghost">Đã xong</button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className="btn btn-sm btn-ghost"><Icon name="grid" size={14}/></button>
            <button className="btn btn-sm btn-ghost"><Icon name="menu" size={14}/></button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {series.map((s, i) => (
            <div key={s.title} className="stroke-ink panel-shadow" style={{ background: "var(--panel)", overflow: "hidden", cursor: "pointer" }}>
              <div style={{ display: "flex" }}>
                <div className="halftone-coarse" style={{ width: 120, height: 160, background: "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "2px solid var(--border)", color: "var(--ink)" }}>
                  <span className="serif" style={{ fontSize: 80, color: "var(--accent)", fontWeight: 800 }}>{s.kanji}</span>
                </div>
                <div style={{ flex: 1, padding: 14 }}>
                  <div className="serif" style={{ fontSize: 16, fontWeight: 700 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.jp}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 10, fontSize: 11, color: "var(--fg-soft)" }}>
                    <span>📖 {s.chapters} chương</span>
                    <span>{s.pages} trang</span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>
                      <span>Đã đọc</span><span className="mono">{Math.round(s.progress * 100)}%</span>
                    </div>
                    <div style={{ height: 6, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                      <div style={{ width: `${s.progress*100}%`, height: "100%", background: s.progress === 1 ? "var(--jade)" : "var(--accent)" }}/>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: "8px 14px", borderTop: "1px dashed var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--muted)" }}>
                <span><Icon name="clock" size={10}/> {s.last}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <span className="chip" style={{ padding: "2px 8px", fontSize: 10 }}>Q&A ready</span>
                  {s.progress === 1 && <span className="chip chip-accent" style={{ padding: "2px 8px", fontSize: 10 }}>✓ Xong</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
