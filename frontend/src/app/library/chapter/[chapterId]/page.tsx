import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icons";
import { ChapterComments } from "@/components/ChapterComments";

/**
 * Public chapter reader. Long-strip rendering (server-side, no JS needed to
 * see the pages — JS only enhances comments). Anonymous-readable.
 */

export const revalidate = 300;

interface PublicChapterMeta {
  chapter_id: string;
  series_id: string;
  chapter_number: number | null;
  title: string | null;
  published_at: string;
}

interface PublicChapterPage {
  page_id: string;
  page_number: number | null;
  original_image_url: string | null;
  thumbnail_url: string | null;
}

interface ChapterPagesResponse {
  chapter: PublicChapterMeta;
  pages: PublicChapterPage[];
}

interface SeriesMeta {
  series_id: string;
  title: string;
}

async function fetchChapterPages(chapterId: string): Promise<ChapterPagesResponse | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/v1";
  try {
    const res = await fetch(`${base}/library/chapters/${encodeURIComponent(chapterId)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ChapterPagesResponse;
  } catch {
    return null;
  }
}

async function fetchSeriesMeta(seriesId: string): Promise<SeriesMeta | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/v1";
  try {
    const res = await fetch(`${base}/library/${encodeURIComponent(seriesId)}/chapters`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.series ? { series_id: data.series.series_id, title: data.series.title } : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}): Promise<Metadata> {
  const { chapterId } = await params;
  const data = await fetchChapterPages(chapterId);
  if (!data) return { title: "Không tìm thấy chương · StoryLens" };

  const seriesMeta = await fetchSeriesMeta(data.chapter.series_id);
  const seriesTitle = seriesMeta?.title || "StoryLens";
  const chapterLabel = data.chapter.title
    ? `Chương ${data.chapter.chapter_number ?? "?"} — ${data.chapter.title}`
    : `Chương ${data.chapter.chapter_number ?? "?"}`;

  const title = `${seriesTitle} · ${chapterLabel} · StoryLens`;
  const description = `${seriesTitle} ${chapterLabel}. ${data.pages.length} trang đã dịch sang tiếng Việt, đọc miễn phí.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
  };
}

export default async function PublicChapterReaderPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  const data = await fetchChapterPages(chapterId);
  if (!data) notFound();

  const { chapter, pages } = data;
  const seriesMeta = await fetchSeriesMeta(chapter.series_id);

  return (
    <>
      <TopBar active="library" />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 80px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap", fontSize: 12 }}>
          <Link href="/library" style={{ color: "var(--muted)", textDecoration: "none" }}>
            Thư viện
          </Link>
          <span style={{ color: "var(--muted)" }}>/</span>
          <Link
            href={`/library/${chapter.series_id}`}
            style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
          >
            {seriesMeta?.title || "Bộ truyện"}
          </Link>
          <span style={{ color: "var(--muted)" }}>/</span>
          <span style={{ fontWeight: 600 }}>
            Chương {chapter.chapter_number ?? "?"}
            {chapter.title ? ` — ${chapter.title}` : ""}
          </span>
          <div style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            {pages.length} trang
          </span>
        </div>

        {/* Pages (long-strip) */}
        {pages.length === 0 ? (
          <div className="stroke-ink" style={{ background: "var(--panel)", padding: 32, textAlign: "center", color: "var(--muted)" }}>
            <Icon name="alert" size={24} />
            <div style={{ marginTop: 10, fontSize: 13 }}>Chương này chưa có trang nào hoàn thành.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pages.map((p, i) => {
              const imageUrl = p.original_image_url || p.thumbnail_url;
              if (!imageUrl) return null;
              return (
                <div
                  key={p.page_id}
                  className="stroke-ink panel-shadow"
                  style={{
                    background: "var(--panel)",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Image
                    src={imageUrl}
                    alt={`Trang ${p.page_number ?? i + 1}`}
                    width={900}
                    height={1300}
                    unoptimized
                    sizes="(max-width: 900px) 100vw, 900px"
                    priority={i < 2}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Back link */}
        <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <Link
            href={`/library/${chapter.series_id}`}
            className="btn btn-sm"
            style={{ textDecoration: "none" }}
          >
            <Icon name="arrow-left" size={11} /> Quay lại danh sách chương
          </Link>
          <Link href="/register" className="btn btn-sm btn-primary" style={{ textDecoration: "none" }}>
            Dịch truyện của riêng bạn →
          </Link>
        </div>

        {/* Comments */}
        <ChapterComments chapterId={chapter.chapter_id} />
      </main>
      <Footer />
    </>
  );
}
