import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoryLens — Manga Reader AI",
  description: "Read manga without language barriers using contextual AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
