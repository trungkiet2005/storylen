"""
Admin · System health.

    GET /health    Probes Supabase, ai_module, HF Space and reports per-service status.
"""
from __future__ import annotations

import logging
import time

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.config import get_settings
from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_admin
from app.services.ai_module_source import get_active_ai_module_url

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)


class ServiceHealth(BaseModel):
    name: str
    ok: bool
    latency_ms: int | None = None
    detail: str | None = None


class AdminHealthResponse(BaseModel):
    app_name: str
    app_version: str
    debug: bool
    services: list[ServiceHealth]
    checked_at: str


def _check_supabase() -> ServiceHealth:
    start = time.perf_counter()
    try:
        get_supabase().table("profiles").select("user_id", count="exact", head=True).limit(1).execute()
        return ServiceHealth(name="supabase", ok=True, latency_ms=int((time.perf_counter() - start) * 1000))
    except Exception as exc:
        return ServiceHealth(name="supabase", ok=False, detail=str(exc)[:200])


def _check_http(name: str, base_url: str, *, path: str = "/health", timeout: float = 4.0) -> ServiceHealth:
    if not base_url:
        return ServiceHealth(name=name, ok=False, detail="URL chưa cấu hình.")
    url = base_url.rstrip("/") + path
    start = time.perf_counter()
    try:
        with httpx.Client(timeout=timeout) as client:
            res = client.get(url)
        ok = 200 <= res.status_code < 500
        return ServiceHealth(
            name=name,
            ok=ok,
            latency_ms=int((time.perf_counter() - start) * 1000),
            detail=f"HTTP {res.status_code}" if not ok else None,
        )
    except Exception as exc:
        return ServiceHealth(name=name, ok=False, detail=str(exc)[:200])


@router.get("/health", response_model=AdminHealthResponse)
def get_admin_health(_admin: AuthUser = Depends(get_current_admin)) -> AdminHealthResponse:
    settings = get_settings()
    from datetime import datetime, timezone

    services = [
        _check_supabase(),
        _check_http("ai_module", get_active_ai_module_url()),
        _check_http("hf_space", settings.HF_SPACE_URL),
    ]
    return AdminHealthResponse(
        app_name=settings.APP_NAME,
        app_version=settings.APP_VERSION,
        debug=settings.DEBUG,
        services=services,
        checked_at=datetime.now(timezone.utc).isoformat(),
    )


class GeminiReloadResponse(BaseModel):
    keys_loaded: int
    message: str


@router.post("/gemini/reload", response_model=GeminiReloadResponse)
def reload_gemini_keys(_admin: AuthUser = Depends(get_current_admin)) -> GeminiReloadResponse:
    """Re-read GEMINI_API_KEY from env and rebuild the Gemini client pool.
    Call this after rotating API keys without restarting the service."""
    from app.services.rag import reload_gemini_pool
    count = reload_gemini_pool()
    return GeminiReloadResponse(
        keys_loaded=count,
        message=f"Gemini pool reloaded with {count} key(s).",
    )
