"""Health endpoints — /health/live, /health/ready, /health/dependencies"""
from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from control_plane.config import get_settings
from control_plane.storage.db import get_engine

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def health_live():
    return {"status": "ok"}


@router.get("/health/ready")
async def health_ready():
    try:
        async with get_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as exc:
        db_ok = False

    status = "ok" if db_ok else "degraded"
    return {
        "status": status,
        "db": "ok" if db_ok else "error",
    }


@router.get("/health/dependencies")
async def health_dependencies():
    settings = get_settings()
    return {
        "gemini_api_key_configured": bool(settings.gemini_api_key),
        "ngrok_worker_configured": bool(settings.kaggle_worker_url),
        "ngrok_worker_endpoint": "/translate-image" if settings.kaggle_worker_url else None,
        "key_status": settings.key_status(),
        "models": {
            "translation": settings.gemini_translation_model,
            "critic": settings.gemini_critic_model,
            "embedding": settings.gemini_embedding_model,
        },
    }
