"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

  // Hydrate from localStorage on mount
  useEffect(() => {
    setBookmarks(getAllBookmarks());
    setAllProgress(getAllProgress());
    setStats(getReadingStats());
    const ratings = getAllRatings();
    setRatingsMap(Object.fromEntries(Object.entries(ratings).map(([k, v]) => [k, v.rating])));
  }, []);

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
    }),
    [bookmarks, toggleBookmark, isBookmarkedFn, allProgress, saveProgress, markRead, stats, addMinutes, refreshStats, getGlossaryFn, upsertFn, deleteFn, ratingsMap, getRatingFn, setRatingFn],
  );

  return <WibuContext.Provider value={value}>{children}</WibuContext.Provider>;
}

export function useWibu(): WibuContextValue {
  const ctx = useContext(WibuContext);
  if (!ctx) throw new Error("useWibu must be used inside <WibuProvider>");
  return ctx;
}
