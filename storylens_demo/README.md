# StoryLens Demo

AI-powered manga translation pipeline: **Gemini + Multi-RAG + LLMOps**

## Quick Start

### 1. Add your Gemini API key

```json
// secrets/keys.json
{
  "gemini_api_key": "AIza...",
  "kaggle_worker_url": "https://your-ngrok-url.ngrok-free.app",
  "kaggle_worker_api_key": "",
  "jwt_secret": "change-me"
}
```

Get your key from [Google AI Studio](https://aistudio.google.com/apikey).

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run dev server

```bash
python run.py
# Opens http://localhost:8000
```

## Architecture

```
secrets/keys.json          ← API keys (gitignored)
control_plane/             ← FastAPI backend
  config.py                ← Reads keys.json → env var fallback
  app.py                   ← Main app + routes
  routes/                  ← REST API endpoints
  ws/                      ← WebSocket event streaming
  workers/                 ← In-process job runner
  rag/                     ← 5 RAG agents (story/glossary/style/layout/critic)
  llm/gemini_provider.py   ← Gemini AI Studio adapter
  storage/                 ← SQLite DB + ChromaDB + local artifacts
  llmops/                  ← Prompt registry + tracing
web/                       ← Dark-mode SPA (vanilla JS)
  pages/                   ← 7 pages: Home, Import, Studio, Review, Library, Reader, Summary
tests/                     ← pytest tests (mocked Gemini)
.github/workflows/         ← CI (lint+test) + Docker + Smoke
```

## CI/CD

| Workflow | Trigger | Action |
|---|---|---|
| `ci.yml` | Push / PR | Ruff lint + pytest |
| `docker.yml` | Push to `main` | Build + push to GHCR |
| `smoke.yml` | Manual | Health + API smoke test |

## Docker

```bash
# Build
docker compose up

# With real key (no secrets/ in container)
GEMINI_API_KEY=AIza... docker compose up
```

## Key file reference

`secrets/keys.json` fields:

| Field | Description |
|---|---|
| `gemini_api_key` | Google AI Studio API key |
| `kaggle_worker_url` | Ngrok worker URL. The worker must expose `POST /translate-image` like `storylens_kaggle_build`. |
| `kaggle_worker_api_key` | Optional key sent as `X-StoryLens-Key` |
| `jwt_secret` | JWT signing secret |
