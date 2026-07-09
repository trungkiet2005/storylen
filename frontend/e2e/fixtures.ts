/**
 * Test fixtures + helpers.
 *
 * `withMockedApi`: intercepts every `/v1/**` request and replies with deterministic
 * JSON. Lets us run the whole UI offline without spinning up Python.
 *
 * `loginAsTestUser`: hydrates an authenticated session by stuffing the auth
 * cookie-shaped response into the AuthContext via /v1/auth/me mock.
 */
import { test as base, expect, type Page } from "@playwright/test";

export const TEST_USER = {
  id: "test-user-uuid",
  username: "duongtest",
  email: "duong+e2e@example.com",
  role: "user" as const,
  full_name: null,
  display_name: "Duong Test",
  avatar_url: null,
  bio: null,
  locale: "vi",
  timezone: "Asia/Ho_Chi_Minh",
  date_of_birth: null,
  gender: null,
  country: null,
  phone: null,
  preferred_target_lang: "VIN",
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-15T00:00:00Z",
  last_seen_at: "2026-05-16T00:00:00Z",
  plan_tier: "free" as const,
  credits_balance: 5,
  daily_credits_reset_at: "2026-05-17T00:00:00Z",
};

export async function withMockedApi(page: Page, opts: { authenticated?: boolean } = {}) {
  const { authenticated = false } = opts;

  // Default 404 for any unmocked /v1 endpoint so missing mocks fail loudly.
  await page.route("**/v1/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const path = new URL(url).pathname.replace(/^.*\/v1/, "");

    // The frontend talks to NEXT_PUBLIC_API_URL (a different origin in CI:
    // http://127.0.0.1:8000) from the page origin (http://localhost:3100).
    // With credentials: "include" + Content-Type: application/json, every POST
    // triggers a CORS preflight. Without proper headers the browser silently
    // rejects the response → fetch throws → request lib retries 8s+15s →
    // assertion times out. We attach matching CORS headers to every fulfill.
    const reqOrigin = route.request().headers()["origin"] ?? "*";
    const cors = {
      "Access-Control-Allow-Origin": reqOrigin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key, cf-turnstile-token, X-Requested-With",
    };
    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: cors });
    }

    // ── Auth ─────────────────────────────────────────────────────────────
    if (path === "/auth/me" && method === "GET") {
      if (authenticated) {
        return route.fulfill({
          status: 200,
          contentType: "application/json", headers: cors,
          body: JSON.stringify({ authenticated: true, user: TEST_USER }),
        });
      }
      return route.fulfill({ status: 401, contentType: "application/json", headers: cors, body: JSON.stringify({ detail: "Chưa đăng nhập." }) });
    }
    if (path === "/auth/login" && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json", headers: cors,
        body: JSON.stringify({ authenticated: true, user: TEST_USER }),
      });
    }
    if (path === "/auth/register" && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json", headers: cors,
        body: JSON.stringify({
          authenticated: false,
          user: TEST_USER,
          requires_email_confirmation: true,
          message: "Tài khoản đã được tạo. Vui lòng kiểm tra email.",
        }),
      });
    }
    if (path === "/auth/logout" && method === "POST") {
      return route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify({ authenticated: false }) });
    }
    if (path === "/auth/forgot-password" && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json", headers: cors,
        body: JSON.stringify({ message: "Nếu email tồn tại, chúng tôi đã gửi liên kết." }),
      });
    }

    // ── Credits / plans ──────────────────────────────────────────────────
    if (path === "/credits" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json", headers: cors,
        body: JSON.stringify({
          plan_tier: "free",
          credits_balance: 5,
          daily_credits_reset_at: "2026-05-17T00:00:00Z",
          plan: null,
          recent_transactions: [],
        }),
      });
    }
    if (path === "/credits/plans" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json", headers: cors,
        body: JSON.stringify([
          { id: "free", name: "Free", price_vnd: 0, monthly_credits: 0, daily_credits: 5, max_batch_size: 5, priority_weight: 1, bonus_credits: 0, sort_order: 0 },
          { id: "basic", name: "Basic", price_vnd: 49000, monthly_credits: 200, daily_credits: 0, max_batch_size: 20, priority_weight: 2, bonus_credits: 50, sort_order: 1 },
        ]),
      });
    }

    // ── Library / catalog ────────────────────────────────────────────────
    if (path === "/library" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json", headers: cors,
        body: JSON.stringify({ total: 0, items: [] }),
      });
    }

    // ── Notifications ────────────────────────────────────────────────────
    if (path.startsWith("/notifications") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json", headers: cors,
        body: JSON.stringify({ total: 0, unread: 0, items: [] }),
      });
    }

    // ── Wibu (gamification) ──────────────────────────────────────────────
    if (path === "/wibu/me" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json", headers: cors,
        body: JSON.stringify({
          bookmarks: [],
          ratings: {},
          reading_lists: {},
          goals: { daily_pages: 20, weekly_pages: 100 },
          stats: {
            total_pages_read: 0,
            total_minutes_read: 0,
            current_streak: 0,
            longest_streak: 0,
            last_read_date: null,
            daily_history: {},
          },
          unlocked_achievement_ids: [],
          progress: [],
        }),
      });
    }

    // ── History ──────────────────────────────────────────────────────────
    if (path.startsWith("/history") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json", headers: cors,
        body: JSON.stringify({ total: 0, items: [] }),
      });
    }

    // ── MangaDex (browse) ────────────────────────────────────────────────
    if (path.startsWith("/mdx/manga/popular")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json", headers: cors,
        body: JSON.stringify({ data: [], total: 0, limit: 24, offset: 0 }),
      });
    }

    // ── Narration / Listen mode ──────────────────────────────────────────
    if (path === "/narrate/voices" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json", headers: cors,
        body: JSON.stringify({
          default_engine: "edge",
          engines: [
            {
              engine: "edge", available: true, is_default: true,
              voices: [
                { id: "vi-VN-HoaiMyNeural", label: "Hoài My (nữ, VN)", locale: "vi-VN", gender: "Female" },
                { id: "vi-VN-NamMinhNeural", label: "Nam Minh (nam, VN)", locale: "vi-VN", gender: "Male" },
              ],
            },
            { engine: "pyttsx3", available: false, is_default: false, voices: [] },
            { engine: "coqui", available: false, is_default: false, voices: [] },
          ],
        }),
      });
    }
    if (path.startsWith("/narrate/page/") && method === "POST") {
      const pid = path.split("/").pop() || "p1";
      return route.fulfill({
        status: 200,
        contentType: "application/json", headers: cors,
        body: JSON.stringify({
          page_id: pid,
          script: "Người hùng bước ra khỏi bóng tối, ánh mắt cương nghị.",
          audio_url: `https://audio.example.com/${pid}.mp3`,
          mime: "audio/mpeg", engine: "edge", voice: "vi-VN-HoaiMyNeural",
          source: "vlm", dialogue_lines: ["Ta đến đây"],
        }),
      });
    }

    // ── Page (reader) ────────────────────────────────────────────────────
    if (/^\/page\/[^/]+$/.test(path) && method === "GET") {
      const pid = path.split("/")[2];
      return route.fulfill({
        status: 200,
        contentType: "application/json", headers: cors,
        body: JSON.stringify({
          page_id: pid,
          original_image_url: `https://img.example.com/${pid}.png`,
          translated_image_url: null,
          thumbnail_url: null,
          status: "translated",
          processed_data: [],
          metadata: { page_number: 1 },
        }),
      });
    }

    // ── Fallback: empty 200 — unmocked feature pings shouldn't block UI ─
    // We log to help diagnose, but never fail (the page may have many
    // tangential calls we don't care about for the test under inspection).
    if (process.env.PW_LOG_MOCK_MISS) {
      console.warn(`[mock miss] ${method} ${path}`);
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json", headers: cors,
      body: JSON.stringify({}),
    });
  });
}

export async function clearStorage(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch { /* ignore */ }
  });
}

/** `page.goto` with sane defaults — wait for DOMContentLoaded, not full network idle.
 *  Next.js dev mode + Sentry + framer-motion never reaches `networkidle`. */
export async function gotoApp(page: Page, path: string) {
  return page.goto(path, { waitUntil: "domcontentloaded" });
}

type Fixtures = { authedPage: Page };

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, runTest) => {
    await clearStorage(page);
    await withMockedApi(page, { authenticated: true });
    // Pre-set the onboarding flag so it doesn't block the page.
    await page.addInitScript(() => {
      try { window.localStorage.setItem("storylens.onboarding.done.v1", "1"); } catch { /* ignore */ }
    });
    await runTest(page);
  },
});

export { expect };
