/**
 * Client-side persistence for wibu features.
 * All data lives in localStorage — no backend required.
 */

// ─── Reading Progress ─────────────────────────────────────────────────────────

export interface ReadProgress {
  seriesId: string;
  seriesTitle: string;
  coverUrl: string | null;
  chapterId: string | null;
  chapterNumber: number | null;
  pageId: string;
  pageNumber: number;
  totalPages: number;
  readAt: string; // ISO
}

const PROGRESS_KEY = "sl-progress";

function readProgressMap(): Record<string, ReadProgress> {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveReadProgress(p: ReadProgress) {
  const map = readProgressMap();
  map[p.seriesId] = { ...p, readAt: new Date().toISOString() };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
}

export function getSeriesProgress(seriesId: string): ReadProgress | null {
  return readProgressMap()[seriesId] ?? null;
}

export function getAllProgress(): ReadProgress[] {
  return Object.values(readProgressMap()).sort(
    (a, b) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime(),
  );
}

// ─── Pages Read Tracking ─────────────────────────────────────────────────────

const READ_PAGES_KEY = "sl-read-pages";

function readPagesSet(): Set<string> {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(READ_PAGES_KEY) || "[]");
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function markPageRead(pageId: string) {
  const set = readPagesSet();
  if (set.has(pageId)) return;
  set.add(pageId);
  localStorage.setItem(READ_PAGES_KEY, JSON.stringify([...set]));
  bumpStats();
}

export function isPageRead(pageId: string): boolean {
  return readPagesSet().has(pageId);
}

export function countPagesRead(pageIds: string[]): number {
  const set = readPagesSet();
  return pageIds.filter(id => set.has(id)).length;
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export interface Bookmark {
  pageId: string;
  pageNumber: number | null;
  seriesId: string | null;
  seriesTitle: string | null;
  chapterNumber: number | null;
  thumbnailUrl: string | null;
  savedAt: string;
  note: string;
}

const BOOKMARKS_KEY = "sl-bookmarks";

function readBookmarksMap(): Record<string, Bookmark> {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function addBookmark(bm: Omit<Bookmark, "savedAt">) {
  const map = readBookmarksMap();
  map[bm.pageId] = { ...bm, savedAt: new Date().toISOString() };
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(map));
}

export function removeBookmark(pageId: string) {
  const map = readBookmarksMap();
  delete map[pageId];
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(map));
}

export function isBookmarked(pageId: string): boolean {
  return Boolean(readBookmarksMap()[pageId]);
}

export function getAllBookmarks(): Bookmark[] {
  return Object.values(readBookmarksMap()).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

// ─── Reading Stats ────────────────────────────────────────────────────────────

export interface ReadingStats {
  totalPagesRead: number;
  totalMinutesRead: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null; // YYYY-MM-DD
  dailyHistory: Record<string, number>; // YYYY-MM-DD → pages
}

const STATS_KEY = "sl-stats";

export function getReadingStats(): ReadingStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
    return { ...defaultStats(), ...JSON.parse(raw) };
  } catch {
    return defaultStats();
  }
}

function defaultStats(): ReadingStats {
  return {
    totalPagesRead: 0,
    totalMinutesRead: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    dailyHistory: {},
  };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function bumpStats() {
  const stats = getReadingStats();
  const today = todayStr();
  stats.totalPagesRead += 1;
  stats.dailyHistory[today] = (stats.dailyHistory[today] ?? 0) + 1;

  if (stats.lastReadDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ystStr = yesterday.toISOString().slice(0, 10);
    if (stats.lastReadDate === ystStr) {
      stats.currentStreak += 1;
    } else if (stats.lastReadDate !== today) {
      stats.currentStreak = 1;
    }
    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    stats.lastReadDate = today;
  }

  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function addReadingMinutes(minutes: number) {
  const stats = getReadingStats();
  stats.totalMinutesRead += minutes;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// ─── Custom Glossary ──────────────────────────────────────────────────────────

export interface GlossaryEntry {
  key: string;
  value: string;
  note: string;
  createdAt: string;
}

const GLOSSARY_KEY = "sl-glossary";

function readGlossaryAll(): Record<string, Record<string, GlossaryEntry>> {
  try {
    return JSON.parse(localStorage.getItem(GLOSSARY_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getGlossary(seriesId: string): GlossaryEntry[] {
  const all = readGlossaryAll();
  return Object.values(all[seriesId] ?? {}).sort(
    (a, b) => a.key.localeCompare(b.key),
  );
}

export function upsertGlossaryEntry(seriesId: string, entry: Omit<GlossaryEntry, "createdAt">) {
  const all = readGlossaryAll();
  if (!all[seriesId]) all[seriesId] = {};
  all[seriesId][entry.key] = {
    ...entry,
    createdAt: all[seriesId][entry.key]?.createdAt ?? new Date().toISOString(),
  };
  localStorage.setItem(GLOSSARY_KEY, JSON.stringify(all));
}

export function deleteGlossaryEntry(seriesId: string, key: string) {
  const all = readGlossaryAll();
  if (all[seriesId]) delete all[seriesId][key];
  localStorage.setItem(GLOSSARY_KEY, JSON.stringify(all));
}

// ─── Series Ratings ───────────────────────────────────────────────────────────

export interface SeriesRating {
  rating: number; // 1-5
  ratedAt: string;
}

const RATINGS_KEY = "sl-ratings";

function readRatingsMap(): Record<string, SeriesRating> {
  try {
    return JSON.parse(localStorage.getItem(RATINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getRating(seriesId: string): number {
  return readRatingsMap()[seriesId]?.rating ?? 0;
}

export function setRating(seriesId: string, rating: number) {
  const map = readRatingsMap();
  if (rating <= 0) {
    delete map[seriesId];
  } else {
    map[seriesId] = { rating: Math.min(5, Math.max(1, rating)), ratedAt: new Date().toISOString() };
  }
  localStorage.setItem(RATINGS_KEY, JSON.stringify(map));
}

export function getAllRatings(): Record<string, SeriesRating> {
  return readRatingsMap();
}

// ─── Reading Goals ────────────────────────────────────────────────────────────

export interface ReadingGoals {
  dailyPages: number;
  weeklyPages: number;
}

const GOALS_KEY = "sl-goals";
const DEFAULT_GOALS: ReadingGoals = { dailyPages: 20, weeklyPages: 100 };

export function getGoals(): ReadingGoals {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) return DEFAULT_GOALS;
    return { ...DEFAULT_GOALS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_GOALS;
  }
}

export function setGoals(g: ReadingGoals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(g));
}
