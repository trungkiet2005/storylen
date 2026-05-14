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
      detail = body.detail || detail;
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

export async function uploadImages(
  files: File[],
  aiConfig?: AIModuleCurrentConfig,
): Promise<UploadResponse> {
  const fd = new FormData();
  for (const file of files) {
    fd.append("files", file);
  }
  if (aiConfig) {
    fd.append("ai_config", JSON.stringify(aiConfig));
  }
  return request<UploadResponse>("/upload", {
    method: "POST",
    body: fd,
  });
}

export async function getAIModuleOptions(): Promise<AIModuleOptions> {
  return request<AIModuleOptions>("/ai-module/options");
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
