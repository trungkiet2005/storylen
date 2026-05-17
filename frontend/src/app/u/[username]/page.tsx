import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icons";

/**
 * Public profile page (Tier C). Anonymous, indexable.
 *
 * Only renders for users who have at least one published chapter — otherwise
 * the API returns 404, which we forward via notFound().
 */

export const revalidate = 300;

interface ProfileSeries {
  series_id: string;
  title: string;
  cover_image_url: string | null;
  tags: string[];
  published_chapter_count: number;
  latest_published_at: string | null;
}

interface RecentChapter {
  chapter_id: string;
  series_id: string;
  series_title: string | null;
  chapter_number: number | null;
  title: string | null;
  published_at: string | null;
}

interface PublicProfile {
  username: string;
  avatar_url: string | null;
  bio: string | null;
  joined_at: string;
  published_series: ProfileSeries[];
  total_published_chapters: number;
  recent_chapters: RecentChapter[];
}

async function fetchProfile(username: string): Promise<PublicProfile | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/v1";
  try {
    const res = await fetch(`${base}/u/${encodeURIComponent(username)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicProfile;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchProfile(username);
  if (!profile) return { title: "Không tìm thấy người dùng · StoryLens" };
  const title = `@${profile.username} · StoryLens`;
  const description =
    profile.bio ||
    `Hồ sơ công khai của ${profile.username} trên StoryLens — đã publish ${profile.total_published_chapters} chương.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
  };
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "hôm nay";
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  const years = Math.floor(days / 365);
  return `${years} năm trước`;
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await fetchProfile(username);
  if (!profile) notFound();

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 80px" }}>
        {/* Header */}
        <div className="stroke-ink-thick panel-shadow-lg" style={{ background: "var(--panel)", padding: "20px 24px", display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", marginBottom: 24 }}>
          <div
            style={{
              width: 80, height: 80, flexShrink: 0,
              background: "var(--bg-2)", border: "2.5px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                width={80}
                height={80}
                unoptimized
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Icon name="user" size={32} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="display" style={{ fontSize: 26, fontWeight: 800 }}>@{profile.username}</div>
            <div style={{ fontSize: 13, color: "var(--fg-soft)", marginTop: 4, lineHeight: 1.5 }}>
              {profile.bio || <em style={{ color: "var(--muted)" }}>Người dùng chưa viết giới thiệu.</em>}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span>📚 {profile.published_series.length} bộ truyện</span>
              <span>📖 {profile.total_published_chapters} chương đã publish</span>
              <span>📅 Tham gia {timeAgo(profile.joined_at)}</span>
            </div>
          </div>
        </div>

        {/* Series */}
        <section style={{ marginBottom: 28 }}>
          <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>BỘ TRUYỆN ĐÃ PUBLISH</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {profile.published_series.map(s => (
              <Link key={s.series_id} href={`/library/${s.series_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <article className="stroke-ink panel-shadow" style={{ background: "var(--panel)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{ aspectRatio: "3/4", background: "var(--bg-2)", position: "relative" }}>
                    {s.cover_image_url ? (
                      <Image
                        src={s.cover_image_url}
                        alt={s.title}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 180px"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                        <Icon name="image" size={28} />
                      </div>
                    )}
                  </div>
                  <div style={{ padding: 10 }}>
                    <h2 style={{ fontWeight: 700, fontSize: 13, margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {s.title}
                    </h2>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4 }}>
                      {s.published_chapter_count} chương · {timeAgo(s.latest_published_at)}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent activity */}
        {profile.recent_chapters.length > 0 && (
          <section>
            <div className="caps-xs" style={{ color: "var(--accent)", marginBottom: 10 }}>HOẠT ĐỘNG GẦN ĐÂY</div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {profile.recent_chapters.map(c => (
                <li
                  key={c.chapter_id}
                  className="stroke-ink"
                  style={{ background: "var(--panel)", padding: "10px 14px", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}
                >
                  <Link href={`/library/${c.series_id}`} style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
                    {c.series_title}
                  </Link>
                  <span style={{ fontSize: 12, color: "var(--fg-soft)", flex: 1, minWidth: 120 }}>
                    Chương {c.chapter_number}{c.title ? ` · ${c.title}` : ""}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {timeAgo(c.published_at)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
