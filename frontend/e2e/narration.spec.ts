import { test, expect, withMockedApi, clearStorage, gotoApp } from "./fixtures";

/**
 * Listen mode (AI narration + TTS) in the reader.
 *
 * The backend (VLM + TTS) is fully mocked in fixtures.ts, so this drives the
 * real reader page in a browser and verifies the ListenMode drawer end-to-end:
 * trigger → voice picker → generate → audio + script render.
 */
// The reader route is large; Next dev-compiles it lazily on first hit. Run
// serial so only the first test pays that cost, and give generous timeouts so
// the cold compile doesn't trip the default 60s budget.
test.describe.configure({ mode: "serial", timeout: 180_000 });

test.describe("Listen mode", () => {
  test.use({ navigationTimeout: 120_000, actionTimeout: 20_000 });

  // A real 1×1 PNG so the reader's <img> loads instead of erroring → no image-retry
  // re-render that would detach the toolbar mid-click.
  const PNG_1PX = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );

  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await withMockedApi(page, { authenticated: true });
    await page.route(/img\.example\.com/, r => r.fulfill({ contentType: "image/png", body: PNG_1PX }));
    await page.route(/audio\.example\.com/, r => r.fulfill({ contentType: "audio/mpeg", body: Buffer.from([0xff, 0xf3]) }));
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("storylens.onboarding.done.v1", "1");
        // Seed a valid reading-stats shape so the reader's stats/streak code never
        // dereferences an undefined dailyHistory (a reader-side fragility unrelated
        // to Listen mode that otherwise throws under mocked data).
        window.localStorage.setItem("sl-stats", JSON.stringify({
          totalPagesRead: 0, totalMinutesRead: 0, currentStreak: 0,
          longestStreak: 0, lastReadDate: null, dailyHistory: {},
        }));
      } catch { /* ignore */ }
    });
  });

  test("trigger button appears once a page is loaded", async ({ page }) => {
    await gotoApp(page, "/reader?page=test-page-1");
    await expect(page.getByTestId("listen-mode-trigger")).toBeVisible({ timeout: 15_000 });
  });

  test("opens the drawer and loads engines + voices", async ({ page }) => {
    await gotoApp(page, "/reader?page=test-page-1");
    await page.getByTestId("listen-mode-trigger").click();
    await expect(page.getByTestId("listen-mode-panel")).toBeVisible();

    const engineSelect = page.getByTestId("listen-engine-select");
    await expect(engineSelect).toHaveValue("edge");
    // Unavailable engines (coqui/pyttsx3) are not offered.
    await expect(engineSelect.locator("option")).toHaveText([/Microsoft/]);

    await expect(page.getByTestId("listen-voice-select").locator("option")).toHaveCount(2);
  });

  test("generates narration and renders audio + script", async ({ page }) => {
    await gotoApp(page, "/reader?page=test-page-1");
    await page.getByTestId("listen-mode-trigger").click();
    await page.getByTestId("listen-generate").click();

    const audio = page.getByTestId("listen-audio");
    await expect(audio).toBeVisible();
    await expect(audio).toHaveAttribute("src", /audio\.example\.com\/test-page-1\.mp3/);
    await expect(page.getByTestId("listen-result")).toContainText("Người hùng bước ra khỏi bóng tối");
  });

  test("can switch voice before generating", async ({ page }) => {
    await gotoApp(page, "/reader?page=test-page-1");
    await page.getByTestId("listen-mode-trigger").click();
    await page.getByTestId("listen-voice-select").selectOption("vi-VN-NamMinhNeural");
    await expect(page.getByTestId("listen-voice-select")).toHaveValue("vi-VN-NamMinhNeural");
    await page.getByTestId("listen-generate").click();
    await expect(page.getByTestId("listen-audio")).toBeVisible();
  });

  test("drawer closes with the close button", async ({ page }) => {
    await gotoApp(page, "/reader?page=test-page-1");
    await page.getByTestId("listen-mode-trigger").click();
    await expect(page.getByTestId("listen-mode-panel")).toBeVisible();
    await page.getByTestId("listen-mode-close").click();
    await expect(page.getByTestId("listen-mode-panel")).toHaveCount(0);
  });
});
