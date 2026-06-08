# StoryLens 📖✨

> AI-powered manga translation platform: upload pages → bubbles auto-detected →
> translated (JP/CN → VI) → readable with RAG-powered Q&A.

[![CI](https://github.com/trungkiet2005/storylen/actions/workflows/ci.yml/badge.svg)](https://github.com/trungkiet2005/storylen/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

- **Drag-and-drop translation pipeline** — YOLOv8 bubble detection → manga-ocr →
  lama_large inpainting → Gemini contextual translation.
- **RAG-powered Q&A** — ask anything about a chapter; vector search over
  every translated bubble + Gemini answers grounded in source.
- **Public library** — owners publish chapters to a read-only anonymous library.
- **Community forum** — categories, nested replies, voting, @mentions, and
  image/video attachments, with admin pin/lock.
- **Chapter comments** — lightweight discussion on published library chapters.
- **Import from source** — fetch chapters from supported sites (allowlisted,
  SSRF-safe) or browse via the MangaDex proxy, then run the same pipeline.
- **Bubble dictionary** — per-bubble word breakdown, romanization, and
  alternative translations powered by Gemini.
- **Account self-service** — password reset, change email, GDPR data export,
  account deletion.
- **In-app notifications + auto-unlocked achievements + reading-session resume.**
- **3-theme UI** (light / dark / sepia), VI/EN i18n, animated anime backgrounds,
  PWA-installable, mobile-responsive.
- **Stripe-ready** subscriptions (free / basic / pro / premium tiers).

---

## 🏗 Architecture

```
                   ┌────────────────────┐
                   │  Vercel (frontend) │
                   │  Next.js 16 + RSC  │
                   └────────┬───────────┘
                            │  HTTPS, cookies
                            ▼
              ┌─────────────────────────────┐
              │   Render (backend) — API     │
              │   FastAPI + Python 3.11      │
              │   ├─ slowapi rate limit      │
              │   ├─ Stripe webhook          │
              │   └─ WebSocket progress      │
              └─┬──────────────────┬─────────┘
                │ service-role     │ HTTP
                ▼                  ▼
       ┌───────────────────┐   ┌──────────────────────┐
       │ Supabase Postgres │   │ HuggingFace Space    │
       │ ├─ Auth (cookies) │   │ AI Module (Docker)   │
       │ ├─ Storage        │   │ ├─ YOLOv8            │
       │ └─ pgvector + RLS │   │ ├─ manga-ocr         │
       └───────────────────┘   │ ├─ lama_large        │
                               │ └─ Gemini bridge     │
                               └──────────────────────┘
```

Three deployable services — frontend (Vercel), backend (Render), AI worker (HF Spaces).
Database (Supabase) is shared. Free-tier compatible end-to-end.

---

## 🚀 Quick start

### 1. Clone

```powershell
git clone https://github.com/trungkiet2005/storylen.git
cd storylen
```

### 2. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env          # fill in Supabase + Gemini keys
uvicorn app.main:app --reload --port 8000
```

Open `http://127.0.0.1:8000/docs` for interactive Swagger.
`http://127.0.0.1:8000/health/deep` for full readiness check.

### 3. Frontend

```powershell
cd frontend
npm install
cp .env.example .env.local    # fill in NEXT_PUBLIC_API_URL etc.
npm run dev
```

Open `http://localhost:3000`.

### 4. Database migrations

CI / Render runs this automatically as `preDeployCommand`. To apply locally:

```powershell
$env:SUPABASE_DB_URL = "postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres"
python -m app.scripts.apply_migrations
```

Or paste each `backend/supabase_migration*.sql` into the Supabase SQL Editor
in lexicographic order.

### 5. AI Module (optional, heavy ~4GB image)

```powershell
cd ai_module
pip install -r requirements.txt
python main.py --host 127.0.0.1 --port 8001
```

Without a local AI module, point `AI_MODULE_URL` at the public HuggingFace Space.

---

## 🧪 Testing

| Layer            | Tool             | Where                      | Count                    |
| ---------------- | ---------------- | -------------------------- | ------------------------ |
| Backend          | pytest + respx   | `backend/tests/`           | scraper + idempotency    |
| Frontend unit    | Vitest + RTL     | `frontend/__tests__/`      | 143 tests                |
| Frontend E2E     | Playwright       | `frontend/e2e/`            | 33 tests                 |

Playwright suites: `auth.spec.ts` (login/register/forgot), `home.spec.ts`,
`protected-pages.spec.ts` (security, qa, search, library, plans),
`edge-cases.spec.ts` (rate-limit, expired session, 410, 404), `mobile.spec.ts`.

Run everything locally:

```powershell
# backend
cd backend && pytest -q

# frontend
cd frontend
npx tsc --noEmit         # typecheck
npm test                 # vitest
npm run lint
npm run test:e2e         # Playwright (auto-starts dev server on 3100)
```

CI runs all five jobs in parallel on every push — see
[.github/workflows/ci.yml](.github/workflows/ci.yml).

---

## 🔑 Environment variables

**Required (backend):**

| Var                          | Why                                         |
| ---------------------------- | ------------------------------------------- |
| `SUPABASE_URL`               | Database + Auth + Storage                   |
| `SUPABASE_SERVICE_ROLE_KEY`  | Server-side RLS bypass                      |
| `SUPABASE_ANON_KEY`          | Public-facing client key                    |
| `SUPABASE_DB_URL`            | Direct PG conn for migrations               |
| `GEMINI_API_KEY`             | Comma-separated for key rotation            |
| `AI_MODULE_URL`              | HuggingFace Space URL (or `localhost:8001`) |
| `ALLOWED_ORIGINS`            | JSON array or comma-separated               |

**Optional (backend):**

| Var                              | When to set                                       |
| -------------------------------- | ------------------------------------------------- |
| `REDIS_URL`                      | Multi-replica deployments (state sharing)         |
| `STRIPE_SECRET_KEY` + price IDs + `STRIPE_WEBHOOK_SECRET` | Enable paid plans               |
| `PASSWORD_RESET_REDIRECT_URL`    | Where Supabase recovery email lands               |
| `FRONTEND_BASE_URL`              | Used in share-link URLs and Stripe redirects      |
| `SENTRY_DSN`                     | Error tracking                                    |
| `OTEL_EXPORTER_OTLP_ENDPOINT`    | OpenTelemetry traces                              |

**Frontend (`.env.local`):**

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/v1
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Full reference: [`backend/.env.example`](backend/.env.example) and
[`frontend/.env.example`](frontend/.env.example).

---

## 🗄 Database

PostgreSQL 15 (Supabase) + extensions: `pgvector`, `pg_trgm`. Row-Level Security
enabled on every user-data table. Migrations are sequential and idempotent:

```
supabase_migration.sql                # base schema + auth + storage policies
supabase_migration_credits.sql        # credit transactions + plan tiers
supabase_migration_series.sql         # series + chapters
supabase_migration_studio.sql         # bubble editing, translation history
supabase_migration_wibu.sql           # bookmarks, ratings, achievements
supabase_migration_admin.sql          # audit log + feature flags
supabase_migration_v2_features.sql    # notifications, share_links, stripe IDs
supabase_migration_v3_features.sql    # manga_chapters.published_at
supabase_migration_v4_security.sql    # RLS for profiles/notifications/share +
                                      # trigram search indexes
```

Run order matters — the auto-apply script discovers them in lexicographic order.

---

## 🔐 Security posture

- **Auth**: HTTP-only cookies + Supabase Auth + bcrypt-hashed passwords.
- **RLS**: enabled on every user-data table (verified by v4 migration).
- **Headers**: CSP / HSTS / X-Frame-Options=DENY / Permissions-Policy on every response
  (see `app/middleware.py:SecurityHeadersMiddleware`).
- **Rate limits**: slowapi with per-user key derivation; Redis-backed when
  `REDIS_URL` is set.
- **File upload validation**: MIME + Pillow magic-byte verify + size cap.
- **Stripe webhooks**: signature-verified (`stripe.Webhook.construct_event`).
- **Idempotency keys** on `/upload` + `/scrape` to dedupe retries.

For DMCA takedowns: see [/copyright](frontend/src/app/copyright/page.tsx).
For data exports / deletion: `POST /v1/auth/export-data` + `/v1/auth/delete-account`.

---

## 🚢 Deployment

- **Backend** (Render): blueprint at [`render.yaml`](render.yaml). Auto-deploys
  `main` to Singapore region. Pre-deploy hook applies migrations.
- **Frontend** (Vercel): connect repo, root `frontend/`, set
  `NEXT_PUBLIC_*` env vars.
- **AI Module** (HuggingFace Spaces): Docker-based Space, ~4GB image.
- **Keep-alive**: `.github/workflows/keep-alive.yml` pings Render free tier
  every few minutes.

---

## 💾 Backups & disaster recovery

See [CLAUDE.md § Backups](CLAUDE.md) for the full runbook. TL;DR:

- **Supabase Pro**: daily backups, 7-day retention.
- **Supabase free tier**: no automated backups — do weekly `pg_dump` to S3.
- **Before each schema migration**: take a Supabase snapshot from the dashboard.
- **Storage buckets**: enable versioning so deleted images can be restored.
- **Restore drill**: rehearse quarterly using a non-prod project.

---

## 🤝 Contributing

PRs welcome. Open an issue first for non-trivial changes.

Conventions are enforced by CI (typecheck, lint, vitest, Playwright, pytest).
For deep context on architecture / design decisions, see [CLAUDE.md](CLAUDE.md).

---

## 📜 License

MIT — see [LICENSE](LICENSE). Note: anime wallpapers in
`frontend/public/wallpapers/` are NOT covered by the MIT license; they're
demo assets, replace before commercial deployment.

---

Built by **Dao Sy Duy Minh** · Faculty of IT, VNUHCM-US.
