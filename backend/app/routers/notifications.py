"""
StoryLens Backend — Notifications Router

In-app notifications. Other services emit events via `notify(user_id, ...)`
(see `app/services/notifications.py`); this router serves them to the user's
bell icon.

GET    /notifications              → list + unread count
POST   /notifications/{id}/read    → mark one read
POST   /notifications/read-all     → mark all read
DELETE /notifications/{id}         → dismiss
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])
logger = logging.getLogger(__name__)


class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    body: str | None = None
    url: str | None = None
    read: bool = False
    created_at: str


class NotificationListResponse(BaseModel):
    total: int
    unread: int
    items: list[NotificationOut]


def _row_to_notification(row: dict[str, Any]) -> NotificationOut:
    return NotificationOut(
        id=str(row["id"]),
        type=str(row.get("type") or "info"),
        title=str(row.get("title") or ""),
        body=row.get("body"),
        url=row.get("url"),
        read=bool(row.get("read", False)),
        created_at=str(row.get("created_at") or ""),
    )


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    user: AuthUser = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
):
    sb = get_supabase()
    try:
        result = (
            sb.table("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = result.data or []
        unread_result = (
            sb.table("notifications")
            .select("id", count="exact")
            .eq("user_id", user.id)
            .eq("read", False)
            .execute()
        )
        unread = getattr(unread_result, "count", None) or 0
    except Exception as exc:
        logger.warning("List notifications failed for %s: %s", user.id, exc)
        return NotificationListResponse(total=0, unread=0, items=[])

    return NotificationListResponse(
        total=len(rows),
        unread=int(unread),
        items=[_row_to_notification(r) for r in rows],
    )


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(notification_id: str, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    try:
        sb.table("notifications").update({"read": True}).eq("id", notification_id).eq("user_id", user.id).execute()
    except Exception as exc:
        logger.warning("mark_read failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Không thể cập nhật trạng thái.")


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    try:
        sb.table("notifications").update({"read": True}).eq("user_id", user.id).eq("read", False).execute()
    except Exception as exc:
        logger.warning("mark_all_read failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Không thể cập nhật trạng thái.")


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(notification_id: str, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    try:
        sb.table("notifications").delete().eq("id", notification_id).eq("user_id", user.id).execute()
    except Exception as exc:
        logger.warning("delete notification failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Không thể xoá.")


def emit_notification(
    user_id: str,
    *,
    type: str,
    title: str,
    body: str | None = None,
    url: str | None = None,
) -> None:
    """Insert a notification row. Swallow errors — non-critical."""
    try:
        get_supabase().table("notifications").insert({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": type,
            "title": title,
            "body": body,
            "url": url,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as exc:
        logger.info("Skip notification emit for %s: %s", user_id, exc)
