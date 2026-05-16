import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Playwright config — production-ready E2E suite for StoryLens.
 *
 * Defaults:
 *   - Spins up `next dev` on a non-conflicting port (3100) so it doesn't clash
 *     with manual `npm run dev` on 3000.
 *   - Backend is NOT spawned — tests either mock `/v1/**` via routes or assume
 *     a backend is reachable at NEXT_PUBLIC_API_URL. The mocked tests are the
 *     default; backend-dependent tests are gated by `@live` tag.
 *   - On CI: retry once, single worker, fail fast.
 *
 * Run:
 *   npx playwright test                  # all
 *   npx playwright test --ui            # UI mode
 *   npx playwright test e2e/auth        # one file
 *   npx playwright test --project mobile
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /.*mobile.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: /.*mobile.*\.spec\.ts/,
      // Use Chromium engine with an iPhone-class viewport so we don't need
      // WebKit installed in CI. Trade-off: tests genuine layout breakage but
      // misses Safari-specific bugs (acceptable for our manga-style UI today).
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        command: `npx next dev --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
        env: {
          // Tests use a mock backend by default — keep NEXT_PUBLIC_API_URL
          // pointing somewhere safe and intercept via `page.route()`.
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/v1",
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "anon-key-placeholder",
        },
      },
});
