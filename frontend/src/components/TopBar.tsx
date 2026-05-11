"use client";
import React from 'react';
import Link from 'next/link';
import { Icon } from './Icons';

export const Logo = ({ size = 22 }: { size?: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <svg viewBox="0 0 40 40" width={size + 10} height={size + 10}>
      <rect x="2" y="2" width="36" height="36" fill="var(--accent)" stroke="var(--border)" strokeWidth="2.5" transform="rotate(-4 20 20)"/>
      <text x="20" y="28" textAnchor="middle" fontSize="22" fontFamily="'Shippori Mincho', serif" fontWeight={800} fill="var(--paper)" transform="rotate(-4 20 20)">物</text>
    </svg>
    <div style={{ lineHeight: 1 }}>
      <div className="display" style={{ fontSize: size, letterSpacing: "-0.02em" }}>StoryLens</div>
      <div className="caps-xs" style={{ color: "var(--muted)", marginTop: 3 }}>物語 · ストーリーレンズ</div>
    </div>
  </div>
);

export const TopBar = ({ active, compact = false }: { active: string, compact?: boolean }) => {
  const [theme, setTheme] = React.useState("light");
  
  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const items = [
    { id: "home", label: "Trang chủ", icon: "home", href: "/" },
    { id: "upload", label: "Tải lên", icon: "upload", href: "/upload" },
    { id: "reader", label: "Đọc truyện", icon: "book", href: "/reader" },
    { id: "qa", label: "Hỏi AI", icon: "chat", href: "/qa" },
    { id: "batch", label: "Batch", icon: "stack", href: "/batch" },
    { id: "history", label: "Lịch sử", icon: "history", href: "/history" },
  ];
  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: compact ? "10px 20px" : "14px 28px",
      borderBottom: "2px solid var(--border)",
      background: "var(--panel)",
      position: "sticky", top: 0, zIndex: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Logo />
        <nav style={{ display: "flex", gap: 2, marginLeft: 20 }}>
          {items.map(it => (
            <Link href={it.href} key={it.id} style={{ textDecoration: 'none' }}>
              <div className="tab" data-active={active === it.id} style={{cursor: 'pointer'}}>
                <Icon name={it.icon} size={14}/>
                <span>{it.label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", border: "1.5px solid var(--border-soft)", borderRadius: 2, fontSize: 12, color: "var(--muted)" }}>
          <Icon name="search" size={14}/>
          <span>Tìm bộ truyện, nhân vật…</span>
          <span style={{ marginLeft: 14, padding: "1px 6px", border: "1px solid var(--border-soft)", fontFamily: "var(--font-mono)", fontSize: 10 }}>⌘K</span>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">
          <Icon name={theme === "dark" ? "sun" : "moon"} size={14}/>
        </button>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontWeight: 800, border: "2px solid var(--border)" }}>K</div>
      </div>
    </header>
  );
};
