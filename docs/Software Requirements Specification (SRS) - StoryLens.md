# Software Requirements Specification (SRS) - StoryLens

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for **StoryLens** — an AI-powered manga translation and Q&A web platform targeting Vietnamese readers. It serves as the reference for development, QA, and stakeholder alignment.

### 1.2 Product Overview
StoryLens allows users to upload manga image files, automatically detect and extract Japanese text from speech bubbles, translate them to Vietnamese (or other languages) using contextual AI, and display the translated text overlaid on the original images. Users can also ask questions about the manga content via a RAG-based Q&A interface. A credit/subscription system controls usage, and an admin dashboard provides platform management.

### 1.3 User Classes

| Class | Description |
|-------|-------------|
| **Casual Reader** | Uploads and reads translated manga; uses history and series features |
| **Japanese Learner** | Uses Q&A feature to understand story context and language nuance |
| **Content Creator** | Organizes translated manga into series with custom covers and tags |
| **Admin** | Manages platform: monitors analytics, moderates content, manages users and credits |

---

## 2. Functional Requirements

### F01 – User Authentication
- **F01.1** Users can register with email, password, and username (3–32 chars, alphanumeric + underscore)
- **F01.2** Users can log in with email/password; session is maintained via HTTP-only cookies
- **F01.3** Users can update profile fields: full_name, display_name, bio, locale, timezone, date_of_birth, gender, country, phone, preferred_target_lang
- **F01.4** Users can upload and remove a profile avatar (JPG/PNG/WebP)
- **F01.5** Sessions persist via auto-refreshed access/refresh token cookies
- **F01.6** Users can log out, which clears cookies and invalidates the Supabase session

### F02 – Image Upload
- **F02.1** Users can upload one or more manga image files (JPG, PNG, WebP) in a single batch
- **F02.2** Max file size per image: configured via `max_upload_size_mb` app setting (default: 10 MB)
- **F02.3** Max batch size per upload is determined by the user's subscription plan
- **F02.4** Users can optionally specify AI processing configuration (detector, OCR, translator, target language)
- **F02.5** Users can optionally bind uploaded pages to an existing series/chapter or create a new chapter automatically
- **F02.6** Upload triggers background AI processing; user receives `page_ids` and `batch_id` immediately (202 Accepted)
- **F02.7** Each uploaded page costs 1 credit

### F03 – AI Processing Pipeline
- **F03.1** System detects text regions (speech bubbles) using a configurable detector model (default: YOLOv8)
- **F03.2** System extracts Japanese text from detected bubbles using Manga-OCR
- **F03.3** OCR accuracy target: Character Error Rate (CER) ≤ 5%
- **F03.4** System removes original text from image via inpainting
- **F03.5** System translates Japanese text to the target language (default: Vietnamese) using Gemini API with context awareness and xưng hô (pronoun) preservation
- **F03.6** System renders translated text onto the inpainted image
- **F03.7** System generates sentence embeddings for each translated bubble and stores them in pgvector
- **F03.8** Page status progresses through: `pending` → `ocr_running` → `translating` → `completed` (or `failed`)
- **F03.9** System reports processing progress as a 0–100 percentage
- **F03.10** Processing timeout: 30 seconds per page; pages exceeding this are marked `failed`

### F04 – Manga Reader & Overlay
- **F04.1** Users can view processed pages with translated text overlaid on the original image
- **F04.2** Users can toggle overlay visibility to compare original vs. translated
- **F04.3** Users can view individual bubble data (bounding box, original Japanese, confidence score)
- **F04.4** Users can manually edit a bubble's translation (1–5000 chars); edits are saved to `translation_history`
- **F04.5** Users can view the translation history for any bubble (who changed what, when)

### F05 – RAG Q&A
- **F05.1** Users can ask natural language questions about any processed page or series
- **F05.2** System retrieves the most relevant text chunks from pgvector using semantic similarity search
- **F05.3** System generates an answer via Gemini API using retrieved chunks as context (RAG)
- **F05.4** Response includes the answer text and source chunks for transparency
- **F05.5** Q&A history is stored per user and paginated in the UI
- **F05.6** Daily Q&A limit per user is controlled by app settings (`qa_daily_limit`, default: 50)

### F06 – Series & Chapter Management
- **F06.1** Users can create manga series with title, description, status (ongoing/completed/paused), tags (max 20), source and target languages, and a cover image
- **F06.2** Users can create chapters within a series (chapter_number, title, description)
- **F06.3** Users can assign processed pages to a chapter and set page ordering
- **F06.4** Users can reorder chapters and pages
- **F06.5** System auto-generates a cover image from the first page thumbnail if none is provided
- **F06.6** Series `updated_at` is auto-bumped when chapters or pages are modified

### F07 – History
- **F07.1** Users can view a paginated history of all processed pages and series
- **F07.2** History items include thumbnail, status, title, and last accessed timestamp
- **F07.3** History supports filtering and pagination (limit + offset)

### F08 – Credit & Subscription System
- **F08.1** All users start on the `free` plan (150 monthly credits, 5 daily top-up)
- **F08.2** Four plan tiers: free, basic, pro, premium (differing in monthly/daily credits and batch size)
- **F08.3** Each image upload costs 1 credit; system rejects uploads if balance is insufficient
- **F08.4** Daily free credits are automatically topped up via a scheduled trigger
- **F08.5** Users can view their current balance, plan info, and last 10 transactions
- **F08.6** Admin can manually grant credits to any user
- **F08.7** All credit events are recorded in an append-only transaction ledger

### F09 – Admin Dashboard
- **F09.1** Admin can view analytics: daily new users, pages uploaded, Q&A activity (time-series)
- **F09.2** Admin can view top users by pages or Q&A activity
- **F09.3** Admin can view page processing status breakdown
- **F09.4** Admin can list, search, and manage user accounts (view profile, ban, modify plan/credits)
- **F09.5** Admin can view and moderate uploaded content
- **F09.6** Admin can monitor system health (AI worker status, Supabase connectivity)
- **F09.7** Admin can view a paginated audit log of all admin actions
- **F09.8** Admin can modify app settings (registration toggle, maintenance mode, upload limits, Q&A limits)

---

## 3. Non-Functional Requirements

### 3.1 Performance
- UI interactive response: < 3 seconds
- Single-page AI processing: < 30 seconds
- Batch upload (10 images) enqueued: < 5 seconds
- Q&A response: < 10 seconds
- API rate limiting via SlowAPI (configurable per endpoint)

### 3.2 Scalability
- Backend is horizontally scalable via Docker containers on Render
- AI Worker runs on HuggingFace Spaces (separate from API server)
- BoundedSemaphore limits concurrent AI pipeline threads to prevent OOM

### 3.3 Availability
- Frontend served from Vercel's global CDN (high availability)
- Backend on Render free tier has cold starts (30–60s); frontend auto-retries with backoff
- AI Worker on HuggingFace may cold-start; keep-alive workflow pings it periodically

### 3.4 Security
- Authentication via HTTP-only cookies (no token exposure to JavaScript)
- RBAC: `user` and `admin` roles enforced at API layer
- RLS policies on all user data tables in Supabase
- Input validation on all endpoints (file types, sizes, string lengths)
- Rate limiting on sensitive endpoints (register, login, upload)
- No secrets hardcoded; all via environment variables

### 3.5 Data Integrity
- Credit transactions use an append-only ledger (never modified after insertion)
- Stale pipeline pages are auto-marked `failed` on backend restart
- Unique constraints on chapter numbers within a series

### 3.6 Usability
- UI supports Vietnamese as the primary language for target users
- Progress indicators for AI processing (0–100%)
- Toast notifications for errors and success states
- Framer Motion animations for page transitions

### 3.7 File Constraints
- Supported image formats: JPG, PNG, WebP
- Max file size per image: 10 MB (configurable in app_settings)
- Max batch size: 5 (free), 20 (basic), 50 (pro), 100 (premium)

---

## 4. External Interfaces

### 4.1 Google Gemini API
- Used for: translation and Q&A answer generation
- Model: `gemini-2.5-flash`
- Multi-key rotation on quota exhaustion (comma-separated `GEMINI_API_KEY`)

### 4.2 Supabase
- Services used: PostgreSQL (data), pgvector (embeddings), Storage (images), Auth (users)
- Access: service-role key from backend; anon key for direct client access where permitted

### 4.3 HuggingFace Spaces
- Hosts AI Worker (Manga-OCR, YOLOv8, inpainting, translation rendering)
- Accessed via HTTP from FastAPI backend; supports optional bearer token auth

### 4.4 Vercel
- Hosts Next.js frontend; auto-deploys on push to `main`

### 4.5 Render.com
- Hosts FastAPI backend as Docker container; auto-deploys via `render.yaml`
