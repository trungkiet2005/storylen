"""
StoryLens Backend — Narration router ("Listen mode").

Endpoints:
  GET  /narrate/voices                     list TTS engines + voices (+ default)
  POST /narrate/page/{page_id}             narrate one page → script + audio URL
  POST /narrate/chapter/{chapter_id}       start a background chapter narration job
  GET  /narrate/chapter/status/{job_id}    poll a chapter job
  POST /narrate/recap/{chapter_id}         render a recap .mp4 (optional; needs ffmpeg)

Auth + credit gating live here; the heavy lifting is in services/narration.py.
"""
from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import get_settings
from app.database import get_supabase
from app.models.schemas import (
    ChapterNarrateResponse,
    ChapterNarrationStatusResponse,
    NarrateRequest,
    NarrationResponse,
    RecapVideoResponse,
    VoicesResponse,
)
from app.rate_limit import limiter
from app.routers.auth import AuthUser, get_current_user
from app.services import narration, recap_video
from app.services.credit_service import check_has_credits, deduct
from app.services.tts import registry as tts_registry

router = APIRouter(prefix="/narrate", tags=["narration"])
logger = logging.getLogger(__name__)


def _ensure_enabled() -> None:
    if not get_settings().NARRATION_ENABLED:
        raise HTTPException(status_code=503, detail="Tính năng đọc truyện đang tắt.")


def _get_owned_page(supabase, page_id: str, user: AuthUser) -> dict:
    res = (
        supabase.table("manga_pages")
        .select("page_id, user_id, chapter_id")
        .eq("page_id", page_id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy trang.")
    if res.data.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Truy cập bị từ chối.")
    return res.data


@router.get("/voices", response_model=VoicesResponse)
def list_voices(user: AuthUser = Depends(get_current_user)):
    """List available TTS engines and their voices so the reader can offer a picker."""
    settings = get_settings()
    return VoicesResponse(
        default_engine=tts_registry.default_engine(),
        engines=tts_registry.describe_engines(),
        credit_cost_per_page=settings.NARRATION_CREDIT_COST,
        max_chapter_pages=settings.NARRATION_MAX_CHAPTER_PAGES,
    )


@router.post("/page/{page_id}", response_model=NarrationResponse)
@limiter.limit(lambda: get_settings().RATE_LIMIT_NARRATE)
def narrate_page(
    request: Request,
    page_id: str,
    payload: NarrateRequest | None = None,
    user: AuthUser = Depends(get_current_user),
):
    """Generate a spoken narration for a single page (VLM script → TTS audio)."""
    _ensure_enabled()
    payload = payload or NarrateRequest()
    supabase = get_supabase()

    _get_owned_page(supabase, page_id, user)

    settings = get_settings()
    cost = settings.NARRATION_CREDIT_COST
    check_has_credits(user.id, cost, supabase)

    try:
        result = narration.narrate_page(
            supabase,
            page_id,
            engine=payload.engine,
            voice=payload.voice,
            rate=payload.rate,
        )
    except narration.NarrationError as exc:
        raise HTTPException(status_code=502, detail=f"Không tạo được lời kể: {exc}") from exc

    if cost > 0:
        try:
            deduct(user.id, cost, "narration", supabase, reference_id=page_id)
        except Exception as exc:  # noqa: BLE001 — deduction failure must not lose the result
            logger.warning("Credit deduction failed after narration for %s: %s", user.id, exc)

    return NarrationResponse(**result.as_dict())


@router.post("/chapter/{chapter_id}", response_model=ChapterNarrateResponse)
@limiter.limit(lambda: get_settings().RATE_LIMIT_NARRATE)
def narrate_chapter(
    request: Request,
    chapter_id: str,
    payload: NarrateRequest | None = None,
    user: AuthUser = Depends(get_current_user),
):
    """Kick off a background job that narrates every readable page in a chapter."""
    _ensure_enabled()
    payload = payload or NarrateRequest()
    supabase = get_supabase()
    settings = get_settings()

    pages = narration.list_chapter_pages(supabase, chapter_id, user.id)
    if not pages:
        raise HTTPException(status_code=404, detail="Chương không có trang nào của bạn.")

    if len(pages) > settings.NARRATION_MAX_CHAPTER_PAGES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Chương có {len(pages)} trang, vượt giới hạn "
                f"{settings.NARRATION_MAX_CHAPTER_PAGES} trang mỗi lần đọc."
            ),
        )

    page_ids = [p["page_id"] for p in pages]
    cost = settings.NARRATION_CREDIT_COST * len(page_ids)
    if cost > 0:
        check_has_credits(user.id, cost, supabase)
        try:
            deduct(user.id, cost, "narration_chapter", supabase, reference_id=chapter_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Credit deduction failed for chapter narration %s: %s", user.id, exc)

    job_id = str(uuid.uuid4())
    job = narration.start_chapter_job(
        supabase,
        chapter_id,
        page_ids,
        engine=payload.engine,
        voice=payload.voice,
        rate=payload.rate,
        job_id=job_id,
    )
    return ChapterNarrateResponse(
        job_id=job.job_id, chapter_id=chapter_id, total=job.total, status=job.status
    )


@router.get("/chapter/status/{job_id}", response_model=ChapterNarrationStatusResponse)
def chapter_status(job_id: str, user: AuthUser = Depends(get_current_user)):
    """Poll a chapter narration job for progress + completed segments."""
    job = narration.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy tác vụ (có thể đã hết hạn).")
    return ChapterNarrationStatusResponse(
        job_id=job.job_id,
        chapter_id=job.chapter_id,
        total=job.total,
        done=job.done,
        status=job.status,
        error=job.error,
        segments=job.segments,
    )


@router.post("/recap/{chapter_id}", response_model=RecapVideoResponse)
@limiter.limit(lambda: get_settings().RATE_LIMIT_NARRATE)
def recap_chapter(
    request: Request,
    chapter_id: str,
    payload: NarrateRequest | None = None,
    user: AuthUser = Depends(get_current_user),
):
    """Render a narrated recap video (.mp4) for a chapter. Needs ffmpeg on the host."""
    _ensure_enabled()
    payload = payload or NarrateRequest()
    supabase = get_supabase()
    settings = get_settings()

    if not recap_video.ffmpeg_available():
        raise HTTPException(
            status_code=503,
            detail="Xuất video recap chưa khả dụng trên máy chủ này (thiếu ffmpeg).",
        )

    pages = narration.list_chapter_pages(supabase, chapter_id, user.id)
    if not pages:
        raise HTTPException(status_code=404, detail="Chương không có trang nào của bạn.")
    if len(pages) > settings.NARRATION_MAX_CHAPTER_PAGES:
        raise HTTPException(status_code=400, detail="Chương quá dài để xuất recap.")

    page_ids = [p["page_id"] for p in pages]
    cost = settings.NARRATION_CREDIT_COST * len(page_ids)
    if cost > 0:
        check_has_credits(user.id, cost, supabase)

    try:
        video_url = recap_video.build_chapter_recap(
            supabase, chapter_id, page_ids,
            engine=payload.engine, voice=payload.voice, rate=payload.rate,
        )
    except recap_video.RecapError as exc:
        raise HTTPException(status_code=502, detail=f"Không tạo được recap: {exc}") from exc

    if cost > 0:
        try:
            deduct(user.id, cost, "narration_recap", supabase, reference_id=chapter_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Credit deduction failed for recap %s: %s", user.id, exc)

    return RecapVideoResponse(chapter_id=chapter_id, video_url=video_url)
