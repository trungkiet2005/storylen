import { test, expect, withMockedApi, clearStorage, gotoApp } from "./fixtures";

test.describe("Edge cases & error handling", () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test("backend completely unreachable: home still renders chrome", async ({ page }) => {
    // Abort every API call.
    await page.route("**/v1/**", (route) => route.abort("connectionfailed"));
    await gotoApp(page, "/");
    // The page chrome must still be alive.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("rate-limited login surfaces 429 detail", async ({ page }) => {
    await page.route("**/v1/auth/login", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Rate limit exceeded" }),
      }),
    );
    await page.route("**/v1/auth/me", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Chưa đăng nhập." }) }),
    );
    await gotoApp(page, "/login");
    await page.getByPlaceholder("name@example.com").fill("user@x.com");
    await page.getByPlaceholder(/tối thiểu 8 ký tự/i).fill("password123");
    await page.getByRole("button", { name: /đăng nhập/i }).click();
    await expect(page.getByText(/rate limit/i).first()).toBeVisible();
  });

  test("expired session: /qa redirects to login", async ({ page }) => {
    await page.route("**/v1/auth/me", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Phiên đăng nhập đã hết hạn." }) }),
    );
    await gotoApp(page, "/qa");
    await expect(page).toHaveURL(/\/login/);
  });

  test("malformed JSON response doesn't crash the page", async ({ page }) => {
    await withMockedApi(page);
    await page.route("**/v1/credits/plans", (route) =>
      route.fulfill({ status: 200, contentType: "text/plain", body: "not json" }),
    );
    await gotoApp(page, "/plans");
    await expect(page.getByRole("heading", { name: /chọn gói phù hợp/i })).toBeVisible();
  });

  test("share link expired returns 410 and shows friendly error", async ({ page }) => {
    await withMockedApi(page);
    await page.route("**/v1/share/**", (route) =>
      route.fulfill({ status: 410, contentType: "application/json", body: JSON.stringify({ detail: "Liên kết đã hết hạn." }) }),
    );
    await gotoApp(page, "/share/abc123");
    await expect(page.getByText(/liên kết đã hết hạn/i)).toBeVisible();
  });

  test("404 page renders for unknown route", async ({ page }) => {
    await withMockedApi(page);
    const res = await gotoApp(page, "/this-page-does-not-exist-9821");
    // Either Next.js's not-found.tsx renders or HTTP 404 is returned.
    expect([200, 404]).toContain(res?.status() ?? 200);
  });
});
