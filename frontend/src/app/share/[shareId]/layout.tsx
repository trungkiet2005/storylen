import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://storylens-api.onrender.com/v1";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://storylens.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;

  // Fetch best-effort to enrich the description with the page number.
  // Falls back gracefully if the share endpoint is unreachable at build/crawl time.
  let pageNumber: number | null = null;
  try {
    const res = await fetch(`${API_BASE}/share/${encodeURIComponent(shareId)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      pageNumber = data?.metadata?.page_number ?? null;
    }
  } catch {
    // ignore — fall through to defaults
  }

  const title = pageNumber != null
    ? `Trang #${pageNumber} đã dịch — StoryLens`
    : "Trang truyện đã dịch — StoryLens";
  const description = "Một trang truyện do người dùng StoryLens dịch bằng AI và chia sẻ công khai.";
  const url = `${SITE_URL}/share/${shareId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      locale: "vi_VN",
      // opengraph-image.tsx in this folder is auto-included by Next.js,
      // we don't need to spell `images` here.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: { canonical: url },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
