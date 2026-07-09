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
import { useAuth } from "@/contexts/AuthContext";
import {
  getWibuMe,
  addWibuBookmark,
  removeWibuBookmark,
  setWibuRating,
  setWibuListStatus,
  removeWibuListStatus,
  updateWibuGoals,
  addWibuMinutes,
  markWibuPageRead,
  unlockWibuAchievements,
  saveWibuProgress,
  type WibuBookmark,
  type WibuGoals,
  type WibuStats,
  type WibuReadProgress,
  type WibuListStatus,
} from "@/lib/api";
import {
  // localStorage fallback (used when not authenticated / offline)
  getAllBookmarks,
  getAllProgress,
  getReadingStats,
  getAllRatings,
  getGoals,
  getUnlockedAchievements,
  getAllListStatuses,
  addBookmark,
  removeBookmark,
  setRating as setRatingLS,
  setGoals as setGoalsLS,
  markPageRead as markPageReadLS,
  addReadingMinutes as addReadingMinutesLS,
  saveReadProgress as saveReadProgressLS,
  setListStatus as setListStatusLS,
  evaluateAchievements,
  shouldNotifyWeeklyGoal,
  markWeeklyGoalNotified,
  getGlossary,
  upsertGlossaryEntry,
  deleteGlossaryEntry,
  computeLevel,
  ACHIEVEMENTS,
  READING_LIST_META,
  type Bookmark,
  type GlossaryEntry,
  type ReadProgress,
  type ReadingGoals,
  type ReadingStats,
  type LevelInfo,
} from "@/lib/localStore";

// ─── Context shape ────────────────────────────────────────────────────────────

interface WibuContextValue {
  bookmarks: Bookmark[];
  toggleBookmark: (bm: Omit<Bookmark, "savedAt">) => void;
  isBookmarked: (pageId: string) => boolean;

  allProgress: ReadProgress[];
  saveProgress: (p: ReadProgress) => void;
  markRead: (pageId: string) => void;

  stats: ReadingStats;
  addMinutes: (m: number) => void;
  refreshStats: () => void;

  getGlossary: (seriesId: string) => GlossaryEntry[];
  upsertGlossaryEntry: (seriesId: string, entry: Omit<GlossaryEntry, "createdAt">) => void;
  deleteGlossaryEntry: (seriesId: string, key: string) => void;

  ratings: Record<string, number>;
  getRating: (seriesId: string) => number;
  setRating: (seriesId: string, rating: number) => void;

  goals: ReadingGoals;
  setGoals: (g: ReadingGoals) => void;
  todayPages: number;
  weekPages: number;

  unlockedAchievements: Record<string, { unlockedAt: string }>;
  newlyUnlocked: string[];
  consumeNewlyUnlocked: () => void;

  weeklyGoalReached: boolean;
  consumeWeeklyGoal: () => void;

  listStatuses: Record<string, ReadingListStatus>;
  getListStatus: (seriesId: string) => ReadingListStatus | null;
  setListStatus: (seriesId: string, status: ReadingListStatus | null) => void;

  level: LevelInfo;

  /** true while initial data is loading from the API */
  loading: boolean;
}

export type ReadingListStatus = WibuListStatus;

const WibuContext = createContext<WibuContextValue | null>(null);

// ─── Adapters: convert API shapes → localStore shapes ─────────────────────────

function apiStatsToLocal(s: WibuStats): ReadingStats {
  return {
    totalPagesRead: s.total_pages_read,
    totalMinutesRead: s.total_minutes_read,
    currentStreak: s.current_streak,
    longestStreak: s.longest_streak,
    lastReadDate: s.last_read_date,
    dailyHistory: s.daily_history,
  };
}

function apiBookmarkToLocal(b: WibuBookmark): Bookmark {
  return {
    pageId: b.page_id,
    pageNumber: b.page_number,
    seriesId: b.series_id,
    seriesTitle: b.series_title,
    chapterNumber: b.chapter_number,
    thumbnailUrl: b.thumbnail_url,
    note: b.note,
    savedAt: b.saved_at,
  };
}

function apiProgressToLocal(p: WibuReadProgress): ReadProgress {
  return {
    seriesId: p.series_id,
    seriesTitle: p.series_title,
    coverUrl: p.cover_url,
    chapterId: p.chapter_id,
    chapterNumber: p.chapter_number,
    pageId: p.page_id,
    pageNumber: p.page_number,
    totalPages: p.total_pages,
    readAt: p.read_at,
  };
}

function localGoalsToApi(g: ReadingGoals): WibuGoals {
  return { daily_pages: g.dailyPages, weekly_pages: g.weeklyPages };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WibuProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [allProgress, setAllProgress] = useState<ReadProgress[]>([]);
  const [stats, setStats] = useState<ReadingStats>({
    totalPagesRead: 0, totalMinutesRead: 0,
    currentStreak: 0, longestStreak: 0,
    lastReadDate: null, dailyHistory: {},
  });
  const [ratingsMap, setRatingsMap] = useState<Record<string, number>>({});
  const [goalsState, setGoalsState] = useState<ReadingGoals>({ dailyPages: 20, weeklyPages: 100 });
  const [unlockedAchievements, setUnlockedAchievements] = useState<Record<string, { unlockedAt: string }>>({});
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const [listStatusesState, setListStatusesState] = useState<Record<string, ReadingListStatus>>({});
  const [weeklyGoalReached, setWeeklyGoalReached] = useState(false);
  const hydratedRef = useRef(false);

  // ── Hydration: API when authenticated, localStorage otherwise ────────────────

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      setLoading(true);
      try {
        if (isAuthenticated) {
          const me = await getWibuMe();
          if (cancelled) return;

          setBookmarks(me.bookmarks.map(apiBookmarkToLocal));
          setAllProgress(me.progress.map(apiProgressToLocal));
          setStats(apiStatsToLocal(me.stats));
          setRatingsMap(me.ratings);
          setGoalsState({ dailyPages: me.goals.daily_pages, weeklyPages: me.goals.weekly_pages });
          setListStatusesState(me.reading_lists as Record<string, ReadingListStatus>);

          const unlockedIds = new Set(me.unlocked_achievement_ids);
          const unlocked: Record<string, { unlockedAt: string }> = {};
          for (const id of unlockedIds) unlocked[id] = { unlockedAt: "" };
          setUnlockedAchievements(unlocked);
        } else {
          // Not logged in — use localStorage
          if (cancelled) return;
          setBookmarks(getAllBookmarks());
          setAllProgress(getAllProgress());
          setStats(getReadingStats());
          const ratings = getAllRatings();
          setRatingsMap(Object.fromEntries(Object.entries(ratings).map(([k, v]) => [k, v.rating])));
          setGoalsState(getGoals());
          setUnlockedAchievements(getUnlockedAchievements());
          setListStatusesState(getAllListStatuses() as Record<string, ReadingListStatus>);
        }
      } catch {
        // API unreachable or token expired — fall through to localStorage
        if (cancelled) return;
        setBookmarks(getAllBookmarks());
        setAllProgress(getAllProgress());
        setStats(getReadingStats());
        const ratings = getAllRatings();
        setRatingsMap(Object.fromEntries(Object.entries(ratings).map(([k, v]) => [k, v.rating])));
        setGoalsState(getGoals());
        setUnlockedAchievements(getUnlockedAchievements());
        setListStatusesState(getAllListStatuses() as Record<string, ReadingListStatus>);
      } finally {
        if (!cancelled) {
          setLoading(false);
          queueMicrotask(() => { hydratedRef.current = true; });
        }
      }
    }

    hydrate();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // ── Derived values ────────────────────────────────────────────────────────────

  const todayPages = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return stats.dailyHistory?.[today] ?? 0;
  }, [stats]);

  const weekPages = useMemo(() => {
    const start = new Date();
    const diff = start.getDay() === 0 ? -6 : 1 - start.getDay();
    start.setDate(start.getDate() + diff);
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      total += stats.dailyHistory?.[d.toISOString().slice(0, 10)] ?? 0;
    }
    return total;
  }, [stats]);

  // Weekly goal notification — fires once per ISO week
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (shouldNotifyWeeklyGoal(goalsState.weeklyPages, weekPages)) {
      markWeeklyGoalNotified();
      setWeeklyGoalReached(true);
    }
  }, [weekPages, goalsState.weeklyPages]);

  const consumeWeeklyGoal = useCallback(() => setWeeklyGoalReached(false), []);

  const level = useMemo(() => computeLevel(stats, bookmarks.length), [stats, bookmarks.length]);

  // ── Achievement evaluation ────────────────────────────────────────────────────

  useEffect(() => {
    if (!hydratedRef.current) return;
    const ratedCount = Object.keys(ratingsMap).length;
    let glossaryCount = 0;
    try {
      const all = JSON.parse(localStorage.getItem("sl-glossary") || "{}");
      for (const sid of Object.keys(all)) glossaryCount += Object.keys(all[sid] || {}).length;
    } catch { /* ignore */ }

    const newly = evaluateAchievements({ stats, bookmarkCount: bookmarks.length, ratedCount, glossaryCount });
    if (newly.length) {
      setUnlockedAchievements(getUnlockedAchievements());
      setNewlyUnlocked(prev => [...prev, ...newly]);
      // Persist new unlocks to DB in the background
      if (isAuthenticated) {
        unlockWibuAchievements(newly).catch(() => {/* silent */});
      }
    }
  }, [stats, bookmarks.length, ratingsMap, isAuthenticated]);

  const consumeNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), []);

  // ── Mutations — write-through: localStorage first, then API ──────────────────

  const toggleBookmark = useCallback((bm: Omit<Bookmark, "savedAt">) => {
    const isAlreadySaved = bookmarks.some(b => b.pageId === bm.pageId);

    // localStorage (instant, offline-safe)
    if (isAlreadySaved) {
      removeBookmark(bm.pageId);
    } else {
      addBookmark(bm);
    }
    setBookmarks(getAllBookmarks());

    // API (background)
    if (isAuthenticated) {
      if (isAlreadySaved) {
        removeWibuBookmark(bm.pageId).catch(() => {/* silent */});
      } else {
        addWibuBookmark({
          page_id: bm.pageId,
          page_number: bm.pageNumber ?? null,
          series_id: bm.seriesId ?? null,
          series_title: bm.seriesTitle ?? null,
          chapter_number: bm.chapterNumber ?? null,
          thumbnail_url: bm.thumbnailUrl ?? null,
          note: bm.note,
        }).catch(() => {/* silent */});
      }
    }
  }, [bookmarks, isAuthenticated]);

  const isBookmarkedFn = useCallback((pageId: string) => bookmarks.some(b => b.pageId === pageId), [bookmarks]);

  const saveProgress = useCallback((p: ReadProgress) => {
    saveReadProgressLS(p);
    setAllProgress(getAllProgress());

    if (isAuthenticated) {
      saveWibuProgress(p.seriesId, {
        series_title: p.seriesTitle,
        cover_url: p.coverUrl ?? null,
        chapter_id: p.chapterId ?? null,
        chapter_number: p.chapterNumber ?? null,
        page_id: p.pageId,
        page_number: p.pageNumber,
        total_pages: p.totalPages,
      }).catch(() => {/* silent */});
    }
  }, [isAuthenticated]);

  const markRead = useCallback((pageId: string) => {
    markPageReadLS(pageId);
    setStats(getReadingStats());

    if (isAuthenticated) {
      markWibuPageRead(pageId)
        .then(apiStats => setStats(apiStatsToLocal(apiStats)))
        .catch(() => {/* silent */});
    }
  }, [isAuthenticated]);

  const addMinutes = useCallback((m: number) => {
    addReadingMinutesLS(m);
    setStats(getReadingStats());

    if (isAuthenticated) {
      addWibuMinutes(m)
        .then(apiStats => setStats(apiStatsToLocal(apiStats)))
        .catch(() => {/* silent */});
    }
  }, [isAuthenticated]);

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

    if (isAuthenticated) {
      setWibuRating(seriesId, rating).catch(() => {/* silent */});
    }
  }, [isAuthenticated]);

  const setGoalsFn = useCallback((g: ReadingGoals) => {
    setGoalsLS(g);
    setGoalsState(g);

    if (isAuthenticated) {
      updateWibuGoals(localGoalsToApi(g)).catch(() => {/* silent */});
    }
  }, [isAuthenticated]);

  const getListStatusFn = useCallback((seriesId: string) => listStatusesState[seriesId] ?? null, [listStatusesState]);

  const setListStatusFn = useCallback((seriesId: string, status: ReadingListStatus | null) => {
    setListStatusLS(seriesId, status);
    setListStatusesState(prev => {
      const next = { ...prev };
      if (status === null) delete next[seriesId];
      else next[seriesId] = status;
      return next;
    });

    if (isAuthenticated) {
      if (status === null) {
        removeWibuListStatus(seriesId).catch(() => {/* silent */});
      } else {
        setWibuListStatus(seriesId, status).catch(() => {/* silent */});
      }
    }
  }, [isAuthenticated]);

  // ── Context value ─────────────────────────────────────────────────────────────

  const value = useMemo<WibuContextValue>(
    () => ({
      bookmarks, toggleBookmark, isBookmarked: isBookmarkedFn,
      allProgress, saveProgress, markRead,
      stats, addMinutes, refreshStats,
      getGlossary: getGlossaryFn, upsertGlossaryEntry: upsertFn, deleteGlossaryEntry: deleteFn,
      ratings: ratingsMap, getRating: getRatingFn, setRating: setRatingFn,
      goals: goalsState, setGoals: setGoalsFn, todayPages, weekPages,
      unlockedAchievements, newlyUnlocked, consumeNewlyUnlocked,
      weeklyGoalReached, consumeWeeklyGoal,
      listStatuses: listStatusesState, getListStatus: getListStatusFn, setListStatus: setListStatusFn,
      level, loading,
    }),
    [
      bookmarks, toggleBookmark, isBookmarkedFn,
      allProgress, saveProgress, markRead,
      stats, addMinutes, refreshStats,
      getGlossaryFn, upsertFn, deleteFn,
      ratingsMap, getRatingFn, setRatingFn,
      goalsState, setGoalsFn, todayPages, weekPages,
      unlockedAchievements, newlyUnlocked, consumeNewlyUnlocked,
      weeklyGoalReached, consumeWeeklyGoal,
      listStatusesState, getListStatusFn, setListStatusFn,
      level, loading,
    ],
  );

  return <WibuContext.Provider value={value}>{children}</WibuContext.Provider>;
}

export function useWibu(): WibuContextValue {
  const ctx = useContext(WibuContext);
  if (!ctx) throw new Error("useWibu must be used inside <WibuProvider>");
  return ctx;
}

export { ACHIEVEMENTS, READING_LIST_META };
