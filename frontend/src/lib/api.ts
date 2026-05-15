/**
 * StoryLens API Client
 * Centralized fetch wrapper for all backend API calls.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://storylens-api.onrender.com/v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadResponse {
  message: string;
  page_ids: string[];
  batch_id: string;
}

export interface AIModuleCurrentConfig {
  translator: string;
  target_lang: string;
  detector: string;
  ocr: string;
  inpainter: string;
  renderer: string;
}

export interface AIModuleOptions {
  current: AIModuleCurrentConfig;
  translators: string[];
  target_languages: string[];
  detectors: string[];
  ocr_models: string[];
  inpainters: string[];
  renderers: string[];
}

export interface PageStatus {
  page_id: string;
  status:
    | "pending"
    | "ocr_running"
    | "ocr_failed"
    | "translating"
    | "translated"
    | "completed"
    | "failed"
    | "error";
  progress: number;
  error: string | null;
  original_image_url?: string;
  thumbnail_url?: string;
}

export interface BatchStatus {
  batch_id: string;
  total: number;
  completed: number;
  failed: number;
  pages: PageStatus[];
}

export interface BubbleData {
  bubble_id: string;
  bbox: [number, number, number, number]; // [x, y, w, h]
  original_text: string;
  translated_text: string;
  confidence: number;
}

export interface PageData {
  page_id: string;
  original_image_url: string;
  translated_image_url?: string | null;
  thumbnail_url?: string;
  status?: PageStatus["status"];
  processed_data: BubbleData[];
  metadata: {
    batch_id?: string;
    series_id?: string;
    chapter_id?: string;
    page_number?: number;
  };
}

export interface QASource {
  ch: number;
  p: number;
  score: number;
}

export interface QAResponse {
  question: string;
  answer: string;
  source_chunks: string[];
}

export interface HistoryItem {
  id: string;
  type: "page" | "series";
  title: string;
  thumbnail_url: string | null;
  last_accessed: string;
  status: PageStatus["status"];
  progress?: number;
  chapters?: number;
  pages?: number;
  qa_ready?: boolean;
  series_id?: string | null;
  series_title?: string | null;
  chapter_id?: string | null;
  chapter_title?: string | null;
  chapter_number?: number | null;
}

export interface HistoryResponse {
  total: number;
  items: HistoryItem[];
}

export interface TranslationHistoryItem {
  translation_id: string;
  bubble_id: string;
  translated_text: string;
  translated_at: string;
  llm_model_used?: string | null;
  user_id?: string | null;
  username?: string | null;
}

export interface TranslationHistoryResponse {
  bubble_id: string;
  total: number;
  items: TranslationHistoryItem[];
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

// Render free-tier cold start can take 30-60s. Retry network failures automatically.
const RETRY_DELAYS_MS = [8000, 15000]; // wait 8s then 15s before giving up

async function request<T>(
  path: string,
  options?: RequestInit,
  _attempt = 0,
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...options?.headers,
      },
    });
  } catch {
    // TypeError: Failed to fetch — backend unreachable or still warming up (Render cold start).
    // Safe to retry even for POST/PATCH/DELETE because the server never received the request.
    if (_attempt < RETRY_DELAYS_MS.length) {
      await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[_attempt]));
      return request<T>(path, options, _attempt + 1);
    }
    throw new APIError(
      0,
      `Không thể kết nối đến backend (${BASE_URL}). Backend có thể đang khởi động (Render cold start ~30-60s) — thử lại sau ít phút.`,
    );
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      const raw = body.detail || body.message;
      if (typeof raw === "string") {
        detail = raw;
      } else if (Array.isArray(raw)) {
        detail = (raw as Array<{ msg?: string }>).map((e) => e.msg ?? String(e)).join(", ");
      }
    } catch {
      // ignore parse errors
    }
    throw new APIError(res.status, detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Health ───────────────────────────────────────────────────────────────────

/**
 * Ping the backend health endpoint.
 * Returns true if reachable, false otherwise.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL.replace(/\/v1$/, "")}/health`, {
      method: "GET",
      // 35s covers Render free-tier cold start (~30-60s); short enough to not block indefinitely
      signal: AbortSignal.timeout(35_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadOptions {
  aiConfig?: AIModuleCurrentConfig;
  seriesId?: string;
  chapterId?: string;
  newChapterTitle?: string;
}

export async function uploadImages(
  files: File[],
  aiConfigOrOptions?: AIModuleCurrentConfig | UploadOptions,
): Promise<UploadResponse> {
  const fd = new FormData();
  for (const file of files) {
    fd.append("files", file);
  }

  let aiConfig: AIModuleCurrentConfig | undefined;
  let seriesId: string | undefined;
  let chapterId: string | undefined;
  let newChapterTitle: string | undefined;

  if (aiConfigOrOptions) {
    if ("aiConfig" in aiConfigOrOptions || "seriesId" in aiConfigOrOptions || "chapterId" in aiConfigOrOptions || "newChapterTitle" in aiConfigOrOptions) {
      const opts = aiConfigOrOptions as UploadOptions;
      aiConfig = opts.aiConfig;
      seriesId = opts.seriesId;
      chapterId = opts.chapterId;
      newChapterTitle = opts.newChapterTitle;
    } else {
      aiConfig = aiConfigOrOptions as AIModuleCurrentConfig;
    }
  }

  if (aiConfig) {
    fd.append("ai_config", JSON.stringify(aiConfig));
  }
  if (seriesId) fd.append("series_id", seriesId);
  if (chapterId) fd.append("chapter_id", chapterId);
  if (newChapterTitle) fd.append("new_chapter_title", newChapterTitle);

  return request<UploadResponse>("/upload", {
    method: "POST",
    body: fd,
  });
}

export async function getAIModuleOptions(): Promise<AIModuleOptions> {
  return request<AIModuleOptions>("/ai-module/options");
}

// ─── Scrape ───────────────────────────────────────────────────────────────────

export interface ScrapePreviewResponse {
  chapter_title: string;
  page_count: number;
  preview_urls: string[];
}

export interface ScrapeOptions {
  seriesId?: string;
  chapterId?: string;
  newChapterTitle?: string;
  aiConfig?: AIModuleCurrentConfig;
}

export async function previewChapter(chapterUrl: string): Promise<ScrapePreviewResponse> {
  return request<ScrapePreviewResponse>("/scrape/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chapter_url: chapterUrl }),
  });
}

export async function scrapeChapter(
  chapterUrl: string,
  opts: ScrapeOptions = {},
): Promise<UploadResponse> {
  return request<UploadResponse>("/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chapter_url: chapterUrl,
      series_id: opts.seriesId ?? null,
      chapter_id: opts.chapterId ?? null,
      new_chapter_title: opts.newChapterTitle ?? null,
      ai_config: opts.aiConfig ? JSON.stringify(opts.aiConfig) : null,
    }),
  });
}

// ─── MangaDex proxy ───────────────────────────────────────────────────────────

export interface MdxCoverArt {
  type: "cover_art";
  attributes: { fileName: string; volume?: string };
}

export interface MdxTag {
  attributes: { name: { en: string }; group: string };
}

export interface MdxManga {
  id: string;
  attributes: {
    title: Record<string, string>;
    description: Record<string, string>;
    status: "ongoing" | "completed" | "hiatus" | "cancelled";
    lastChapter?: string;
    tags: MdxTag[];
  };
  relationships: Array<MdxCoverArt | { type: string; attributes?: Record<string, unknown> }>;
}

export interface MdxMangaList {
  data: MdxManga[];
  total: number;
  limit: number;
  offset: number;
}

export interface MdxChapter {
  id: string;
  attributes: {
    chapter?: string;
    title?: string;
    pages: number;
    publishAt: string;
  };
  relationships: Array<{ type: string; attributes?: { name?: string } }>;
}

export interface MdxChapterList {
  data: MdxChapter[];
  total: number;
}

export interface MdxAtHomeServer {
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
}

export function mdxCoverUrl(mangaId: string, fileName: string): string {
  const raw = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}.512.jpg`;
  return `${BASE_URL}/mdx/cover-proxy?url=${encodeURIComponent(raw)}`;
}

export function mdxMangaTitle(manga: MdxManga): string {
  const t = manga.attributes.title;
  return t["vi"] || t["en"] || t["ja-ro"] || Object.values(t)[0] || "Unknown";
}

export function mdxCoverFromManga(manga: MdxManga): string | null {
  const cover = manga.relationships.find((r) => r.type === "cover_art") as MdxCoverArt | undefined;
  if (!cover?.attributes?.fileName) return null;
  return mdxCoverUrl(manga.id, cover.attributes.fileName);
}

export async function mdxPopular(limit = 24): Promise<MdxMangaList> {
  return request<MdxMangaList>(`/mdx/manga/popular?limit=${limit}`);
}

export async function mdxSearch(opts: {
  title?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}): Promise<MdxMangaList> {
  const params = new URLSearchParams({
    limit: String(opts.limit ?? 24),
    offset: String(opts.offset ?? 0),
  });
  if (opts.title) params.set("title", opts.title);
  (opts.tags ?? []).forEach((t) => params.append("includedTags", t));
  return request<MdxMangaList>(`/mdx/manga?${params}`);
}

export async function mdxChapters(
  mangaId: string,
  limit = 100,
  offset = 0,
): Promise<MdxChapterList> {
  return request<MdxChapterList>(
    `/mdx/manga/${mangaId}/chapters?limit=${limit}&offset=${offset}`,
  );
}

export async function mdxChapterPages(chapterId: string): Promise<MdxAtHomeServer> {
  return request<MdxAtHomeServer>(`/mdx/chapter/${chapterId}/pages`);
}

// ─── Status polling ───────────────────────────────────────────────────────────

export async function getPageStatus(pageId: string): Promise<PageStatus> {
  return request<PageStatus>(`/status/${pageId}`);
}

export async function getBatchStatus(batchId: string): Promise<BatchStatus> {
  return request<BatchStatus>(`/status/batch/${batchId}`);
}

/**
 * Poll until status is terminal, calling onUpdate on each tick.
 */
export async function pollUntilDone(
  pageId: string,
  onUpdate: (status: PageStatus) => void,
  intervalMs = 2000,
  maxAttempts = 60,
): Promise<PageStatus> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tick = async () => {
      try {
        const status = await getPageStatus(pageId);
        onUpdate(status);
        if (status.status === "completed" || status.status === "translated") {
          resolve(status);
          return;
        }
        if (
          status.status === "failed" ||
          status.status === "ocr_failed" ||
          status.status === "error"
        ) {
          reject(new Error(status.error || `Processing failed: ${status.status}`));
          return;
        }
        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error("Timeout: processing took too long"));
          return;
        }
        setTimeout(tick, intervalMs);
      } catch (err) {
        reject(err);
      }
    };

    tick();
  });
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export async function getPage(pageId: string): Promise<PageData> {
  return request<PageData>(`/page/${pageId}`);
}

export async function getTranslationHistory(
  pageId: string,
  bubbleId: string,
): Promise<TranslationHistoryResponse> {
  return request<TranslationHistoryResponse>(
    `/page/${pageId}/bubbles/${bubbleId}/translations`,
  );
}

export async function updateBubbleTranslation(
  pageId: string,
  bubbleId: string,
  translatedText: string,
): Promise<TranslationHistoryItem> {
  return request<TranslationHistoryItem>(`/page/${pageId}/bubbles/${bubbleId}/translation`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ translated_text: translatedText }),
  });
}

// ─── Q&A ─────────────────────────────────────────────────────────────────────

export async function askQuestion(payload: {
  question: string;
  page_id?: string;
  series_id?: string;
}): Promise<QAResponse> {
  return request<QAResponse>("/qa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ─── History ─────────────────────────────────────────────────────────────────

export async function getHistory(params?: {
  type?: "page" | "series";
  limit?: number;
  offset?: number;
}): Promise<HistoryResponse> {
  const qs = new URLSearchParams();
  if (params?.type) qs.set("type", params.type);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return request<HistoryResponse>(`/history${q ? `?${q}` : ""}`);
}

export async function deleteHistoryItem(pageId: string): Promise<void> {
  return request<void>(`/history/${pageId}`, { method: "DELETE" });
}

// ─── Series ──────────────────────────────────────────────────────────────────

export type SeriesStatus = "ongoing" | "completed" | "paused";

export interface SeriesListItem {
  series_id: string;
  title: string;
  description: string | null;
  status: SeriesStatus | string;
  tags: string[];
  cover_image_url: string | null;
  source_language: string | null;
  target_language: string | null;
  created_at: string;
  updated_at: string;
  chapter_count: number;
  page_count: number;
}

export interface SeriesListResponse {
  total: number;
  items: SeriesListItem[];
}

export interface ChapterPage {
  page_id: string;
  page_number: number | null;
  thumbnail_url: string | null;
  translated_image_url: string | null;
  original_image_url: string | null;
  status: PageStatus["status"];
}

export interface ChapterResponse {
  chapter_id: string;
  series_id: string;
  chapter_number: number;
  title: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  page_count: number;
  pages: ChapterPage[];
}

export interface SeriesDetail {
  series_id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  status: SeriesStatus | string;
  tags: string[];
  cover_image_url: string | null;
  source_language: string | null;
  target_language: string | null;
  created_at: string;
  updated_at: string;
  chapters: ChapterResponse[];
  chapter_count: number;
  page_count: number;
}

export interface SeriesCreatePayload {
  title: string;
  description?: string | null;
  status?: SeriesStatus | string;
  tags?: string[];
  source_language?: string | null;
  target_language?: string | null;
}

export interface SeriesUpdatePayload {
  title?: string;
  description?: string | null;
  status?: SeriesStatus | string;
  tags?: string[];
  source_language?: string | null;
  target_language?: string | null;
  cover_image_url?: string | null;
}

export interface ChapterCreatePayload {
  title?: string | null;
  description?: string | null;
  chapter_number?: number;
}

export interface ChapterUpdatePayload {
  title?: string | null;
  description?: string | null;
  chapter_number?: number;
}

export interface ReorderItem {
  id: string;
  order: number;
}

export async function listSeries(params?: {
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<SeriesListResponse> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.status) qs.set("status", params.status);
  const q = qs.toString();
  return request<SeriesListResponse>(`/series${q ? `?${q}` : ""}`);
}

export async function getSeries(seriesId: string): Promise<SeriesDetail> {
  return request<SeriesDetail>(`/series/${seriesId}`);
}

export async function getSeriesFull(seriesId: string): Promise<SeriesDetail> {
  return request<SeriesDetail>(`/series/${seriesId}/full`);
}

export async function createSeries(payload: SeriesCreatePayload): Promise<SeriesDetail> {
  return request<SeriesDetail>("/series", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateSeries(
  seriesId: string,
  payload: SeriesUpdatePayload,
): Promise<SeriesDetail> {
  return request<SeriesDetail>(`/series/${seriesId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteSeries(seriesId: string): Promise<void> {
  return request<void>(`/series/${seriesId}`, { method: "DELETE" });
}

export async function uploadSeriesCover(
  seriesId: string,
  file: File,
): Promise<SeriesDetail> {
  const fd = new FormData();
  fd.append("file", file);
  return request<SeriesDetail>(`/series/${seriesId}/cover`, {
    method: "POST",
    body: fd,
  });
}

export async function createChapter(
  seriesId: string,
  payload: ChapterCreatePayload,
): Promise<ChapterResponse> {
  return request<ChapterResponse>(`/series/${seriesId}/chapters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateChapter(
  chapterId: string,
  payload: ChapterUpdatePayload,
): Promise<ChapterResponse> {
  return request<ChapterResponse>(`/chapters/${chapterId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteChapter(chapterId: string): Promise<void> {
  return request<void>(`/chapters/${chapterId}`, { method: "DELETE" });
}

export async function reorderChapters(
  seriesId: string,
  items: ReorderItem[],
): Promise<void> {
  return request<void>(`/series/${seriesId}/chapters/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
}

export async function reorderPages(
  chapterId: string,
  items: ReorderItem[],
): Promise<void> {
  return request<void>(`/chapters/${chapterId}/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
}

export async function addPagesToChapter(
  chapterId: string,
  pageIds: string[],
): Promise<ChapterResponse> {
  return request<ChapterResponse>(`/chapters/${chapterId}/add-pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page_ids: pageIds }),
  });
}

export async function removePageFromChapter(
  chapterId: string,
  pageId: string,
): Promise<void> {
  return request<void>(`/chapters/${chapterId}/pages/${pageId}`, {
    method: "DELETE",
  });
}

// ─── Credits & Plans ─────────────────────────────────────────────────────────

export interface PlanInfo {
  id: string;
  name: string;
  price_vnd: number;
  monthly_credits: number;
  daily_credits: number;
  max_batch_size: number;
  priority_weight: number;
  bonus_credits: number;
  sort_order: number;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  reference_id: string | null;
  note: string | null;
  created_at: string;
}

export interface CreditsResponse {
  plan_tier: string;
  credits_balance: number;
  daily_credits_reset_at: string;
  plan: PlanInfo | null;
  recent_transactions: CreditTransaction[];
}

export interface UpgradeResponse {
  plan_tier: string;
  credits_balance: number;
  monthly_credits_granted: number;
  bonus_credits_granted: number;
  message: string;
}

export async function getCredits(): Promise<CreditsResponse> {
  return request<CreditsResponse>("/credits");
}

export async function getPlans(): Promise<PlanInfo[]> {
  return request<PlanInfo[]>("/credits/plans");
}

export async function upgradePlan(planId: string): Promise<UpgradeResponse> {
  return request<UpgradeResponse>("/credits/upgrade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId }),
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export type UserRole = "user" | "admin";
export type UserStatusFilter = "all" | "active" | "banned" | "unverified";

export interface AdminUserItem {
  id: string;
  username: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  display_name: string | null;
  full_name: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  last_seen_at: string | null;
  banned_until: string | null;
  email_confirmed: boolean;
  pages_count: number;
  qa_count: number;
}

export interface AdminUserListResponse {
  total: number;
  items: AdminUserItem[];
}

export interface AdminUserDetail extends AdminUserItem {
  bio: string | null;
  locale: string | null;
  timezone: string | null;
  country: string | null;
  phone: string | null;
  preferred_target_lang: string | null;
  email_confirmed_at: string | null;
  translations_count: number;
  plan_tier: string;
  credits_balance: number;
}

export interface AdminStats {
  total_users: number;
  total_admins: number;
  total_pages: number;
  total_qa: number;
  total_translations: number;
  pages_today: number;
  qa_today: number;
  new_users_today: number;
}

export interface AdminListUsersParams {
  limit?: number;
  offset?: number;
  search?: string;
  role?: UserRole | "all";
  status?: UserStatusFilter;
  sort?: string; // "created_at:desc", "email:asc", etc.
}

export async function adminListUsers(params?: AdminListUsersParams): Promise<AdminUserListResponse> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.search) qs.set("search", params.search);
  if (params?.role && params.role !== "all") qs.set("role", params.role);
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  if (params?.sort) qs.set("sort", params.sort);
  const q = qs.toString();
  return request<AdminUserListResponse>(`/admin/users${q ? `?${q}` : ""}`);
}

export async function adminGetUser(userId: string): Promise<AdminUserDetail> {
  return request<AdminUserDetail>(`/admin/users/${userId}`);
}

export async function adminUpdateUserRole(userId: string, role: UserRole): Promise<AdminUserItem> {
  return request<AdminUserItem>(`/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export interface AdminProfilePatch {
  full_name?: string | null;
  display_name?: string | null;
  bio?: string | null;
  locale?: string;
  timezone?: string;
  date_of_birth?: string | null;
  gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
  country?: string | null;
  phone?: string | null;
  preferred_target_lang?: string;
  avatar_url?: string | null;
}

export async function adminUpdateUserProfile(
  userId: string,
  patch: AdminProfilePatch,
): Promise<AdminUserDetail> {
  return request<AdminUserDetail>(`/admin/users/${userId}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function adminBanUser(
  userId: string,
  payload: { duration: string; reason?: string | null },
): Promise<AdminUserItem> {
  return request<AdminUserItem>(`/admin/users/${userId}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function adminUnbanUser(userId: string): Promise<AdminUserItem> {
  return request<AdminUserItem>(`/admin/users/${userId}/unban`, { method: "POST" });
}

export async function adminSendPasswordReset(userId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/users/${userId}/password-reset`, { method: "POST" });
}

export async function adminResendVerification(userId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/users/${userId}/resend-verification`, { method: "POST" });
}

export async function adminDeleteUser(userId: string): Promise<void> {
  return request<void>(`/admin/users/${userId}`, { method: "DELETE" });
}

export interface AdminBulkResult {
  succeeded: string[];
  failed: { user_id?: string; id?: string; error: string }[];
}

export async function adminBulkDeleteUsers(userIds: string[]): Promise<AdminBulkResult> {
  return request<AdminBulkResult>("/admin/users/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_ids: userIds }),
  });
}

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  username: string;
  role?: "user" | "admin";
  full_name?: string | null;
  email_confirm?: boolean;
}

export async function adminCreateUser(payload: AdminCreateUserPayload): Promise<AdminUserItem> {
  return request<AdminUserItem>("/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export interface AdminPlanUpgradeResponse {
  user_id: string;
  plan_tier: string;
  credits_balance: number;
  monthly_credits_granted: number;
  bonus_credits_granted: number;
  message: string;
}

export async function adminUpgradePlan(
  userId: string,
  planId: string,
  note?: string,
): Promise<AdminPlanUpgradeResponse> {
  return request<AdminPlanUpgradeResponse>("/admin/credits/upgrade-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, plan_id: planId, note }),
  });
}

// ─── Content management ───────────────────────────────────────────────────────

export interface AdminPageItem {
  page_id: string;
  user_id: string | null;
  username: string | null;
  thumbnail_url: string | null;
  original_image_url: string | null;
  status: string;
  progress: number;
  page_number: number | null;
  uploaded_at: string | null;
  processed_at: string | null;
}

export interface AdminPageListResponse {
  total: number;
  items: AdminPageItem[];
}

export async function adminListPages(params?: {
  limit?: number;
  offset?: number;
  user_id?: string;
  status?: string;
}): Promise<AdminPageListResponse> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.user_id) qs.set("user_id", params.user_id);
  if (params?.status) qs.set("status", params.status);
  const q = qs.toString();
  return request<AdminPageListResponse>(`/admin/pages${q ? `?${q}` : ""}`);
}

export async function adminDeletePage(pageId: string): Promise<void> {
  return request<void>(`/admin/pages/${pageId}`, { method: "DELETE" });
}

export async function adminBulkDeletePages(pageIds: string[]): Promise<AdminBulkResult> {
  return request<AdminBulkResult>("/admin/pages/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: pageIds }),
  });
}

export interface AdminQAItem {
  qa_id: string;
  user_id: string | null;
  username: string | null;
  page_id: string | null;
  user_question: string;
  ai_answer: string | null;
  asked_at: string | null;
}

export interface AdminQAListResponse {
  total: number;
  items: AdminQAItem[];
}

export async function adminListQA(params?: {
  limit?: number;
  offset?: number;
  user_id?: string;
  page_id?: string;
}): Promise<AdminQAListResponse> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.user_id) qs.set("user_id", params.user_id);
  if (params?.page_id) qs.set("page_id", params.page_id);
  const q = qs.toString();
  return request<AdminQAListResponse>(`/admin/qa${q ? `?${q}` : ""}`);
}

export async function adminDeleteQA(qaId: string): Promise<void> {
  return request<void>(`/admin/qa/${qaId}`, { method: "DELETE" });
}

export async function adminBulkDeleteQA(qaIds: string[]): Promise<AdminBulkResult> {
  return request<AdminBulkResult>("/admin/qa/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: qaIds }),
  });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function adminGetStats(): Promise<AdminStats> {
  return request<AdminStats>("/admin/stats");
}

export interface AdminActivityPoint {
  day: string;
  new_users: number;
  pages_uploaded: number;
  qa_asked: number;
}

export interface AdminActivityResponse {
  days: number;
  points: AdminActivityPoint[];
}

export async function adminGetActivity(days = 30): Promise<AdminActivityResponse> {
  return request<AdminActivityResponse>(`/admin/activity?days=${days}`);
}

export interface AdminTopUser {
  user_id: string;
  username: string | null;
  pages_count: number;
  qa_count: number;
}

export async function adminGetTopUsers(
  metric: "pages" | "qa" | "total" = "pages",
  limit = 10,
): Promise<{ metric: string; items: AdminTopUser[] }> {
  return request(`/admin/top-users?metric=${metric}&limit=${limit}`);
}

export interface AdminBreakdownItem {
  label: string;
  count: number;
}

export async function adminGetStatusBreakdown(): Promise<{ items: AdminBreakdownItem[] }> {
  return request("/admin/breakdown/status");
}

export async function adminGetTargetLangBreakdown(): Promise<{ items: AdminBreakdownItem[] }> {
  return request("/admin/breakdown/target-lang");
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export interface AdminAuditEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
}

export async function adminGetAudit(params?: {
  limit?: number;
  offset?: number;
  actor_id?: string;
  action?: string;
  target_type?: string;
}): Promise<{ total: number; items: AdminAuditEntry[] }> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.actor_id) qs.set("actor_id", params.actor_id);
  if (params?.action) qs.set("action", params.action);
  if (params?.target_type) qs.set("target_type", params.target_type);
  const q = qs.toString();
  return request(`/admin/audit${q ? `?${q}` : ""}`);
}

// ─── App settings ─────────────────────────────────────────────────────────────

export interface AdminSettingItem {
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

export async function adminListSettings(): Promise<{ items: AdminSettingItem[] }> {
  return request("/admin/settings");
}

export async function adminUpsertSetting(
  key: string,
  value: unknown,
  description?: string | null,
): Promise<AdminSettingItem> {
  return request<AdminSettingItem>(`/admin/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value, description: description ?? null }),
  });
}

export async function adminDeleteSetting(key: string): Promise<void> {
  return request<void>(`/admin/settings/${encodeURIComponent(key)}`, { method: "DELETE" });
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface AdminServiceHealth {
  name: string;
  ok: boolean;
  latency_ms: number | null;
  detail: string | null;
}

export interface AdminHealth {
  app_name: string;
  app_version: string;
  debug: boolean;
  services: AdminServiceHealth[];
  checked_at: string;
}

export async function adminGetHealth(): Promise<AdminHealth> {
  return request<AdminHealth>("/admin/health");
}

// ─── Wibu (Gamification) ─────────────────────────────────────────────────────

export type WibuListStatus = "reading" | "want" | "done" | "dropped";

export interface WibuBookmark {
  page_id: string;
  page_number: number | null;
  series_id: string | null;
  series_title: string | null;
  chapter_number: number | null;
  thumbnail_url: string | null;
  note: string;
  saved_at: string;
}

export interface WibuGoals {
  daily_pages: number;
  weekly_pages: number;
}

export interface WibuStats {
  total_pages_read: number;
  total_minutes_read: number;
  current_streak: number;
  longest_streak: number;
  last_read_date: string | null;
  daily_history: Record<string, number>;
}

export interface WibuReadProgress {
  series_id: string;
  series_title: string;
  cover_url: string | null;
  chapter_id: string | null;
  chapter_number: number | null;
  page_id: string;
  page_number: number;
  total_pages: number;
  read_at: string;
}

export interface WibuMeResponse {
  bookmarks: WibuBookmark[];
  ratings: Record<string, number>;
  reading_lists: Record<string, WibuListStatus>;
  goals: WibuGoals;
  stats: WibuStats;
  unlocked_achievement_ids: string[];
  progress: WibuReadProgress[];
}

export async function getWibuMe(): Promise<WibuMeResponse> {
  return request<WibuMeResponse>("/wibu/me");
}

export async function addWibuBookmark(bm: Omit<WibuBookmark, "saved_at">): Promise<WibuBookmark> {
  return request<WibuBookmark>("/wibu/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bm),
  });
}

export async function removeWibuBookmark(pageId: string): Promise<void> {
  return request<void>(`/wibu/bookmarks/${encodeURIComponent(pageId)}`, { method: "DELETE" });
}

export async function setWibuRating(seriesId: string, rating: number): Promise<void> {
  return request<void>(`/wibu/ratings/${encodeURIComponent(seriesId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });
}

export async function setWibuListStatus(seriesId: string, status: WibuListStatus): Promise<void> {
  return request<void>(`/wibu/lists/${encodeURIComponent(seriesId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function removeWibuListStatus(seriesId: string): Promise<void> {
  return request<void>(`/wibu/lists/${encodeURIComponent(seriesId)}`, { method: "DELETE" });
}

export async function updateWibuGoals(goals: WibuGoals): Promise<void> {
  return request<void>("/wibu/goals", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(goals),
  });
}

export async function addWibuMinutes(minutes: number): Promise<WibuStats> {
  return request<WibuStats>("/wibu/stats/minutes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ minutes }),
  });
}

export async function markWibuPageRead(pageId: string): Promise<WibuStats> {
  return request<WibuStats>("/wibu/pages/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page_id: pageId }),
  });
}

export async function unlockWibuAchievements(achievementIds: string[]): Promise<string[]> {
  return request<string[]>("/wibu/achievements/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(achievementIds),
  });
}

export async function saveWibuProgress(
  seriesId: string,
  body: Omit<WibuReadProgress, "series_id" | "read_at">,
): Promise<WibuReadProgress> {
  return request<WibuReadProgress>(`/wibu/progress/${encodeURIComponent(seriesId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
