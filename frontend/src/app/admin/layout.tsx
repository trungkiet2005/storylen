"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icons";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";

const NAV: ReadonlyArray<{
  href: string;
  label: string;
  icon: string;
  match: (path: string) => boolean;
}> = [
  { href: "/admin",           label: "Dashboard",  icon: "grid",     match: (p) => p === "/admin" },
  { href: "/admin/users",     label: "Người dùng", icon: "user",     match: (p) => p.startsWith("/admin/users") },
  { href: "/admin/content",   label: "Nội dung",   icon: "book",     match: (p) => p.startsWith("/admin/content") },
  { href: "/admin/analytics", label: "Phân tích",  icon: "layers",   match: (p) => p.startsWith("/admin/analytics") },
  { href: "/admin/audit",     label: "Audit log",  icon: "history",  match: (p) => p.startsWith("/admin/audit") },
  { href: "/admin/settings",  label: "Cấu hình",   icon: "settings", match: (p) => p.startsWith("/admin/settings") },
  { href: "/admin/health",    label: "Sức khoẻ",   icon: "alert",    match: (p) => p.startsWith("/admin/health") },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/admin";
  const { toast } = useToast();
  const { isLoading, isAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      toast("Bạn không có quyền truy cập khu vực quản trị.", "error");
      router.replace("/");
    }
  }, [isLoading, isAdmin, router, toast]);

  if (isLoading || !isAdmin) {
    return (
      <div className="paper-grain" style={{ minHeight: "100vh" }}>
        <TopBar active="admin" />
        <div style={{ padding: 56, textAlign: "center", color: "var(--muted)" }}>
          Đang kiểm tra quyền truy cập…
        </div>
      </div>
    );
  }

  return (
    <div className="paper-grain" style={{ minHeight: "100vh" }}>
      <TopBar active="admin" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          minHeight: "calc(100vh - 62px)",
        }}
      >
        <aside
          aria-label="Admin navigation"
          style={{
            borderRight: "2px solid var(--border)",
            background: "var(--panel)",
            padding: "24px 14px",
            position: "sticky",
            top: 62,
            height: "calc(100vh - 62px)",
            overflowY: "auto",
          }}
        >
          <div className="caps-xs" style={{ color: "var(--muted)", padding: "0 8px 12px" }}>
            Quản trị
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                  <div
                    role="link"
                    aria-current={active ? "page" : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      color: active ? "#fff" : "var(--fg-soft)",
                      background: active ? "var(--accent)" : "transparent",
                      border: active ? "2px solid var(--border)" : "2px solid transparent",
                      boxShadow: active ? "2px 2px 0 0 var(--border)" : "none",
                      transition: "background 0.1s, color 0.1s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-2)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <Icon name={item.icon} size={14} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div
            style={{
              marginTop: 28,
              padding: "12px 10px",
              border: "1.5px dashed var(--border-soft)",
              background: "var(--bg-2)",
              fontSize: 11,
              color: "var(--muted)",
              lineHeight: 1.5,
            }}
          >
            Mọi thao tác phía admin đều được ghi vào{" "}
            <Link href="/admin/audit" style={{ color: "var(--accent)" }}>
              audit log
            </Link>
            .
          </div>
        </aside>

        <main style={{ padding: "32px 40px", minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
