import { test, expect, withMockedApi, clearStorage, gotoApp } from "./fixtures";

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await withMockedApi(page);
  });

  test("renders hero + CTA buttons", async ({ page }) => {
    await gotoApp(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/đọc thế giới/i);
    // Hero CTAs
    await expect(page.getByRole("button", { name: /bắt đầu ngay/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /trải nghiệm q.a/i }).first()).toBeVisible();
  });

  test("anime background slideshow mounts (anim-bg-root)", async ({ page }) => {
    await gotoApp(page, "/");
    await expect(page.locator(".anim-bg-root").first()).toBeVisible({ timeout: 5000 });
  });

  test("title in head matches brand", async ({ page }) => {
    await gotoApp(page, "/");
    await expect(page).toHaveTitle(/StoryLens/);
  });

  test("language switcher cycles VI ↔ EN", async ({ page }) => {
    await gotoApp(page, "/");
    // After mount the button labels itself "Đổi ngôn ngữ sang EN" (next locale).
    const toEn = page.getByRole("button", { name: /đổi ngôn ngữ sang en/i });
    await expect(toEn).toBeVisible();
    await toEn.click();
    // After click, button now offers to switch back to VI.
    await expect(page.getByRole("button", { name: /đổi ngôn ngữ sang vi/i })).toBeVisible();
  });

  test("'Sources:' link to /upload navigates correctly", async ({ page }) => {
    await gotoApp(page, "/");
    const startLink = page.locator('a[href="/upload"]').first();
    await expect(startLink).toBeVisible();
  });

  test("footer renders with terms/privacy links", async ({ page }) => {
    await gotoApp(page, "/");
    await expect(page.locator('a[href="/terms"]').first()).toBeVisible();
    await expect(page.locator('a[href="/privacy"]').first()).toBeVisible();
  });
});
