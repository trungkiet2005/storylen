"""
StoryLens Backend - Main Application Entry Point
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import get_settings
from app.middleware import (
    BodySizeLimitMiddleware,
    RequestIDFilter,
    RequestIDMiddleware,
)
from app.rate_limit import limiter
from app.routers import admin, ai_module, auth, history, pages, qa, status, upload

# ─── Logging ──────────────────────────────────────────────────────────────────
_request_id_filter = RequestIDFilter()
_log_handler = logging.StreamHandler()
_log_handler.setFormatter(
    logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | rid=%(request_id)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
)
_log_handler.addFilter(_request_id_filter)
_root = logging.getLogger()
_root.handlers = [_log_handler]
_root.setLevel(logging.INFO)

logger = logging.getLogger(__name__)
settings = get_settings()


# ─── Lifespan (startup / shutdown) ───────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Validate critical configuration at startup. Fail-fast in production."""
    logger.info("=== %s v%s starting up ===", settings.APP_NAME, settings.APP_VERSION)

    if settings.DEBUG and settings.AUTH_COOKIE_SAMESITE == "none":
        logger.warning(
            "AUTH_COOKIE_SAMESITE=none is set while DEBUG=True. "
            "Ensure AUTH_COOKIE_SECURE=True before deploying to production."
        )

    # Validate Supabase connectivity
    try:
        from app.database import get_supabase
        sb = get_supabase()
        sb.table("manga_pages").select("page_id").limit(1).execute()
        logger.info("Supabase connection OK")

        # Pages left in a mid-pipeline state from the previous container run will
        # never progress — the daemon threads that drove them are gone. Mark them
        # failed immediately so the frontend doesn't wait forever.
        stale_statuses = ["pending", "ocr_running", "translating"]
        result = (
            sb.table("manga_pages")
            .update({
                "status": "failed",
                "error": "Tiến trình bị gián đoạn khi server khởi động lại.",
                "progress": 0,
            })
            .in_("status", stale_statuses)
            .execute()
        )
        stale_count = len(result.data) if result.data else 0
        if stale_count:
            logger.warning("Marked %d stale in-progress page(s) as failed on startup.", stale_count)

    except Exception as exc:
        logger.error("Supabase connection FAILED: %s", exc)
        if not settings.DEBUG:
            raise RuntimeError(
                "Cannot reach Supabase at startup; refusing to serve in production."
            ) from exc

    # Validate Gemini key pool
    keys = [k.strip() for k in settings.GEMINI_API_KEY.split(",") if k.strip()]
    if not keys:
        msg = "GEMINI_API_KEY is empty."
        logger.error(msg)
        if not settings.DEBUG:
            raise RuntimeError(msg)
    else:
        logger.info("Gemini API keys loaded: %d key(s)", len(keys))

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

    yield

    logger.info("=== %s shutting down ===", settings.APP_NAME)


# ─── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered manga translation & Q&A platform.",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ─── Rate limiter ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ─── Body size limit (runs before route handlers) ─────────────────────────────
app.add_middleware(
    BodySizeLimitMiddleware,
    max_bytes=settings.MAX_REQUEST_SIZE_MB * 1024 * 1024,
)

# ─── Request ID ───────────────────────────────────────────────────────────────
app.add_middleware(RequestIDMiddleware)

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
        "docs": "/docs" if settings.DEBUG else None,
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
