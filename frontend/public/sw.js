/* StoryLens service worker — minimal offline shell.
 *
 * Strategy:
 *   - **Static assets** (images, fonts, /_next/static/*): cache-first.
 *   - **API requests** (/v1/*): network-only — never cache user data.
 *   - **HTML navigations**: network-first with offline fallback to /offline.
 *
 * Versioning: bump CACHE_VERSION when shipping breaking changes; old caches
 * are pruned on activate.
 */

const CACHE_VERSION = "v1-2026-05-16";
const STATIC_CACHE = `storylens-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `storylens-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((err) => {
        // Don't block install if optional URLs fail (e.g. /offline not yet built).
        console.warn("[sw] precache failed for some entries:", err);
      }),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/wallpapers/") ||
    url.pathname.startsWith("/images/") ||
    /\.(?:woff2?|ttf|otf|css|js|svg|png|jpg|jpeg|webp|avif|ico)$/i.test(url.pathname)
  );
}

function isApiRequest(url) {
  // The backend API is on a different origin; same-origin /api routes are
  // typically Next.js internals. Treat both as bypass-cache to be safe.
  return url.pathname.startsWith("/api/") || url.pathname.includes("/v1/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Cross-origin: never intervene (Supabase / CDN / Sentry handle their own headers).
  if (url.origin !== self.location.origin) return;

  if (isApiRequest(url)) return; // network-only

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(OFFLINE_URL).then(
          (r) => r || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } }),
        ),
      ),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            // Only cache successful, basic-type responses (skip opaque / no-cors mishaps).
            if (res && res.status === 200 && res.type === "basic") {
              const copy = res.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
