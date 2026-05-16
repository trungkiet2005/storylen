import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Bản quyền & DMCA · StoryLens",
  description: "Chính sách bản quyền và quy trình DMCA của StoryLens.",
};

const LAST_UPDATED = "16 tháng 5, 2026";

export default function CopyrightPage() {
  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 8 }}>
          LEGAL · COPYRIGHT &amp; DMCA
        </div>
        <h1 className="display" style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.02em" }}>
          Bản quyền &amp; DMCA
        </h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
          Cập nhật lần cuối: {LAST_UPDATED}
        </p>

        <Section title="1. StoryLens không sở hữu nội dung user upload">
          Tất cả truyện tranh, ảnh, văn bản người dùng tải lên thuộc về chủ sở hữu hợp pháp.
          StoryLens là <strong>công cụ xử lý</strong>, không phải nhà xuất bản và không yêu cầu
          quyền sở hữu đối với nội dung của bạn.
        </Section>

        <Section title="2. Bạn chịu trách nhiệm về nội dung tải lên">
          Khi tải truyện lên StoryLens, bạn cam kết:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.7 }}>
            <li>Bạn là tác giả/chủ sở hữu, HOẶC</li>
            <li>Bạn được tác giả cấp phép sử dụng, HOẶC</li>
            <li>Tác phẩm thuộc public domain / fair use cho mục đích cá nhân không phát tán.</li>
          </ul>
          Vi phạm sẽ bị gỡ nội dung và có thể bị khoá tài khoản.
        </Section>

        <Section title="3. Quy trình DMCA — Gửi yêu cầu gỡ nội dung">
          Nếu bạn là chủ sở hữu bản quyền và phát hiện nội dung vi phạm trên StoryLens,
          vui lòng gửi email đến <a href="mailto:dmca@storylens.app">dmca@storylens.app</a>{" "}
          với các thông tin sau:
          <ol style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.7 }}>
            <li>Họ tên + chữ ký (điện tử) của bạn hoặc đại diện được uỷ quyền.</li>
            <li>Mô tả tác phẩm có bản quyền (tên truyện, tác giả, ISBN/ID nếu có).</li>
            <li>URL chính xác trên StoryLens dẫn đến nội dung vi phạm (ví dụ <code>storylens.app/reader/...</code>).</li>
            <li>Thông tin liên hệ: email + số điện thoại + địa chỉ.</li>
            <li>Tuyên bố bạn tin rằng việc sử dụng nội dung không được uỷ quyền.</li>
            <li>Tuyên bố thông tin chính xác và bạn được uỷ quyền hành động cho chủ sở hữu (dưới hình phạt khai man).</li>
          </ol>
          Chúng tôi cam kết phản hồi trong vòng <strong>72 giờ làm việc</strong> và gỡ nội dung
          vi phạm trong tối đa <strong>7 ngày</strong> kể từ ngày nhận được yêu cầu hợp lệ.
        </Section>

        <Section title="4. Counter-notice — Phản hồi nếu nội dung của bạn bị gỡ nhầm">
          Nếu nội dung của bạn bị gỡ và bạn tin đây là nhầm lẫn, gửi counter-notice đến cùng email
          với:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.7 }}>
            <li>Họ tên + chữ ký + thông tin liên hệ.</li>
            <li>URL nội dung đã bị gỡ.</li>
            <li>Bằng chứng quyền sở hữu / cấp phép.</li>
          </ul>
        </Section>

        <Section title="5. Tài sản trí tuệ của StoryLens">
          Mã nguồn, thiết kế UI, tên thương hiệu &ldquo;StoryLens&rdquo;, logo, và tài liệu của
          StoryLens là tài sản của <strong>Dao Sy Duy Minh</strong> (Faculty of IT, VNUHCM-US).
          Mã nguồn open-source phát hành theo giấy phép MIT (xem{" "}
          <a href="https://github.com/trungkiet2005/storylen/blob/main/LICENSE">LICENSE</a> trên GitHub).
        </Section>

        <Section title="6. Wallpaper / hình nền">
          Hình nền hiển thị trên một số trang (home hero, login aside) là ảnh anime
          do người dùng cung cấp / nghệ sĩ fan-art đăng tải công khai. StoryLens không
          tuyên bố quyền sở hữu các ảnh này. Nếu bạn là chủ sở hữu bản quyền và muốn gỡ,
          vui lòng dùng quy trình DMCA mục 3.
        </Section>

        <Section title="7. Vi phạm lặp lại">
          Tài khoản bị nhận ≥3 thông báo DMCA hợp lệ trong 12 tháng sẽ bị khoá vĩnh viễn,
          phù hợp chính sách &ldquo;repeat infringer&rdquo; tiêu chuẩn của DMCA.
        </Section>

        <Section title="8. Liên hệ">
          Designated agent: <a href="mailto:dmca@storylens.app">dmca@storylens.app</a>.
          Câu hỏi pháp lý chung: <a href="mailto:legal@storylens.app">legal@storylens.app</a>.
        </Section>

        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 40, padding: "16px 0", borderTop: "1px solid var(--border-soft)" }}>
          Xem thêm:{" "}
          <Link href="/terms" style={{ color: "var(--fg-soft)", textDecoration: "underline" }}>Điều khoản sử dụng</Link>{" "}·{" "}
          <Link href="/privacy" style={{ color: "var(--fg-soft)", textDecoration: "underline" }}>Chính sách bảo mật</Link>
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
