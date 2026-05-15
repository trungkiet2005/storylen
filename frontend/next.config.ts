import type { NextConfig } from "next";

// Where the browser is allowed to talk to. Backend API is configurable per-env;
// MangaDex CDN is whitelisted because covers + chapter pages stream from there.
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/v1").origin;
  } catch {
    return "https://storylens-api.onrender.com";
  }
})();

const connectSrc = [
  "'self'",
  apiOrigin,
  "https://*.supabase.co",
  "https://api.mangadex.org",
  "wss:",  // backend WebSocket progress channel (added in this pass)
].join(" ");

const imgSrc = [
  "'self'",
  "data:",
  "blob:",
  apiOrigin,
  "https://*.supabase.co",
  "https://uploads.mangadex.org",
  "https://*.mangadex.network",
  "https://*.mangaread.org",
  "https://www.mangaread.org",
].join(" ");

const securityHeaders = [
  // Block clickjacking. SAMEORIGIN since we don't embed ourselves.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Stop browsers from sniffing a different content-type than declared.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs (including query params with tokens) to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Force HTTPS on every subdomain for 2 years; preload-eligible.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Lock down powerful APIs we never use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // CSP — kept generous enough for framer-motion inline styles + dev tooling.
  // 'unsafe-inline' in style-src is unavoidable while we use inline style={} attrs
  // everywhere. Revisit when components migrate to CSS Modules / nonces.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `connect-src ${connectSrc}`,
      `img-src ${imgSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "font-src 'self' data:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Allow Next.js's built-in <Image> to optimise remote MangaDex / Supabase images.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "uploads.mangadex.org" },
      { protocol: "https", hostname: "*.mangadex.network" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "www.mangaread.org" },
    ],
  },
};

export default nextConfig;
