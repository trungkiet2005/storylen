"""
Admin · AI module source switch.

Lets admins toggle which AI module backend is active:

    "huggingface"  → use the HF Space URL baked into env (AI_MODULE_URL)
    "kaggle"       → use the runtime URL stored in app_settings
                     (the Kaggle / Cloudflare tunnel that changes per session)

    GET  /ai-source        snapshot (provider, kaggle_url, hf_url, active_url)
    PUT  /ai-source        update provider + kaggle_url
    POST /ai-source/test   probe an arbitrary URL's /health endpoint
"""
from __future__ import annotations

import logging
import re
import time
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_admin
from app.services.ai_module_source import (
    KEY_KAGGLE_URL,
    KEY_PROVIDER,
    get_ai_source_state,
    invalidate_ai_source_cache,
)

from .deps import audit

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)

_URL_RE = re.compile(r"^https?://[A-Za-z0-9.\-]+(:\d+)?(/.*)?$")


class AISourceState(BaseModel):
    provider: Literal["huggingface", "kaggle"]
    kaggle_url: str = ""
    huggingface_url: str
    active_url: str


class AISourceUpdate(BaseModel):
    provider: Literal["huggingface", "kaggle"]
    kaggle_url: str = Field(default="", max_length=512)

    @field_validator("kaggle_url")
    @classmethod
    def strip_url(cls, v: str) -> str:
        return (v or "").strip()


class TestRequest(BaseModel):
    url: str = Field(min_length=1, max_length=512)


class TestResponse(BaseModel):
    ok: bool
    http_status: int | None = None
    latency_ms: int | None = None
    detail: str | None = None


def _validate_url(url: str) -> None:
    if not _URL_RE.match(url):
        raise HTTPException(status_code=400, detail="URL không hợp lệ (cần bắt đầu bằng http:// hoặc https://).")


def _upsert(key: str, value, admin_id: str, description: str) -> None:
    try:
        get_supabase().table("app_settings").upsert(
            {
                "key": key,
                "value": value,
                "description": description,
                "updated_by": admin_id,
            },
            on_conflict="key",
        ).execute()
    except Exception as exc:
        logger.error("ai_source upsert %s failed: %s", key, exc)
        raise HTTPException(status_code=503, detail="Không thể lưu cấu hình AI source.") from exc


@router.get("/ai-source", response_model=AISourceState)
def get_ai_source(_admin: AuthUser = Depends(get_current_admin)) -> AISourceState:
    return AISourceState(**get_ai_source_state())


@router.put("/ai-source", response_model=AISourceState)
def update_ai_source(
    payload: AISourceUpdate,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> AISourceState:
    if payload.provider == "kaggle":
        if not payload.kaggle_url:
            raise HTTPException(status_code=400, detail="Cần nhập URL Kaggle/Cloudflare khi chọn provider Kaggle.")
        _validate_url(payload.kaggle_url)

    if payload.kaggle_url:
        _validate_url(payload.kaggle_url)

    _upsert(
        KEY_PROVIDER,
        payload.provider,
        admin_user.id,
        "AI module provider: 'huggingface' or 'kaggle'.",
    )
    _upsert(
        KEY_KAGGLE_URL,
        payload.kaggle_url,
        admin_user.id,
        "Runtime Kaggle/Cloudflare tunnel URL for the AI module (changes per session).",
    )
    invalidate_ai_source_cache()

    audit(
        admin_user,
        "ai_source.update",
        request=request,
        target_type="ai_source",
        target_id=payload.provider,
        summary=f"Đặt AI source = {payload.provider}",
        metadata={"provider": payload.provider, "kaggle_url": payload.kaggle_url},
    )

    return AISourceState(**get_ai_source_state())


@router.post("/ai-source/test", response_model=TestResponse)
def test_ai_source(
    payload: TestRequest,
    _admin: AuthUser = Depends(get_current_admin),
) -> TestResponse:
    url = payload.url.strip()
    _validate_url(url)
    probe = url.rstrip("/") + "/health"
    start = time.perf_counter()
    try:
        with httpx.Client(timeout=8.0) as client:
            res = client.get(probe)
        latency = int((time.perf_counter() - start) * 1000)
        ok = 200 <= res.status_code < 500
        return TestResponse(
            ok=ok,
            http_status=res.status_code,
            latency_ms=latency,
            detail=None if ok else f"HTTP {res.status_code}",
        )
    except Exception as exc:
        return TestResponse(ok=False, detail=str(exc)[:200])
