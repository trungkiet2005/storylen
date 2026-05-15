import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  // Bookmarks
  addBookmark,
  removeBookmark,
  isBookmarked,
  getAllBookmarks,
  // Progress
  saveReadProgress,
  getSeriesProgress,
  getAllProgress,
  // Pages read
  markPageRead,
  isPageRead,
  countPagesRead,
  // Stats
  getReadingStats,
  addReadingMinutes,
  // Glossary
  getGlossary,
  upsertGlossaryEntry,
  deleteGlossaryEntry,
  // Ratings
  getRating,
  setRating,
  getAllRatings,
  // Goals
  getGoals,
  setGoals,
  // Weekly
  getWeekPages,
  shouldNotifyWeeklyGoal,
  markWeeklyGoalNotified,
  // Reading lists
  getListStatus,
  setListStatus,
  getAllListStatuses,
  READING_LIST_META,
  // Achievements
  ACHIEVEMENTS,
  evaluateAchievements,
  getUnlockedAchievements,
  // Level
  computeLevel,
  type ReadingStats,
} from "@/lib/localStore";

// ── helpers ────────────────────────────────────────────────────────────────────

function freshStats(overrides: Partial<ReadingStats> = {}): ReadingStats {
  return {
    totalPagesRead: 0,
    totalMinutesRead: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    dailyHistory: {},
    ...overrides,
  };
}

function dayString(offsetFromToday = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetFromToday);
  return d.toISOString().slice(0, 10);
}

// Mondays-as-week-start: figure out today's week and seed history for it.
function seedThisWeek(perDay: number) {
  const stats = getReadingStats();
  const start = new Date();
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    stats.dailyHistory[d.toISOString().slice(0, 10)] = perDay;
  }
  localStorage.setItem("sl-stats", JSON.stringify(stats));
}

// ── Bookmarks ──────────────────────────────────────────────────────────────────

describe("bookmarks", () => {
  const fixture = {
    pageId: "p1",
    pageNumber: 1,
    seriesId: "s1",
    seriesTitle: "Demo",
    chapterNumber: 1,
    thumbnailUrl: null,
    note: "",
  };

  it("starts empty", () => {
    expect(getAllBookmarks()).toEqual([]);
    expect(isBookmarked("p1")).toBe(false);
  });

  it("adds and detects a bookmark", () => {
    addBookmark(fixture);
    expect(isBookmarked("p1")).toBe(true);
    const all = getAllBookmarks();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ pageId: "p1", note: "" });
    expect(typeof all[0].savedAt).toBe("string");
  });

  it("removes a bookmark", () => {
    addBookmark(fixture);
    removeBookmark("p1");
    expect(isBookmarked("p1")).toBe(false);
    expect(getAllBookmarks()).toEqual([]);
  });

  it("re-adding overwrites without duplicating", () => {
    addBookmark(fixture);
    addBookmark({ ...fixture, note: "updated" });
    const all = getAllBookmarks();
    expect(all).toHaveLength(1);
    expect(all[0].note).toBe("updated");
  });

  it("sorts most-recent first", async () => {
    addBookmark({ ...fixture, pageId: "older" });
    // small delay so savedAt differs
    await new Promise(r => setTimeout(r, 5));
    addBookmark({ ...fixture, pageId: "newer" });
    const ids = getAllBookmarks().map(b => b.pageId);
    expect(ids).toEqual(["newer", "older"]);
  });
});

// ── Read progress ──────────────────────────────────────────────────────────────

describe("reading progress", () => {
  const fixture = {
    seriesId: "s1",
    seriesTitle: "Demo",
    coverUrl: null,
    chapterId: "c1",
    chapterNumber: 1,
    pageId: "p1",
    pageNumber: 3,
    totalPages: 10,
    readAt: "ignored",
  };

  it("returns null when no progress saved", () => {
    expect(getSeriesProgress("missing")).toBeNull();
    expect(getAllProgress()).toEqual([]);
  });

  it("saves and retrieves progress per series", () => {
    saveReadProgress(fixture);
    const p = getSeriesProgress("s1");
    expect(p).not.toBeNull();
    expect(p!.pageId).toBe("p1");
    // readAt is overwritten with a real timestamp
    expect(p!.readAt).not.toBe("ignored");
    expect(() => new Date(p!.readAt).toISOString()).not.toThrow();
  });

  it("upserts when the same series is saved again", () => {
    saveReadProgress(fixture);
    saveReadProgress({ ...fixture, pageNumber: 7 });
    expect(getAllProgress()).toHaveLength(1);
    expect(getSeriesProgress("s1")!.pageNumber).toBe(7);
  });

  it("sorts getAllProgress by readAt desc", async () => {
    saveReadProgress({ ...fixture, seriesId: "old", pageId: "po" });
    await new Promise(r => setTimeout(r, 5));
    saveReadProgress({ ...fixture, seriesId: "new", pageId: "pn" });
    expect(getAllProgress().map(p => p.seriesId)).toEqual(["new", "old"]);
  });
});

// ── Pages-read tracking & stats ────────────────────────────────────────────────

describe("pages-read tracking and stats", () => {
  it("markPageRead increments total and writes daily history", () => {
    markPageRead("p1");
    markPageRead("p2");
    expect(isPageRead("p1")).toBe(true);
    expect(isPageRead("missing")).toBe(false);

    const stats = getReadingStats();
    expect(stats.totalPagesRead).toBe(2);
    expect(stats.dailyHistory[dayString(0)]).toBe(2);
    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(1);
    expect(stats.lastReadDate).toBe(dayString(0));
  });

  it("ignores duplicate page IDs", () => {
    markPageRead("p1");
    markPageRead("p1"); // same id
    expect(getReadingStats().totalPagesRead).toBe(1);
  });

  it("countPagesRead intersects a list with the read set", () => {
    markPageRead("a");
    markPageRead("b");
    expect(countPagesRead(["a", "b", "c"])).toBe(2);
    expect(countPagesRead([])).toBe(0);
  });

  it("addReadingMinutes accumulates minutes", () => {
    addReadingMinutes(5);
    addReadingMinutes(7);
    expect(getReadingStats().totalMinutesRead).toBe(12);
  });

  it("getReadingStats falls back to defaults when storage is corrupt", () => {
    localStorage.setItem("sl-stats", "{not json}");
    const s = getReadingStats();
    expect(s).toEqual(freshStats());
  });

  it("streak resets when last-read date is older than yesterday", () => {
    // Pre-seed: last read 5 days ago, currentStreak was 4
    const fiveDaysAgo = dayString(-5);
    localStorage.setItem(
      "sl-stats",
      JSON.stringify(freshStats({
        totalPagesRead: 4,
        currentStreak: 4,
        longestStreak: 4,
        lastReadDate: fiveDaysAgo,
        dailyHistory: { [fiveDaysAgo]: 4 },
      })),
    );
    markPageRead("p1");
    const s = getReadingStats();
    expect(s.currentStreak).toBe(1);
    expect(s.longestStreak).toBe(4); // longest preserved
  });

  it("streak extends when last read was yesterday", () => {
    const yesterday = dayString(-1);
    localStorage.setItem(
      "sl-stats",
      JSON.stringify(freshStats({
        totalPagesRead: 3,
        currentStreak: 3,
        longestStreak: 3,
        lastReadDate: yesterday,
        dailyHistory: { [yesterday]: 3 },
      })),
    );
    markPageRead("p1");
    const s = getReadingStats();
    expect(s.currentStreak).toBe(4);
    expect(s.longestStreak).toBe(4);
  });
});

// ── Glossary ──────────────────────────────────────────────────────────────────

describe("glossary", () => {
  it("is empty by default", () => {
    expect(getGlossary("s1")).toEqual([]);
  });

  it("upserts, retrieves sorted by key, and deletes", () => {
    upsertGlossaryEntry("s1", { key: "beta", value: "second", note: "" });
    upsertGlossaryEntry("s1", { key: "alpha", value: "first", note: "" });
    const entries = getGlossary("s1");
    expect(entries.map(e => e.key)).toEqual(["alpha", "beta"]);
    expect(entries[0].createdAt).toBeDefined();

    // Update preserves original createdAt
    const originalCreatedAt = entries[0].createdAt;
    upsertGlossaryEntry("s1", { key: "alpha", value: "updated", note: "x" });
    const updated = getGlossary("s1").find(e => e.key === "alpha");
    expect(updated!.value).toBe("updated");
    expect(updated!.note).toBe("x");
    expect(updated!.createdAt).toBe(originalCreatedAt);

    deleteGlossaryEntry("s1", "alpha");
    expect(getGlossary("s1").map(e => e.key)).toEqual(["beta"]);
  });

  it("isolates entries per series", () => {
    upsertGlossaryEntry("s1", { key: "k", value: "v1", note: "" });
    upsertGlossaryEntry("s2", { key: "k", value: "v2", note: "" });
    expect(getGlossary("s1")[0].value).toBe("v1");
    expect(getGlossary("s2")[0].value).toBe("v2");
  });
});

// ── Ratings (Feature 1) ────────────────────────────────────────────────────────

describe("series ratings", () => {
  it("getRating returns 0 when not rated", () => {
    expect(getRating("s1")).toBe(0);
  });

  it("setRating persists value and ratedAt", () => {
    setRating("s1", 4);
    expect(getRating("s1")).toBe(4);
    const all = getAllRatings();
    expect(all["s1"].rating).toBe(4);
    expect(typeof all["s1"].ratedAt).toBe("string");
  });

  it("clamps rating to 1..5", () => {
    setRating("s1", 99);
    expect(getRating("s1")).toBe(5);
    setRating("s1", -3);
    // negative is treated as clear (rating <= 0) — see implementation
    expect(getRating("s1")).toBe(0);
    setRating("s1", 7);
    expect(getRating("s1")).toBe(5);
  });

  it("setRating(0) removes the entry", () => {
    setRating("s1", 3);
    setRating("s1", 0);
    expect(getRating("s1")).toBe(0);
    expect(getAllRatings()).toEqual({});
  });

  it("updates ratedAt on each set", async () => {
    setRating("s1", 3);
    const first = getAllRatings()["s1"].ratedAt;
    await new Promise(r => setTimeout(r, 5));
    setRating("s1", 5);
    const second = getAllRatings()["s1"].ratedAt;
    expect(new Date(second).getTime()).toBeGreaterThan(new Date(first).getTime());
  });
});

// ── Goals (Feature 2 & 7) ──────────────────────────────────────────────────────

describe("reading goals", () => {
  it("returns sensible defaults", () => {
    expect(getGoals()).toEqual({ dailyPages: 20, weeklyPages: 100 });
  });

  it("persists goals", () => {
    setGoals({ dailyPages: 50, weeklyPages: 300 });
    expect(getGoals()).toEqual({ dailyPages: 50, weeklyPages: 300 });
  });

  it("merges with defaults when partial config is stored", () => {
    localStorage.setItem("sl-goals", JSON.stringify({ dailyPages: 30 }));
    const g = getGoals();
    expect(g.dailyPages).toBe(30);
    expect(g.weeklyPages).toBe(100); // default
  });

  it("falls back to defaults on corrupt JSON", () => {
    localStorage.setItem("sl-goals", "{broken");
    expect(getGoals()).toEqual({ dailyPages: 20, weeklyPages: 100 });
  });
});

// ── Weekly goal (Feature 7) ────────────────────────────────────────────────────

describe("weekly goal", () => {
  it("getWeekPages sums all seven days of the current week", () => {
    expect(getWeekPages()).toBe(0);
    seedThisWeek(3); // 3 pages/day × 7 = 21
    expect(getWeekPages()).toBe(21);
  });

  it("does not include days outside this week", () => {
    // Seed today (in week) + 14 days ago (outside)
    const stats = freshStats({
      dailyHistory: {
        [dayString(0)]: 5,
        [dayString(-14)]: 999,
      },
    });
    localStorage.setItem("sl-stats", JSON.stringify(stats));
    expect(getWeekPages()).toBe(5);
  });

  it("shouldNotifyWeeklyGoal returns false when below target", () => {
    expect(shouldNotifyWeeklyGoal(100, 50)).toBe(false);
  });

  it("returns true once and false after notification is marked", () => {
    expect(shouldNotifyWeeklyGoal(100, 120)).toBe(true);
    markWeeklyGoalNotified();
    expect(shouldNotifyWeeklyGoal(100, 120)).toBe(false);
  });

  it("treats zero/negative target as never-notify", () => {
    expect(shouldNotifyWeeklyGoal(0, 50)).toBe(false);
  });
});

// ── Reading lists (Feature 8) ──────────────────────────────────────────────────

describe("reading lists", () => {
  it("returns null when no status set", () => {
    expect(getListStatus("s1")).toBeNull();
    expect(getAllListStatuses()).toEqual({});
  });

  it("sets and retrieves all four statuses", () => {
    for (const s of Object.keys(READING_LIST_META) as Array<keyof typeof READING_LIST_META>) {
      setListStatus(`s-${s}`, s);
      expect(getListStatus(`s-${s}`)).toBe(s);
    }
    expect(Object.keys(getAllListStatuses())).toHaveLength(4);
  });

  it("setListStatus(null) removes the entry", () => {
    setListStatus("s1", "reading");
    setListStatus("s1", null);
    expect(getListStatus("s1")).toBeNull();
  });

  it("READING_LIST_META has labels for every status", () => {
    for (const status of ["reading", "want", "done", "dropped"] as const) {
      expect(READING_LIST_META[status]).toBeDefined();
      expect(READING_LIST_META[status].label).toBeTruthy();
      expect(READING_LIST_META[status].icon).toBeTruthy();
    }
  });
});

// ── Achievements (Feature 6) ───────────────────────────────────────────────────

describe("achievements", () => {
  const emptyCtx = {
    stats: freshStats(),
    bookmarkCount: 0,
    ratedCount: 0,
    glossaryCount: 0,
  };

  it("returns no new unlocks when nothing qualifies", () => {
    expect(evaluateAchievements(emptyCtx)).toEqual([]);
    expect(getUnlockedAchievements()).toEqual({});
  });

  it("unlocks 'first-page' once stats reach 1 page", () => {
    const newly = evaluateAchievements({
      ...emptyCtx,
      stats: freshStats({ totalPagesRead: 1 }),
    });
    expect(newly).toContain("first-page");
    expect(getUnlockedAchievements()["first-page"]).toBeDefined();
  });

  it("does not re-fire already-unlocked achievements", () => {
    const ctx = { ...emptyCtx, stats: freshStats({ totalPagesRead: 1 }) };
    evaluateAchievements(ctx);
    const second = evaluateAchievements(ctx);
    expect(second).toEqual([]);
  });

  it("unlocks cumulative milestones at once when stats jump", () => {
    const newly = evaluateAchievements({
      ...emptyCtx,
      stats: freshStats({ totalPagesRead: 150 }),
    });
    // 1, 10, 100 should all unlock
    expect(newly).toEqual(expect.arrayContaining(["first-page", "pages-10", "pages-100"]));
    // 500 and 1000 should NOT
    expect(newly).not.toContain("pages-500");
    expect(newly).not.toContain("pages-1k");
  });

  it("streak-based achievements use longestStreak, not currentStreak", () => {
    const newly = evaluateAchievements({
      ...emptyCtx,
      stats: freshStats({ longestStreak: 7, currentStreak: 1 }),
    });
    expect(newly).toContain("streak-3");
    expect(newly).toContain("streak-7");
  });

  it("bookmark / rating / glossary achievements gate on their counts", () => {
    const newly = evaluateAchievements({
      stats: freshStats(),
      bookmarkCount: 10,
      ratedCount: 5,
      glossaryCount: 10,
    });
    expect(newly).toEqual(expect.arrayContaining(["bookmark-10", "rate-5", "glossary-10"]));
  });

  it("every ACHIEVEMENT has a valid shape", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy();
      expect(a.label).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(typeof a.check).toBe("function");
    }
  });
});

// ── Level / XP (Feature 9) ─────────────────────────────────────────────────────

describe("level system", () => {
  it("level 0 / Tân Binh with no activity", () => {
    const info = computeLevel(freshStats(), 0);
    expect(info.level).toBe(0);
    expect(info.rank).toBe("Tân Binh");
    expect(info.xp).toBe(0);
    expect(info.xpInLevel).toBe(0);
    expect(info.pctToNext).toBe(0);
  });

  it("XP = pages*10 + minutes*2 + bookmarks*5", () => {
    const info = computeLevel(freshStats({ totalPagesRead: 5, totalMinutesRead: 10 }), 3);
    // 5*10 + 10*2 + 3*5 = 50 + 20 + 15 = 85
    expect(info.xp).toBe(85);
  });

  it("level threshold matches the triangular curve", () => {
    // Level n requires cumulative XP = 50 × n × (n+1)
    // Level 1: 100 XP, Level 2: 300 XP, Level 3: 600 XP
    expect(computeLevel(freshStats({ totalPagesRead: 9 }), 0).level).toBe(0); // 90 XP
    expect(computeLevel(freshStats({ totalPagesRead: 10 }), 0).level).toBe(1); // 100 XP exactly
    expect(computeLevel(freshStats({ totalPagesRead: 30 }), 0).level).toBe(2); // 300 XP
    expect(computeLevel(freshStats({ totalPagesRead: 60 }), 0).level).toBe(3); // 600 XP
  });

  it("pctToNext is between 0 and 1", () => {
    const info = computeLevel(freshStats({ totalPagesRead: 15 }), 0);
    expect(info.pctToNext).toBeGreaterThanOrEqual(0);
    expect(info.pctToNext).toBeLessThanOrEqual(1);
  });

  it("xpInLevel + xpToNext is consistent with thresholds", () => {
    const info = computeLevel(freshStats({ totalPagesRead: 25 }), 0); // 250 XP
    // level 1 (100..299), so xpInLevel = 150, xpToNext = 200
    expect(info.level).toBe(1);
    expect(info.xpInLevel).toBe(150);
    expect(info.xpToNext).toBe(200);
  });

  it("assigns the highest-matching rank", () => {
    // Triangle: 50*n*(n+1) — level 50 needs 127,500 XP
    const huge = computeLevel(freshStats({ totalPagesRead: 20_000 }), 0);
    expect(huge.level).toBeGreaterThanOrEqual(50);
    expect(huge.rank).toBe("Chúa Tể Wibu");

    const mid = computeLevel(freshStats({ totalPagesRead: 600 }), 0); // 6000 XP → level 10
    expect(mid.rank).toBe("Wibu Trung Cấp");
  });
});
