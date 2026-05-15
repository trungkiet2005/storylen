# Software Architecture Document (SAD) - StoryLens

## 1. Introduction

### 1.1 Purpose
This document describes the software architecture of StoryLens — an AI-powered manga translation and Q&A platform. It provides an overview of the system's structure, key components, their relationships, and the design principles guiding development.

### 1.2 Scope
StoryLens consists of three independently deployed services:
- **Frontend** – Next.js web application (Vercel)
- **Backend API** – FastAPI server (Render.com)
- **AI Worker** – Manga translation service (HuggingFace Spaces)

All services communicate over HTTPS. Shared persistent state is stored in Supabase (PostgreSQL + Storage).

---

## 2. Architecture Overview

### 2.1 Architecture Style
**Microservice + Layered Architecture**

The system separates concerns into three independent deployable services, with each service internally organized into layers (presentation → application → business logic → data access).

### 2.2 High-Level Diagram

```
┌─────────────────────────────────────────────┐
│           User Browser                      │
│         Next.js 16 (Vercel)                 │
│  Pages: Upload, Reader, Q&A, History,       │
│         Series, Profile, Admin              │
└────────────────┬────────────────────────────┘
                 │ HTTPS (HTTP-only cookies)
                 ▼
┌─────────────────────────────────────────────┐
│        Backend API (Render.com)             │
│          FastAPI + Uvicorn                  │
│  Routers: auth, upload, pages, status,      │
│           qa, history, series, credits,     │
│           admin, ai_module                  │
└────┬──────────────────────┬─────────────────┘
     │                      │
     │ Supabase SDK          │ HTTP (async background)
     ▼                      ▼
┌────────────────┐  ┌──────────────────────────┐
│   Supabase     │  │  AI Worker               │
│  PostgreSQL    │  │  (HuggingFace Spaces)    │
│  + pgvector    │  │  - YOLOv8 detection      │
│  + Storage     │  │  - Manga-OCR             │
│  + Auth        │  │  - Text inpainting       │
└────────────────┘  │  - Gemini translation    │
                    │  - Sentence Transformers  │
                    └──────────────────────────┘
                              │
                    ┌─────────┘
                    │ Gemini API (Google)
                    └──────────────────
```

---

## 3. Frontend Architecture

### 3.1 Framework
**Next.js 16** with App Router, React 19, TypeScript, Tailwind CSS

### 3.2 Page Structure (`/app` router)

| Route | Description |
|-------|-------------|
| `/` | Home / landing page |
| `/login` | User login |
| `/register` | User registration |
| `/upload` | Manga image upload (single or batch) |
| `/reader` | Manga reader with AI translation overlay |
| `/qa` | RAG-based Q&A interface |
| `/history` | Processed pages and series history |
| `/series` | Series list |
| `/series/[id]` | Series detail |
| `/series/[id]/read` | In-series reader |
| `/series/create` | Create new series |
| `/series/[id]/edit` | Edit series metadata |
| `/profile` | User profile management |
| `/settings` | User settings |
| `/plans` | Subscription plans / pricing |
| `/admin/*` | Admin dashboard (analytics, users, content, health, audit, settings) |

### 3.3 Key Components

| Component | Purpose |
|-----------|---------|
| `TopBar` | Navigation bar with auth state |
| `Footer` | Site footer |
| `MangaPage` | Renders manga page with translation bubbles |
| `AddToSeriesModal` | Add processed pages to a series/chapter |
| `CreditBadge` | Displays current credit balance |
| `UpgradePrompt` | Upsell modal for credit/plan upgrades |
| `Toast` | Notification system |
| `AuthContext` | Global authentication state & session |

### 3.4 API Client (`src/lib/api.ts`)
Centralizes all backend calls. Key behaviors:
- Base URL: `NEXT_PUBLIC_API_URL` (default: `https://storylens-api.onrender.com/v1`)
- Always sends cookies (`credentials: 'include'`)
- Auto-retries on network failure (8s, 15s delays) to handle Render cold starts
- `APIError` class captures HTTP status codes and user-facing messages

---

## 4. Backend Architecture

### 4.1 Framework
**FastAPI** with Python 3.10+, Uvicorn (ASGI), Gunicorn (process manager)

### 4.2 Middleware Stack (applied in order)
1. **SlowAPI** – Rate limiting per endpoint (register, login, upload)
2. **BodySizeLimitMiddleware** – Rejects oversized request bodies
3. **RequestIDMiddleware** – Injects `X-Request-ID` header for tracing
4. **CORSMiddleware** – Allows configured `ALLOWED_ORIGINS` with credentials

### 4.3 Router Modules (`/v1` prefix)

| Router | Path | Description |
|--------|------|-------------|
| auth | `/v1/auth` | Register, login, profile CRUD, avatar upload, logout |
| upload | `/v1/upload` | Upload images, trigger background AI pipeline |
| status | `/v1/status` | Per-page and batch processing status |
| pages | `/v1/page` | Retrieve translated page data and bubble results |
| qa | `/v1/qa` | RAG-based Q&A on manga content |
| history | `/v1/history` | User's processing history |
| series | `/v1/series` | Series/chapter CRUD, page assignment |
| credits | `/v1/credits` | Credit balance, plans, transactions |
| ai_module | `/v1/ai-module` | AI module config and options |
| admin | `/v1/admin` | Admin-only analytics, users, audit, content, settings |

### 4.4 Services Layer

| Service | Responsibility |
|---------|---------------|
| `ai_module_client.py` | HTTP client to HuggingFace Space AI worker |
| `ai_pipeline.py` | Orchestrates upload → OCR → translation → embedding |
| `credit_service.py` | Credit deduction, daily reset, plan checks |
| `hf_client.py` | HuggingFace API authentication and request management |
| `image_validation.py` | File type/size validation for uploads |
| `rag.py` | pgvector similarity search + Gemini RAG answer generation |

### 4.5 Background Processing
- Upload handler creates page records, deducts credits, then kicks off `run_ai_pipeline` as a background task
- A `BoundedSemaphore` limits concurrent pipeline threads (`MAX_PIPELINE_CONCURRENCY`) to prevent OOM on Render's free tier
- Pipeline timeout: 300 seconds — if semaphore cannot be acquired, page is marked `failed`

### 4.6 Startup Validation
On startup, the backend:
1. Tests Supabase connectivity
2. Marks any `ocr_running` or `translating` pages (stale from previous container) as `failed`
3. Validates all Gemini API keys in the rotation pool
4. Validates AI Module URL and HuggingFace Space URL

---

## 5. AI Worker Architecture

### 5.1 Deployment
Separate FastAPI service on HuggingFace Spaces (16 GB RAM). The backend calls it asynchronously after upload.

### 5.2 Processing Pipeline

```
Input image
    ↓
Text Region Detection (YOLOv8 / CRAFT / DBNet)
    ↓
Text Extraction via Manga-OCR
    ↓
Inpainting (remove original text from image)
    ↓
Translation via Gemini API (context-aware, xưng hô preservation)
    ↓
Text Rendering (font overlay on inpainted image)
    ↓
Embedding generation (Sentence Transformers)
    ↓
Store results: translated image + bubble data + pgvector embeddings
```

### 5.3 Configurable Options
- **Detector:** YOLOv8, CRAFT, CTD, DBNet, Paddle
- **OCR:** Manga-OCR (Japanese), PaddleOCR, etc.
- **Inpainter:** AOT, LAMA, Stable Diffusion
- **Translator:** Gemini (default), others configurable
- **Target Language:** Vietnamese (VIN), English (ENG), Japanese (JPN), Chinese (CHS), Korean (KOR)

---

## 6. Data Architecture

### 6.1 Database: Supabase (PostgreSQL)
- All relational data: users, series, chapters, pages, bubbles, translations, Q&A history
- Row-Level Security (RLS) enforces ownership: users can only read/write their own data
- Backend uses service-role key (bypasses RLS); ownership is enforced in Python

### 6.2 Vector Storage: pgvector (Supabase extension)
- `embeddings` table stores 384-dimension vectors (all-MiniLM-L6-v2)
- Custom RPC function `match_embeddings(query_vec, match_threshold, match_count, page_id, series_id)` for similarity search

### 6.3 File Storage: Supabase Storage
Buckets:
- `manga-originals` – Raw uploaded images (private)
- `manga-thumbnails` – Generated thumbnails (private)
- `avatars` – User profile pictures (public)
- `series-covers` – Series cover images (public)

### 6.4 Credit/Subscription Data
- `subscription_plans` – Plan tiers (free/basic/pro/premium) with credit limits
- `user_subscriptions` – Active subscription per user
- `credit_transactions` – Append-only ledger of all credit events
- Profile columns: `plan_tier`, `credits_balance`, `daily_credits_reset_at`

---

## 7. Authentication & Security

### 7.1 Authentication Flow
1. User submits credentials → FastAPI `/auth/login`
2. Backend validates via Supabase Auth → receives access + refresh tokens
3. Tokens stored as **HTTP-only cookies** (never exposed to JavaScript)
4. All subsequent requests carry cookies automatically
5. Auto-refresh: backend exchanges expired access token using refresh token

### 7.2 Authorization
- **RBAC:** Two roles — `user` (default) and `admin`
- Admin endpoints (`/v1/admin/*`) check `role = 'admin'` from Supabase profile
- Ownership checks (series, pages) enforced in Python using service-role queries

### 7.3 Rate Limiting (SlowAPI)
- Configurable limits per endpoint via env vars (`RATE_LIMIT_REGISTER`, `RATE_LIMIT_LOGIN`, `RATE_LIMIT_UPLOAD`)

---

## 8. Deployment Architecture

```
GitHub (main branch)
    │
    ├── Push → Vercel CI/CD → Frontend (Vercel CDN, global)
    │
    └── Push → Render CI/CD → Backend API (Docker, Singapore)
                                    │
                    (manual deploy) ▼
                    HuggingFace Spaces (AI Worker, US)
                                    │
                    (shared)        ▼
                    Supabase (PostgreSQL + Storage, AWS us-east-1)
                    Google Gemini API (translation + QA generation)
```

### 8.1 Infrastructure Summary

| Service | Platform | Region | Tier |
|---------|----------|--------|------|
| Frontend | Vercel | Global CDN | Hobby/Pro |
| Backend API | Render.com | Singapore | Free (Docker) |
| AI Worker | HuggingFace Spaces | US | 16 GB RAM |
| Database + Storage | Supabase | AWS us-east-1 | Free/Pro |
| Translation AI | Google Gemini API | — | Pay-as-you-go |

---

## 9. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| AI Worker as separate service | Isolates heavy ML workloads (4–8 GB models) from the API server; Render free tier (512 MB) cannot load them |
| HTTP-only cookies for auth | Prevents XSS token theft; tokens never accessible via JavaScript |
| pgvector over external vector DB | Supabase already hosts PostgreSQL; pgvector eliminates the need for a separate ChromaDB/FAISS service for MVP |
| Multiple Gemini API keys | Gemini free tier has per-key quotas; rotation pool prevents service degradation during heavy use |
| Service-role key in backend | RLS protects direct DB access; backend bypasses RLS and enforces ownership in application code for flexibility |
| BoundedSemaphore for pipeline | Prevents spawning too many concurrent ML threads on the free tier, avoiding OOM crashes |
