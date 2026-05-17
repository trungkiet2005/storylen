"""
StoryLens Backend — Chapter comments (Tier C).

Lightweight comments on published chapters in the public library. Anonymous
users can read; authenticated users can post / soft-delete their own.

If the chapter_comments table is missing (v4 migration not yet applied), the
router degrades to empty-list reads and 503 on writes — no crashes.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_user, get_optional_current_user

router = APIRouter(tags=["comments"])
logger = logging.getLogger(__name__)


class CommentCreateRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class CommentItem(BaseModel):
    comment_id: str
    chapter_id: str
    user_id: str
    username: Optional[str] = None
    body: str
    created_at: datetime
    can_delete: bool = False


class CommentListResponse(BaseModel):
    chapter_id: str
    total: int
    items: list[CommentItem]


def _is_missing_table(exc: Exception) -> bool:
    text = str(exc).lower()
    return "chapter_comments" in text and ("does not exist" in text or "could not find" in text or "42p01" in text)


def _ensure_chapter_public(chapter_id: str) -> dict:
    sb = get_supabase()
    chap = (
        sb.table("manga_chapters")
        .select("chapter_id, published_at")
        .eq("chapter_id", chapter_id)
        .maybe_single()
        .execute()
    )
    if not chap or not chap.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương.")
    if not chap.data.get("published_at"):
        raise HTTPException(status_code=404, detail="Chương chưa được publish.")
    return chap.data


@router.get("/chapters/{chapter_id}/comments", response_model=CommentListResponse)
def list_comments(
    chapter_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[AuthUser] = Depends(get_optional_current_user),
):
    """List comments on a published chapter. Anonymous-readable."""
    _ensure_chapter_public(chapter_id)
    sb = get_supabase()

    try:
        rows = (
            sb.table("chapter_comments")
            .select("comment_id, chapter_id, user_id, body, created_at")
            .eq("chapter_id", chapter_id)
            .is_("deleted_at", "null")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        if _is_missing_table(exc):
            return CommentListResponse(chapter_id=chapter_id, total=0, items=[])
        logger.warning("list_comments failed: %s", exc)
        return CommentListResponse(chapter_id=chapter_id, total=0, items=[])

    user_ids = list({r["user_id"] for r in rows if r.get("user_id")})
    usernames: dict[str, str] = {}
    if user_ids:
        try:
            prof = (
                sb.table("profiles")
                .select("user_id, username")
                .in_("user_id", user_ids)
                .execute()
                .data
                or []
            )
            usernames = {p["user_id"]: p.get("username") or "" for p in prof}
        except Exception:
            pass

    current_id = current_user.id if current_user else None
    items = [
        CommentItem(
            comment_id=r["comment_id"],
            chapter_id=r["chapter_id"],
            user_id=r["user_id"],
            username=usernames.get(r["user_id"]) or None,
            body=r["body"],
            created_at=r["created_at"],
            can_delete=(current_id is not None and r["user_id"] == current_id),
        )
        for r in rows
    ]

    return CommentListResponse(chapter_id=chapter_id, total=len(items), items=items)


@router.post("/chapters/{chapter_id}/comments", response_model=CommentItem, status_code=201)
def post_comment(
    chapter_id: str,
    payload: CommentCreateRequest,
    user: AuthUser = Depends(get_current_user),
):
    """Post a comment. Requires auth + chapter must be published."""
    _ensure_chapter_public(chapter_id)
    sb = get_supabase()

    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=400, detail="Nội dung không được để trống.")

    row = {
        "comment_id": str(uuid.uuid4()),
        "chapter_id": chapter_id,
        "user_id": user.id,
        "body": body,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        sb.table("chapter_comments").insert(row).execute()
    except Exception as exc:
        if _is_missing_table(exc):
            raise HTTPException(
                status_code=503,
                detail="Tính năng bình luận chưa sẵn sàng (DB migration v4 chưa chạy).",
            ) from exc
        logger.error("post_comment failed: %s", exc)
        raise HTTPException(status_code=500, detail="Không lưu được bình luận.") from exc

    return CommentItem(
        comment_id=row["comment_id"],
        chapter_id=chapter_id,
        user_id=user.id,
        username=user.username,
        body=body,
        created_at=row["created_at"],
        can_delete=True,
    )


@router.delete("/chapters/{chapter_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    chapter_id: str,
    comment_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """Soft-delete own comment. Sets deleted_at; admins can also delete others' comments."""
    sb = get_supabase()

    try:
        existing = (
            sb.table("chapter_comments")
            .select("comment_id, chapter_id, user_id, deleted_at")
            .eq("comment_id", comment_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        if _is_missing_table(exc):
            raise HTTPException(status_code=404, detail="Không tìm thấy bình luận.") from exc
        raise HTTPException(status_code=503, detail="Không truy cập được bình luận.") from exc

    row = existing.data if existing else None
    if not row or row.get("chapter_id") != chapter_id:
        raise HTTPException(status_code=404, detail="Không tìm thấy bình luận.")
    if row.get("user_id") != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không phải chủ bình luận này.")
    if row.get("deleted_at"):
        return

    try:
        sb.table("chapter_comments").update(
            {"deleted_at": datetime.now(timezone.utc).isoformat()}
        ).eq("comment_id", comment_id).execute()
    except Exception as exc:
        logger.error("delete_comment failed: %s", exc)
        raise HTTPException(status_code=500, detail="Không xoá được bình luận.") from exc

    return None
