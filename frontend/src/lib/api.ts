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

async function request<T>(
  path: string,
  options?: RequestInit,
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
    // TypeError: Failed to fetch — backend unreachable
    throw new APIError(
      0,
      `Không thể kết nối đến backend (${BASE_URL}). Hãy kiểm tra backend đã khởi động chưa.`,
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
      signal: AbortSignal.timeout(4000),
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

export interface AdminUserItem {
  id: string;
  username: string | null;
  email: string | null;
  role: UserRole;
  created_at: string | null;
  last_sign_in_at: string | null;
  pages_count: number;
  qa_count: number;
}

export interface AdminUserListResponse {
  total: number;
  items: AdminUserItem[];
}

export interface AdminUserDetail extends AdminUserItem {
  email_confirmed_at: string | null;
  banned_until: string | null;
}

export interface AdminStats {
  total_users: number;
  total_admins: number;
  total_pages: number;
  total_qa: number;
}

export async function adminListUsers(params?: {
  limit?: number;
  offset?: number;
}): Promise<AdminUserListResponse> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return request<AdminUserListResponse>(`/admin/users${q ? `?${q}` : ""}`);
}

export async function adminGetUser(userId: string): Promise<AdminUserDetail> {
  return request<AdminUserDetail>(`/admin/users/${userId}`);
}

export async function adminUpdateUserRole(
  userId: string,
  role: UserRole,
): Promise<AdminUserItem> {
  return request<AdminUserItem>(`/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export async function adminDeleteUser(userId: string): Promise<void> {
  return request<void>(`/admin/users/${userId}`, { method: "DELETE" });
}

export async function adminGetStats(): Promise<AdminStats> {
  return request<AdminStats>("/admin/stats");
}
