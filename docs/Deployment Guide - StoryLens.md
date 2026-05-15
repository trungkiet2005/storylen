# Deployment Guide - StoryLens

## 1. Overview

StoryLens consists of three independently deployed services:

| Service | Platform | Deploy Method |
|---------|----------|--------------|
| Frontend (Next.js) | Vercel | Auto-deploy on push to `main` |
| Backend API (FastAPI) | Render.com | Docker via `render.yaml` |
| AI Worker | HuggingFace Spaces | Manual Docker push or Spaces sync |

Shared infrastructure:
- **Database + Storage:** Supabase (PostgreSQL, pgvector, Storage, Auth)
- **Translation AI:** Google Gemini API

---

## 2. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Frontend build |
| Python | 3.10+ | Backend/AI |
| Docker | 24+ | Container builds |
| Git | latest | Version control |
| Supabase CLI | latest | DB migrations |
| Vercel CLI | latest | Frontend deployment (optional) |

Accounts required:
- [Supabase](https://supabase.com) — database, storage, auth
- [Google AI Studio](https://aistudio.google.com) — Gemini API key(s)
- [Render.com](https://render.com) — backend hosting
- [Vercel](https://vercel.com) — frontend hosting
- [HuggingFace](https://huggingface.co) — AI worker hosting

---

## 3. Supabase Setup

### 3.1 Create Supabase Project
1. Create a new project at [app.supabase.com](https://app.supabase.com)
2. Note your **Project URL**, **anon key**, and **service role key**

### 3.2 Run Migrations
Apply migrations in order using the Supabase SQL editor or CLI:

```bash
# Using Supabase CLI
supabase db push

# Or manually via SQL editor in order:
# 1. backend/supabase_migration.sql       (core schema + RLS + pgvector)
# 2. backend/supabase_migration_series.sql (series/chapter extensions)
# 3. backend/supabase_migration_credits.sql (credit & subscription system)
# 4. backend/supabase_migration_admin.sql  (admin tables + analytics RPCs)
# 5. backend/supabase_patch.sql            (any hotfixes, apply if needed)
```

### 3.3 Storage Buckets
The migrations create these buckets automatically:
- `manga-originals` (private)
- `manga-thumbnails` (private)
- `avatars` (public)
- `series-covers` (public)

Verify they exist in **Supabase Dashboard → Storage**.

---

## 4. Backend Deployment (Render.com)

### 4.1 Environment Variables
Create a `.env` file in `backend/` from the template:

```bash
cp backend/.env.example backend/.env
```

Fill in all values:

```bash
# Application
APP_NAME=StoryLens
APP_VERSION=1.0.0
DEBUG=false
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://yourdomain.com
MAX_FILE_SIZE_MB=10
MAX_AVATAR_SIZE_MB=2
MAX_REQUEST_SIZE_MB=50
MAX_PIPELINE_CONCURRENCY=3

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_BUCKET_ORIGINALS=manga-originals
SUPABASE_BUCKET_THUMBNAILS=manga-thumbnails

# Auth Cookies (production settings)
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=none
AUTH_COOKIE_DOMAIN=.yourdomain.com    # optional
AUTH_ACCESS_COOKIE_NAME=sl_access
AUTH_REFRESH_COOKIE_NAME=sl_refresh
AUTH_REFRESH_COOKIE_MAX_AGE_SECONDS=2592000   # 30 days

# Gemini (supports multiple keys for rotation)
GEMINI_API_KEY=AIza...,AIza...,AIza...
GEMINI_MODEL=gemini-2.5-flash

# HuggingFace Space (AI Worker)
HF_SPACE_URL=https://your-username-storylens-ai.hf.space
HF_SPACE_TOKEN=hf_...   # optional, required if space is private

# AI Module defaults
AI_MODULE_TRANSLATOR=gemini
AI_MODULE_TARGET_LANG=VIN
AI_MODULE_DETECTOR=default
AI_MODULE_OCR=manga-ocr
AI_MODULE_INPAINTER=lama
AI_MODULE_RENDERER=default

# Rate Limiting (slowapi format)
RATE_LIMIT_REGISTER=5/minute
RATE_LIMIT_LOGIN=10/minute
RATE_LIMIT_UPLOAD=30/minute
```

### 4.2 Deploy to Render.com

The project includes `render.yaml` at the root for Infrastructure-as-Code deployment.

**Steps:**
1. Push code to GitHub
2. Log in to [Render Dashboard](https://dashboard.render.com)
3. Click **New → Blueprint** and connect your GitHub repo
4. Render reads `render.yaml` and creates the `storylens-api` web service
5. Set secret environment variables in **Render Dashboard → Environment** (marked `sync: false` in `render.yaml`):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `HF_SPACE_URL`
   - `HF_SPACE_TOKEN`
   - `ALLOWED_ORIGINS`

**Service Configuration (from render.yaml):**
- Type: Web Service (Docker)
- Region: Singapore (closest to Vietnam)
- Plan: Free (512 MB RAM; note 30–60s cold start on free tier)
- Health Check: `/health`
- Auto-deploy: Enabled on push to `main`

### 4.3 Local Backend Development

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 5. Frontend Deployment (Vercel)

### 5.1 Environment Variables
Set these in Vercel project settings:

```bash
NEXT_PUBLIC_API_URL=https://storylens-api.onrender.com/v1
```

For local dev, create `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/v1
```

### 5.2 Deploy to Vercel

**Option A – CLI:**
```bash
cd frontend
npm install
npx vercel --prod
```

**Option B – GitHub Integration (recommended):**
1. Connect GitHub repo to Vercel project
2. Set root directory to `frontend/`
3. Framework: Next.js (auto-detected)
4. Vercel auto-deploys on every push to `main`

### 5.3 Local Frontend Development

```bash
cd frontend
npm install
npm run dev      # starts on http://localhost:3000
```

---

## 6. AI Worker Deployment (HuggingFace Spaces)

### 6.1 Prerequisites
- HuggingFace account with a Space of type **Docker**
- At least **16 GB RAM** tier (required for ML models)

### 6.2 Deploy

The AI worker is in the `ai_module/` directory.

**Steps:**
1. Create a new HuggingFace Space (Docker type, 16 GB RAM)
2. Push the `ai_module/` contents to the Space repository:
   ```bash
   cd ai_module
   git remote add hf https://huggingface.co/spaces/your-username/storylens-ai
   git push hf main
   ```
3. HuggingFace builds the Docker image from `ai_module/Dockerfile`
4. Set Space secrets (environment variables):
   - `GEMINI_API_KEY`
   - Any model download tokens if needed

### 6.3 Keep-Alive
HuggingFace Spaces on the free tier sleep after inactivity. The project includes a GitHub Actions workflow (`.github/workflows/`) that pings the Space periodically to prevent cold starts during active usage.

---

## 7. Docker Compose (Local Full-Stack Development)

For running all services locally:

```yaml
# docker-compose.yml (create at project root)
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: ./backend/.env
    
  ai_module:
    build: ./ai_module
    ports:
      - "7860:7860"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000/v1
```

```bash
docker-compose up --build
```

> Note: AI module requires significant RAM (4–8 GB+). Ensure Docker has sufficient memory allocation.

---

## 8. Post-Deployment Checklist

- [ ] Backend health check returns `200`: `GET https://storylens-api.onrender.com/health`
- [ ] Frontend loads without console errors
- [ ] Registration flow creates user + free subscription in Supabase
- [ ] Upload flow: image uploads to Supabase Storage, page record created, AI pipeline triggered
- [ ] AI Worker responds: `GET https://your-space.hf.space/health`
- [ ] Supabase Storage buckets are accessible and properly configured
- [ ] CORS: Frontend can call API without errors (check browser Network tab)
- [ ] Cookie auth: Login sets HTTP-only cookies, `/auth/me` returns user after login
- [ ] Admin account: Set `role = 'admin'` for admin user directly in Supabase Dashboard

---

## 9. Monitoring & Maintenance

### 9.1 Monitoring
- **Render Dashboard:** Request logs, CPU/memory usage, deploy history
- **Supabase Dashboard:** Database queries, storage usage, auth events
- **Vercel Analytics:** Frontend performance, error rates
- **HuggingFace Spaces:** Container logs, hardware usage

### 9.2 Log Access
```bash
# Render logs via CLI
render logs --service storylens-api --tail

# Or via Render Dashboard → Logs tab
```

### 9.3 Database Maintenance
- Run `supabase_patch.sql` for schema hotfixes
- Monitor pgvector index performance as embeddings table grows
- Archive old `credit_transactions` if table becomes very large

### 9.4 Gemini API Key Rotation
The backend automatically rotates through comma-separated keys in `GEMINI_API_KEY` when a key hits quota. To add more keys, update the environment variable in Render Dashboard (no redeploy needed if using Render env sync).

### 9.5 Cost Optimization
- Render free tier: 750 hours/month — sufficient for one service
- Supabase free tier: 500 MB DB, 1 GB storage — upgrade if needed
- Gemini API: Free quota per key; use multiple keys for higher throughput
- HuggingFace Spaces: Free tier available; upgrade to persistent for production
