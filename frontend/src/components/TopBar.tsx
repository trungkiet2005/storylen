"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from './Icons';
import { useAuth, getAvatarInitial, getDisplayName } from '@/contexts/AuthContext';
import { useToast } from './Toast';
import { CreditBadge } from './CreditBadge';
import { NotificationBell } from './NotificationBell';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n, type Locale } from '@/contexts/I18nContext';

export const Logo = ({ size = 22 }: { size?: number }) => (
  <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg viewBox="0 0 40 40" width={size + 10} height={size + 10} aria-hidden="true">
        <rect x="2" y="2" width="36" height="36" fill="var(--accent)" stroke="var(--border)" strokeWidth="2.5" transform="rotate(-4 20 20)"/>
        <text x="20" y="29" textAnchor="middle" fontSize="24" fontFamily="var(--font-serif)" fontWeight={800} fill="var(--paper)" transform="rotate(-4 20 20)">S</text>
      </svg>
      <div style={{ lineHeight: 1 }}>
        <div className="display topbar-logo-name" style={{ fontSize: size, letterSpacing: "-0.02em" }}>StoryLens</div>
        <div className="caps-xs topbar-logo-sub" style={{ color: "var(--muted)", marginTop: 3 }}>XÓA NHÒA RÀO CẢN NGÔN NGỮ</div>
      </div>
    </div>
  </Link>
);

// ─── Shared dropdown panel styles ─────────────────────────────────────────────

const dropdownPanelStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  minWidth: 220,
  background: "var(--panel)",
  border: "2px solid var(--border)",
  boxShadow: "4px 4px 0 0 var(--border)",
  zIndex: 200,
  animation: "fadeIn 0.12s ease",
};

const dropdownItemStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "10px 16px",
  fontSize: 13,
  color: "var(--fg-soft)",
  cursor: "pointer",
  transition: "background 0.1s",
};

function useOutsideClick<T extends HTMLElement>(ref: React.RefObject<T | null>, onOutside: () => void) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, onOutside]);
}

// ─── Grouped "Của tôi" dropdown ───────────────────────────────────────────────

type NavItem = { id: string; label: string; icon: string; href: string };

function GroupedNavMenu({ items, active }: { items: NavItem[]; active: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false));

  const isActive = items.some(it => it.id === active);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="tab"
        data-active={isActive}
        style={{
          cursor: "pointer",
          background: "none",
          border: "none",
          padding: undefined,
          fontFamily: "inherit",
          color: "inherit",
        }}
      >
        <Icon name="layers" size={14} aria-hidden="true" />
        <span className="nav-label">Của tôi</span>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={11} aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" style={{ ...dropdownPanelStyle, left: 0, right: "auto", minWidth: 200 }}>
          {items.map(it => (
            <Link key={it.id} href={it.href} style={{ textDecoration: "none" }} onClick={() => setOpen(false)}>
              <div
                role="menuitem"
                style={{
                  ...dropdownItemStyle,
                  background: active === it.id ? "var(--bg-2)" : undefined,
                  color: active === it.id ? "var(--accent)" : "var(--fg-soft)",
                  fontWeight: active === it.id ? 700 : 500,
                }}
                onMouseEnter={e => { if (active !== it.id) (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
                onMouseLeave={e => { if (active !== it.id) (e.currentTarget as HTMLElement).style.background = ""; }}
              >
                <Icon name={it.icon} size={13} />
                {it.label}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── User Avatar Dropdown ─────────────────────────────────────────────────────

const THEME_CYCLE: Record<string, string> = { light: "dark", dark: "sepia", sepia: "light" };
const THEME_LABEL: Record<string, string> = { light: "Sáng", dark: "Tối", sepia: "Sepia" };

function UserMenu({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false));

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
  const displayName = getDisplayName(user);

  const cycleTheme = () => {
    const next = THEME_CYCLE[theme] ?? "light";
    setTheme(next);
  };

  const toggleLocale = () => {
    const next: Locale = locale === "vi" ? "en" : "vi";
    setLocale(next);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Tài khoản người dùng"
        aria-expanded={open}
        className="topbar-user-btn"
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
            overflow: "hidden",
            backgroundImage: user.avatar_url ? `url(${user.avatar_url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {!user.avatar_url && initial}
        </div>
        <span className="topbar-username" style={{ fontSize: 13, fontWeight: 600, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayName}
        </span>
        <span className="topbar-user-chev" style={{ display: "inline-flex" }}>
          <Icon name="chevron-down" size={11} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={dropdownPanelStyle}>
          {/* User info header */}
          <div style={{ padding: "14px 16px", borderBottom: "1.5px solid var(--border-soft)" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{displayName}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{user.email}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>@{user.username}</div>
          </div>

          {/* Account links */}
          {[
            { label: "Hồ sơ cá nhân", icon: "user", href: "/profile" },
            { label: "Cài đặt", icon: "settings", href: "/settings" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div
                onClick={() => setOpen(false)}
                style={dropdownItemStyle}
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

          {/* Language row */}
          <button
            onClick={toggleLocale}
            aria-label={`Đổi ngôn ngữ sang ${locale === "vi" ? "EN" : "VI"}`}
            style={{
              ...dropdownItemStyle,
              width: "100%",
              justifyContent: "space-between",
              background: "none",
              border: "none",
              fontFamily: "var(--font-sans)",
              textAlign: "left",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Icon name="globe" size={13} />
              Ngôn ngữ
            </span>
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
              border: "1.5px solid var(--border)",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              color: "var(--fg)",
            }}>
              {locale === "vi" ? "VI" : "EN"}
            </span>
          </button>

          {/* Theme row */}
          <button
            onClick={cycleTheme}
            aria-label="Đổi giao diện"
            style={{
              ...dropdownItemStyle,
              width: "100%",
              justifyContent: "space-between",
              background: "none",
              border: "none",
              fontFamily: "var(--font-sans)",
              textAlign: "left",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Icon name={theme === "dark" ? "moon" : theme === "sepia" ? "leaf" : "sun"} size={13} />
              Giao diện
            </span>
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
              border: "1.5px solid var(--border)",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              color: "var(--fg)",
            }}>
              {THEME_LABEL[theme] ?? "Sáng"}
            </span>
          </button>

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

export const TopBar = ({ active = "", compact = false }: { active?: string, compact?: boolean }) => {
  const [theme, setThemeState] = useState("light");
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin, user } = useAuth();

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [active]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Hydrate theme from localStorage on mount
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem("sl-theme") || "light" : "light";
    document.documentElement.dataset.theme = saved;
    queueMicrotask(() => {
      setThemeState(saved);
      setMounted(true);
    });
  }, []);

  const setTheme = useCallback((next: string) => {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("sl-theme", next);
  }, []);

  // Primary nav — always visible on desktop
  const primaryItems: NavItem[] = [
    { id: "home",   label: "Trang chủ",  icon: "home",   href: "/" },
    { id: "browse", label: "Kho truyện", icon: "grid",   href: "/browse" },
    { id: "upload", label: "Tải lên",    icon: "upload", href: "/upload" },
    { id: "reader", label: "Đọc",        icon: "book",   href: "/reader" },
  ];

  // Secondary — collapsed into "Của tôi" dropdown on desktop, flat on mobile
  const groupedItems: NavItem[] = [
    { id: "series",    label: "Bộ truyện", icon: "stack",    href: "/series" },
    { id: "bookmarks", label: "Bookmark",  icon: "bookmark", href: "/bookmarks" },
    { id: "stats",     label: "Thống kê",  icon: "chart",    href: "/stats" },
    { id: "history",   label: "Lịch sử",   icon: "history",  href: "/history" },
    ...(isAdmin ? [{ id: "admin", label: "Quản trị", icon: "key", href: "/admin" }] : []),
  ];

  // Mobile drawer shows everything in one flat list
  const allItems = [...primaryItems, ...groupedItems];

  return (
    <>
      <header
        role="banner"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: compact ? "10px 20px" : "12px clamp(16px, 3vw, 28px)",
          borderBottom: "2px solid var(--border)",
          background: "var(--panel)",
          position: "sticky", top: 0, zIndex: 100,
          backdropFilter: "blur(12px)",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {/* Hamburger — visible only on mobile (<640px) via CSS */}
          <button
            className="topbar-hamburger"
            onClick={() => setMobileOpen(v => !v)}
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileOpen}
          >
            <Icon name={mobileOpen ? "x" : "menu"} size={18} />
          </button>

          <Logo />

          {/* Desktop nav — hidden on mobile via CSS */}
          <nav aria-label="Main navigation" className="topbar-desktop-nav" style={{ marginLeft: 12 }}>
            {primaryItems.map(it => (
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
            {mounted && <GroupedNavMenu items={groupedItems} active={active} />}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {/* Anonymous users get a standalone language switcher;
              authenticated users find it inside the avatar dropdown. */}
          {mounted && !user && <LanguageSwitcher />}
          {mounted && <NotificationBell />}
          {mounted && <CreditBadge />}
          {mounted && <UserMenu theme={theme} setTheme={setTheme} />}
        </div>
      </header>

      {/* ── Mobile full-screen nav drawer ─────────────────────────────────── */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-label="Menu điều hướng"
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--panel)",
            zIndex: 150,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            animation: "slideInLeft 0.18s ease",
          }}
        >
          {/* Drawer header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 20px",
              borderBottom: "2px solid var(--border)",
              position: "sticky",
              top: 0,
              background: "var(--panel)",
              zIndex: 1,
            }}
          >
            <Logo />
            <button
              className="topbar-hamburger"
              style={{ display: "flex" }}
              onClick={() => setMobileOpen(false)}
              aria-label="Đóng menu"
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          {/* Nav items — flat list of primary + grouped */}
          <nav aria-label="Mobile navigation" style={{ padding: "12px 8px", flex: 1 }}>
            {allItems.map(it => (
              <Link
                href={it.href}
                key={it.id}
                style={{ textDecoration: "none" }}
                onClick={() => setMobileOpen(false)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 20px",
                    fontSize: 15,
                    fontWeight: active === it.id ? 700 : 500,
                    color: active === it.id ? "var(--accent)" : "var(--fg-soft)",
                    borderLeft: active === it.id ? "3px solid var(--accent)" : "3px solid transparent",
                    background: active === it.id ? "var(--bg-2)" : "transparent",
                    borderRadius: "0 var(--radius) var(--radius) 0",
                    marginBottom: 2,
                    cursor: "pointer",
                    transition: "background 0.1s, color 0.1s",
                  }}
                >
                  <Icon name={it.icon} size={18} />
                  {it.label}
                </div>
              </Link>
            ))}
          </nav>

          {/* Bottom: user section (lang + theme are now inside UserMenu dropdown) */}
          <div
            style={{
              padding: "16px 20px",
              borderTop: "2px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {mounted && <UserMenu theme={theme} setTheme={setTheme} />}
          </div>
        </div>
      )}
    </>
  );
};
