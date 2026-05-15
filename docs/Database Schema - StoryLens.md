# Database Schema - StoryLens

## 1. Overview

**Database:** PostgreSQL via Supabase
**Extensions:** `pgvector` (384-dimension embeddings), `uuid-ossp` (UUID generation)
**Security Model:** Row-Level Security (RLS) enabled on all user data tables. The backend uses the Supabase service-role key to bypass RLS; ownership is enforced in application code.

---

## 2. Entity Relationship Summary

```
profiles (1) ──────────────── (N) manga_series
manga_series (1) ──────────── (N) manga_chapters
manga_chapters (1) ─────────── (N) manga_pages
manga_pages (1) ────────────── (1) page_metadata
manga_pages (1) ────────────── (N) bubble_data
bubble_data (1) ─────────────── (N) translation_history
manga_pages (1) ────────────── (N) qa_history
manga_pages (1) ────────────── (N) embeddings
profiles (1) ──────────────── (1) user_subscriptions
profiles (1) ──────────────── (N) credit_transactions
subscription_plans (1) ──────── (N) user_subscriptions
admin_audit_log (N) ─────────── (1) profiles (actor)
```

---

## 3. Core Tables

### 3.1 `profiles`
Extends Supabase Auth `auth.users`. Created automatically on registration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, FK → `auth.users.id` | Matches Supabase Auth user ID |
| `username` | `text` | UNIQUE, NOT NULL | 3–32 chars, alphanumeric + underscore |
| `email` | `text` | UNIQUE, NOT NULL | User email (mirrors auth.users) |
| `role` | `text` | DEFAULT `'user'` | `'user'` or `'admin'` |
| `full_name` | `text` | nullable | Display full name |
| `display_name` | `text` | nullable | Short display name |
| `avatar_url` | `text` | nullable | URL to profile picture in Supabase Storage |
| `bio` | `text` | nullable | User biography |
| `locale` | `text` | nullable | Preferred UI language (`vi`, `en`, `ja`, `zh`, `ko`) |
| `timezone` | `text` | nullable | IANA timezone string |
| `date_of_birth` | `date` | nullable | — |
| `gender` | `text` | nullable | `male`, `female`, `other`, `prefer_not_to_say` |
| `country` | `text` | nullable | ISO country code |
| `phone` | `text` | nullable | 6–20 chars |
| `preferred_target_lang` | `text` | nullable | Default translation target (`VIN`, `ENG`, etc.) |
| `plan_tier` | `text` | DEFAULT `'free'` | `free`, `basic`, `pro`, `premium` |
| `credits_balance` | `integer` | DEFAULT `0` | Current credit balance |
| `daily_credits_reset_at` | `timestamptz` | nullable | Next daily top-up timestamp |
| `last_seen_at` | `timestamptz` | nullable | Last API activity |
| `created_at` | `timestamptz` | DEFAULT `now()` | Registration time |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last profile update |

---

### 3.2 `manga_series`
Manga series owned by a user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `series_id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | — |
| `user_id` | `uuid` | FK → `profiles.id`, NOT NULL | Owner |
| `title` | `text` | NOT NULL | 1–200 chars |
| `description` | `text` | nullable | Up to 5000 chars |
| `cover_image_url` | `text` | nullable | URL in `series-covers` bucket |
| `status` | `text` | DEFAULT `'ongoing'` | `ongoing`, `completed`, `paused` |
| `tags` | `text[]` | nullable | Max 20 tags, max 32 chars each, lowercase |
| `source_language` | `text` | nullable | e.g., `JPN` |
| `target_language` | `text` | nullable | e.g., `VIN` |
| `created_at` | `timestamptz` | DEFAULT `now()` | — |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Auto-bumped when chapters/pages are added |

**Indexes:** `(user_id, updated_at DESC)`, GIN index on `tags`

---

### 3.3 `manga_chapters`
Chapters within a series.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `chapter_id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | — |
| `series_id` | `uuid` | FK → `manga_series.series_id`, NOT NULL | Parent series |
| `chapter_number` | `integer` | NOT NULL | >= 1; unique per series |
| `title` | `text` | NOT NULL | Chapter title |
| `description` | `text` | nullable | Chapter description |
| `created_at` | `timestamptz` | DEFAULT `now()` | — |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Auto-bumped when pages are reordered |

**Constraints:** `UNIQUE (series_id, chapter_number)`

---

### 3.4 `manga_pages`
Individual manga pages (uploaded images).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `page_id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | — |
| `user_id` | `uuid` | FK → `profiles.id`, NOT NULL | Owner |
| `chapter_id` | `uuid` | FK → `manga_chapters.chapter_id`, nullable | `null` = orphan page (batch only) |
| `batch_id` | `uuid` | nullable | Groups pages uploaded together |
| `page_number` | `integer` | nullable | Order within chapter |
| `original_image_url` | `text` | nullable | URL in originals storage bucket |
| `translated_image_url` | `text` | nullable | URL to inpainted + rendered image |
| `thumbnail_url` | `text` | nullable | URL to generated thumbnail |
| `status` | `text` | DEFAULT `'pending'` | See status enum below |
| `progress` | `integer` | DEFAULT `0` | 0–100, processing progress |
| `error` | `text` | nullable | Error message if status = `failed` |
| `uploaded_at` | `timestamptz` | DEFAULT `now()` | — |
| `processed_at` | `timestamptz` | nullable | Completion time |

**Status Enum:** `pending` → `ocr_running` → (`ocr_failed` \| `translating`) → `translated` → `completed` \| `failed`

**RLS:** Users can only SELECT/UPDATE their own pages. Inserts/Deletes use service-role.

---

### 3.5 `page_metadata`
AI model versions and confidence scores for a processed page.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `metadata_id` | `uuid` | PK | — |
| `page_id` | `uuid` | FK → `manga_pages.page_id`, UNIQUE | One record per page |
| `ocr_model_version` | `text` | nullable | e.g., `manga-ocr-0.1.0` |
| `translation_model_version` | `text` | nullable | e.g., `gemini-2.5-flash` |
| `avg_ocr_confidence` | `float` | nullable | Average bubble OCR confidence |
| `avg_translation_confidence` | `float` | nullable | Average translation confidence |
| `created_at` | `timestamptz` | DEFAULT `now()` | — |

---

### 3.6 `bubble_data`
Speech bubbles detected on a page.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `bubble_id` | `uuid` | PK | — |
| `page_id` | `uuid` | FK → `manga_pages.page_id`, NOT NULL | Parent page |
| `x` | `float` | NOT NULL | Bounding box left edge (pixels) |
| `y` | `float` | NOT NULL | Bounding box top edge (pixels) |
| `width` | `float` | NOT NULL | Bounding box width (pixels) |
| `height` | `float` | NOT NULL | Bounding box height (pixels) |
| `original_text_jp` | `text` | nullable | Raw Japanese text from OCR |
| `ocr_confidence` | `float` | nullable | 0.0–1.0 confidence score |
| `created_at` | `timestamptz` | DEFAULT `now()` | — |

**RLS:** Users can SELECT their own bubbles (via page → user ownership).

---

### 3.7 `translation_history`
Audit trail of all translations per bubble (AI-generated and manual edits).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `translation_id` | `uuid` | PK | — |
| `bubble_id` | `uuid` | FK → `bubble_data.bubble_id`, NOT NULL | Parent bubble |
| `translated_text` | `text` | NOT NULL | Vietnamese (or target language) translation |
| `llm_model_used` | `text` | nullable | Model that produced the translation |
| `user_id` | `uuid` | FK → `profiles.id`, nullable | Non-null if manually edited by user |
| `translated_at` | `timestamptz` | DEFAULT `now()` | — |

---

### 3.8 `qa_history`
Questions asked by users about manga content, with AI answers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `qa_id` | `uuid` | PK | — |
| `user_id` | `uuid` | FK → `profiles.id`, NOT NULL | Questioner |
| `page_id` | `uuid` | FK → `manga_pages.page_id`, nullable | Specific page context |
| `series_id` | `uuid` | FK → `manga_series.series_id`, nullable | Series-level context |
| `question` | `text` | NOT NULL | User's question (1–2000 chars) |
| `answer` | `text` | NOT NULL | AI-generated answer |
| `source_chunks` | `jsonb` | nullable | Source text chunks used for answer |
| `asked_at` | `timestamptz` | DEFAULT `now()` | — |

**RLS:** Users can only SELECT their own Q&A history.

---

### 3.9 `embeddings`
pgvector embeddings for RAG semantic search.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `embedding_id` | `uuid` | PK | — |
| `page_id` | `uuid` | FK → `manga_pages.page_id`, NOT NULL | Source page |
| `series_id` | `uuid` | FK → `manga_series.series_id`, nullable | Parent series (for series-level search) |
| `chunk_text` | `text` | NOT NULL | Text chunk that was embedded |
| `embedding` | `vector(384)` | NOT NULL | all-MiniLM-L6-v2 embedding |
| `created_at` | `timestamptz` | DEFAULT `now()` | — |

**RPC:** `match_embeddings(query_embedding, match_threshold, match_count, filter_page_id, filter_series_id)` — returns ranked chunks by cosine similarity.

**RLS:** Users can SELECT embeddings for pages they own.

---

## 4. Credit & Subscription Tables

### 4.1 `subscription_plans`
Read-only plan definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `text` | PK: `free`, `basic`, `pro`, `premium` |
| `name` | `text` | Display name |
| `price_vnd` | `integer` | Monthly price in Vietnamese Dong (0 = free) |
| `monthly_credits` | `integer` | Credits granted on subscription/renewal |
| `daily_credits` | `integer` | Free daily top-up credits |
| `max_batch_size` | `integer` | Max images per upload batch |
| `priority_weight` | `integer` | AI queue priority |
| `bonus_credits` | `integer` | One-time bonus on first subscription |
| `sort_order` | `integer` | UI display order |

**Current Plan Data:**

| Plan | Price (VND) | Monthly Credits | Daily Credits | Max Batch |
|------|------------|----------------|--------------|-----------|
| free | 0 | 150 | 5 | 5 |
| basic | 49,000 | 300 | 20 | 20 |
| pro | 99,000 | 1,000 | 50 | 50 |
| premium | 249,000 | 3,000 | 100 | 100 |

---

### 4.2 `user_subscriptions`
Active subscription per user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.id`, UNIQUE (one active sub per user) |
| `plan_id` | `text` | FK → `subscription_plans.id` |
| `status` | `text` | `active`, `cancelled`, `expired` |
| `started_at` | `timestamptz` | Subscription start |
| `expires_at` | `timestamptz` | nullable — null = forever (free plan) |
| `bonus_credits_given` | `boolean` | Whether one-time bonus was applied |
| `updated_at` | `timestamptz` | Last status change |

**Trigger:** New user registration automatically creates a `free` subscription record.

---

### 4.3 `credit_transactions`
Append-only ledger. Never updated or deleted.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.id`, NOT NULL |
| `amount` | `integer` | Positive = credit added, Negative = credit deducted |
| `type` | `text` | `daily_reset`, `upload`, `qa`, `bonus`, `admin_grant`, `purchase`, `subscription` |
| `reference_id` | `uuid` | nullable — references page_id, qa_id, etc. |
| `note` | `text` | nullable — human-readable description |
| `created_at` | `timestamptz` | DEFAULT `now()` |

---

## 5. Admin Tables

### 5.1 `admin_audit_log`
Immutable record of all admin actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `actor_id` | `uuid` | FK → `profiles.id` — admin who performed the action |
| `actor_email` | `text` | Snapshot of admin email at action time |
| `action` | `text` | Action type (e.g., `ban_user`, `grant_credits`, `delete_content`) |
| `target_type` | `text` | nullable — entity type affected (`user`, `page`, `series`) |
| `target_id` | `text` | nullable — ID of affected entity |
| `summary` | `text` | Human-readable description |
| `metadata` | `jsonb` | nullable — additional context |
| `ip_address` | `text` | nullable — admin client IP |
| `user_agent` | `text` | nullable — admin browser UA |
| `created_at` | `timestamptz` | DEFAULT `now()` |

---

### 5.2 `app_settings`
Runtime-mutable feature flags and configuration.

| Column | Type | Description |
|--------|------|-------------|
| `key` | `text` | PK — setting name |
| `value` | `text` | Setting value (stored as text, parsed in code) |
| `description` | `text` | nullable — human-readable description |
| `updated_at` | `timestamptz` | Last change |
| `updated_by` | `uuid` | FK → `profiles.id` — last admin who changed it |

**Default Settings:**

| Key | Default Value | Description |
|-----|--------------|-------------|
| `registration_enabled` | `true` | Allow new registrations |
| `maintenance_mode` | `false` | Show maintenance banner |
| `max_upload_size_mb` | `10` | Max image file size |
| `default_target_lang` | `VIN` | Default translation target language |
| `qa_daily_limit` | `50` | Max Q&A queries per user per day |
| `upload_daily_limit` | `20` | Max uploads per user per day |

---

## 6. Analytics RPCs

Supabase SQL functions for admin analytics queries:

| Function | Parameters | Returns |
|----------|-----------|---------|
| `admin_daily_activity(days)` | Number of days to look back | Daily time-series: new users, pages uploaded, Q&A count |
| `admin_top_users(metric, max_rows)` | `metric` = `pages` or `qa` | Users ranked by activity |
| `admin_status_breakdown()` | — | Page count by processing status |
| `admin_target_lang_breakdown()` | — | User count by preferred target language |

---

## 7. Storage Buckets

| Bucket | Access | Contents |
|--------|--------|---------|
| `manga-originals` | Private (service-role only) | Raw uploaded manga images |
| `manga-thumbnails` | Private (service-role only) | Auto-generated page thumbnails |
| `avatars` | Public | User profile pictures |
| `series-covers` | Public | Series cover images |
