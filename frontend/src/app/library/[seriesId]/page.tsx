import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icons";

/**
 * Public series detail page. Anonymous-readable. SSR + revalidate so Google
 * indexes one card per published series with its chapter list.
 */

export const revalidate = 300;

interface PublicSeries {
  series_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  author: string | null;
  tags: string[];
}

interface PublicChapter {
  chapter_id: string;
  chapter_number: number | null;
  title: string | null;
  published_at: string | null;
  cover_image_url: string | null;
}

interface SeriesChaptersResponse {
  series: PublicSeries;
  chapters: PublicChapter[];
}

async function fetchSeriesChapters(seriesId: string): Promise<SeriesChaptersResponse | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/v1";
  try {
    const res = await fetch(`${base}/library/${encodeURIComponent(seriesId)}/chapters`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as SeriesChaptersResponse;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}): Promise<Metadata> {
  const { seriesId } = await params;
  const data = await fetchSeriesChapters(seriesId);
  if (!data) return { title: "Không tìm thấy bộ truyện · StoryLens" };
  const { series } = data;
  const title = `${series.title} · StoryLens`;
  const description =
    series.description ||
    `${series.title}${series.author ? ` — ${series.author}` : ""}. ${data.chapters.length} chương đã publish, đọc miễn phí.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "book",
      images: series.cover_image_url ? [series.cover_image_url] : undefined,
    },
  };
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d < 1) return "hôm nay";
  if (d < 30) return `${d} ngày trước`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m} tháng trước`;
  return `${Math.floor(d / 365)} năm trước`;
}

export default async function PublicSeriesDetailPage({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}) {
  const { seriesId } = await params;
  const data = await fetchSeriesChapters(seriesId);
  if (!data) notFound();

  const { series, chapters } = data;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://storylens.app").replace(/\/$/, "");

  // JSON-LD for richer Google results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: series.title,
    author: series.author ?? undefined,
    description: series.description ?? undefined,
    image: series.cover_image_url ?? undefined,
    url: `${siteUrl}/library/${series.series_id}`,
    workExample: chapters.slice(0, 20).map(c => ({
      "@type": "Chapter",
      name: c.title || `Chương ${c.chapter_number ?? "?"}`,
      url: `${siteUrl}/library/chapter/${c.chapter_id}`,
      datePublished: c.published_at ?? undefined,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TopBar active="library" />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 80px" }}>
        <div style={{ marginBottom: 12 }}>
          <Link href="/library" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Icon name="arrow-left" size={11} /> Thư viện công khai
          </Link>
        </div>

        {/* Series header */}
        <div
          className="stroke-ink-thick panel-shadow-lg"
          style={{
            background: "var(--panel)",
            padding: "20px 24px",
            display: "grid",
            gridTemplateColumns: "180px 1fr",
            gap: 24,
            marginBottom: 28,
            alignItems: "start",
          }}
        >
          <div style={{ aspectRatio: "3/4", background: "var(--bg-2)", position: "relative", border: "2px solid var(--border)" }}>
            {series.cover_image_url ? (
              <Image
                src={series.cover_image_url}
                alt={series.title}
                fill
                unoptimized
                sizes="180px"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                <Icon name="image" size={32} />
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            <h1 className="display" style={{ fontSize: "clamp(24px, 3vw, 32px)", letterSpacing: "-0.02em", margin: 0 }}>
              {series.title}
            </h1>
            {series.author && (
              <div style={{ fontSize: 13, color: "var(--fg-soft)" }}>
                Tác giả · <span style={{ fontWeight: 600 }}>{series.author}</span>
              </div>
            )}
            {series.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
                {series.tags.map(t => (
                  <Link
                    key={t}
                    href={`/library?tag=${encodeURIComponent(t)}`}
                    prefetch={false}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      background: "var(--bg-2)",
                      color: "var(--fg-soft)",
                      border: "1.5px solid var(--border-soft)",
                      textDecoration: "none",
                    }}
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}
            {series.description && (
              <p style={{ fontSize: 14, color: "var(--fg-soft)", lineHeight: 1.6, marginTop: 4 }}>
                {series.description}
              </p>
            )}
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
              {chapters.length} chương đã publish
            </div>
          </div>
        </div>

        {/* Chapters */}
        <section>
          <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>DANH SÁCH CHƯƠNG</div>
          {chapters.length === 0 ? (
            <div className="stroke-ink" style={{ background: "var(--panel)", padding: 24, textAlign: "center", color: "var(--muted)" }}>
              Chưa có chương nào được publish.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {chapters.map(c => (
                <li key={c.chapter_id}>
                  <Link
                    href={`/library/chapter/${c.chapter_id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: "var(--panel)",
                      border: "2px solid var(--border)",
                      boxShadow: "2px 2px 0 var(--border)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: 700,
                        background: "var(--accent)",
                        color: "#fff",
                        padding: "3px 9px",
                        flexShrink: 0,
                      }}
                    >
                      Ch.{c.chapter_number ?? "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="serif" style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.title || <span style={{ color: "var(--muted)", fontStyle: "italic", fontWeight: 400 }}>Chưa đặt tên</span>}
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>
                      {timeAgo(c.published_at)}
                    </span>
                    <Icon name="chevron-right" size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
