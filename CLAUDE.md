# StoryLens — Claude Code Context

## What This Project Is

StoryLens is a production web app that lets users upload manga pages, runs an AI pipeline to detect and translate speech bubbles (Japanese/Chinese → Vietnamese), then serves a reader interface with translation overlays and a RAG-powered Q&A system.

**Three deployable services:**

| Service | Stack | Port | Deploy target |
|---------|-------|------|---------------|
| `frontend/` | Next.js 16 + React 19 + TypeScript | 3000 | Vercel |
| `backend/` | FastAPI + Python 3.11 + Supabase | 8000 | Render (Docker) |
| `ai_module/` | FastAPI + PyTorch + YOLOv8 + manga-ocr | 8001 | HuggingFace Spaces |

**Database:** Supabase PostgreSQL with pgvector extension (vector search for RAG).

---

## Repository Layout

```
storylen/
├── frontend/              # Next.js web app
│   ├── src/
│   │   ├── app/           # App Router pages (login, upload, reader, qa, admin…)
│   │   ├── components/    # Shared React components
│   │   ├── contexts/      # AuthContext, WibuContext
│   │   └── lib/           # api.ts (fetch wrapper), constants.ts, localStore.ts
│   └── __tests__/         # Vitest + React Testing Library
├── backend/
│   └── app/
│       ├── main.py        # FastAPI entry, middleware, router registration
│       ├── config.py      # Pydantic Settings — all env vars live here
│       ├── database.py    # Supabase client singleton
│       ├── routers/       # 10 routers: auth, upload, pages, status, qa, history,
│       │                  #   series, credits, ai_module, wibu + admin/
│       ├── services/      # Business logic: ai_pipeline, rag, credit_service, hf_client
│       ├── models/schemas.py  # Pydantic request/response models
│       └── storage/supabase_storage.py
├── ai_module/             # Standalone ML service (heavy: ~4GB Docker image)
│   ├── manga_translator/  # YOLOv8 detection, manga-ocr, lama_large inpainting
│   └── server/            # FastAPI routes for translation
├── docs/                  # SAD, SRS, API spec, DB schema, deployment guide
├── supabase/              # Supabase config
├── render.yaml            # Render IaC (backend Docker deploy, Singapore region)
└── .github/workflows/     # CI: tsc typecheck + vitest + eslint on frontend changes
```

---

## Local Development

### 1 — Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env          # fill in secrets
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Health check: `GET http://127.0.0.1:8000/health`  
Interactive docs: `http://127.0.0.1:8000/docs`

### 2 — Frontend

```powershell
cd frontend
npm install
# create .env.local:
# NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/v1
npm run dev
```

Open `http://localhost:3000`

### 3 — AI Module (optional, heavy)

```powershell
cd ai_module
pip install -r requirements.txt
python main.py --host 127.0.0.1 --port 8001
```

Without the AI module running locally, point `AI_MODULE_URL` in `backend/.env` at the HuggingFace Space URL.

---

## Key Commands

### Frontend

```powershell
npm run dev          # dev server
npm run build        # production build
npx tsc --noEmit     # typecheck only (CI uses this)
npm test             # vitest run (single pass)
npm run test:watch   # vitest watch
npm run lint         # ESLint
```

Tests live in `frontend/__tests__/` (components, unit, integration) and use `jsdom` environment. Setup file: `frontend/vitest.setup.ts`.

### Backend

```powershell
uvicorn app.main:app --reload          # dev
python smoke_test.py                   # basic integration check
docker build -t storylens-api .        # build image
docker run -p 8000:8000 --env-file .env storylens-api
```

---

## Environment Variables

All backend config is validated by `app/config.py` (Pydantic Settings). Missing required vars crash on startup.

### Critical backend vars

```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
GEMINI_API_KEY           # comma-separated list for key rotation
GEMINI_MODEL=gemini-2.5-flash
AI_MODULE_URL            # http://localhost:8001 or HF Space URL
AI_MODULE_TRANSLATOR=gemini
AI_MODULE_TARGET_LANG=VIN
MAX_FILE_SIZE_MB=10
ALLOWED_EXTENSIONS=jpg,jpeg,png,webp
RATE_LIMIT_UPLOAD=30/minute
AUTH_COOKIE_SECURE=false  # true in production (cross-domain HTTPS)
AUTH_COOKIE_SAMESITE=lax  # none in production
```

### Frontend

```
NEXT_PUBLIC_API_URL=https://storylens-api.onrender.com/v1
```

---

## Architecture & Critical Paths

### Upload & Translation Pipeline

1. User drops image(s) → `POST /v1/upload` → images stored in Supabase Storage (`manga-originals`)
2. Background thread (semaphore-limited) calls AI Module (`POST /translate/with-form/image`)
3. AI Module: YOLOv8 detects bubbles → manga-ocr reads text → lama_large inpaints → Gemini translates
4. Result (translated PNG) stored in `manga-thumbnails`, metadata saved to `manga_pages` + `bubble_data`
5. Sentence embeddings computed and stored in `embeddings` (pgvector)
6. Frontend polls `GET /v1/status/{page_id}` until `status=completed`

### RAG Q&A

1. User question → `POST /v1/qa` → vector embedding via Gemini embedding model
2. `pgvector` cosine search in `embeddings` table → top-k bubble texts retrieved
3. Context + question sent to Gemini (round-robin across multiple API keys)
4. 1 credit deducted per successful answer

### Auth Flow

- Supabase Auth (email/password). Backend issues HTTP-only cookie after login — no JS token access.
- Backend uses service-role key to bypass RLS for all DB operations.
- `AuthContext` on frontend tracks session; unauthenticated → redirect to `/login`.

### Credit System

- FREE tier: 5 credits/day, reset at 00:00 `Asia/Ho_Chi_Minh`
- Paid tiers: monthly pool (basic / pro / premium)
- 1 credit = 1 image translation OR 1 Q&A query
- Logic in `backend/app/services/credit_service.py`

### Gamification ("Wibu" system)

- Bookmarks, star ratings, reading progress, achievements tracked via `wibu` router
- Frontend state lives in `WibuContext` + `localStore.ts` (localStorage sync)
- Backend tables: `bookmarks`, `ratings`, `achievements`

---

## Database (Supabase PostgreSQL + pgvector)

Key tables:

| Table | Purpose |
|-------|---------|
| `profiles` | User metadata (username, avatar, locale, timezone) |
| `manga_series` | Series owned by user |
| `manga_chapters` | Chapters within a series |
| `manga_pages` | Individual pages, status, translated image URL |
| `bubble_data` | OCR bounding boxes, original/translated text, confidence |
| `embeddings` | pgvector (1536-dim) — powers RAG search |
| `qa_history` | Q&A logs |
| `credits` | Credit transactions & balances |
| `bookmarks` | Saved pages |
| `ratings` | User star ratings |
| `achievements` | Unlocked badges |

Migrations: `backend/supabase_migration*.sql`  
Supabase Storage buckets: `manga-originals` (private), `manga-thumbnails` (private), `avatars` (public read)

---

## Frontend Code Conventions

### Next.js version warning

This project uses **Next.js 16.2.6 with React 19**. APIs, file conventions, and component behavior may differ from your training data. Before writing page/layout/route code, check `node_modules/next/dist/docs/` or `frontend/AGENTS.md`.

### API calls

All backend calls go through `src/lib/api.ts` — a centralized fetch wrapper.  
Do not use `fetch()` directly in components; extend `api.ts` if needed.

### Routing

App Router (not Pages Router). All pages are in `src/app/`. Route groups: `(auth)`, `admin/` sub-routes.

### State management

- Global auth: `AuthContext` (`src/contexts/AuthContext.tsx`)
- Gamification: `WibuContext` (`src/contexts/WibuContext.tsx`)
- No Redux/Zustand — use React context + local state.

### Styling

Tailwind CSS + Framer Motion for animations. Dark-themed manga aesthetic. No CSS modules.

### Testing

```typescript
// Preferred test structure
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// Vitest globals (describe, it, expect, vi) are available without import
```

---

## Backend Code Conventions

### Adding a new router

1. Create `backend/app/routers/your_router.py`
2. Define `router = APIRouter(prefix="/your-prefix", tags=["Your Tag"])`
3. Register in `app/main.py`: `app.include_router(your_router.router)`
4. Add Pydantic schemas to `app/models/schemas.py`

### Service layer

Business logic belongs in `app/services/`, not in router functions. Routers handle HTTP; services handle logic.

### Rate limiting

Uses `slowapi`. Rate limits defined in `.env` (e.g., `RATE_LIMIT_UPLOAD=30/minute`) and applied via decorator:

```python
@limiter.limit(settings.RATE_LIMIT_UPLOAD)
async def upload_handler(request: Request, ...):
```

### Error handling

Return structured JSON errors — FastAPI `HTTPException` with meaningful status codes. Do not expose internal tracebacks.

---

## Deployment

### Backend (Render)

- Defined in `render.yaml` — auto-deploys on push to `main`
- Region: Singapore (`oregon` for free tier override)
- Plan: free (512MB RAM) — no heavy ML models here
- Health check endpoint: `GET /health`

### Frontend (Vercel)

- Connect Vercel project to `storylen` repo, set root to `frontend/`
- Set `NEXT_PUBLIC_API_URL` to the Render backend URL

### AI Module (HuggingFace Spaces)

- Docker-based Space (~4GB image)
- Set `GEMINI_API_KEY` as a repository secret in Space settings
- Backend `.env`: set `AI_MODULE_URL` to the HF Space URL, leave `AI_MODULE_TOKEN` empty for public Spaces

### Keep-alive

`.github/workflows/keep-alive.yml` pings the Render free tier to prevent sleep.

---

## CI/CD

`.github/workflows/ci.yml` runs on push/PR to `main` when `frontend/**` changes:

1. **typecheck** — `npx tsc --noEmit`
2. **test** — `npm test` (Vitest)
3. **lint** — `npm run lint` (ESLint)

All three must pass before merge.

---

## Admin Features

Admin dashboard at `/admin` — restricted to users with `role=admin` in `profiles`.

Sub-sections: analytics, users, content moderation, health monitoring, audit logs, app settings (feature toggles, rate limit overrides).

---

## What NOT to Do

- Do not add ML model loading to `backend/` — that belongs in `ai_module/` only.
- Do not use `fetch()` directly in frontend components — use `src/lib/api.ts`.
- Do not commit `.env` files or API keys.
- Do not bypass the credit deduction logic in `credit_service.py` without a clear reason.
- Do not use the Pages Router — this project uses the App Router exclusively.
- Do not store auth tokens in `localStorage` — they must stay in HTTP-only cookies.
