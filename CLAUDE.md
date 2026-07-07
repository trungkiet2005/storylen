# StoryLens — Claude Code Context

## What This Project Is

StoryLens is a production web app that lets users upload manga pages, runs an AI
pipeline to detect and translate speech bubbles (Japanese/Chinese → Vietnamese),
then serves a reader interface with translation overlays and a RAG-powered Q&A
system. Users can also publish their translated chapters to a public library.

**Three deployable services:**

| Service       | Stack                                         | Port | Deploy target          |
| ------------- | --------------------------------------------- | ---- | ---------------------- |
| `frontend/`   | Next.js 16 + React 19 + TypeScript            | 3000 | Vercel                 |
| `backend/`    | FastAPI + Python 3.11 + Supabase              | 8000 | Render (Docker)        |
| `ai_module/`  | FastAPI + PyTorch + YOLOv8 + manga-ocr        | 8001 | HuggingFace Spaces     |

**Database:** Supabase PostgreSQL with pgvector + pg_trgm extensions.

---

## Repository Layout

```
storylen/
├── frontend/                  # Next.js web app
│   ├── src/
│   │   ├── app/               # App Router pages (login, register, upload,
│   │   │                      #   reader, qa, library, browse, series, studio,
│   │   │                      #   forum, history, bookmarks, stats, search,
│   │   │                      #   review/[pageId], share/[shareId], u/[handle],
│   │   │                      #   forgot/reset-password, notifications, plans,
│   │   │                      #   settings, profile/security, offline,
│   │   │                      #   terms/privacy/copyright, admin/…)
│   │   ├── components/        # AnimatedBackground, NotificationBell,
│   │   │                      #   LanguageSwitcher, OnboardingOverlay,
│   │   │                      #   ResumeReading, TopBar, …
│   │   ├── contexts/          # AuthContext, WibuContext, I18nContext
│   │   └── lib/               # api.ts (fetch wrapper), wallpaper-playlists.ts
│   ├── e2e/                   # Playwright E2E tests (auth, home, edge cases,
│   │                          #   mobile, protected-pages)
│   ├── __tests__/             # Vitest + React Testing Library
│   ├── public/wallpapers/     # Themed anime backgrounds (dragonball, xianxia,
│   │                          #   demon-slayer, blue-lock, jujutsu, naruto)
│   └── playwright.config.ts
├── backend/
│   └── app/
│       ├── main.py            # FastAPI entry, middleware, router registration
│       ├── config.py          # Pydantic Settings — all env vars live here
│       ├── database.py        # Supabase client singleton
│       ├── middleware.py      # RequestID, BodySizeLimit, SecurityHeaders
│       ├── routers/           # auth, upload, scrape, mangadex, pages, status,
│       │                      #   qa, history, series, credits, ai_module,
│       │                      #   wibu, notifications, share, search, payments,
│       │                      #   library, comments, forum, ws, admin/
│       ├── services/          # ai_pipeline, rag, credit_service, hf_client,
│       │                      #   ai_module_client, ai_module_source, scraper,
│       │                      #   captcha, dictionary, image_validation,
│       │                      #   forum_service, pipeline_control (cancel +
│       │                      #   event bus), achievements, idempotency
│       ├── models/schemas.py  # Pydantic request/response models
│       └── storage/supabase_storage.py
├── ai_module/                 # Standalone ML service (heavy: ~4GB Docker image)
├── docs/                      # SAD, SRS, API spec, DB schema, deployment guide
├── supabase/                  # Supabase config
├── render.yaml                # Render IaC (backend Docker deploy, Singapore)
└── .github/workflows/ci.yml   # CI: tsc + vitest + eslint + build + Playwright + pytest
```

---

## Local Development

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env          # fill in secrets
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Health check: `GET http://127.0.0.1:8000/health`
Interactive docs: `http://127.0.0.1:8000/docs` (only when `DEBUG=true`)

### Frontend

```powershell
cd frontend
npm install
# create .env.local from .env.example
npm run dev
```

Open `http://localhost:3000`

### AI Module (optional, heavy)

```powershell
cd ai_module
pip install -r requirements.txt
python main.py --host 127.0.0.1 --port 8001
```

Without the AI module running locally, point `AI_MODULE_URL` in `backend/.env`
at the HuggingFace Space URL.

---

## Key Commands

### Frontend

```powershell
npm run dev          # dev server (port 3000)
npm run build        # production build
npx tsc --noEmit     # typecheck only
npm test             # vitest (unit + RTL component tests)
npm run test:watch   # vitest watch
npm run test:e2e     # Playwright E2E (spins up its own dev server on 3100)
npm run test:e2e:ui  # Playwright UI mode
npm run lint         # ESLint
```

Playwright config: [`frontend/playwright.config.ts`](frontend/playwright.config.ts).
Run against an existing dev server on 3000:
`PLAYWRIGHT_NO_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e`.

### Backend

```powershell
uvicorn app.main:app --reload          # dev
pytest -q                              # all tests
python smoke_test.py                   # basic integration check
docker build -t storylens-api .        # build image
```

---

## Environment Variables

All backend config is validated by `app/config.py` (Pydantic Settings).
Missing required vars crash on startup in production.

### Critical backend vars

```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
GEMINI_API_KEY                # comma-separated for key rotation
GEMINI_MODEL=gemini-2.5-flash
AI_MODULE_URL                 # http://localhost:8001 or HF Space URL
MAX_FILE_SIZE_MB=10
ALLOWED_EXTENSIONS=jpg,jpeg,png,webp
RATE_LIMIT_UPLOAD=30/minute
AUTH_COOKIE_SECURE=false      # true in production (cross-domain HTTPS)
AUTH_COOKIE_SAMESITE=lax      # none in production
# Account flows
PASSWORD_RESET_REDIRECT_URL=http://localhost:3000/reset-password
FRONTEND_BASE_URL=http://localhost:3000
# Stripe (optional — leave blank to disable checkout)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_BASIC=
STRIPE_PRICE_PRO=
STRIPE_PRICE_PREMIUM=
# Bot protection (optional — leave blank to disable captcha in dev/free tier)
TURNSTILE_SECRET_KEY=
```

### Frontend (`.env.local`)

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=…       # used only by /reset-password page
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Architecture & Critical Paths

### Upload & Translation Pipeline

1. User drops image(s) → `POST /v1/upload` → Supabase Storage (`manga-originals`)
2. Background thread (semaphore-limited) calls AI Module `/translate/with-form/image`
3. AI Module: YOLOv8 detects bubbles → manga-ocr reads text → lama_large inpaints → Gemini translates
4. Result (translated PNG) stored in `manga-thumbnails`, metadata in
   `manga_pages` + `bubble_data`
5. Gemini embeddings of translated bubbles → `embeddings` (pgvector, 768-dim)
6. Frontend receives progress via WebSocket (`/v1/ws/batch/{batch_id}`) with
   polling fallback. Event bus replays missed events on reconnect.

**Cooperative cancellation:** `POST /v1/status/{page_id}/cancel` flips a
`threading.Event` checked at safe checkpoints in `ai_pipeline.process_page`.

### RAG Q&A

- Embeddings are generated **in the backend** by `services/embedding.py` calling
  the Gemini embedding API (`gemini-embedding-001`, 768-dim, L2-normalized,
  `task_type` RETRIEVAL_DOCUMENT/QUERY). No local ML model (respects "no ML on
  Render"). The ai_module does **not** return embeddings.
- Written at translate time in `ai_pipeline` (one batch per page, best-effort) and
  backfilled for older pages via `python -m app.scripts.backfill_embeddings`.

Query flow:
1. User question → `POST /v1/qa` → `embed_query()` (same model as the chunks).
2. `match_embeddings` RPC: pgvector cosine search, **owner-scoped**
   (`filter_user_id` → also closes the IDOR), with a `min_similarity`
   (`RAG_MIN_SIMILARITY`) floor; optional page/series scope.
3. Hits are enriched into `QASource` citations (original + translated +
   page_number + `/reader?page=` link); context + question → Gemini answer.
4. Falls back to the owner's own page text if no vector hits; honest "not found"
   message otherwise. 1 credit deducted per successful answer.

### Auth Flow

- Supabase Auth (email/password). Backend issues HTTP-only cookie after login —
  no JS token access.
- Self-service: `/forgot-password` (Supabase recovery email), `/reset-password`
  (uses access token from email hash), `/profile/security` (change password,
  change email, GDPR export, delete account).
- `AuthContext` tracks session; unauthenticated → redirect to `/login`.

### Public Library

- Owners call `POST /v1/chapters/{id}/publish` to make a chapter visible at
  `/library`. Read-only endpoints (`GET /v1/library`, `/v1/library/{id}/chapters`,
  `/v1/library/chapters/{id}`) are anonymous.
- DB flag: `manga_chapters.published_at` (NULL = private).

### Credit System

- FREE tier: 5 credits/day, reset at 00:00 `Asia/Ho_Chi_Minh`
- Paid tiers: monthly pool (basic / pro / premium)
- 1 credit = 1 image translation OR 1 Q&A query
- Self-service upgrade via Stripe Checkout (`/v1/credits/checkout`) if
  `STRIPE_SECRET_KEY` is set; otherwise returns 503 + UI falls back to
  contact-admin modal.

### Gamification ("Wibu") + Achievements

- Bookmarks, ratings, reading lists, goals tracked via `wibu` router.
- Achievement auto-unlock: server-side `app/services/achievements.py` runs
  after pipeline completes, Q&A, or bookmark add. Newly-unlocked badges
  emit notifications.

### Notifications

- In-app, persisted in `notifications` table. Bell icon polls every 60s.
- Emitted from: pipeline complete/fail, achievement unlock, Stripe webhook.
- Endpoints: `GET /v1/notifications`, `POST .../{id}/read`, `POST .../read-all`,
  `DELETE .../{id}`.

### Reading Session Resume

- `frontend/src/lib/api.ts`: `saveNativeReading` / `loadNativeReading` writes
  the last page/chapter/series to localStorage. `<ResumeReading />` on the
  home page surfaces a "Tiếp tục đọc" pill.

### Share Links

- `POST /v1/share` (owner) issues an opaque `share_id` with optional TTL.
- `GET /v1/share/{share_id}` is public; renders at `/share/[shareId]`.

### Community Forum

- Site-wide discussion forum (`routers/forum.py` + `services/forum_service.py`),
  surfaced at `/forum`. Categories (discussion / Q&A / recommend / feedback /
  announcement), nested replies (1 level deep), up/down voting, and
  hot/top/new sorting. Image/video attachments per post (v6 migration).
- Anonymous users read; authenticated users post, reply, vote. Admins can
  pin / lock threads.
- `@username` mentions are parsed server-side and emit notifications.
- Denormalized score / reply_count / hot_score are maintained by Postgres
  triggers (see `supabase_migration_v5_forum.sql`), not application code.
- Graceful degradation: if forum tables are missing, reads return empty lists
  and writes return 503 — no crashes.

### Chapter Comments

- Lightweight comments on published library chapters (`routers/comments.py`,
  `chapter_comments` table). Anonymous read; authenticated post / soft-delete
  own comments. Degrades to empty reads + 503 writes if the table is absent.

### Import from External Sources (scrape / MangaDex)

- `routers/scrape.py`: `POST /v1/scrape/preview` fetches a chapter URL and
  returns its image list (no download); `POST /v1/scrape` downloads all images
  and starts the normal translation pipeline. Backed by `services/scraper.py`.
- **SSRF mitigation:** `scraper.py` only accepts URLs from an explicit domain
  allowlist (`SUPPORTED_DOMAINS`) — Madara-theme WordPress sites.
- `routers/mangadex.py` (`/v1/mdx/*`): server-side proxy to the MangaDex API
  to avoid browser CORS and hotlink blocking, with light retry on 429/5xx.

### Bubble Dictionary

- `services/dictionary.py`: given a bubble's raw OCR text + current VN
  translation, asks Gemini for a word-by-word breakdown, romanization,
  alternative translations, and a cultural note for a structured popup in the
  reader. LRU-cached in-process.

---

## Database (Supabase PostgreSQL + pgvector + pg_trgm)

Key tables:

| Table                     | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `profiles`                | User metadata (+ `stripe_customer_id`, `plan_tier`)     |
| `manga_series`            | Series owned by user                                    |
| `manga_chapters`          | Chapters (`published_at` flag for public library)       |
| `manga_pages`             | Individual pages, status, translated image URL          |
| `bubble_data`             | OCR bounding boxes, text, confidence, `review_status`   |
| `embeddings`              | pgvector (768-dim, Gemini) — RAG search                 |
| `qa_history`              | Q&A logs                                                |
| `credit_transactions`     | Credit movements                                        |
| `subscription_plans`      | Plan tier definitions                                   |
| `user_bookmarks`/`ratings`/`reading_lists`/`reading_goals`/`achievements`/`read_pages`/`read_progress`/`reading_stats` | Wibu tables                                             |
| `notifications`           | In-app bell feed (v2 migration)                         |
| `share_links`             | Public share URLs (v2 migration)                        |
| `app_settings`            | Admin feature flags                                     |
| `audit_logs`              | Admin audit trail                                       |
| `chapter_comments`        | Comments on published chapters (v4 migration)           |
| `forum_threads`/`forum_posts`/`forum_votes` | Community forum (v5 migration)        |

Migrations (run in order):

```
backend/supabase_migration.sql           # base schema
backend/supabase_migration_credits.sql
backend/supabase_migration_series.sql
backend/supabase_migration_studio.sql
backend/supabase_migration_wibu.sql
backend/supabase_migration_admin.sql
backend/supabase_migration_v2_features.sql   # notifications, share_links, stripe_customer_id, pg_trgm
backend/supabase_migration_v3_features.sql   # manga_chapters.published_at
backend/supabase_migration_v4_features.sql   # chapter_comments (public library comments)
backend/supabase_migration_v4_security.sql   # security hardening (captcha, validation)
backend/supabase_migration_v5_forum.sql      # forum_threads/posts/votes + hot-score triggers
backend/supabase_migration_v6_forum_attachments.sql  # forum post image/video attachments
backend/supabase_migration_v7_rag.sql        # embeddings→768-dim (Gemini) + owner-scoped match_embeddings
```

Patches: `backend/supabase_patch.sql` holds out-of-band fixes applied after a
migration shipped — review before re-running a full migration set.

Storage buckets: `manga-originals` (private), `manga-thumbnails` (private),
`avatars` (public read).

---

## Testing

### Frontend

- **Unit / component** — Vitest + React Testing Library at `frontend/__tests__/`.
- **E2E** — Playwright at `frontend/e2e/`:
  - `auth.spec.ts` — login, register, forgot password, password toggle, Google button placeholder
  - `home.spec.ts` — hero, CTA, language switcher, footer, anime BG mount
  - `protected-pages.spec.ts` — /profile/security, /notifications, /qa,
    /search, /plans, /library, /admin
  - `edge-cases.spec.ts` — backend down, rate-limited, expired session,
    malformed JSON, share expired (410), 404
  - `mobile.spec.ts` — mobile viewport: hamburger reveals drawer, language
    switcher hidden in header, credit-badge plan hidden, username hidden, CTAs reachable
  - `forum.spec.ts` — forum list, category filter, sort, new-thread gating,
    login-required prompt for anonymous users
- API mocking: `frontend/e2e/fixtures.ts` (`withMockedApi`, `clearStorage`,
  `gotoApp`). Default 200 fallback so unmocked endpoints don't break UI.

### Backend

- Pytest at `backend/tests/` (`test_forum.py`, `test_scraper.py`,
  `test_idempotency.py`). Uses `respx` to mock Supabase + Gemini HTTP.

### CI

`.github/workflows/ci.yml` runs five jobs in parallel: typecheck, lint,
production build, Playwright E2E, backend pytest.

---

## Frontend Code Conventions

### Next.js version warning

This project uses **Next.js 16.2.6 with React 19**. Before writing page/layout
code check `node_modules/next/dist/docs/` or `frontend/AGENTS.md` —
APIs may differ from training data.

### API calls

All backend calls go through `src/lib/api.ts` — a centralized fetch wrapper
with retry on cold-start, idempotency-key headers, and typed return values.
**Do not use `fetch()` directly in components.**

### State

- Global auth: `AuthContext` (`src/contexts/AuthContext.tsx`)
- Gamification: `WibuContext`
- i18n: `I18nContext` (VI/EN, localStorage-backed)
- No Redux/Zustand — React context + local state.

### Styling

Tailwind + Framer Motion. Editorial / manga-magazine aesthetic:

- **Sharp corners** (`var(--radius-sm)` = 2px, never soft rounded).
- **Hard offset shadows** (`panel-shadow` = `4px 4px 0 0 var(--border)`).
- **2px borders** (`stroke-ink`, `stroke-ink-thick`).
- `caps-xs` for tiny uppercase labels (letter-spaced 0.18em).
- Flat colors, no gradient buttons.
- 3-theme support (`light` / `dark` / `sepia`) via `[data-theme]` on `<html>`.

### Animated wallpapers

`<AnimatedBackground playlist="…" />` mounted in hero / login aside /
register aside / browse. Playlists declared in
`src/lib/wallpaper-playlists.ts`. Files in `public/wallpapers/<theme>/`.

### Routing

App Router only. Route groups: `(auth)`, `admin/` sub-routes.

---

## Backend Code Conventions

### Adding a new router

1. Create `backend/app/routers/your_router.py`.
2. `router = APIRouter(prefix="/your-prefix", tags=["Your Tag"])`.
3. Register in `app/main.py`.
4. Add Pydantic schemas to `app/models/schemas.py`.

### Service layer

Business logic in `app/services/`, **not** in router functions.

### Rate limiting

`slowapi` decorators driven by env vars (`RATE_LIMIT_*`). Uses access-token
hash as key when authenticated, IP otherwise.

### Security headers

`SecurityHeadersMiddleware` (in `middleware.py`) sets X-Content-Type-Options,
X-Frame-Options=DENY, Referrer-Policy, Permissions-Policy, HSTS, and a tight
CSP on every response — including FastAPI /docs.

### Bot protection (Turnstile)

`services/captcha.py` verifies Cloudflare Turnstile tokens on bot-prone
endpoints (register, forgot-password). Verification is **skipped** when
`TURNSTILE_SECRET_KEY` is unset, so local dev and free-tier deploys aren't
blocked behind an unconfigured captcha.

### Upload validation

`services/image_validation.py` re-decodes uploaded bytes with Pillow's
`verify()` to reject MIME-spoofed payloads (e.g. a script renamed to `.jpg`).
Only real JPEG/PNG/WebP pass. `services/scraper.py` enforces a domain
allowlist to prevent SSRF on the import path.

### AI module source override

`services/ai_module_client.py` calls the AI module at a URL resolved by
`services/ai_module_source.py`. The default comes from `AI_MODULE_URL`
(HuggingFace Space), but admins can override it at runtime via `app_settings`
to point at an ad-hoc Kaggle/Cloudflare tunnel (URL changes each session). A
TTL cache keeps the DB out of every translate call; admin writes invalidate it.

### Error handling

Structured JSON errors via FastAPI `HTTPException`. **Never** expose tracebacks
in production. Auth errors return localized Vietnamese messages.

---

## Deployment

### Backend (Render)

- `render.yaml` — auto-deploys on push to `main`. Region: Singapore.
- Plan: free (512MB RAM) — no heavy ML models here.
- Health check: `GET /health`.

### Frontend (Vercel)

- Connect Vercel project to `storylen` repo, root = `frontend/`.
- Required env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.

### AI Module (HuggingFace Spaces)

- Docker-based Space (~4GB image).
- Set `GEMINI_API_KEY` secret in Space settings.
- Backend `.env`: set `AI_MODULE_URL` to the HF Space URL, leave
  `AI_MODULE_TOKEN` empty for public Spaces.

### Keep-alive

`.github/workflows/keep-alive.yml` pings Render free tier to prevent sleep.

---

## Backups & Disaster Recovery

### What we back up

| Data                       | Source              | Frequency       | Retention   |
| -------------------------- | ------------------- | --------------- | ----------- |
| All Postgres tables        | Supabase PITR (Pro) | Continuous WAL  | 7 days      |
| Manual schema snapshots    | `pg_dump`           | Before each migration | Until next | 
| Storage buckets            | Supabase Storage    | Versioned       | Until purged|
| User-uploaded raw images   | `manga-originals`   | Versioning ON   | 30 days soft-delete |

### Backup commands

```powershell
# Manual logical dump — run before a risky migration.
$env:PGPASSWORD = "<service-role-jwt-password>"
pg_dump -h <host> -U postgres -d postgres -F c -f "storylens-$(Get-Date -Format yyyyMMdd-HHmm).dump"

# Restore to a fresh project (DR drill):
pg_restore -h <new-host> -U postgres -d postgres --clean --if-exists storylens-YYYYMMDD-HHmm.dump
```

### Incident runbooks

**Backend down (Render returns 5xx)**
1. Check Render dashboard → recent deploys → rollback to previous green build.
2. Verify `/health/deep` reports `supabase: ok, gemini: ok`.
3. If Supabase pool exhausted: Render → restart service.

**Database connection lost**
1. Supabase dashboard → Database → Roles → check pool size.
2. If 100% saturated: scale up pool (Supabase Pro) or kill long-running queries
   via SQL Editor `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle in transaction' AND now() - state_change > INTERVAL '5 minutes';`.

**Gemini quota exhausted**
1. Add additional keys to `GEMINI_API_KEY` (comma-separated).
2. Hit `POST /v1/admin/health/gemini/reload` to pick up without restart.

**AI module unreachable**
1. Check HuggingFace Space → Logs.
2. If sleeping (free tier): browse the public Space URL once to wake it.
3. Backend handles gracefully — `/health/deep` reports `ai_module: degraded`.

**Mass cancellation needed** (e.g. runaway upload)
1. `POST /v1/status/batch/{batch_id}/cancel` if you have the batch ID.
2. Otherwise: Supabase SQL Editor:
   `UPDATE manga_pages SET status='cancelled', error='Manual cleanup' WHERE status IN ('pending', 'ocr_running', 'translating');`

### DR drill cadence

- **Quarterly**: restore latest dump to a fresh Supabase project, verify
  `pytest -q` passes against it, document any drift.

---

## Admin Features

Admin dashboard at `/admin` — restricted to users with `role=admin`.

Sub-sections: analytics, users, content moderation, health monitoring,
audit logs, app settings (feature toggles, rate limit overrides),
credit/plan management.

---

## What NOT to Do

- Do not add ML model loading to `backend/` — that belongs in `ai_module/`.
- Do not use `fetch()` directly in frontend components — use `src/lib/api.ts`.
- Do not commit `.env` files or API keys.
- Do not bypass credit deduction in `credit_service.py` without a clear reason.
- Do not use the Pages Router — App Router only.
- Do not store auth tokens in `localStorage` — they must stay in HTTP-only cookies.
- Do not introduce rounded corners / blurred shadows / gradient buttons —
  the design language is sharp / hard / editorial.
