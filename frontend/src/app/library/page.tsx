import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icons";

/**
 * Server-rendered public library — anonymous, indexable by Google.
 *
 * Why SSR: the library is THE thing we want crawlers to see. Doing it
 * client-side meant a blank page for googlebot. Now every published series
 * shows up in the initial HTML response, with proper meta tags.
 *
 * Revalidates every 5 minutes (`revalidate = 300`) so newly-published
 * chapters appear without being stale.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Thư viện công khai · StoryLens",
  description:
    "Khám phá các bộ truyện tranh đã được dịch và publish bởi cộng đồng StoryLens. Đọc miễn phí, không cần đăng nhập.",
  openGraph: {
    title: "StoryLens — Thư viện công khai",
    description:
      "Truyện tranh đa ngôn ngữ, dịch bằng AI, publish bởi cộng đồng. Đọc miễn phí.",
    type: "website",
  },
};

interface LibrarySeriesItem {
  series_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  author: string | null;
  tags: string[];
  published_chapter_count: number;
  latest_published_at: string | null;
}

interface LibraryResponse {
  total: number;
  items: LibrarySeriesItem[];
}

async function fetchLibrary(): Promise<LibrarySeriesItem[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/v1";
  try {
    const res = await fetch(`${base}/library?limit=60`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data: LibraryResponse = await res.json();
    return data.items;
  } catch {
    return [];
  }
}

function jsonLd(items: LibrarySeriesItem[], siteUrl: string) {
  // Structured data so Google can render a rich card per series.
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "StoryLens — Thư viện công khai",
    description:
      "Truyện tranh đa ngôn ngữ, dịch bằng AI, publish bởi cộng đồng StoryLens.",
    url: `${siteUrl}/library`,
    hasPart: items.slice(0, 20).map((s) => ({
      "@type": "Book",
      name: s.title,
      author: s.author ?? undefined,
      url: `${siteUrl}/library/${s.series_id}`,
      image: s.cover_image_url ?? undefined,
      description: s.description ?? undefined,
      datePublished: s.latest_published_at ?? undefined,
    })),
  };
}

export default async function PublicLibraryPage() {
  const items = await fetchLibrary();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://storylens.app").replace(/\/$/, "");

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD must be unescaped JSON; this is the canonical Next.js pattern.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(items, siteUrl)) }}
      />
      <TopBar active="library" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 80px" }}>
        <header style={{ marginBottom: 24 }}>
          <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 6 }}>
            PUBLIC LIBRARY
          </div>
          <h1 className="display" style={{ fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-0.02em" }}>
            Thư viện công khai
          </h1>
          <p style={{ fontSize: 14, color: "var(--fg-soft)", marginTop: 6 }}>
            {items.length > 0
              ? `${items.length} bộ truyện đã được tác giả publish — đọc tự do, không cần đăng nhập.`
              : "Các bộ truyện được publish sẽ xuất hiện ở đây."}
          </p>
        </header>

        {items.length === 0 ? (
          <div className="stroke-ink" style={{ padding: 32, textAlign: "center", color: "var(--muted)", background: "var(--panel)" }}>
            <Icon name="book" size={28} />
            <p style={{ marginTop: 12, fontSize: 14 }}>
              Chưa có bộ truyện nào được publish. Trở thành tác giả đầu tiên — upload + publish chapter của bạn để xuất hiện ở đây.
            </p>
            <Link href="/upload" className="btn btn-primary" style={{ marginTop: 16 }}>
              Tải truyện lên →
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {items.map((s) => (
              <Link key={s.series_id} href={`/library/${s.series_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <article className="stroke-ink panel-shadow" style={{ background: "var(--panel)", overflow: "hidden", borderRadius: "var(--radius-sm)", height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{ aspectRatio: "3/4", background: "var(--bg-2)", position: "relative" }}>
                    {s.cover_image_url ? (
                      <Image
                        src={s.cover_image_url}
                        alt={s.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 180px"
                        unoptimized
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                        <Icon name="image" size={28} />
                      </div>
                    )}
                  </div>
                  <div style={{ padding: 10 }}>
                    <h2 style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", margin: 0 }}>
                      {s.title}
                    </h2>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4 }}>
                      {s.published_chapter_count} chương
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
