import type { MetadataRoute } from "next";

// Static routes only. Dynamic per-manga / per-series pages stream from the
// backend at runtime and aren't worth eager-indexing on the marketing surface.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://storylens.app").replace(/\/$/, "");
  const now = new Date();
  const entries: { path: string; changeFreq: "daily" | "weekly" | "monthly"; priority: number }[] = [
    { path: "/",         changeFreq: "weekly",  priority: 1.0 },
    { path: "/browse",   changeFreq: "daily",   priority: 0.9 },
    { path: "/login",    changeFreq: "monthly", priority: 0.4 },
    { path: "/register", changeFreq: "monthly", priority: 0.4 },
    { path: "/plans",    changeFreq: "monthly", priority: 0.6 },
  ];
  return entries.map((e) => ({
    url: `${base}${e.path}`,
    lastModified: now,
    changeFrequency: e.changeFreq,
    priority: e.priority,
  }));
}
