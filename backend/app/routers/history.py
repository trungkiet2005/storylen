"""
StoryLens Backend - History Router
GET /history — returns paginated list of processed pages for the current session.

Fixes:
- Handle unknown/invalid status values gracefully (don't crash)
- Handle None values in optional fields
- Safe count access from Supabase
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query

from app.database import get_supabase
from app.models.schemas import HistoryItem, HistoryResponse, ProcessingStatus
from app.routers.auth import AuthUser, get_current_user

router = APIRouter(prefix="/history", tags=["history"])
logger = logging.getLogger(__name__)


@router.get("", response_model=HistoryResponse)
def get_history(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: AuthUser = Depends(get_current_user),
):
    """
    Return paginated history of manga pages uploaded by the current user.
    Sorted by upload date (newest first).
    """
    supabase = get_supabase()

    # Count total for this user
    try:
        count_res = (
            supabase.table("manga_pages")
            .select("page_id", count="exact")
            .eq("user_id", user.id)
            .execute()
        )
        total = count_res.count or 0
    except Exception as exc:
        logger.error("Failed to count manga_pages: %s", exc)
        total = 0

    # Fetch page records with pagination (filtered by user)
    try:
        data_res = (
            supabase.table("manga_pages")
            .select(
                "page_id, original_image_url, thumbnail_url, status, "
                "uploaded_at, page_number, chapter_id"
            )
            .eq("user_id", user.id)
            .order("uploaded_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = data_res.data or []
    except Exception as exc:
        logger.error("Failed to fetch manga_pages history: %s", exc)
        rows = []

    items: list[HistoryItem] = []
    for row in rows:
        # Parse status safely
        try:
            status = ProcessingStatus(row.get("status", "pending"))
        except ValueError:
            logger.warning(
                "Unknown status '%s' for page %s in history",
                row.get("status"),
                row.get("page_id"),
            )
            status = ProcessingStatus.FAILED

        # Build a human-readable title
        page_number = row.get("page_number")
        chapter_id = row.get("chapter_id")
        if page_number is not None:
            title = f"Page {page_number}"
        else:
            page_id_short = (row.get("page_id") or "?")[:8]
            title = f"Page {page_id_short}…"
        if chapter_id:
            title = f"Chapter — {title}"

        uploaded_at = row.get("uploaded_at")
        if not uploaded_at:
            continue  # Skip malformed rows

        items.append(
            HistoryItem(
                id=row["page_id"],
                type="page",
                title=title,
                thumbnail_url=row.get("thumbnail_url"),
                last_accessed=uploaded_at,
                status=status,
            )
        )

    return HistoryResponse(total=total, items=items)
