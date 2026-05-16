"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { getPlans, type PlanInfo, createCheckoutSession, createBillingPortalSession } from "@/lib/api";
import { useToast } from "@/components/Toast";

const PLAN_COLORS: Record<string, string> = {
  free:    "var(--muted)",
  basic:   "#2563eb",
  pro:     "#7c3aed",
  premium: "#d97706",
};

const PLAN_EMOJIS: Record<string, string> = {
  free:    "🆓",
  basic:   "💙",
  pro:     "💜",
  premium: "💛",
};

function formatPrice(vnd: number): string {
  if (vnd === 0) return "Miễn phí";
  return vnd.toLocaleString("vi-VN") + "đ/tháng";
}

function ContactModal({
  plan,
  onClose,
}: {
  plan: PlanInfo;
  onClose: () => void;
}) {
  const color = PLAN_COLORS[plan.id] ?? "var(--muted)";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--panel)",
          border: `2px solid ${color}`,
          boxShadow: `6px 6px 0 0 ${color}33`,
          padding: "28px 28px 24px",
          maxWidth: 440,
          width: "100%",
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>
            {PLAN_EMOJIS[plan.id]}{" "}
            <span style={{ fontFamily: "var(--font-serif)", fontWeight: 800, color }}>
              {plan.name}
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{formatPrice(plan.price_vnd)}</div>
        </div>

        <p style={{ fontSize: 14, color: "var(--fg-soft)", lineHeight: 1.65, marginBottom: 20 }}>
          Tính năng thanh toán đang được phát triển. Để nâng cấp ngay,
          hãy liên hệ admin — gói sẽ được kích hoạt thủ công trong vòng{" "}
          <strong style={{ color: "var(--fg)" }}>24 giờ</strong> sau khi xác nhận thanh toán.
        </p>

        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border-soft)",
            padding: "14px 16px",
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            fontSize: 13,
          }}
        >
          <div>
            <span style={{ color: "var(--muted)", marginRight: 8 }}>Email:</span>
            <a href="mailto:contact@storylens.app" style={{ color: color, fontWeight: 600 }}>
              contact@storylens.app
            </a>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Tiêu đề email: <em>Đăng ký gói {plan.name} – [tên tài khoản của bạn]</em>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <a
            href={`mailto:contact@storylens.app?subject=${encodeURIComponent(`Đăng ký gói ${plan.name}`)}&body=${encodeURIComponent(`Xin chào,\n\nTôi muốn đăng ký gói ${plan.name} (${formatPrice(plan.price_vnd)}).\n\nTên tài khoản: \nEmail: `)}`}
            style={{
              flex: 1,
              padding: "10px",
              background: color,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              textAlign: "center",
              textDecoration: "none",
              display: "block",
            }}
          >
            Gửi email ngay →
          </a>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost"
            style={{ fontSize: 13 }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  onContact,
}: {
  plan: PlanInfo;
  isCurrent: boolean;
  onContact: (plan: PlanInfo) => void;
}) {
  const color = PLAN_COLORS[plan.id] ?? "var(--muted)";
  const isFree = plan.id === "free";

  const features = [
    { label: plan.daily_credits > 0 ? `${plan.daily_credits} credit/ngày (tự động nạp)` : `${plan.monthly_credits.toLocaleString()} credit/tháng`, highlight: true },
    { label: `Upload tối đa ${plan.max_batch_size} ảnh/lần` },
    { label: `Ưu tiên xử lý: ${"●".repeat(plan.priority_weight)}${"○".repeat(4 - plan.priority_weight)}` },
    ...(plan.bonus_credits > 0 ? [{ label: `+${plan.bonus_credits} credit bonus khi đăng ký lần đầu`, bonus: true }] : []),
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: `2.5px solid ${isCurrent ? color : "var(--border)"}`,
        boxShadow: isCurrent ? `4px 4px 0 0 ${color}44` : "4px 4px 0 0 var(--border)",
        background: "var(--panel)",
        padding: "24px 22px 20px",
        position: "relative",
        flex: "1 1 200px",
        minWidth: 200,
        maxWidth: 280,
        transition: "box-shadow 0.15s",
      }}
    >
      {isCurrent && (
        <div
          style={{
            position: "absolute",
            top: -13,
            left: "50%",
            transform: "translateX(-50%)",
            background: color,
            color: "#fff",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            padding: "3px 10px",
            whiteSpace: "nowrap",
          }}
        >
          GÓI HIỆN TẠI
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, marginBottom: 4 }}>
          {PLAN_EMOJIS[plan.id]} <span style={{ fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: 20, color }}>{plan.name}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: isFree ? "var(--muted)" : "var(--fg)" }}>
          {formatPrice(plan.price_vnd)}
        </div>
        {plan.price_vnd > 0 && (
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            ~{(plan.price_vnd / 25000).toFixed(1)} USD
          </div>
        )}
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13 }}>
            <span style={{ color: (f as { highlight?: boolean; bonus?: boolean }).bonus ? "#d97706" : color, marginTop: 1, flexShrink: 0 }}>
              {(f as { highlight?: boolean; bonus?: boolean }).bonus ? "★" : "✓"}
            </span>
            <span style={{ color: (f as { highlight?: boolean; bonus?: boolean }).highlight ? "var(--fg)" : "var(--fg-soft)", fontWeight: (f as { highlight?: boolean; bonus?: boolean }).highlight ? 700 : 400 }}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      {isFree ? (
        <div
          style={{
            textAlign: "center",
            padding: "9px",
            border: "1.5px solid var(--border-soft)",
            color: "var(--muted)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {isCurrent ? "Gói hiện tại" : "Gói mặc định"}
        </div>
      ) : isCurrent ? (
        <div
          style={{
            textAlign: "center",
            padding: "9px",
            border: `1.5px solid ${color}`,
            color,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Đang sử dụng ✓
        </div>
      ) : (
        <button
          onClick={() => onContact(plan)}
          style={{
            width: "100%",
            padding: "10px",
            background: color,
            color: "#fff",
            border: "none",
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            letterSpacing: "0.03em",
            transition: "opacity 0.15s",
          }}
        >
          Đăng ký gói {plan.name}
        </button>
      )}
    </div>
  );
}

export default function PlansPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactPlan, setContactPlan] = useState<PlanInfo | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      const data = await getPlans();
      setPlans(data);
    } catch {
      toast("Không thể tải danh sách gói.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const currentPlan = user?.plan_tier ?? "free";

  const handleUpgrade = useCallback(async (plan: PlanInfo) => {
    try {
      const res = await createCheckoutSession(plan.id);
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        setContactPlan(plan);
      }
    } catch (err) {
      // Stripe not configured → fall back to contact-admin modal.
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("chưa được cấu hình") || msg.includes("503")) {
        setContactPlan(plan);
      } else {
        toast(msg || "Không tạo được phiên thanh toán.", "error");
      }
    }
  }, [toast]);

  const handleManageBilling = useCallback(async () => {
    try {
      const res = await createBillingPortalSession();
      if (res.checkout_url) window.location.href = res.checkout_url;
    } catch (err) {
      toast(err instanceof Error ? err.message : "Không mở được cổng quản lý.", "error");
    }
  }, [toast]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <TopBar active="plans" />

      {contactPlan && (
        <ContactModal plan={contactPlan} onClose={() => setContactPlan(null)} />
      )}

      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", padding: "48px 24px 64px", width: "100%" }}>
        {/* Page header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="caps-xs" style={{ color: "var(--muted)", letterSpacing: "0.12em", marginBottom: 10 }}>
            SUBSCRIPTION PLANS
          </div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px,5vw,42px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
            Chọn gói phù hợp
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 480, margin: "0 auto" }}>
            1 credit = 1 ảnh dịch = 1 câu hỏi Q&A.
            Credit miễn phí tự động nạp lại mỗi ngày.
          </p>

          {user && (
            <div style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", border: "1.5px solid var(--border-soft)", background: "var(--bg-2)", fontSize: 13, color: "var(--fg-soft)", flexWrap: "wrap" }}>
              Số dư hiện tại:
              <strong style={{ color: "var(--fg)", fontSize: 15 }}>{user.credits_balance} credit</strong>
              <span style={{ color: "var(--border-soft)" }}>·</span>
              Gói: <strong style={{ color: PLAN_COLORS[currentPlan] ?? "var(--muted)" }}>{currentPlan.toUpperCase()}</strong>
              {currentPlan !== "free" && (
                <>
                  <span style={{ color: "var(--border-soft)" }}>·</span>
                  <button type="button" onClick={handleManageBilling} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                    Quản lý thanh toán →
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Plan cards */}
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: "60px 0", fontSize: 14 }}>
            Đang tải...
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 20,
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={currentPlan === plan.id}
                onContact={handleUpgrade}
              />
            ))}
          </div>
        )}

        {/* Credit packs section */}
        <div style={{ marginTop: 60, maxWidth: 700, margin: "60px auto 0" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
            Mua thêm credit
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
            Dùng cho tất cả các gói. Credit mua không hết hạn.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            {[
              { credits: 50,   price: "19.000đ" },
              { credits: 150,  price: "49.000đ" },
              { credits: 500,  price: "149.000đ" },
              { credits: 1500, price: "399.000đ" },
            ].map(pack => (
              <div
                key={pack.credits}
                style={{
                  border: "2px solid var(--border)",
                  padding: "16px 14px",
                  textAlign: "center",
                  background: "var(--panel)",
                  opacity: 0.6,
                  cursor: "not-allowed",
                }}
                title="Sắp ra mắt"
              >
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-serif)" }}>
                  {pack.credits.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>credits</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{pack.price}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>Sắp ra mắt</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 60, maxWidth: 620, margin: "60px auto 0" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, marginBottom: 24 }}>
            Câu hỏi thường gặp
          </h2>
          {[
            {
              q: "1 credit tính như thế nào?",
              a: "1 credit = 1 ảnh manga được dịch (bao gồm OCR + AI dịch thuật + render chữ) hoặc 1 câu hỏi Q&A với AI."
            },
            {
              q: "Credit miễn phí có hết hạn không?",
              a: "Credit miễn phí được nạp lại mỗi ngày (5 credit/ngày lúc 00:00 giờ Việt Nam). Credit không dùng hôm nay không tích lũy sang ngày mai."
            },
            {
              q: "Credit gói trả phí có hết hạn không?",
              a: "Credit từ gói trả phí không hết hạn theo ngày — bạn dùng dần trong tháng. Sang tháng mới sẽ được cộng thêm credits mới."
            },
            {
              q: "Thanh toán bằng gì?",
              a: "Hiện tại đang trong giai đoạn beta. Liên hệ admin qua email để đăng ký gói — gói sẽ được kích hoạt thủ công sau khi xác nhận thanh toán. Tích hợp MoMo/ZaloPay sẽ sớm ra mắt."
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                borderTop: i === 0 ? "2px solid var(--border)" : "1px solid var(--border-soft)",
                padding: "16px 0",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{item.q}</div>
              <div style={{ color: "var(--fg-soft)", fontSize: 13, lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>

        {!user && (
          <div style={{ marginTop: 48, textAlign: "center" }}>
            <Link href="/register" style={{ textDecoration: "none" }}>
              <button className="btn btn-primary" style={{ padding: "11px 28px", fontSize: 14, fontWeight: 700 }}>
                Đăng ký miễn phí →
              </button>
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
