"use client";
import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { PLAN_COLORS, PLAN_LABELS } from "@/lib/constants";

export function CreditBadge() {
  const { user } = useAuth();
  if (!user) return null;

  const { plan_tier, credits_balance } = user;
  const planColor = PLAN_COLORS[plan_tier] ?? PLAN_COLORS.free;
  const planLabel = PLAN_LABELS[plan_tier] ?? "FREE";
  const isLow = plan_tier === "free" && credits_balance <= 1;

  return (
    <Link href="/plans" style={{ textDecoration: "none" }}>
      <div
        title="Credits còn lại — nhấn để xem gói đăng ký"
        className="topbar-credit-badge"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          border: `2px solid ${isLow ? "var(--accent)" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)",
          background: isLow ? "rgba(200,16,46,0.05)" : "var(--panel)",
          cursor: "pointer",
          transition: "box-shadow 0.1s",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "var(--font-sans)",
          color: isLow ? "var(--accent)" : "var(--fg)",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = "2px 2px 0 0 var(--border)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        {/* Credit icon */}
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke={isLow ? "var(--accent)" : planColor} strokeWidth="1.5"/>
          <text x="8" y="11.5" textAnchor="middle" fontSize="8" fontWeight="800"
                fill={isLow ? "var(--accent)" : planColor} fontFamily="sans-serif">
            C
          </text>
        </svg>

        {/* Balance */}
        <span className="topbar-credit-balance" style={{ color: isLow ? "var(--accent)" : "var(--fg)" }}>
          {credits_balance}
        </span>

        {/* Divider */}
        <span className="topbar-credit-divider" style={{ color: "var(--border)", margin: "0 1px" }}>·</span>

        {/* Plan tier */}
        <span className="topbar-credit-plan" style={{ color: planColor, letterSpacing: "0.04em" }}>
          {planLabel}
        </span>
      </div>
    </Link>
  );
}
