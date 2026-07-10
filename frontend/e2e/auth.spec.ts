import { test, expect, withMockedApi, clearStorage, gotoApp } from "./fixtures";

test.describe("Auth flow", () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test("login page renders and accepts valid credentials", async ({ page }) => {
    await withMockedApi(page);
    await gotoApp(page, "/login");
    await expect(page.getByRole("heading", { name: /chào mừng trở lại/i })).toBeVisible();
    await page.getByPlaceholder("name@example.com").fill("duong+e2e@example.com");
    await page.getByPlaceholder(/tối thiểu 8 ký tự/i).fill("password123");
    await page.getByRole("button", { name: /đăng nhập/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("login shows error on bad credentials", async ({ page }) => {
    await page.route("**/v1/auth/login", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Email hoặc mật khẩu không đúng." }) }),
    );
    await page.route("**/v1/auth/me", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Chưa đăng nhập." }) }),
    );
    await gotoApp(page, "/login");
    await page.getByPlaceholder("name@example.com").fill("wrong@x.com");
    await page.getByPlaceholder(/tối thiểu 8 ký tự/i).fill("wrongpass");
    await page.getByRole("button", { name: /đăng nhập/i }).click();
    await expect(page.getByText(/email hoặc mật khẩu không đúng/i).first()).toBeVisible();
  });

  test("show/hide password toggle works", async ({ page }) => {
    await withMockedApi(page);
    await gotoApp(page, "/login");
    const pw = page.getByPlaceholder(/tối thiểu 8 ký tự/i);
    await pw.fill("secret123");
    await expect(pw).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: /hiện mật khẩu/i }).click();
    await expect(pw).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: /ẩn mật khẩu/i }).click();
    await expect(pw).toHaveAttribute("type", "password");
  });

  test("forgot password sends request and shows confirmation", async ({ page }) => {
    await withMockedApi(page);
    await gotoApp(page, "/forgot-password");
    await expect(page.getByRole("heading", { name: /quên mật khẩu/i })).toBeVisible();
    await page.getByPlaceholder("name@example.com").fill("test@x.com");
    const submit = page.getByRole("button", { name: /gửi liên kết/i });
    // Under `next dev` the route hydrates on demand, so the very first click can
    // land before React wires the form's submit handler (the click then no-ops
    // without firing a request). Retry click+assert until it takes — submitting
    // a forgot-password request is idempotent, so re-clicking is safe.
    await expect(async () => {
      await submit.click();
      await expect(page.getByText(/đã gửi email/i)).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
  });

  test("register page renders form + link back to login", async ({ page }) => {
    await withMockedApi(page);
    await gotoApp(page, "/register");
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    await expect(page.locator('input[name="username"], input[id*="username" i]').first()).toBeVisible();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    // Login link present.
    await expect(page.getByRole("link", { name: /^đăng nhập$/i }).first()).toBeVisible();
  });

  test("authenticated user sees TopBar with avatar instead of login button", async ({ page }) => {
    await withMockedApi(page, { authenticated: true });
    await gotoApp(page, "/");
    // The avatar circle button is visible (aria-label "Tài khoản người dùng").
    await expect(page.getByRole("button", { name: /tài khoản người dùng/i })).toBeVisible();
  });

  test("Google OAuth button is present and enabled", async ({ page }) => {
    await withMockedApi(page);
    await gotoApp(page, "/login");
    const googleBtn = page.getByRole("button", { name: /tiếp tục với google/i });
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeEnabled();
  });
});
