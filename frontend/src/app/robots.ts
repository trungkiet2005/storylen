import type { MetadataRoute } from "next";

// Block crawlers from authenticated areas; let them index public marketing pages.
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://storylens.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/browse", "/login", "/register"],
        disallow: [
          "/admin",
          "/admin/*",
          "/upload",
          "/reader",
          "/studio",
          "/studio/*",
          "/history",
          "/profile",
          "/settings",
          "/qa",
          "/api/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
