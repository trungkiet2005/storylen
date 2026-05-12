import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "StoryLens — Đọc Manga Không Rào Cản Ngôn Ngữ",
  description:
    "Nền tảng dịch manga Nhật–Việt thông minh: phát hiện bubble tự động với YOLOv8, dịch ngữ cảnh qua Gemini AI, hỏi đáp RAG về nội dung truyện.",
  keywords: ["manga", "dịch manga", "OCR manga", "StoryLens", "Gemini AI", "RAG Q&A"],
  openGraph: {
    title: "StoryLens — Đọc Manga Như Người Nhật",
    description:
      "Dịch manga tiếng Nhật sang tiếng Việt bằng AI. Giữ nguyên nhịp điệu, ngữ khí, và giọng văn gốc.",
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
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
        {/* Film grain overlay */}
        <div className="grain-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
