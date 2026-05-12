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

from fastapi import APIRouter, HTTPException

from app.database import get_supabase
from app.models.schemas import BubbleResult, PageDataResponse, PageMetadata, ProcessingStatus

router = APIRouter(prefix="/page", tags=["pages"])
logger = logging.getLogger(__name__)

# Statuses that mean the page is ready to be read
_READABLE_STATUSES = {ProcessingStatus.TRANSLATED, ProcessingStatus.COMPLETED}


@router.get("/{page_id}", response_model=PageDataResponse)
def get_page(page_id: str):
    """
    Return the processed manga page data:
    - Original image URL
    - List of bubbles with bounding boxes, OCR text, and Vietnamese translation
    """
    supabase = get_supabase()

    # Fetch page metadata
    page_res = (
        supabase.table("manga_pages")
        .select("page_id, original_image_url, status, chapter_id, page_number")
        .eq("page_id", page_id)
        .maybe_single()
        .execute()
    )

    if not page_res.data:
        raise HTTPException(status_code=404, detail="Page not found.")

    page = page_res.data

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

    return PageDataResponse(
        page_id=page_id,
        original_image_url=page["original_image_url"],
        processed_data=processed_data,
        metadata=PageMetadata(
            series_id=series_id,
            chapter_id=chapter_id,
            page_number=page.get("page_number"),
        ),
        status=status,
    )
