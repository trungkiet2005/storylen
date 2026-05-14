"use client";
import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface UpgradePromptProps {
  onClose?: () => void;
}

export function UpgradePrompt({ onClose }: UpgradePromptProps) {
  const { user } = useAuth();
  const isPaidPlan = user && user.plan_tier !== "free";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hết credit"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          border: "2.5px solid var(--border)",
          boxShadow: "6px 6px 0 0 var(--border)",
          maxWidth: 420,
          width: "100%",
          padding: "28px 28px 24px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-serif)", color: "var(--accent)" }}>
              Hết credit!
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              {isPaidPlan
                ? "Bạn đã dùng hết credit tháng này."
                : "Bạn đã dùng hết 5 credit miễn phí hôm nay."}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 18, lineHeight: 1, padding: "0 0 0 12px" }}
              aria-label="Đóng"
            >
              ×
            </button>
          )}
        </div>

        {/* Free plan info */}
        {!isPaidPlan && (
          <div
            style={{
              background: "var(--bg-2)",
              border: "1.5px solid var(--border-soft)",
              padding: "12px 14px",
              marginBottom: 20,
              fontSize: 13,
              color: "var(--fg-soft)",
              lineHeight: 1.6,
            }}
          >
            Credit miễn phí sẽ được <strong>nạp lại 5 credit</strong> vào lúc
            00:00 giờ ngày mai (giờ Việt Nam).
            <br />
            Hoặc nâng cấp để dùng ngay!
          </div>
        )}

        {/* Plans */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {[
            { id: "basic",   label: "💙 BASIC",   price: "49.000đ/tháng", credits: "300 credits", color: "#2563eb" },
            { id: "pro",     label: "💜 PRO",     price: "99.000đ/tháng", credits: "1.000 credits", color: "#7c3aed" },
            { id: "premium", label: "💛 PREMIUM", price: "249.000đ/tháng", credits: "3.000 credits", color: "#d97706" },
          ].map(plan => (
            <Link
              key={plan.id}
              href="/plans"
              onClick={onClose}
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                border: `2px solid ${plan.color}22`,
                background: `${plan.color}08`,
                cursor: "pointer",
                transition: "background 0.1s",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13, color: plan.color }}>{plan.label}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg)" }}>{plan.credits}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{plan.price}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link href="/plans" onClick={onClose} style={{ textDecoration: "none" }}>
          <button
            className="btn btn-primary"
            style={{ width: "100%", padding: "11px", fontSize: 14, fontWeight: 700 }}
          >
            Xem tất cả gói đăng ký →
          </button>
        </Link>
      </div>
    </div>
  );
}
