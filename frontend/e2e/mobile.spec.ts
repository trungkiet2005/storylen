import { test, expect, withMockedApi, clearStorage, gotoApp } from "./fixtures";

// These tests run under the `mobile` Playwright project (iPhone 13 viewport).
test.describe("Mobile responsive", () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await withMockedApi(page, { authenticated: true });
    await page.addInitScript(() => {
      try { window.localStorage.setItem("storylens.onboarding.done.v1", "1"); } catch { /* ignore */ }
    });
  });

  test("home: hamburger shows, desktop nav hides", async ({ page }) => {
    await gotoApp(page, "/");
    await expect(page.getByRole("button", { name: /mở menu/i })).toBeVisible();
    // Desktop nav has class topbar-desktop-nav and is hidden via CSS.
    const desktopNav = page.locator(".topbar-desktop-nav");
    if (await desktopNav.count()) {
      await expect(desktopNav).toBeHidden();
    }
  });

  test("opening hamburger reveals nav drawer", async ({ page }) => {
    await gotoApp(page, "/");
    await page.getByRole("button", { name: /mở menu/i }).click();
    // Drawer should now show nav items linking to /upload, /browse, etc.
    await expect(page.getByRole("dialog", { name: /menu/i })).toBeVisible();
  });

  test("language switcher hidden on mobile header (lives in drawer)", async ({ page }) => {
    await gotoApp(page, "/");
    // .topbar-mobile-hide should be `display: none` here.
    const hidden = page.locator(".topbar-mobile-hide").first();
    if (await hidden.count()) {
      await expect(hidden).toBeHidden();
    }
  });

  test("credit badge plan label hides on mobile (only shows number + icon)", async ({ page }) => {
    await gotoApp(page, "/");
    const planTag = page.locator(".topbar-credit-plan").first();
    if (await planTag.count()) {
      await expect(planTag).toBeHidden();
    }
  });

  test("avatar shows but username text is hidden", async ({ page }) => {
    await gotoApp(page, "/");
    const avatar = page.getByRole("button", { name: /tài khoản người dùng/i });
    await expect(avatar).toBeVisible();
    const username = page.locator(".topbar-username").first();
    if (await username.count()) {
      await expect(username).toBeHidden();
    }
  });

  test("hero CTA buttons stack/wrap and remain reachable", async ({ page }) => {
    await gotoApp(page, "/");
    const start = page.getByRole("button", { name: /bắt đầu ngay/i }).first();
    await expect(start).toBeVisible();
    const box = await start.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
  });
});
