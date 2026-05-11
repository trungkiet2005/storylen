"""
StoryLens Backend - History Router
GET /history — returns paginated list of processed pages/series for the current session.
"""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.database import get_supabase
from app.models.schemas import HistoryItem, HistoryResponse, ProcessingStatus

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=HistoryResponse)
def get_history(
    type: str = Query("page", pattern="^(page|series)$"),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    Return paginated history of processed manga pages.
    Currently returns all pages sorted by upload date (no user auth for MVP).
    """
    supabase = get_supabase()

    # Count total
    count_res = (
        supabase.table("manga_pages")
        .select("page_id", count="exact")
        .execute()
    )
    total = count_res.count or 0

    # Fetch page records with pagination
    data_res = (
        supabase.table("manga_pages")
        .select("page_id, original_image_url, thumbnail_url, status, uploaded_at, page_number, chapter_id")
        .order("uploaded_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    items: list[HistoryItem] = []
    for row in data_res.data or []:
        # Build a human-readable title
        title = f"Page {row.get('page_number', '?')}"
        if row.get("chapter_id"):
            title = f"Chapter — {title}"

        items.append(
            HistoryItem(
                id=row["page_id"],
                type="page",
                title=title,
                thumbnail_url=row.get("thumbnail_url"),
                last_accessed=row["uploaded_at"],
                status=ProcessingStatus(row["status"]),
            )
        )

    return HistoryResponse(total=total, items=items)
