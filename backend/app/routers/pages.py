"""
StoryLens Backend - Pages Router
GET /page/{page_id} — returns full processed page data (image URL + bubble translations)
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.database import get_supabase
from app.models.schemas import BubbleResult, PageDataResponse, PageMetadata, ProcessingStatus

router = APIRouter(prefix="/page", tags=["pages"])


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
    status = ProcessingStatus(page["status"])

    if status not in (ProcessingStatus.TRANSLATED, ProcessingStatus.COMPLETED):
        raise HTTPException(
            status_code=404,
            detail=f"Page not yet processed. Current status: {status.value}",
        )

    # Fetch bubble data + latest translation for each bubble
    bubbles_res = (
        supabase.table("bubble_data")
        .select(
            "bubble_id, x, y, width, height, original_text_jp, ocr_confidence,"
            "translation_history(translated_text_vi)"
        )
        .eq("page_id", page_id)
        .execute()
    )

    processed_data: list[BubbleResult] = []
    for b in bubbles_res.data or []:
        translations = b.get("translation_history") or []
        translated_text = translations[-1]["translated_text_vi"] if translations else ""
        processed_data.append(
            BubbleResult(
                bubble_id=b["bubble_id"],
                bbox=[b["x"], b["y"], b["width"], b["height"]],
                original_text=b.get("original_text_jp", ""),
                translated_text=translated_text,
                confidence=b.get("ocr_confidence", 0.0) or 0.0,
            )
        )

    # Fetch series_id from chapter
    series_id = None
    if page.get("chapter_id"):
        ch_res = (
            supabase.table("manga_chapters")
            .select("series_id")
            .eq("chapter_id", page["chapter_id"])
            .maybe_single()
            .execute()
        )
        if ch_res.data:
            series_id = ch_res.data.get("series_id")

    return PageDataResponse(
        page_id=page_id,
        original_image_url=page["original_image_url"],
        processed_data=processed_data,
        metadata=PageMetadata(
            series_id=series_id,
            chapter_id=page.get("chapter_id"),
            page_number=page.get("page_number"),
        ),
        status=status,
    )
