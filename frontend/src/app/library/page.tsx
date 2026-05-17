import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icons";

/**
 * Server-rendered public library — anonymous, indexable by Google.
 *
 * Tag + sort filters use searchParams so each filter URL is its own crawlable
 * page. Revalidates every 5 minutes so newly-published chapters appear soon.
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
  trending_score?: number;
  latest_published_at: string | null;
}

interface LibraryResponse {
  total: number;
  items: LibrarySeriesItem[];
  all_tags?: string[];
}

type LibrarySort = "recent" | "trending";

async function fetchLibrary(sort: LibrarySort, tag?: string): Promise<LibraryResponse> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/v1";
  const params = new URLSearchParams({ limit: "60", sort });
  if (tag) params.set("tag", tag);
  try {
    const res = await fetch(`${base}/library?${params.toString()}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { total: 0, items: [], all_tags: [] };
    return (await res.json()) as LibraryResponse;
  } catch {
    return { total: 0, items: [], all_tags: [] };
  }
}

function jsonLd(items: LibrarySeriesItem[], siteUrl: string) {
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

function filterHref(sort: LibrarySort, tag: string | null): string {
  const params = new URLSearchParams();
  if (sort !== "recent") params.set("sort", sort);
  if (tag) params.set("tag", tag);
  const qs = params.toString();
  return qs ? `/library?${qs}` : "/library";
}

export default async function PublicLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const sort: LibrarySort = sp.sort === "trending" ? "trending" : "recent";
  const activeTag = (sp.tag || "").trim() || null;

  const data = await fetchLibrary(sort, activeTag || undefined);
  const items = data.items;
  const allTags = data.all_tags || [];
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://storylens.app").replace(/\/$/, "");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(items, siteUrl)) }}
      />
      <TopBar active="library" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 80px" }}>
        <header style={{ marginBottom: 18 }}>
          <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 6 }}>
            PUBLIC LIBRARY
          </div>
          <h1 className="display" style={{ fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-0.02em" }}>
            Thư viện công khai
          </h1>
          <p style={{ fontSize: 14, color: "var(--fg-soft)", marginTop: 6 }}>
            {items.length > 0
              ? `${items.length} bộ truyện${activeTag ? ` · #${activeTag}` : ""} — đọc tự do, không cần đăng nhập.`
              : "Các bộ truyện được publish sẽ xuất hiện ở đây."}
          </p>
        </header>

        {/* Sort + tag toolbar */}
        {(items.length > 0 || activeTag) && (
          <div style={{ marginBottom: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Sort tabs */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="caps-xs" style={{ color: "var(--muted)" }}>Sắp xếp</span>
              <div style={{ display: "flex", border: "1.5px solid var(--border)", background: "var(--panel)" }}>
                {(["recent", "trending"] as LibrarySort[]).map((s, i) => {
                  const isActive = sort === s;
                  return (
                    <Link
                      key={s}
                      href={filterHref(s, activeTag)}
                      prefetch={false}
                      style={{
                        padding: "6px 12px", fontSize: 12, fontWeight: 600,
                        background: isActive ? "var(--accent)" : "transparent",
                        color: isActive ? "#fff" : "var(--fg)",
                        textDecoration: "none",
                        borderRight: i === 0 ? "1.5px solid var(--border)" : "none",
                        display: "inline-flex", alignItems: "center", gap: 5,
                      }}
                    >
                      <Icon name={s === "trending" ? "fire" : "clock"} size={11} />
                      {s === "recent" ? "Mới nhất" : "Trending (7 ngày)"}
                    </Link>
                  );
                })}
              </div>
              {activeTag && (
                <Link
                  href={filterHref(sort, null)}
                  prefetch={false}
                  className="btn btn-sm btn-ghost"
                  style={{ fontSize: 11, padding: "4px 8px", textDecoration: "none" }}
                >
                  <Icon name="close" size={10} /> Bỏ lọc #{activeTag}
                </Link>
              )}
            </div>

            {/* Tag chips */}
            {allTags.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="caps-xs" style={{ color: "var(--muted)" }}>Thể loại</span>
                {allTags.slice(0, 20).map(t => {
                  const isActive = activeTag === t;
                  return (
                    <Link
                      key={t}
                      href={filterHref(sort, isActive ? null : t)}
                      prefetch={false}
                      style={{
                        fontSize: 11, padding: "3px 8px",
                        background: isActive ? "var(--accent)" : "var(--bg-2)",
                        color: isActive ? "#fff" : "var(--fg-soft)",
                        border: "1.5px solid var(--border-soft)",
                        textDecoration: "none",
                      }}
                    >
                      #{t}
                    </Link>
                  );
                })}
                {allTags.length > 20 && (
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>… +{allTags.length - 20}</span>
                )}
              </div>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div className="stroke-ink" style={{ padding: 32, textAlign: "center", color: "var(--muted)", background: "var(--panel)" }}>
            <Icon name="book" size={28} />
            <p style={{ marginTop: 12, fontSize: 14 }}>
              {activeTag
                ? `Không có bộ nào gắn tag #${activeTag}.`
                : "Chưa có bộ truyện nào được publish. Trở thành tác giả đầu tiên — upload + publish chapter của bạn để xuất hiện ở đây."}
            </p>
            <Link href={activeTag ? "/library" : "/upload"} className="btn btn-primary" style={{ marginTop: 16 }}>
              {activeTag ? "Xem tất cả" : "Tải truyện lên →"}
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {items.map((s) => (
              <Link key={s.series_id} href={`/library/${s.series_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <article className="stroke-ink panel-shadow" style={{ background: "var(--panel)", overflow: "hidden", borderRadius: "var(--radius-sm)", height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
                  {sort === "trending" && (s.trending_score ?? 0) > 0 && (
                    <div
                      className="mono"
                      style={{
                        position: "absolute", top: 6, right: 6, zIndex: 1,
                        background: "var(--accent)", color: "#fff",
                        padding: "2px 6px", fontSize: 10, fontWeight: 700,
                      }}
                    >
                      🔥 {s.trending_score}
                    </div>
                  )}
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
                    {s.tags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>
                        {s.tags.slice(0, 3).map(t => (
                          <span key={t} style={{ fontSize: 9, color: "var(--muted)", padding: "1px 5px", background: "var(--bg-3)", border: "1px solid var(--border-soft)" }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
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
