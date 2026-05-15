import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { WibuProvider } from "@/contexts/WibuContext";
import { AchievementToaster } from "@/components/AchievementToaster";

export const metadata: Metadata = {
  title: "StoryLens — Đọc Truyện Tranh Đa Ngôn Ngữ Bằng AI",
  description:
    "Nền tảng dịch truyện tranh thông minh: phát hiện bubble tự động, dịch ngữ cảnh sâu rộng qua Gemini AI, hỏi đáp RAG về nội dung truyện.",
  keywords: ["truyện tranh", "dịch truyện", "OCR truyện tranh", "StoryLens", "Gemini AI", "RAG Q&A", "dịch thuật AI"],
  openGraph: {
    title: "StoryLens — Đọc Truyện Không Còn Rào Cản",
    description:
      "Dịch truyện tranh đa ngôn ngữ bằng AI tiên tiến. Giữ nguyên ý nghĩa, cảm xúc, và phong cách gốc của tác phẩm.",
    type: "website",
    locale: "vi_VN",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-theme="light">
      <body>
        <AuthProvider>
          <WibuProvider>
            <ToastProvider>
              <AchievementToaster />
              {children}
            </ToastProvider>
          </WibuProvider>
        </AuthProvider>
        {/* Film grain overlay */}
        <div className="grain-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
