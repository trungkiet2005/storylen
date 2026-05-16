import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Chính sách bảo mật · StoryLens",
  description: "Cách StoryLens thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn.",
};

const LAST_UPDATED = "16 tháng 5, 2026";

export default function PrivacyPage() {
  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 8 }}>
          LEGAL · PRIVACY POLICY
        </div>
        <h1 className="display" style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.02em" }}>
          Chính sách bảo mật
        </h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
          Cập nhật lần cuối: {LAST_UPDATED}
        </p>

        <Section title="1. Dữ liệu chúng tôi thu thập">
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.7 }}>
            <li><strong>Tài khoản:</strong> email, username, mật khẩu hash (qua Supabase Auth).</li>
            <li><strong>Hồ sơ tự nguyện:</strong> tên hiển thị, avatar, ngôn ngữ ưa thích, ngày sinh, quốc gia, số điện thoại — chỉ khi bạn điền.</li>
            <li><strong>Nội dung tải lên:</strong> ảnh truyện gốc + bản dịch + metadata bubble (toạ độ, text gốc, text dịch).</li>
            <li><strong>Hoạt động:</strong> lịch sử Q&amp;A, credit, bookmark, achievement, tiến độ đọc.</li>
            <li><strong>Kỹ thuật:</strong> IP, User-Agent (qua server log), cookie phiên đăng nhập.</li>
            <li><strong>Thanh toán:</strong> Stripe Customer ID (nếu có gói trả phí). Số thẻ tín dụng <strong>KHÔNG</strong> bao giờ đi qua server của chúng tôi — Stripe xử lý trực tiếp.</li>
          </ul>
        </Section>

        <Section title="2. Mục đích sử dụng">
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.7 }}>
            <li>Vận hành Dịch vụ (xác thực, lưu trữ truyện, render reader).</li>
            <li>Cải thiện chất lượng AI (chúng tôi dùng nội dung của bạn <strong>chỉ</strong> để dịch trang đó, không huấn luyện mô hình).</li>
            <li>Gửi thông báo trong-app (pipeline xong, achievement, nâng cấp gói).</li>
            <li>Phân tích vô danh (tổng số trang xử lý, latency) để cải thiện hiệu năng.</li>
          </ul>
        </Section>

        <Section title="3. Bên thứ ba">
          Chúng tôi chia sẻ dữ liệu với các nhà cung cấp sau, mỗi bên có chính sách bảo mật riêng:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.7 }}>
            <li><strong>Supabase</strong> — lưu trữ database + storage + auth.</li>
            <li><strong>Google Gemini</strong> — xử lý dịch + RAG (text gốc được gửi đến Gemini API).</li>
            <li><strong>HuggingFace Spaces</strong> — chạy mô hình OCR/inpainting.</li>
            <li><strong>Stripe</strong> — xử lý thanh toán (nếu có gói trả phí).</li>
            <li><strong>Sentry</strong> — báo lỗi runtime (KHÔNG bao gồm nội dung truyện của bạn).</li>
            <li><strong>Vercel + Render</strong> — hosting frontend + backend.</li>
          </ul>
        </Section>

        <Section title="4. Cookie & lưu trữ trình duyệt">
          Chúng tôi dùng:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.7 }}>
            <li><strong>Cookie HTTP-only</strong> để duy trì phiên đăng nhập (không truy cập được từ JavaScript).</li>
            <li><strong>localStorage</strong> để lưu trạng thái UI (theme, ngôn ngữ, trạng thái onboarding, vị trí đọc dở).</li>
          </ul>
          Không có cookie tracking quảng cáo. Không có Google Analytics / Facebook Pixel.
        </Section>

        <Section title="5. Quyền của bạn (GDPR / Luật An toàn Thông tin VN)">
          Bạn có quyền:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.7 }}>
            <li><strong>Truy cập + xuất dữ liệu</strong>: tải JSON full data tại{" "}
              <Link href="/profile/security" style={{ color: "var(--accent)", textDecoration: "underline" }}>Bảo mật &amp; Tài khoản</Link>.
            </li>
            <li><strong>Sửa</strong> hồ sơ tại trang Hồ sơ.</li>
            <li><strong>Xoá</strong> tài khoản vĩnh viễn (cascading delete) tại trang Bảo mật.</li>
            <li><strong>Phản đối / hạn chế xử lý</strong>: liên hệ <a href="mailto:privacy@storylens.app">privacy@storylens.app</a>.</li>
            <li><strong>Khiếu nại</strong> với cơ quan có thẩm quyền (Cục An toàn Thông tin Việt Nam, hoặc cơ quan DPA của bạn).</li>
          </ul>
        </Section>

        <Section title="6. Bảo mật">
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.7 }}>
            <li>Mật khẩu chỉ lưu dưới dạng hash bcrypt qua Supabase Auth.</li>
            <li>Tất cả request frontend ↔ backend qua HTTPS.</li>
            <li>Cookie phiên: HTTP-only + Secure + SameSite=none cho cross-domain.</li>
            <li>Row Level Security (RLS) bật trên mọi bảng chứa dữ liệu user.</li>
            <li>Rate-limit trên endpoint nhạy cảm (login, register, upload, QA).</li>
          </ul>
        </Section>

        <Section title="7. Lưu trữ dữ liệu">
          Dữ liệu được lưu cho đến khi bạn yêu cầu xoá hoặc tài khoản không hoạt động quá 24 tháng
          (sẽ có email thông báo trước khi xoá tự động).
        </Section>

        <Section title="8. Trẻ em">
          Dịch vụ không dành cho người dưới 13 tuổi. Nếu phát hiện tài khoản của trẻ em,
          chúng tôi sẽ xoá ngay khi nhận được báo cáo.
        </Section>

        <Section title="9. Thay đổi chính sách">
          Khi cập nhật chính sách, chúng tôi sẽ thông báo qua email + banner trên trang chủ
          ít nhất 7 ngày trước khi có hiệu lực.
        </Section>

        <Section title="10. Liên hệ">
          Mọi câu hỏi về bảo mật: <a href="mailto:privacy@storylens.app">privacy@storylens.app</a>.
        </Section>

        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 40, padding: "16px 0", borderTop: "1px solid var(--border-soft)" }}>
          Xem thêm:{" "}
          <Link href="/terms" style={{ color: "var(--fg-soft)", textDecoration: "underline" }}>Điều khoản sử dụng</Link>{" "}·{" "}
          <Link href="/copyright" style={{ color: "var(--fg-soft)", textDecoration: "underline" }}>Bản quyền</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-serif)", marginBottom: 8 }}>{title}</h2>
      <div style={{ fontSize: 14, color: "var(--fg-soft)", lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}
