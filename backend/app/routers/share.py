"""
StoryLens Backend — Share Links Router

Create short, opaque, optionally-expiring share URLs for a translated manga page.
Anyone with the link can view the translated page without authentication.

POST /share          → create link (owner-only)
GET  /share/{share_id} → fetch page data via share link (public)
"""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_user

router = APIRouter(prefix="/share", tags=["share"])
logger = logging.getLogger(__name__)


class ShareCreateRequest(BaseModel):
    page_id: str
    expires_in_hours: int | None = Field(default=None, ge=1, le=24 * 365)


class ShareLinkOut(BaseModel):
    share_id: str
    page_id: str
    url: str
    expires_at: str | None = None
    created_at: str


def _build_share_id() -> str:
    return secrets.token_urlsafe(12)  # ~16 chars, 96 bits of entropy


def _public_url(share_id: str) -> str:
    from app.config import get_settings
    base = get_settings().FRONTEND_BASE_URL.rstrip("/")
    return f"{base}/share/{share_id}"


@router.post("", response_model=ShareLinkOut)
def create_share(body: ShareCreateRequest, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    # Verify ownership (or admin) before issuing a link.
    page = sb.table("manga_pages").select("page_id,user_id").eq("page_id", body.page_id).limit(1).execute()
    if not page.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy trang.")
    if page.data[0].get("user_id") != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền chia sẻ trang này.")

    share_id = _build_share_id()
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(hours=body.expires_in_hours)) if body.expires_in_hours else None
    row = {
        "share_id": share_id,
        "page_id": body.page_id,
        "user_id": user.id,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "created_at": now.isoformat(),
    }
    try:
        sb.table("share_links").insert(row).execute()
    except Exception as exc:
        logger.warning("share insert failed: %s", exc)
        raise HTTPException(status_code=503, detail="Không thể tạo liên kết lúc này.")
    return ShareLinkOut(
        share_id=share_id,
        page_id=body.page_id,
        url=_public_url(share_id),
        expires_at=row["expires_at"],
        created_at=row["created_at"],
    )


@router.get("/{share_id}")
def get_share(share_id: str):
    sb = get_supabase()
    try:
        result = sb.table("share_links").select("*").eq("share_id", share_id).limit(1).execute()
    except Exception as exc:
        logger.warning("share lookup failed: %s", exc)
        raise HTTPException(status_code=503, detail="Liên kết tạm thời không khả dụng.")
    if not result.data:
        raise HTTPException(status_code=404, detail="Liên kết không tồn tại.")
    link = result.data[0]

    expires_at = link.get("expires_at")
    if expires_at:
        try:
            exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                raise HTTPException(status_code=410, detail="Liên kết đã hết hạn.")
        except ValueError:
            pass

    page_id = link["page_id"]
    page_result = sb.table("manga_pages").select("*").eq("page_id", page_id).limit(1).execute()
    if not page_result.data:
        raise HTTPException(status_code=404, detail="Trang đã bị xoá.")
    page = page_result.data[0]
    bubbles = sb.table("bubble_data").select("*").eq("page_id", page_id).execute()
    return {
        "page_id": page_id,
        "original_image_url": page.get("original_image_url"),
        "translated_image_url": page.get("translated_image_url"),
        "thumbnail_url": page.get("thumbnail_url"),
        "status": page.get("status"),
        "processed_data": bubbles.data or [],
        "metadata": {
            "page_number": page.get("page_number"),
            "series_id": page.get("series_id"),
            "chapter_id": page.get("chapter_id"),
        },
    }
