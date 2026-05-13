"""
StoryLens Backend - Pages Router
GET /page/{page_id} — returns full processed page data (image URL + bubble translations)

Fixes:
- Accept both TRANSLATED and COMPLETED as valid states for reading
- Safe handling of missing translation entries
- Handle supabase returning None for optional fields
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.database import get_supabase
from app.models.schemas import (
    BubbleResult,
    PageDataResponse,
    PageMetadata,
    ProcessingStatus,
    TranslationEditRequest,
    TranslationHistoryItem,
    TranslationHistoryResponse,
)
from app.routers.auth import AuthUser, get_current_user
from app.storage.supabase_storage import (
    signed_original_image_url,
    signed_translated_image_url,
    translated_image_public_url,
)

router = APIRouter(prefix="/page", tags=["pages"])
logger = logging.getLogger(__name__)

# Statuses that mean the page is ready to be read
_READABLE_STATUSES = {ProcessingStatus.TRANSLATED, ProcessingStatus.COMPLETED}


def _get_owned_page(supabase, page_id: str, user: AuthUser) -> dict:
    page_res = (
        supabase.table("manga_pages")
        .select("page_id, user_id")
        .eq("page_id", page_id)
        .maybe_single()
        .execute()
    )
    if not page_res.data:
        raise HTTPException(status_code=404, detail="Page not found.")
    if page_res.data.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Truy cập bị từ chối.")
    return page_res.data


def _get_owned_bubble(supabase, page_id: str, bubble_id: str, user: AuthUser) -> dict:
    _get_owned_page(supabase, page_id, user)
    bubble_res = (
        supabase.table("bubble_data")
        .select("bubble_id, page_id")
        .eq("page_id", page_id)
        .eq("bubble_id", bubble_id)
        .maybe_single()
        .execute()
    )
    if not bubble_res.data:
        raise HTTPException(status_code=404, detail="Bubble not found.")
    return bubble_res.data


def _profile_names(supabase, user_ids: list[str]) -> dict[str, str]:
    if not user_ids:
        return {}
    try:
        res = (
            supabase.table("profiles")
            .select("user_id, username")
            .in_("user_id", user_ids)
            .execute()
        )
    except Exception as exc:
        logger.warning("Failed to load translation editor profiles: %s", exc)
        return {}
    return {
        str(row.get("user_id")): str(row.get("username") or "")
        for row in (res.data or [])
        if row.get("user_id") and row.get("username")
    }


def _is_missing_user_id_column(exc: Exception) -> bool:
    text = str(exc).lower()
    return "translation_history" in text and "user_id" in text and (
        "does not exist" in text or "could not find" in text
    )


@router.get("/{page_id}", response_model=PageDataResponse)
def get_page(page_id: str, user: AuthUser = Depends(get_current_user)):
    """
    Return the processed manga page data:
    - Original image URL
    - List of bubbles with bounding boxes, OCR text, and Vietnamese translation
    """
    supabase = get_supabase()

    # Fetch page metadata
    try:
        page_res = (
            supabase.table("manga_pages")
            .select(
                "page_id, user_id, original_image_url, translated_image_url, "
                "status, chapter_id, page_number, batch_id"
            )
            .eq("page_id", page_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.warning(
            "Falling back to page query without translated_image_url for %s: %s",
            page_id,
            exc,
        )
        page_res = (
            supabase.table("manga_pages")
            .select("page_id, user_id, original_image_url, status, chapter_id, page_number, batch_id")
            .eq("page_id", page_id)
            .maybe_single()
            .execute()
        )

    if not page_res.data:
        raise HTTPException(status_code=404, detail="Page not found.")

    page = page_res.data

    if page.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Truy cập bị từ chối.")

    # Parse status safely
    try:
        status = ProcessingStatus(page["status"])
    except ValueError:
        logger.warning("Unknown status '%s' for page %s", page["status"], page_id)
        status = ProcessingStatus.FAILED

    if status not in _READABLE_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=f"Page not yet ready. Current status: {status.value}",
        )

    # Fetch bubble data + latest translation for each bubble
    bubbles_res = (
        supabase.table("bubble_data")
        .select(
            "bubble_id, x, y, width, height, original_text_jp, ocr_confidence,"
            "translation_history(translated_text_vi, translated_at)"
        )
        .eq("page_id", page_id)
        .execute()
    )

    processed_data: list[BubbleResult] = []
    for b in bubbles_res.data or []:
        translations = b.get("translation_history") or []
        # Sort by translated_at descending and pick the latest
        if translations:
            try:
                translations_sorted = sorted(
                    translations,
                    key=lambda t: t.get("translated_at") or "",
                    reverse=True,
                )
                translated_text = translations_sorted[0].get("translated_text_vi") or ""
            except Exception:
                translated_text = translations[-1].get("translated_text_vi") or ""
        else:
            translated_text = ""

        processed_data.append(
            BubbleResult(
                bubble_id=b["bubble_id"],
                bbox=[
                    int(b.get("x") or 0),
                    int(b.get("y") or 0),
                    int(b.get("width") or 0),
                    int(b.get("height") or 0),
                ],
                original_text=b.get("original_text_jp") or "",
                translated_text=translated_text,
                confidence=float(b.get("ocr_confidence") or 0.0),
            )
        )

    # Fetch series_id from chapter (optional)
    series_id: str | None = None
    chapter_id = page.get("chapter_id")
    if chapter_id:
        try:
            ch_res = (
                supabase.table("manga_chapters")
                .select("series_id")
                .eq("chapter_id", chapter_id)
                .maybe_single()
                .execute()
            )
            if ch_res.data:
                series_id = ch_res.data.get("series_id")
        except Exception as exc:
            logger.warning("Failed to fetch chapter info for page %s: %s", page_id, exc)

    translated_public_url = page.get("translated_image_url") or translated_image_public_url(page_id)

    return PageDataResponse(
        page_id=page_id,
        original_image_url=signed_original_image_url(page["original_image_url"]) or page["original_image_url"],
        translated_image_url=signed_translated_image_url(
            page_id,
            translated_public_url,
        ) or translated_public_url,
        processed_data=processed_data,
        metadata=PageMetadata(
            batch_id=page.get("batch_id"),
            series_id=series_id,
            chapter_id=chapter_id,
            page_number=page.get("page_number"),
        ),
        status=status,
    )


@router.get(
    "/{page_id}/bubbles/{bubble_id}/translations",
    response_model=TranslationHistoryResponse,
)
def get_translation_history(
    page_id: str,
    bubble_id: str,
    user: AuthUser = Depends(get_current_user),
) -> TranslationHistoryResponse:
    """Return all translation revisions for one bubble, newest first."""
    supabase = get_supabase()
    _get_owned_bubble(supabase, page_id, bubble_id, user)

    try:
        result = (
            supabase.table("translation_history")
            .select("translation_id, bubble_id, translated_text_vi, translated_at, llm_model_used, user_id")
            .eq("bubble_id", bubble_id)
            .order("translated_at", desc=True)
            .execute()
        )
    except Exception as exc:
        if not _is_missing_user_id_column(exc):
            raise
        logger.warning("translation_history.user_id is missing; returning history without editor users.")
        result = (
            supabase.table("translation_history")
            .select("translation_id, bubble_id, translated_text_vi, translated_at, llm_model_used")
            .eq("bubble_id", bubble_id)
            .order("translated_at", desc=True)
            .execute()
        )
    rows = result.data or []
    names = _profile_names(
        supabase,
        list({str(row.get("user_id")) for row in rows if row.get("user_id")}),
    )

    items = [
        TranslationHistoryItem(
            translation_id=str(row["translation_id"]),
            bubble_id=str(row["bubble_id"]),
            translated_text=str(row.get("translated_text_vi") or ""),
            translated_at=row["translated_at"],
            llm_model_used=row.get("llm_model_used"),
            user_id=row.get("user_id"),
            username=names.get(str(row.get("user_id"))) if row.get("user_id") else None,
        )
        for row in rows
    ]
    return TranslationHistoryResponse(bubble_id=bubble_id, total=len(items), items=items)


@router.patch(
    "/{page_id}/bubbles/{bubble_id}/translation",
    response_model=TranslationHistoryItem,
)
def update_bubble_translation(
    page_id: str,
    bubble_id: str,
    payload: TranslationEditRequest,
    user: AuthUser = Depends(get_current_user),
) -> TranslationHistoryItem:
    """Save a user translation edit as a new revision."""
    translated_text = payload.translated_text.strip()
    if not translated_text:
        raise HTTPException(status_code=400, detail="Translation cannot be empty.")

    supabase = get_supabase()
    _get_owned_bubble(supabase, page_id, bubble_id, user)

    row = {
        "translation_id": str(uuid.uuid4()),
        "bubble_id": bubble_id,
        "translated_text_vi": translated_text,
        "translated_at": datetime.now(timezone.utc).isoformat(),
        "llm_model_used": "user_edit",
        "user_id": user.id,
    }
    try:
        result = supabase.table("translation_history").insert(row).execute()
    except Exception as exc:
        if _is_missing_user_id_column(exc):
            raise HTTPException(
                status_code=503,
                detail="Database migration required: add translation_history.user_id before saving user edits.",
            ) from exc
        logger.error("Failed to save translation edit for bubble %s: %s", bubble_id, exc)
        raise HTTPException(status_code=500, detail="Failed to save translation edit.") from exc

    saved = (result.data or [row])[0]
    return TranslationHistoryItem(
        translation_id=str(saved["translation_id"]),
        bubble_id=str(saved["bubble_id"]),
        translated_text=str(saved.get("translated_text_vi") or translated_text),
        translated_at=saved.get("translated_at"),
        llm_model_used=saved.get("llm_model_used") or "user_edit",
        user_id=saved.get("user_id") or user.id,
        username=user.username,
    )
