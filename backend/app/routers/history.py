"""
StoryLens Backend - History Router
GET    /history           — paginated list of AI-translated pages for the current user
DELETE /history/{page_id} — remove a page from the user's translation history
                            (also cleans up Supabase Storage objects)

Fixes:
- Handle unknown/invalid status values gracefully (don't crash)
- Handle None values in optional fields
- Safe count access from Supabase
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.config import get_settings
from app.database import get_supabase
from app.models.schemas import HistoryItem, HistoryResponse, ProcessingStatus
from app.routers.auth import AuthUser, get_current_user

router = APIRouter(prefix="/history", tags=["history"])
logger = logging.getLogger(__name__)
settings = get_settings()


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


@router.delete("/{page_id}", status_code=204, response_class=Response)
def delete_history_item(
    page_id: str,
    user: AuthUser = Depends(get_current_user),
) -> Response:
    """
    Remove a translated page from the current user's history.
    Deletes the DB row (cascading bubble_data / translation_history via FKs)
    and best-effort cleanup of the related Supabase Storage objects.
    """
    supabase = get_supabase()

    # ── Verify ownership ─────────────────────────────────────────────────────
    try:
        page_res = (
            supabase.table("manga_pages")
            .select("page_id, user_id, original_image_url, thumbnail_url")
            .eq("page_id", page_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.error("Failed to look up page %s for deletion: %s", page_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể truy cập cơ sở dữ liệu.",
        ) from exc

    if not page_res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy trang.")
    if page_res.data.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Truy cập bị từ chối.")

    # ── Delete the DB row first (FK cascades remove bubble + translation rows)
    try:
        supabase.table("manga_pages").delete().eq("page_id", page_id).execute()
    except Exception as exc:
        logger.error("Failed to delete manga_pages row %s: %s", page_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Xoá khỏi lịch sử thất bại.",
        ) from exc

    # ── Best-effort: remove storage objects (don't fail the request) ────────
    from app.storage.supabase_storage import _storage_path_from_public_url

    originals_bucket = settings.SUPABASE_BUCKET_ORIGINALS
    thumbs_bucket = settings.SUPABASE_BUCKET_THUMBNAILS

    original_path = _storage_path_from_public_url(
        originals_bucket, page_res.data.get("original_image_url")
    )
    thumbnail_path = _storage_path_from_public_url(
        thumbs_bucket, page_res.data.get("thumbnail_url")
    )

    paths_originals = [p for p in (original_path, f"{page_id}/translated.png") if p]
    if paths_originals:
        try:
            supabase.storage.from_(originals_bucket).remove(paths_originals)
        except Exception as exc:
            logger.warning(
                "Storage cleanup (originals) failed for page %s: %s", page_id, exc
            )

    if thumbnail_path:
        try:
            supabase.storage.from_(thumbs_bucket).remove([thumbnail_path])
        except Exception as exc:
            logger.warning(
                "Storage cleanup (thumbnail) failed for page %s: %s", page_id, exc
            )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
