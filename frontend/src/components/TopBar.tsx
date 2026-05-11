"use client";
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from './Icons';

export const Logo = ({ size = 22 }: { size?: number }) => (
  <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg viewBox="0 0 40 40" width={size + 10} height={size + 10} aria-hidden="true">
        <rect x="2" y="2" width="36" height="36" fill="var(--accent)" stroke="var(--border)" strokeWidth="2.5" transform="rotate(-4 20 20)"/>
        <text x="20" y="28" textAnchor="middle" fontSize="22" fontFamily="'Shippori Mincho', serif" fontWeight={800} fill="var(--paper)" transform="rotate(-4 20 20)">物</text>
      </svg>
      <div style={{ lineHeight: 1 }}>
        <div className="display" style={{ fontSize: size, letterSpacing: "-0.02em" }}>StoryLens</div>
        <div className="caps-xs" style={{ color: "var(--muted)", marginTop: 3 }}>物語 · ストーリーレンズ</div>
      </div>
    </div>
  </Link>
);

export const TopBar = ({ active, compact = false }: { active: string, compact?: boolean }) => {
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem("sl-theme") || "light" : "light";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("sl-theme", next);
  }, [theme]);

  const items = [
    { id: "home",    label: "Trang chủ", icon: "home",    href: "/" },
    { id: "upload",  label: "Tải lên",   icon: "upload",  href: "/upload" },
    { id: "reader",  label: "Đọc",       icon: "book",    href: "/reader" },
    { id: "qa",      label: "Hỏi AI",    icon: "chat",    href: "/qa" },
    { id: "batch",   label: "Batch",     icon: "stack",   href: "/batch" },
    { id: "history", label: "Lịch sử",   icon: "history", href: "/history" },
  ];

  return (
    <header
      role="banner"
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: compact ? "10px 20px" : "14px 28px",
        borderBottom: "2px solid var(--border)",
        background: "var(--panel)",
        position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Logo />
        <nav aria-label="Main navigation" style={{ display: "flex", gap: 2, marginLeft: 20 }}>
          {items.map(it => (
            <Link href={it.href} key={it.id} style={{ textDecoration: 'none' }}>
              <div
                className="tab"
                data-active={active === it.id}
                role="link"
                aria-current={active === it.id ? "page" : undefined}
                style={{ cursor: 'pointer' }}
              >
                <Icon name={it.icon} size={14} aria-hidden="true" />
                <span>{it.label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Search bar */}
        <div
          role="search"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 12px",
            border: "1.5px solid var(--border-soft)",
            borderRadius: 2,
            fontSize: 12,
            color: "var(--muted)",
            cursor: "text",
            minWidth: 220,
          }}
        >
          <Icon name="search" size={13} aria-hidden="true"/>
          <span style={{ flex: 1 }}>Tìm bộ truyện, nhân vật…</span>
          <kbd style={{
            marginLeft: 8, padding: "1px 6px",
            border: "1px solid var(--border-soft)",
            fontFamily: "var(--font-mono)", fontSize: 10,
            borderRadius: 2,
          }}>⌘K</kbd>
        </div>

        {/* Theme toggle */}
        {mounted && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={15}/>
          </button>
        )}

        {/* Avatar */}
        <div
          aria-label="Tài khoản"
          title="Tài khoản người dùng"
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "var(--accent)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: 14,
            border: "2px solid var(--border)",
            cursor: "pointer",
          }}
        >
          K
        </div>
      </div>
    </header>
  );
};
