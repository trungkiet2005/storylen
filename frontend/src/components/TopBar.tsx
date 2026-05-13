"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from './Icons';
import { useAuth, getAvatarInitial } from '@/contexts/AuthContext';
import { useToast } from './Toast';

export const Logo = ({ size = 22 }: { size?: number }) => (
  <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg viewBox="0 0 40 40" width={size + 10} height={size + 10} aria-hidden="true">
        <rect x="2" y="2" width="36" height="36" fill="var(--accent)" stroke="var(--border)" strokeWidth="2.5" transform="rotate(-4 20 20)"/>
        <text x="20" y="29" textAnchor="middle" fontSize="24" fontFamily="var(--font-serif)" fontWeight={800} fill="var(--paper)" transform="rotate(-4 20 20)">S</text>
      </svg>
      <div style={{ lineHeight: 1 }}>
        <div className="display" style={{ fontSize: size, letterSpacing: "-0.02em" }}>StoryLens</div>
        <div className="caps-xs" style={{ color: "var(--muted)", marginTop: 3 }}>XÓA NHÒA RÀO CẢN NGÔN NGỮ</div>
      </div>
    </div>
  </Link>
);

// ─── User Avatar Dropdown ─────────────────────────────────────────────────────

function UserMenu() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <Link href="/login">
          <button className="btn btn-sm btn-ghost" style={{ padding: "7px 14px" }}>
            Đăng nhập
          </button>
        </Link>
        <Link href="/register">
          <button className="btn btn-sm btn-primary" style={{ padding: "7px 14px" }}>
            Đăng ký
          </button>
        </Link>
      </div>
    );
  }

  const initial = getAvatarInitial(user);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Tài khoản người dùng"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "2px solid var(--border)",
          cursor: "pointer",
          padding: "4px 8px 4px 4px",
          borderRadius: "var(--radius-sm)",
          color: "var(--fg)",
          fontFamily: "var(--font-sans)",
          transition: "box-shadow 0.1s",
          boxShadow: open ? "2px 2px 0 0 var(--border)" : "none",
        }}
      >
        {/* Avatar circle */}
        <div
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--accent)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: 13,
          }}
        >
          {initial}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.username}
        </span>
        <Icon name="arrow-right" size={11} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 200,
            background: "var(--panel)",
            border: "2px solid var(--border)",
            boxShadow: "4px 4px 0 0 var(--border)",
            zIndex: 200,
            animation: "fadeIn 0.12s ease",
          }}
        >
          {/* User info header */}
          <div style={{ padding: "14px 16px", borderBottom: "1.5px solid var(--border-soft)" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{user.username}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{user.email}</div>
          </div>

          {/* Menu items */}
          {[
            { label: "Hồ sơ cá nhân", icon: "home", href: "/profile" },
            { label: "Lịch sử dịch", icon: "history", href: "/history" },
            { label: "Cài đặt", icon: "layers", href: "/settings" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div
                onClick={() => setOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 16px",
                  fontSize: 13,
                  color: "var(--fg-soft)",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
              >
                <Icon name={item.icon} size={13} />
                {item.label}
              </div>
            </Link>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border-soft)", margin: "4px 0" }} />

          {/* Logout */}
          <button
            onClick={async () => {
              await logout();
              setOpen(false);
              toast("Đã đăng xuất. Hẹn gặp lại! 👋", "info");
              router.push("/");
            }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%",
              padding: "10px 16px",
              fontSize: 13,
              color: "var(--accent)",
              cursor: "pointer",
              background: "none",
              border: "none",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              textAlign: "left",
              transition: "background 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(200,16,46,0.06)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
          >
            <Icon name="close" size={13} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export const TopBar = ({ active, compact = false }: { active: string, compact?: boolean }) => {
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);
  const { isAdmin } = useAuth();

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem("sl-theme") || "light" : "light";
    document.documentElement.dataset.theme = saved;
    queueMicrotask(() => {
      setTheme(saved);
      setMounted(true);
    });
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
    { id: "history", label: "Lịch sử",   icon: "history", href: "/history" },
    ...(isAdmin ? [{ id: "admin", label: "Quản trị", icon: "key", href: "/admin" }] : []),
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
                <span className="nav-label">{it.label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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

        {/* Auth: login buttons or user menu */}
        {mounted && <UserMenu />}
      </div>
    </header>
  );
};
