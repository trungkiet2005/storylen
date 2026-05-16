import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng · StoryLens",
  description: "Điều khoản và điều kiện sử dụng dịch vụ StoryLens.",
};

const LAST_UPDATED = "16 tháng 5, 2026";

export default function TermsPage() {
  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 8 }}>
          LEGAL · TERMS OF SERVICE
        </div>
        <h1 className="display" style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.02em" }}>
          Điều khoản sử dụng
        </h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
          Cập nhật lần cuối: {LAST_UPDATED}
        </p>

        <Section title="1. Chấp nhận điều khoản">
          Bằng việc tạo tài khoản hoặc sử dụng StoryLens (&ldquo;Dịch vụ&rdquo;), bạn đồng ý
          tuân thủ các Điều khoản dưới đây. Nếu không đồng ý, vui lòng không sử dụng Dịch vụ.
        </Section>

        <Section title="2. Mô tả Dịch vụ">
          StoryLens cung cấp công cụ dịch truyện tranh bằng AI (OCR, dịch ngữ cảnh,
          hỏi đáp RAG). Bản dịch do mô hình AI tạo ra <strong>có thể không chính xác hoàn toàn</strong>
          và không thay thế bản dịch chuyên nghiệp.
        </Section>

        <Section title="3. Tài khoản người dùng">
          Bạn chịu trách nhiệm bảo mật mật khẩu và mọi hoạt động phát sinh từ tài khoản của mình.
          Vui lòng thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép.
        </Section>

        <Section title="4. Nội dung do người dùng tải lên">
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.7 }}>
            <li>Bạn chỉ được tải lên truyện mà bạn có quyền sử dụng (sở hữu, được cấp phép, hoặc thuộc phạm vi public domain).</li>
            <li>Bạn cấp cho StoryLens quyền không độc quyền để lưu trữ, xử lý và hiển thị nội dung phục vụ Dịch vụ.</li>
            <li>Chúng tôi <strong>không</strong> sở hữu nội dung của bạn. Bạn có thể yêu cầu xoá bất cứ lúc nào.</li>
            <li>Nội dung vi phạm bản quyền sẽ bị gỡ theo quy trình DMCA. Liên hệ <a href="mailto:legal@storylens.app">legal@storylens.app</a>.</li>
          </ul>
        </Section>

        <Section title="5. Hành vi bị cấm">
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.7 }}>
            <li>Tải lên nội dung vi phạm pháp luật Việt Nam hoặc bản quyền của bên thứ ba.</li>
            <li>Cố tình lạm dụng API (DDoS, scraping hàng loạt, vượt rate limit).</li>
            <li>Sử dụng StoryLens để tạo nội dung 18+, bạo lực, kích động thù hận.</li>
            <li>Bán lại / phân phối Dịch vụ mà không có thoả thuận bằng văn bản.</li>
          </ul>
        </Section>

        <Section title="6. Gói trả phí & Credit">
          Credit miễn phí (5/ngày tier FREE) tự động nạp lại lúc 00:00 giờ Việt Nam.
          Credit gói trả phí có hiệu lực 30 ngày kể từ ngày thanh toán. Chúng tôi
          <strong> không hoàn lại</strong> credit đã sử dụng. Hủy gói có hiệu lực từ chu kỳ tiếp theo.
        </Section>

        <Section title="7. Giới hạn trách nhiệm">
          Dịch vụ được cung cấp &ldquo;NGUYÊN TRẠNG&rdquo;. StoryLens không chịu trách nhiệm cho:
          gián đoạn dịch vụ, mất dữ liệu, hoặc thiệt hại gián tiếp phát sinh từ việc sử dụng Dịch vụ.
          Trách nhiệm tối đa của chúng tôi không vượt quá số tiền bạn đã trả trong 12 tháng gần nhất.
        </Section>

        <Section title="8. Chấm dứt tài khoản">
          Bạn có thể tự xoá tài khoản tại{" "}
          <Link href="/profile/security" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            Bảo mật &amp; Tài khoản
          </Link>
          . Chúng tôi có quyền tạm khoá hoặc xoá tài khoản vi phạm Điều khoản mà không cần báo trước.
        </Section>

        <Section title="9. Thay đổi điều khoản">
          Chúng tôi có thể cập nhật Điều khoản. Thay đổi có hiệu lực sau 7 ngày kể từ khi đăng tải;
          tiếp tục sử dụng Dịch vụ sau thời gian đó đồng nghĩa với chấp nhận phiên bản mới.
        </Section>

        <Section title="10. Liên hệ">
          Mọi câu hỏi pháp lý: <a href="mailto:legal@storylens.app">legal@storylens.app</a>.
          Hỗ trợ kỹ thuật: <a href="mailto:support@storylens.app">support@storylens.app</a>.
        </Section>

        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 40, padding: "16px 0", borderTop: "1px solid var(--border-soft)" }}>
          Xem thêm:{" "}
          <Link href="/privacy" style={{ color: "var(--fg-soft)", textDecoration: "underline" }}>Chính sách bảo mật</Link>{" "}·{" "}
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
