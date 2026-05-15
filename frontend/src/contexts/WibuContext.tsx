"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addBookmark,
  addReadingMinutes,
  getAllBookmarks,
  getAllProgress,
  getReadingStats,
  isBookmarked,
  markPageRead,
  removeBookmark,
  saveReadProgress,
  type Bookmark,
  type GlossaryEntry,
  type ReadProgress,
  type ReadingStats,
  getGlossary,
  upsertGlossaryEntry,
  deleteGlossaryEntry,
  getAllRatings,
  setRating as setRatingLS,
  getGoals,
  setGoals as setGoalsLS,
  type ReadingGoals,
  ACHIEVEMENTS,
  evaluateAchievements,
  getUnlockedAchievements,
  shouldNotifyWeeklyGoal,
  markWeeklyGoalNotified,
} from "@/lib/localStore";

interface WibuContextValue {
  // Bookmarks
  bookmarks: Bookmark[];
  toggleBookmark: (bm: Omit<Bookmark, "savedAt">) => void;
  isBookmarked: (pageId: string) => boolean;

  // Reading progress
  allProgress: ReadProgress[];
  saveProgress: (p: ReadProgress) => void;
  markRead: (pageId: string) => void;

  // Stats
  stats: ReadingStats;
  addMinutes: (m: number) => void;
  refreshStats: () => void;

  // Glossary
  getGlossary: (seriesId: string) => GlossaryEntry[];
  upsertGlossaryEntry: (seriesId: string, entry: Omit<GlossaryEntry, "createdAt">) => void;
  deleteGlossaryEntry: (seriesId: string, key: string) => void;

  // Ratings
  ratings: Record<string, number>;
  getRating: (seriesId: string) => number;
  setRating: (seriesId: string, rating: number) => void;

  // Goals
  goals: ReadingGoals;
  setGoals: (g: ReadingGoals) => void;
  todayPages: number;
  weekPages: number;

  // Achievements
  unlockedAchievements: Record<string, { unlockedAt: string }>;
  newlyUnlocked: string[];
  consumeNewlyUnlocked: () => void;

  // Weekly goal — sentinel value, consumed by the toaster
  weeklyGoalReached: boolean;
  consumeWeeklyGoal: () => void;
}

const WibuContext = createContext<WibuContextValue | null>(null);

export function WibuProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [allProgress, setAllProgress] = useState<ReadProgress[]>([]);
  const [stats, setStats] = useState<ReadingStats>({
    totalPagesRead: 0,
    totalMinutesRead: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    dailyHistory: {},
  });
  const [ratingsMap, setRatingsMap] = useState<Record<string, number>>({});
  const [goalsState, setGoalsState] = useState<ReadingGoals>({ dailyPages: 20, weeklyPages: 100 });
  const [unlockedAchievements, setUnlockedAchievements] = useState<Record<string, { unlockedAt: string }>>({});
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const hydratedRef = useRef(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setBookmarks(getAllBookmarks());
    setAllProgress(getAllProgress());
    setStats(getReadingStats());
    const ratings = getAllRatings();
    setRatingsMap(Object.fromEntries(Object.entries(ratings).map(([k, v]) => [k, v.rating])));
    setGoalsState(getGoals());
    setUnlockedAchievements(getUnlockedAchievements());
    // Defer achievement evaluation by one tick — gives state above a chance
    // to settle so we don't double-toast existing unlocks on first load
    queueMicrotask(() => { hydratedRef.current = true; });
  }, []);

  // Today's page count derived from the stats heatmap
  const todayPages = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return stats.dailyHistory[today] ?? 0;
  }, [stats]);

  // Sum the seven days of the current ISO week (Mon→Sun)
  const weekPages = useMemo(() => {
    const start = new Date();
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      total += stats.dailyHistory[d.toISOString().slice(0, 10)] ?? 0;
    }
    return total;
  }, [stats]);

  // Weekly goal notification — fires once per ISO week after reaching target
  const [weeklyGoalReached, setWeeklyGoalReached] = useState(false);
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (shouldNotifyWeeklyGoal(goalsState.weeklyPages, weekPages)) {
      markWeeklyGoalNotified();
      setWeeklyGoalReached(true);
    }
  }, [weekPages, goalsState.weeklyPages]);
  const consumeWeeklyGoal = useCallback(() => setWeeklyGoalReached(false), []);

  // Re-evaluate achievements whenever inputs change. Glossary count is read on
  // the fly from localStorage to avoid plumbing every series through state.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const ratedCount = Object.keys(ratingsMap).length;
    let glossaryCount = 0;
    try {
      const all = JSON.parse(localStorage.getItem("sl-glossary") || "{}");
      for (const sid of Object.keys(all)) glossaryCount += Object.keys(all[sid] || {}).length;
    } catch { /* ignore */ }
    const newly = evaluateAchievements({
      stats,
      bookmarkCount: bookmarks.length,
      ratedCount,
      glossaryCount,
    });
    if (newly.length) {
      setUnlockedAchievements(getUnlockedAchievements());
      setNewlyUnlocked(prev => [...prev, ...newly]);
    }
  }, [stats, bookmarks.length, ratingsMap]);

  const consumeNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), []);

  const toggleBookmark = useCallback((bm: Omit<Bookmark, "savedAt">) => {
    if (isBookmarked(bm.pageId)) {
      removeBookmark(bm.pageId);
    } else {
      addBookmark(bm);
    }
    setBookmarks(getAllBookmarks());
  }, []);

  const isBookmarkedFn = useCallback((pageId: string) => isBookmarked(pageId), []);

  const saveProgress = useCallback((p: ReadProgress) => {
    saveReadProgress(p);
    setAllProgress(getAllProgress());
  }, []);

  const markRead = useCallback((pageId: string) => {
    markPageRead(pageId);
    setStats(getReadingStats());
  }, []);

  const addMinutes = useCallback((m: number) => {
    addReadingMinutes(m);
    setStats(getReadingStats());
  }, []);

  const refreshStats = useCallback(() => {
    setStats(getReadingStats());
    setBookmarks(getAllBookmarks());
    setAllProgress(getAllProgress());
    const ratings = getAllRatings();
    setRatingsMap(Object.fromEntries(Object.entries(ratings).map(([k, v]) => [k, v.rating])));
    setGoalsState(getGoals());
  }, []);

  const getGlossaryFn = useCallback((seriesId: string) => getGlossary(seriesId), []);

  const upsertFn = useCallback((seriesId: string, entry: Omit<GlossaryEntry, "createdAt">) => {
    upsertGlossaryEntry(seriesId, entry);
  }, []);

  const deleteFn = useCallback((seriesId: string, key: string) => {
    deleteGlossaryEntry(seriesId, key);
  }, []);

  const getRatingFn = useCallback((seriesId: string) => ratingsMap[seriesId] ?? 0, [ratingsMap]);

  const setRatingFn = useCallback((seriesId: string, rating: number) => {
    setRatingLS(seriesId, rating);
    setRatingsMap(prev => {
      const next = { ...prev };
      if (rating <= 0) delete next[seriesId];
      else next[seriesId] = rating;
      return next;
    });
  }, []);

  const setGoalsFn = useCallback((g: ReadingGoals) => {
    setGoalsLS(g);
    setGoalsState(g);
  }, []);

  const value = useMemo<WibuContextValue>(
    () => ({
      bookmarks,
      toggleBookmark,
      isBookmarked: isBookmarkedFn,
      allProgress,
      saveProgress,
      markRead,
      stats,
      addMinutes,
      refreshStats,
      getGlossary: getGlossaryFn,
      upsertGlossaryEntry: upsertFn,
      deleteGlossaryEntry: deleteFn,
      ratings: ratingsMap,
      getRating: getRatingFn,
      setRating: setRatingFn,
      goals: goalsState,
      setGoals: setGoalsFn,
      todayPages,
      weekPages,
      unlockedAchievements,
      newlyUnlocked,
      consumeNewlyUnlocked,
      weeklyGoalReached,
      consumeWeeklyGoal,
    }),
    [bookmarks, toggleBookmark, isBookmarkedFn, allProgress, saveProgress, markRead, stats, addMinutes, refreshStats, getGlossaryFn, upsertFn, deleteFn, ratingsMap, getRatingFn, setRatingFn, goalsState, setGoalsFn, todayPages, weekPages, unlockedAchievements, newlyUnlocked, consumeNewlyUnlocked, weeklyGoalReached, consumeWeeklyGoal],
  );

  return <WibuContext.Provider value={value}>{children}</WibuContext.Provider>;
}

export function useWibu(): WibuContextValue {
  const ctx = useContext(WibuContext);
  if (!ctx) throw new Error("useWibu must be used inside <WibuProvider>");
  return ctx;
}

export { ACHIEVEMENTS };
