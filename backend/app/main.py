"""
StoryLens Backend - Main Application Entry Point

Fixes:
- Startup event validates critical config and DB connectivity
- Structured logging for production
- Proper lifespan context manager (FastAPI modern pattern)
- CORS handles both dev and production origins
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import admin, ai_module, auth, history, pages, qa, status, upload

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)
settings = get_settings()


# ─── Lifespan (startup / shutdown) ───────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Validate critical configuration at startup."""
    logger.info("=== %s v%s starting up ===", settings.APP_NAME, settings.APP_VERSION)

    # Validate Supabase connectivity
    try:
        from app.database import get_supabase
        sb = get_supabase()
        # Lightweight ping — just check the connection works
        sb.table("manga_pages").select("page_id").limit(1).execute()
        logger.info("✓ Supabase connection OK")
    except Exception as exc:
        logger.error("✗ Supabase connection FAILED: %s", exc)
        # Don't crash on startup — let endpoints fail individually

    # Validate Gemini key pool
    try:
        keys = [k.strip() for k in settings.GEMINI_API_KEY.split(",") if k.strip()]
        logger.info("✓ Gemini API keys loaded: %d key(s)", len(keys))
    except Exception as exc:
        logger.error("✗ Gemini configuration error: %s", exc)

    # Log AI worker URLs
    logger.info(
        "ai_module URL: %s %s",
        settings.AI_MODULE_URL,
        "(token set)" if settings.AI_MODULE_TOKEN else "(no token)",
    )
    logger.info(
        "HF Space URL: %s %s",
        settings.HF_SPACE_URL,
        "(token set)" if settings.HF_SPACE_TOKEN else "(no token — public space)",
    )
    logger.info("CORS allowed origins: %s", settings.ALLOWED_ORIGINS)
    logger.info("=== Startup complete ===")

    yield  # Application runs here

    logger.info("=== %s shutting down ===", settings.APP_NAME)


# ─── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered manga translation & Q&A platform.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

API_PREFIX = "/v1"

app.include_router(upload.router,  prefix=API_PREFIX)
app.include_router(auth.router,    prefix=API_PREFIX)
app.include_router(ai_module.router, prefix=API_PREFIX)
app.include_router(status.router,  prefix=API_PREFIX)
app.include_router(pages.router,   prefix=API_PREFIX)
app.include_router(qa.router,      prefix=API_PREFIX)
app.include_router(history.router, prefix=API_PREFIX)
app.include_router(admin.router,   prefix=API_PREFIX)


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "version": settings.APP_VERSION}


@app.get("/", tags=["meta"])
def root():
    return {"message": f"Welcome to {settings.APP_NAME} {settings.APP_VERSION}"}


@app.get(API_PREFIX, tags=["meta"])
def api_root():
    return {
        "message": f"Welcome to {settings.APP_NAME} {settings.APP_VERSION}",
        "prefix": API_PREFIX,
        "health": "/health",
        "docs": "/docs",
        "endpoints": [
            f"{API_PREFIX}/upload",
            f"{API_PREFIX}/status/batch/{{batch_id}}",
            f"{API_PREFIX}/status/{{page_id}}",
            f"{API_PREFIX}/page/{{page_id}}",
            f"{API_PREFIX}/qa",
            f"{API_PREFIX}/history",
            f"{API_PREFIX}/auth/me",
        ],
    }
