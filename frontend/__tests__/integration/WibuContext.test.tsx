import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { type ReactNode } from "react";
import { WibuProvider, useWibu } from "@/contexts/WibuContext";
import { markPageRead, addReadingMinutes } from "@/lib/localStore";

// WibuProvider now calls useAuth — mock it as unauthenticated so tests use localStorage path
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false, user: null }),
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

function Wrapper({ children }: { children: ReactNode }) {
  return <WibuProvider>{children}</WibuProvider>;
}

function renderWithProvider(ui: ReactNode) {
  return render(<Wrapper>{ui}</Wrapper>);
}

/** Flush all pending React effects + microtasks (including queueMicrotask). */
async function flushAll() {
  await act(async () => {
    await Promise.resolve();
  });
}

// ─── display helpers (read-only) ──────────────────────────────────────────────

function BookmarkCount() {
  const { bookmarks } = useWibu();
  return <span data-testid="bm-count">{bookmarks.length}</span>;
}

function RatingDisplay({ seriesId }: { seriesId: string }) {
  const { getRating } = useWibu();
  return <span data-testid="rating">{getRating(seriesId)}</span>;
}

function ListStatusDisplay({ seriesId }: { seriesId: string }) {
  const { getListStatus } = useWibu();
  return <span data-testid="list-status">{getListStatus(seriesId) ?? "null"}</span>;
}

function GoalDisplay() {
  const { goals } = useWibu();
  return (
    <span data-testid="goals">
      {goals.dailyPages}/{goals.weeklyPages}
    </span>
  );
}

function StatsDisplay() {
  const { stats, todayPages, weekPages } = useWibu();
  return (
    <>
      <span data-testid="total-pages">{stats.totalPagesRead}</span>
      <span data-testid="today-pages">{todayPages}</span>
      <span data-testid="week-pages">{weekPages}</span>
    </>
  );
}

function LevelDisplay() {
  const { level } = useWibu();
  return (
    <>
      <span data-testid="level">{level.level}</span>
      <span data-testid="rank">{level.rank}</span>
    </>
  );
}

function AchievementDisplay() {
  const { unlockedAchievements, newlyUnlocked } = useWibu();
  return (
    <>
      <span data-testid="unlocked-count">{Object.keys(unlockedAchievements).length}</span>
      <span data-testid="newly-count">{newlyUnlocked.length}</span>
      <span data-testid="newly-ids">{newlyUnlocked.join(",")}</span>
    </>
  );
}

// ─── action helpers (with buttons) ───────────────────────────────────────────

function BookmarkToggle() {
  const { toggleBookmark, bookmarks } = useWibu();
  return (
    <>
      <button
        onClick={() =>
          toggleBookmark({ pageId: "p1", seriesId: "s1", seriesTitle: null, pageNumber: null, chapterNumber: null, thumbnailUrl: null, note: "" })
        }
      >
        toggle
      </button>
      <span data-testid="bm-count">{bookmarks.length}</span>
    </>
  );
}

function RatingControl({ seriesId }: { seriesId: string }) {
  const { getRating, setRating } = useWibu();
  return (
    <>
      <button onClick={() => setRating(seriesId, 4)}>rate</button>
      <button onClick={() => setRating(seriesId, 0)}>clear</button>
      <span data-testid="rating">{getRating(seriesId)}</span>
    </>
  );
}

function ListStatusControl({ seriesId }: { seriesId: string }) {
  const { getListStatus, setListStatus } = useWibu();
  return (
    <>
      <button onClick={() => setListStatus(seriesId, "reading")}>set reading</button>
      <button onClick={() => setListStatus(seriesId, null)}>remove</button>
      <span data-testid="list-status">{getListStatus(seriesId) ?? "null"}</span>
    </>
  );
}

function GoalControl() {
  const { goals, setGoals } = useWibu();
  return (
    <>
      <button onClick={() => setGoals({ dailyPages: 50, weeklyPages: 200 })}>update goals</button>
      <span data-testid="goals">
        {goals.dailyPages}/{goals.weeklyPages}
      </span>
    </>
  );
}

function MarkReadControl() {
  const { markRead, stats } = useWibu();
  return (
    <>
      <button onClick={() => markRead("page-x")}>mark read</button>
      <span data-testid="total-pages">{stats.totalPagesRead}</span>
    </>
  );
}

function ConsumeAchievements() {
  const { newlyUnlocked, consumeNewlyUnlocked } = useWibu();
  return (
    <>
      <button onClick={consumeNewlyUnlocked}>consume</button>
      <span data-testid="newly-count">{newlyUnlocked.length}</span>
    </>
  );
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("WibuContext integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── initial state ──────────────────────────────────────────────────────────

  describe("initial state", () => {
    it("starts with zero bookmarks", async () => {
      renderWithProvider(<BookmarkCount />);
      await flushAll();
      expect(screen.getByTestId("bm-count").textContent).toBe("0");
    });

    it("starts with no rating for an unrated series", async () => {
      renderWithProvider(<RatingDisplay seriesId="s1" />);
      await flushAll();
      expect(screen.getByTestId("rating").textContent).toBe("0");
    });

    it("starts with null list status", async () => {
      renderWithProvider(<ListStatusDisplay seriesId="s1" />);
      await flushAll();
      expect(screen.getByTestId("list-status").textContent).toBe("null");
    });

    it("loads default reading goals (20 daily / 100 weekly)", async () => {
      renderWithProvider(<GoalDisplay />);
      await flushAll();
      expect(screen.getByTestId("goals").textContent).toBe("20/100");
    });

    it("starts at level 0 / Tân Binh with no activity", async () => {
      renderWithProvider(<LevelDisplay />);
      await flushAll();
      expect(screen.getByTestId("level").textContent).toBe("0");
      expect(screen.getByTestId("rank").textContent).toBe("Tân Binh");
    });

    it("todayPages and weekPages start at 0", async () => {
      renderWithProvider(<StatsDisplay />);
      await flushAll();
      expect(screen.getByTestId("today-pages").textContent).toBe("0");
      expect(screen.getByTestId("week-pages").textContent).toBe("0");
    });
  });

  // ── bookmarks ─────────────────────────────────────────────────────────────

  describe("toggleBookmark", () => {
    it("adds a bookmark on first toggle", async () => {
      const user = userEvent.setup();
      renderWithProvider(<BookmarkToggle />);
      await flushAll();
      await user.click(screen.getByText("toggle"));
      expect(screen.getByTestId("bm-count").textContent).toBe("1");
    });

    it("removes the bookmark on second toggle (toggle off)", async () => {
      const user = userEvent.setup();
      renderWithProvider(<BookmarkToggle />);
      await flushAll();
      await user.click(screen.getByText("toggle"));
      await user.click(screen.getByText("toggle"));
      expect(screen.getByTestId("bm-count").textContent).toBe("0");
    });

    it("persists bookmark to localStorage", async () => {
      const user = userEvent.setup();
      renderWithProvider(<BookmarkToggle />);
      await flushAll();
      await user.click(screen.getByText("toggle"));
      const raw = localStorage.getItem("sl-bookmarks");
      expect(raw).not.toBeNull();
      const saved = JSON.parse(raw!) as Record<string, unknown>;
      expect(Object.keys(saved)).toHaveLength(1);
      expect(saved["p1"]).toBeDefined();
    });
  });

  // ── ratings ───────────────────────────────────────────────────────────────

  describe("setRating", () => {
    it("updates the rating state immediately", async () => {
      const user = userEvent.setup();
      renderWithProvider(<RatingControl seriesId="anime-1" />);
      await flushAll();
      await user.click(screen.getByText("rate"));
      expect(screen.getByTestId("rating").textContent).toBe("4");
    });

    it("clears the rating on setRating(0)", async () => {
      const user = userEvent.setup();
      renderWithProvider(<RatingControl seriesId="anime-1" />);
      await flushAll();
      await user.click(screen.getByText("rate"));
      await user.click(screen.getByText("clear"));
      expect(screen.getByTestId("rating").textContent).toBe("0");
    });

    it("persists to localStorage under sl-ratings", async () => {
      const user = userEvent.setup();
      renderWithProvider(<RatingControl seriesId="anime-1" />);
      await flushAll();
      await user.click(screen.getByText("rate"));
      const raw = JSON.parse(localStorage.getItem("sl-ratings") || "{}");
      expect(raw["anime-1"]?.rating).toBe(4);
    });
  });

  // ── reading lists ─────────────────────────────────────────────────────────

  describe("setListStatus", () => {
    it("sets status to reading", async () => {
      const user = userEvent.setup();
      renderWithProvider(<ListStatusControl seriesId="manga-1" />);
      await flushAll();
      await user.click(screen.getByText("set reading"));
      expect(screen.getByTestId("list-status").textContent).toBe("reading");
    });

    it("removes status on setListStatus(null)", async () => {
      const user = userEvent.setup();
      renderWithProvider(<ListStatusControl seriesId="manga-1" />);
      await flushAll();
      await user.click(screen.getByText("set reading"));
      await user.click(screen.getByText("remove"));
      expect(screen.getByTestId("list-status").textContent).toBe("null");
    });
  });

  // ── goals ─────────────────────────────────────────────────────────────────

  describe("setGoals", () => {
    it("updates goals in state and persists to localStorage", async () => {
      const user = userEvent.setup();
      renderWithProvider(<GoalControl />);
      await flushAll();
      await user.click(screen.getByText("update goals"));
      expect(screen.getByTestId("goals").textContent).toBe("50/200");
      const raw = JSON.parse(localStorage.getItem("sl-goals") || "{}");
      expect(raw.dailyPages).toBe(50);
      expect(raw.weeklyPages).toBe(200);
    });
  });

  // ── markRead / todayPages ─────────────────────────────────────────────────

  describe("markRead", () => {
    it("increments totalPagesRead and reflects in stats", async () => {
      const user = userEvent.setup();
      renderWithProvider(<MarkReadControl />);
      await flushAll();
      await user.click(screen.getByText("mark read"));
      expect(screen.getByTestId("total-pages").textContent).toBe("1");
    });

    it("does not double-count the same pageId", async () => {
      const user = userEvent.setup();
      renderWithProvider(<MarkReadControl />);
      await flushAll();
      await user.click(screen.getByText("mark read"));
      await user.click(screen.getByText("mark read"));
      expect(screen.getByTestId("total-pages").textContent).toBe("1");
    });
  });

  // ── level ─────────────────────────────────────────────────────────────────

  describe("level", () => {
    it("advances past level 0 after significant pages + bookmarks", async () => {
      // Seed localStorage before render so the hydration picks it up
      // 500 pages = 5000 XP, 10 bookmarks = 50 XP → 5050 XP total
      // Level threshold for L1 is 100, L2 is 300 … already well past L1
      for (let i = 0; i < 500; i++) markPageRead(`p${i}`);
      const user = userEvent.setup();

      function LevelWithToggle() {
        const { level, toggleBookmark } = useWibu();
        return (
          <>
            <button
              onClick={() =>
                toggleBookmark({ pageId: "bm1", seriesId: "s1", seriesTitle: null, pageNumber: null, chapterNumber: null, thumbnailUrl: null, note: "" })
              }
            >
              add bm
            </button>
            <span data-testid="level">{level.level}</span>
            <span data-testid="rank">{level.rank}</span>
          </>
        );
      }

      renderWithProvider(<LevelWithToggle />);
      await flushAll();
      const lvl = Number(screen.getByTestId("level").textContent);
      expect(lvl).toBeGreaterThan(0);
    });
  });

  // ── achievements ──────────────────────────────────────────────────────────

  describe("achievements", () => {
    it("does not fire 'first-page' on initial load even if page already read", async () => {
      // Pre-seed one page so the hydration useEffect loads stats.totalPagesRead = 1
      markPageRead("existing-page");

      renderWithProvider(<AchievementDisplay />);
      // After render, let ALL effects + microtasks (including hydratedRef) settle
      await flushAll();

      // The achievement effect runs but hydratedRef was false on that first tick
      // so newlyUnlocked should stay empty (no toast on first load)
      expect(screen.getByTestId("newly-count").textContent).toBe("0");
    });

    it("fires 'first-page' when page is marked read after mount", async () => {
      const user = userEvent.setup();

      function FirstPageTest() {
        const { markRead, newlyUnlocked } = useWibu();
        return (
          <>
            <button onClick={() => markRead("brand-new-page")}>read</button>
            <span data-testid="newly-ids">{newlyUnlocked.join(",")}</span>
          </>
        );
      }

      renderWithProvider(<FirstPageTest />);
      await flushAll(); // hydratedRef.current becomes true here

      await user.click(screen.getByText("read"));

      await waitFor(() => {
        expect(screen.getByTestId("newly-ids").textContent).toContain("first-page");
      });
    });

    it("consumeNewlyUnlocked resets the queue to empty", async () => {
      const user = userEvent.setup();

      function ConsumeTest() {
        const { markRead, newlyUnlocked, consumeNewlyUnlocked } = useWibu();
        return (
          <>
            <button onClick={() => markRead("brand-new-page-2")}>read</button>
            <button onClick={consumeNewlyUnlocked}>consume</button>
            <span data-testid="newly-count">{newlyUnlocked.length}</span>
          </>
        );
      }

      renderWithProvider(<ConsumeTest />);
      await flushAll();

      await user.click(screen.getByText("read"));
      await waitFor(() =>
        expect(Number(screen.getByTestId("newly-count").textContent)).toBeGreaterThan(0),
      );

      await user.click(screen.getByText("consume"));
      expect(screen.getByTestId("newly-count").textContent).toBe("0");
    });

    it("does not re-fire already-unlocked achievements on subsequent actions", async () => {
      const user = userEvent.setup();

      function RepeatedTest() {
        const { markRead, newlyUnlocked, consumeNewlyUnlocked } = useWibu();
        return (
          <>
            <button onClick={() => markRead(`page-${Date.now()}`)}>read</button>
            <button onClick={consumeNewlyUnlocked}>consume</button>
            <span data-testid="newly-ids">{newlyUnlocked.join(",")}</span>
          </>
        );
      }

      renderWithProvider(<RepeatedTest />);
      await flushAll();

      // First read → unlocks first-page
      await user.click(screen.getByText("read"));
      await waitFor(() =>
        expect(screen.getByTestId("newly-ids").textContent).toContain("first-page"),
      );

      // Consume and trigger another read (different page)
      await user.click(screen.getByText("consume"));
      await user.click(screen.getByText("read"));

      // Give effects a chance to run
      await act(async () => { await Promise.resolve(); });

      // first-page should NOT appear again
      expect(screen.getByTestId("newly-ids").textContent).not.toContain("first-page");
    });
  });

  // ── hydration from localStorage ───────────────────────────────────────────

  describe("hydration from localStorage", () => {
    it("picks up pre-existing bookmark from localStorage on mount", async () => {
      localStorage.setItem(
        "sl-bookmarks",
        JSON.stringify([{ pageId: "p99", seriesId: "s1", chapterId: "c1", pageIndex: 0, savedAt: new Date().toISOString() }]),
      );
      renderWithProvider(<BookmarkCount />);
      await flushAll();
      expect(screen.getByTestId("bm-count").textContent).toBe("1");
    });

    it("picks up pre-existing rating from localStorage on mount", async () => {
      localStorage.setItem(
        "sl-ratings",
        JSON.stringify({ "s42": { rating: 3, ratedAt: new Date().toISOString() } }),
      );
      renderWithProvider(<RatingDisplay seriesId="s42" />);
      await flushAll();
      expect(screen.getByTestId("rating").textContent).toBe("3");
    });

    it("picks up pre-existing list status from localStorage on mount", async () => {
      localStorage.setItem("sl-reading-lists", JSON.stringify({ "s99": "done" }));
      renderWithProvider(<ListStatusDisplay seriesId="s99" />);
      await flushAll();
      expect(screen.getByTestId("list-status").textContent).toBe("done");
    });

    it("picks up custom goals from localStorage on mount", async () => {
      localStorage.setItem("sl-goals", JSON.stringify({ dailyPages: 30, weeklyPages: 150 }));
      renderWithProvider(<GoalDisplay />);
      await flushAll();
      expect(screen.getByTestId("goals").textContent).toBe("30/150");
    });
  });

  // ── addMinutes ────────────────────────────────────────────────────────────

  describe("addMinutes", () => {
    it("updates totalMinutesRead in stats", async () => {
      const user = userEvent.setup();

      function MinutesControl() {
        const { addMinutes, stats } = useWibu();
        return (
          <>
            <button onClick={() => addMinutes(15)}>add</button>
            <span data-testid="minutes">{stats.totalMinutesRead}</span>
          </>
        );
      }

      renderWithProvider(<MinutesControl />);
      await flushAll();
      await user.click(screen.getByText("add"));
      expect(screen.getByTestId("minutes").textContent).toBe("15");
    });

    it("accumulates across multiple addMinutes calls", async () => {
      const user = userEvent.setup();

      function MinutesControl() {
        const { addMinutes, stats } = useWibu();
        return (
          <>
            <button onClick={() => addMinutes(10)}>add</button>
            <span data-testid="minutes">{stats.totalMinutesRead}</span>
          </>
        );
      }

      renderWithProvider(<MinutesControl />);
      await flushAll();
      await user.click(screen.getByText("add"));
      await user.click(screen.getByText("add"));
      await user.click(screen.getByText("add"));
      expect(screen.getByTestId("minutes").textContent).toBe("30");
    });
  });

  // ── useWibu guard ─────────────────────────────────────────────────────────

  describe("useWibu guard", () => {
    it("throws when used outside WibuProvider", () => {
      // Suppress the expected console.error from React's error boundary
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      function Orphan() {
        useWibu();
        return null;
      }
      expect(() => render(<Orphan />)).toThrow("useWibu must be used inside <WibuProvider>");
      spy.mockRestore();
    });
  });
});
