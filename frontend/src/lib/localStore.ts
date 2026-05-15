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

// Week starts on Monday. The first day of the ISO week is used as a key for
// the "already-notified-this-week" flag so the toast fires at most once per
// week even across page reloads.
function startOfWeekStr(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function getWeekPages(): number {
  const stats = getReadingStats();
  const start = new Date(startOfWeekStr());
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    total += stats.dailyHistory[d.toISOString().slice(0, 10)] ?? 0;
  }
  return total;
}

const WEEK_NOTIFY_KEY = "sl-week-notified";

export function shouldNotifyWeeklyGoal(weeklyTarget: number, currentWeekPages: number): boolean {
  if (currentWeekPages < weeklyTarget || weeklyTarget <= 0) return false;
  return localStorage.getItem(WEEK_NOTIFY_KEY) !== startOfWeekStr();
}

export function markWeeklyGoalNotified() {
  localStorage.setItem(WEEK_NOTIFY_KEY, startOfWeekStr());
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export interface AchievementDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  check: (ctx: AchievementCtx) => boolean;
}

export interface AchievementCtx {
  stats: ReadingStats;
  bookmarkCount: number;
  ratedCount: number;
  glossaryCount: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-page", label: "Trang Đầu Tiên",  description: "Đọc trang đầu tiên",   icon: "book",      color: "var(--muted)",  check: c => c.stats.totalPagesRead >= 1 },
  { id: "pages-10",   label: "Người Mới",       description: "Đọc 10 trang",         icon: "book",      color: "var(--muted)",  check: c => c.stats.totalPagesRead >= 10 },
  { id: "pages-100",  label: "Centurion",       description: "Đọc 100 trang",        icon: "star",      color: "var(--accent)", check: c => c.stats.totalPagesRead >= 100 },
  { id: "pages-500",  label: "Đọc Cuồng",       description: "Đọc 500 trang",        icon: "trophy",    color: "var(--gold)",   check: c => c.stats.totalPagesRead >= 500 },
  { id: "pages-1k",   label: "Đại Sư Đọc",      description: "Đọc 1,000 trang",      icon: "trophy",    color: "#b58a3b",       check: c => c.stats.totalPagesRead >= 1000 },
  { id: "streak-3",   label: "Vào Guồng",       description: "Streak 3 ngày",        icon: "zap",       color: "var(--accent)", check: c => c.stats.longestStreak >= 3 },
  { id: "streak-7",   label: "Tuần Lửa",        description: "Streak 7 ngày",        icon: "fire",      color: "#e04156",       check: c => c.stats.longestStreak >= 7 },
  { id: "streak-30",  label: "Tháng Thần",      description: "Streak 30 ngày",       icon: "trophy",    color: "#b58a3b",       check: c => c.stats.longestStreak >= 30 },
  { id: "bookmark-10",label: "Sưu Tầm Gia",     description: "Bookmark 10 trang",    icon: "bookmark",  color: "var(--indigo)", check: c => c.bookmarkCount >= 10 },
  { id: "rate-5",     label: "Nhà Phê Bình",    description: "Đánh giá 5 bộ truyện", icon: "star-fill", color: "var(--gold)",   check: c => c.ratedCount >= 5 },
  { id: "glossary-10",label: "Từ Điển Gia",     description: "Lưu 10 mục từ điển",   icon: "tag",       color: "var(--jade)",   check: c => c.glossaryCount >= 10 },
  { id: "hours-10",   label: "Bền Bỉ",          description: "Đọc 10 giờ",           icon: "clock",     color: "var(--jade)",   check: c => c.stats.totalMinutesRead >= 600 },
];

const ACHIEVEMENTS_KEY = "sl-achievements";

interface UnlockedRecord { unlockedAt: string }

function readUnlocked(): Record<string, UnlockedRecord> {
  try {
    return JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getUnlockedAchievements(): Record<string, UnlockedRecord> {
  return readUnlocked();
}

/**
 * Evaluate achievements against current ctx, persist new unlocks, and return
 * the newly-unlocked IDs so the UI can fire toasts.
 */
export function evaluateAchievements(ctx: AchievementCtx): string[] {
  const unlocked = readUnlocked();
  const newly: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked[a.id]) continue;
    if (a.check(ctx)) {
      unlocked[a.id] = { unlockedAt: new Date().toISOString() };
      newly.push(a.id);
    }
  }
  if (newly.length) {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
  }
  return newly;
}
