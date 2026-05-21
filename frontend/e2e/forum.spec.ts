import { test, expect, withMockedApi, clearStorage, gotoApp, TEST_USER } from "./fixtures";

const SAMPLE_THREAD = {
  thread_id: "thread-uuid-1",
  user_id: TEST_USER.id,
  username: TEST_USER.username,
  category: "discussion" as const,
  title: "Cách dịch onomatopoeia mượt nhất?",
  body: "Mình đang dịch JJK, các từ tượng thanh kiểu DOOOOM nên giữ nguyên hay Việt hoá?",
  is_pinned: false,
  is_locked: false,
  score: 5,
  reply_count: 1,
  my_vote: 0 as const,
  last_reply_at: "2026-05-15T10:00:00Z",
  created_at: "2026-05-14T09:00:00Z",
  can_edit: false,
  can_delete: true,
};

const SAMPLE_REPLY = {
  reply_id: "reply-uuid-1",
  thread_id: SAMPLE_THREAD.thread_id,
  parent_reply_id: null,
  user_id: "other-user",
  username: "otaku42",
  body: "Mình hay giữ nguyên nếu là hiệu ứng âm thanh, dịch nếu là cảm thán nhân vật.",
  score: 2,
  my_vote: 0 as const,
  created_at: "2026-05-15T10:00:00Z",
  can_delete: false,
};

async function mockForum(
  page: Parameters<typeof withMockedApi>[0],
  opts: { authenticated?: boolean; empty?: boolean } = {},
) {
  await withMockedApi(page, { authenticated: opts.authenticated ?? false });
  await page.route("**/v1/forum/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/v1/, "");
    const method = route.request().method();

    if (path === "/forum/threads" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: opts.empty ? [] : [SAMPLE_THREAD],
          total: opts.empty ? 0 : 1,
          limit: 20,
          offset: 0,
        }),
      });
    }
    if (path === `/forum/threads/${SAMPLE_THREAD.thread_id}` && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ thread: SAMPLE_THREAD, replies: [SAMPLE_REPLY] }),
      });
    }
    if (path === "/forum/vote" && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          target_type: "thread",
          target_id: SAMPLE_THREAD.thread_id,
          score: SAMPLE_THREAD.score + 1,
          my_vote: 1,
        }),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
}

test.describe("Forum", () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await page.addInitScript(() => {
      try { window.localStorage.setItem("storylens.onboarding.done.v1", "1"); } catch { /* ignore */ }
    });
  });

  test("anonymous user sees thread list", async ({ page }) => {
    await mockForum(page, { authenticated: false });
    await gotoApp(page, "/forum");
    await expect(page.getByRole("heading", { name: /diễn đàn cộng đồng/i })).toBeVisible();
    await expect(page.getByText(SAMPLE_THREAD.title)).toBeVisible();
    // Sort tabs visible
    await expect(page.getByRole("button", { name: /nổi bật/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /mới nhất/i })).toBeVisible();
  });

  test("empty state when no threads", async ({ page }) => {
    await mockForum(page, { authenticated: false, empty: true });
    await gotoApp(page, "/forum");
    await expect(page.getByText(/chưa có thread/i)).toBeVisible();
  });

  test("anonymous user sees login link instead of new-thread button", async ({ page }) => {
    await mockForum(page, { authenticated: false });
    await gotoApp(page, "/forum");
    // The header CTA should be a login link, not "+ Tạo thread mới". Scope to
    // the forum's <main> region so we don't collide with TopBar's own login link.
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: /^đăng nhập$/i })).toBeVisible();
    await expect(main.getByRole("link", { name: /tạo thread mới/i })).toHaveCount(0);
  });

  test("authenticated user sees new-thread CTA", async ({ page }) => {
    await mockForum(page, { authenticated: true });
    await gotoApp(page, "/forum");
    await expect(page.getByRole("link", { name: /\+ tạo thread mới/i })).toBeVisible();
  });

  test("thread detail page renders thread + reply", async ({ page }) => {
    await mockForum(page, { authenticated: false });
    await gotoApp(page, `/forum/${SAMPLE_THREAD.thread_id}`);
    await expect(page.getByRole("heading", { name: SAMPLE_THREAD.title })).toBeVisible();
    await expect(page.getByText(SAMPLE_REPLY.body)).toBeVisible();
  });

  test("/forum/new redirects unauthenticated to /login", async ({ page }) => {
    await mockForum(page, { authenticated: false });
    await gotoApp(page, "/forum/new");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/forum/new renders form when authenticated", async ({ page }) => {
    await mockForum(page, { authenticated: true });
    await gotoApp(page, "/forum/new");
    await expect(page.getByRole("heading", { name: /tạo thread mới/i })).toBeVisible();
    await expect(page.getByPlaceholder(/chủ đề/i)).toBeVisible();
  });
});
