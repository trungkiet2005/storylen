import type { MetadataRoute } from "next";

interface LibraryItem {
  series_id: string;
  latest_published_at: string | null;
}

/**
 * Sitemap covers:
 *   - Static marketing + legal routes (always present)
 *   - Every series in the public library (so newly-published manga is indexed
 *     by search engines without waiting for the next deploy)
 *
 * Library entries are fetched at build time + revalidated every 5 minutes
 * by Next.js's incremental cache, so this stays cheap to serve.
 */

export const revalidate = 300;

async function fetchLibrarySeriesIds(): Promise<LibraryItem[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/v1";
  try {
    const res = await fetch(`${base}/library?limit=1000`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    const items = (data?.items ?? []) as LibraryItem[];
    return items.filter((i) => i?.series_id);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://storylens.app").replace(/\/$/, "");
  const now = new Date();

  const staticPaths: { path: string; changeFreq: "daily" | "weekly" | "monthly"; priority: number }[] = [
    { path: "/",          changeFreq: "weekly",  priority: 1.0 },
    { path: "/browse",    changeFreq: "daily",   priority: 0.9 },
    { path: "/library",   changeFreq: "daily",   priority: 0.9 },
    { path: "/plans",     changeFreq: "monthly", priority: 0.6 },
    { path: "/login",     changeFreq: "monthly", priority: 0.4 },
    { path: "/register",  changeFreq: "monthly", priority: 0.4 },
    { path: "/terms",     changeFreq: "monthly", priority: 0.3 },
    { path: "/privacy",   changeFreq: "monthly", priority: 0.3 },
    { path: "/copyright", changeFreq: "monthly", priority: 0.3 },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((e) => ({
    url: `${base}${e.path}`,
    lastModified: now,
    changeFrequency: e.changeFreq,
    priority: e.priority,
  }));

  const seriesItems = await fetchLibrarySeriesIds();
  const seriesEntries: MetadataRoute.Sitemap = seriesItems.map((s) => ({
    url: `${base}/library/${s.series_id}`,
    lastModified: s.latest_published_at ? new Date(s.latest_published_at) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...seriesEntries];
}
