# API Specification (OpenAPI/Swagger) - StoryLens

## 1. Overview

**Base URL:** `https://storylens-api.onrender.com/v1`
**Local Dev URL:** `http://localhost:8000/v1`
**Authentication:** HTTP-only session cookies (set on login, cleared on logout)
**Content Type:** `application/json` unless specified otherwise
**Swagger UI:** Available at `/docs` when `DEBUG=true`

All authenticated endpoints require a valid session cookie. The backend validates the cookie against Supabase Auth and auto-refreshes the access token when expired.

---

## 2. Authentication Endpoints (`/v1/auth`)

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "manga_fan"
}
```

**Validation:**
- `username`: 3–32 chars, alphanumeric + underscore only
- `password`: min 8 characters (enforced by Supabase)
- `email`: valid email format

**Response `201`:**
```json
{
  "id": "uuid",
  "username": "manga_fan",
  "email": "user@example.com",
  "role": "user",
  "plan_tier": "free",
  "credits_balance": 0,
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Rate limit:** Configured via `RATE_LIMIT_REGISTER`

---

### POST /auth/login
Authenticate and receive session cookies.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response `200`:** Sets `access_token` and `refresh_token` HTTP-only cookies.
```json
{
  "id": "uuid",
  "username": "manga_fan",
  "email": "user@example.com",
  "role": "user",
  "plan_tier": "free",
  "credits_balance": 42,
  "full_name": null,
  "avatar_url": null
}
```

**Rate limit:** Configured via `RATE_LIMIT_LOGIN`

---

### GET /auth/me
Get current authenticated user profile.

**Response `200`:**
```json
{
  "id": "uuid",
  "username": "manga_fan",
  "email": "user@example.com",
  "role": "user",
  "full_name": "Nguyen Van A",
  "display_name": "NVA",
  "avatar_url": "https://...supabase.co/storage/v1/object/public/avatars/...",
  "bio": "Manga enthusiast",
  "locale": "vi",
  "timezone": "Asia/Ho_Chi_Minh",
  "date_of_birth": "1995-05-20",
  "gender": "male",
  "country": "VN",
  "phone": null,
  "preferred_target_lang": "VIN",
  "plan_tier": "free",
  "credits_balance": 42,
  "daily_credits_reset_at": "2025-01-02T00:00:00Z",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "last_seen_at": "2025-01-01T12:00:00Z"
}
```

---

### PATCH /auth/me
Update profile fields.

**Request Body** (all fields optional):
```json
{
  "full_name": "Nguyen Van A",
  "display_name": "NVA",
  "bio": "Manga enthusiast",
  "locale": "vi",
  "timezone": "Asia/Ho_Chi_Minh",
  "date_of_birth": "1995-05-20",
  "gender": "male",
  "country": "VN",
  "phone": "+84901234567",
  "preferred_target_lang": "VIN"
}
```

**Valid values:**
- `locale`: `vi`, `en`, `ja`, `zh`, `ko`
- `gender`: `male`, `female`, `other`, `prefer_not_to_say`
- `preferred_target_lang`: `VIN`, `ENG`, `JPN`, `CHS`, `KOR`

**Response `200`:** Updated `AuthUser` object

---

### POST /auth/me/avatar
Upload profile avatar.

**Request:** `multipart/form-data`, field `file` (JPG/PNG/WebP, max `MAX_AVATAR_SIZE_MB`)

**Response `200`:**
```json
{ "avatar_url": "https://...supabase.co/storage/v1/object/public/avatars/..." }
```

---

### DELETE /auth/me/avatar
Remove profile avatar.

**Response `200`:** `{ "message": "Avatar removed" }`

---

### POST /auth/logout
Clear session cookies and invalidate Supabase session.

**Response `200`:** `{ "message": "Logged out" }`

---

## 3. Upload Endpoint (`/v1/upload`)

### POST /upload
Upload manga images and trigger AI processing.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | `file[]` | Yes | Image files (JPG/PNG/WebP); max size per file per app settings |
| `ai_config` | `string` (JSON) | No | AI processing configuration |
| `series_id` | `string` (UUID) | No | Attach pages to an existing series |
| `chapter_id` | `string` (UUID) | No | Attach pages to a specific chapter |
| `new_chapter_title` | `string` | No | Auto-create a new chapter with this title |

**`ai_config` JSON schema:**
```json
{
  "translator": "gemini",
  "target_lang": "VIN",
  "detector": "default",
  "ocr": "manga-ocr",
  "inpainter": "lama",
  "renderer": "default"
}
```

**Response `202 Accepted`:**
```json
{
  "message": "Upload received. Processing started.",
  "page_ids": ["uuid1", "uuid2"],
  "batch_id": "uuid"
}
```

**Errors:**
- `400` – Invalid file type, file too large, or empty batch
- `403` – Insufficient credits or batch size exceeds plan limit
- `429` – Rate limit exceeded

**Rate limit:** Configured via `RATE_LIMIT_UPLOAD`

---

## 4. Processing Status (`/v1/status`)

### GET /status/{page_id}
Get processing status for a single page.

**Response `200`:**
```json
{
  "page_id": "uuid",
  "status": "translating",
  "progress": 65,
  "error": null,
  "original_image_url": "https://...",
  "thumbnail_url": "https://..."
}
```

**Status values:** `pending`, `ocr_running`, `ocr_failed`, `translating`, `translated`, `completed`, `failed`

---

### GET /status/batch/{batch_id}
Get aggregated status for all pages in a batch.

**Response `200`:**
```json
{
  "batch_id": "uuid",
  "total": 5,
  "completed": 3,
  "failed": 0,
  "pages": [
    {
      "page_id": "uuid",
      "status": "completed",
      "progress": 100,
      "error": null,
      "original_image_url": "https://...",
      "thumbnail_url": "https://..."
    }
  ]
}
```

---

## 5. Page Data (`/v1/page`)

### GET /page/{page_id}
Get full translated page data including all bubbles.

**Response `200`:**
```json
{
  "page_id": "uuid",
  "status": "completed",
  "original_image_url": "https://...",
  "translated_image_url": "https://...",
  "processed_data": [
    {
      "bubble_id": "uuid",
      "bbox": [120.5, 45.0, 200.0, 80.0],
      "original_text": "日本語テキスト",
      "translated_text": "Văn bản tiếng Việt",
      "confidence": 0.95
    }
  ],
  "metadata": {
    "batch_id": "uuid",
    "series_id": null,
    "chapter_id": null,
    "page_number": null
  }
}
```

`bbox` format: `[x, y, width, height]` in pixels

---

### PATCH /page/{page_id}/bubbles/{bubble_id}
Manually edit a bubble's translated text.

**Request Body:**
```json
{ "translated_text": "Corrected Vietnamese translation" }
```

`translated_text`: 1–5000 characters

**Response `200`:** `{ "message": "Translation updated" }`

---

### GET /page/{page_id}/bubbles/{bubble_id}/history
Get translation history for a bubble.

**Response `200`:**
```json
{
  "bubble_id": "uuid",
  "total": 2,
  "items": [
    {
      "translation_id": "uuid",
      "bubble_id": "uuid",
      "translated_text": "First AI translation",
      "translated_at": "2025-01-01T10:00:00Z",
      "llm_model_used": "gemini-2.5-flash",
      "user_id": null,
      "username": null
    },
    {
      "translation_id": "uuid",
      "bubble_id": "uuid",
      "translated_text": "User-corrected translation",
      "translated_at": "2025-01-01T11:00:00Z",
      "llm_model_used": null,
      "user_id": "uuid",
      "username": "manga_fan"
    }
  ]
}
```

---

## 6. Q&A Endpoint (`/v1/qa`)

### POST /qa
Ask a question about manga content using RAG.

**Request Body:**
```json
{
  "question": "Who is the main character in this page?",
  "page_id": "uuid",
  "series_id": null
}
```

- `question`: 1–2000 characters (required)
- `page_id`: Scope question to a specific page (optional)
- `series_id`: Scope question to an entire series (optional)

**Response `200`:**
```json
{
  "question": "Who is the main character?",
  "answer": "Based on the dialogue, the main character appears to be Naruto...",
  "source_chunks": [
    "Tôi sẽ trở thành Hokage! - Naruto",
    "Naruto! Hãy cẩn thận! - Sakura"
  ],
  "confidence": 0.87
}
```

---

## 7. History (`/v1/history`)

### GET /history
Get paginated processing history for the current user.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `string` | `all` | Filter: `page`, `series`, or `all` |
| `limit` | `integer` | `20` | Items per page (max 100) |
| `offset` | `integer` | `0` | Pagination offset |

**Response `200`:**
```json
{
  "total": 42,
  "items": [
    {
      "id": "uuid",
      "type": "page",
      "title": "Page 1 - Batch 2025-01-01",
      "thumbnail_url": "https://...",
      "last_accessed": "2025-01-01T12:00:00Z",
      "status": "completed",
      "series_id": null,
      "series_title": null,
      "chapter_number": null
    }
  ]
}
```

---

## 8. Series & Chapters (`/v1/series`)

### POST /series
Create a new manga series.

**Request Body:**
```json
{
  "title": "Naruto",
  "description": "A ninja story",
  "status": "completed",
  "tags": ["action", "shounen"],
  "source_language": "JPN",
  "target_language": "VIN"
}
```

**Response `201`:** `SeriesResponse` object

---

### GET /series
List current user's series.

**Query Params:** `limit`, `offset`, `status` filter

**Response `200`:**
```json
{
  "total": 5,
  "items": [
    {
      "series_id": "uuid",
      "title": "Naruto",
      "description": "...",
      "status": "completed",
      "tags": ["action"],
      "cover_image_url": "https://...",
      "source_language": "JPN",
      "target_language": "VIN",
      "created_at": "...",
      "updated_at": "...",
      "chapter_count": 3,
      "page_count": 45
    }
  ]
}
```

---

### GET /series/{series_id}
Get full series with chapters and pages.

**Response `200`:** Full series object including `chapters[]` with nested `pages[]`

---

### PATCH /series/{series_id}
Update series metadata.

**Request Body** (all optional): Same fields as POST plus `cover_image_url`

---

### DELETE /series/{series_id}
Delete series (does not delete associated pages).

---

### POST /series/{series_id}/cover
Upload series cover image.

**Request:** `multipart/form-data`, field `file` (JPG/PNG/WebP, max 5 MB)

---

### POST /series/{series_id}/chapters
Create a new chapter.

**Request Body:**
```json
{
  "title": "Chapter 1: The Beginning",
  "chapter_number": 1,
  "description": "Optional description"
}
```

---

### GET /series/{series_id}/chapters/{chapter_id}
Get chapter with pages.

---

### PATCH /series/{series_id}/chapters/{chapter_id}
Update chapter metadata.

---

### POST /series/{series_id}/chapters/{chapter_id}/pages
Add processed pages to a chapter.

**Request Body:**
```json
{ "page_ids": ["uuid1", "uuid2"] }
```

`page_ids`: 1–200 items

---

### POST /series/{series_id}/chapters/reorder
Reorder chapters.

**Request Body:**
```json
{
  "items": [
    { "id": "chapter_uuid", "order": 1 },
    { "id": "chapter_uuid2", "order": 2 }
  ]
}
```

---

## 9. Credits (`/v1/credits`)

### GET /credits
Get current credit balance, plan info, and recent transactions.

**Response `200`:**
```json
{
  "plan_tier": "free",
  "credits_balance": 42,
  "daily_credits_reset_at": "2025-01-02T00:00:00Z",
  "plan": {
    "id": "free",
    "name": "Free",
    "price_vnd": 0,
    "monthly_credits": 150,
    "daily_credits": 5,
    "max_batch_size": 5,
    "priority_weight": 1,
    "bonus_credits": 0,
    "sort_order": 0
  },
  "recent_transactions": [
    {
      "id": "uuid",
      "amount": -1,
      "type": "upload",
      "reference_id": "page_uuid",
      "note": "Upload: image.jpg",
      "created_at": "2025-01-01T10:00:00Z"
    }
  ]
}
```

---

### GET /credits/plans
List all available subscription plans.

**Response `200`:** Array of `PlanInfo` objects sorted by tier

---

### POST /credits/upgrade
Initiate subscription upgrade (payment gateway).

**Response `503`:** Payment gateway not yet integrated. Manual upgrade via admin.

---

## 10. AI Module Config (`/v1/ai-module`)

### GET /ai-module/options
Get available AI model options and current configuration.

**Response `200`:**
```json
{
  "current": {
    "translator": "gemini",
    "target_lang": "VIN",
    "detector": "default",
    "ocr": "manga-ocr",
    "inpainter": "lama",
    "renderer": "default"
  },
  "available": {
    "translators": ["gemini", "gpt4", "deepl"],
    "detectors": ["default", "craft", "yolo", "paddle"],
    "ocr_engines": ["manga-ocr", "paddle"],
    "inpainters": ["lama", "aot", "sd"],
    "renderers": ["default"]
  }
}
```

---

## 11. Admin Endpoints (`/v1/admin`)

All admin endpoints require `role = 'admin'` in the user's profile. Returns `403` for non-admins.

### GET /admin/analytics/daily?days=30
Daily activity time-series.

**Response `200`:**
```json
[
  { "date": "2025-01-01", "new_users": 5, "pages_uploaded": 42, "qa_questions": 18 }
]
```

---

### GET /admin/analytics/top-users?metric=pages&limit=10
Top users by activity.

---

### GET /admin/analytics/status-breakdown
Page count by processing status.

---

### GET /admin/users?search=&limit=20&offset=0
List all users with search.

### GET /admin/users/{user_id}
Get user detail.

### PATCH /admin/users/{user_id}
Update user (ban, modify plan, grant credits).

---

### GET /admin/content?status=&limit=20&offset=0
List content for moderation.

### DELETE /admin/content/{page_id}
Delete a page (moderation).

---

### GET /admin/health
System health check (AI worker, Supabase connectivity).

---

### GET /admin/audit?limit=50&offset=0
Paginated admin audit log.

---

### GET /admin/settings
Get all app settings.

### PATCH /admin/settings
Update app settings.

**Request Body:**
```json
{
  "registration_enabled": true,
  "maintenance_mode": false,
  "max_upload_size_mb": 10,
  "qa_daily_limit": 50
}
```

---

## 12. Health Check

### GET /health
Backend liveness probe. No authentication required.

**Response `200`:**
```json
{ "status": "ok", "version": "1.0.0" }
```

---

## 13. Error Responses

All errors follow this format:

```json
{
  "detail": "Human-readable error message"
}
```

| HTTP Code | Meaning |
|-----------|---------|
| `400` | Bad request (invalid input, validation error) |
| `401` | Unauthenticated (missing or invalid session cookie) |
| `403` | Forbidden (insufficient permissions or plan limits) |
| `404` | Resource not found |
| `413` | Request body too large |
| `422` | Unprocessable entity (Pydantic validation failure) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |
| `503` | Service unavailable (AI worker offline, payment not available) |
