"""Public manga library — exposes chapters that owners have explicitly published.

Until an owner calls `POST /chapters/{id}/publish`, their series stays private.
This router gives anonymous visitors a read-only view of the published catalog.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_user
from app.storage.supabase_storage import (
    signed_original_image_url,
    signed_thumbnail_image_url,
)

router = APIRouter(tags=["library"])
logger = logging.getLogger(__name__)


# ─── Owner actions ───────────────────────────────────────────────────────────

@router.post("/chapters/{chapter_id}/publish", status_code=200)
def publish_chapter(chapter_id: str, user: AuthUser = Depends(get_current_user)):
    """Make a chapter visible in /library. Owner-only."""
    sb = get_supabase()
    chap = (
        sb.table("manga_chapters")
        .select("chapter_id,series_id")
        .eq("chapter_id", chapter_id)
        .maybe_single()
        .execute()
    )
    if not chap.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương.")
    series = (
        sb.table("manga_series")
        .select("series_id,user_id")
        .eq("series_id", chap.data["series_id"])
        .maybe_single()
        .execute()
    )
    if not series.data:
        raise HTTPException(status_code=404, detail="Series gốc đã bị xoá.")
    if series.data.get("user_id") != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không sở hữu chương này.")

    now = datetime.now(timezone.utc).isoformat()
    try:
        sb.table("manga_chapters").update({"published_at": now}).eq("chapter_id", chapter_id).execute()
    except Exception as exc:
        logger.warning("publish_chapter failed: %s", exc)
        raise HTTPException(status_code=503, detail="Không thể publish lúc này.") from exc
    return {"message": "Đã publish chương ra thư viện công khai.", "published_at": now}


@router.post("/chapters/{chapter_id}/unpublish", status_code=200)
def unpublish_chapter(chapter_id: str, user: AuthUser = Depends(get_current_user)):
    """Withdraw a chapter from /library."""
    sb = get_supabase()
    chap = (
        sb.table("manga_chapters")
        .select("chapter_id,series_id")
        .eq("chapter_id", chapter_id)
        .maybe_single()
        .execute()
    )
    if not chap.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương.")
    series = (
        sb.table("manga_series")
        .select("user_id")
        .eq("series_id", chap.data["series_id"])
        .maybe_single()
        .execute()
    )
    if not series.data:
        raise HTTPException(status_code=404, detail="Series gốc đã bị xoá.")
    if series.data.get("user_id") != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không sở hữu chương này.")

    try:
        sb.table("manga_chapters").update({"published_at": None}).eq("chapter_id", chapter_id).execute()
    except Exception as exc:
        logger.warning("unpublish_chapter failed: %s", exc)
        raise HTTPException(status_code=503, detail="Không thể unpublish lúc này.") from exc
    return {"message": "Đã ẩn chương khỏi thư viện."}


# ─── Public read endpoints (no auth) ─────────────────────────────────────────

@router.get("/library")
def public_library(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List series that have at least one published chapter. Anonymous access."""
    sb = get_supabase()
    try:
        chap_rows = (
            sb.table("manga_chapters")
            .select("series_id,chapter_id,published_at")
            .not_.is_("published_at", "null")
            .order("published_at", desc=True)
            .limit(500)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.warning("public_library chapters lookup failed: %s", exc)
        return {"total": 0, "items": []}

    if not chap_rows:
        return {"total": 0, "items": []}

    series_ids = list({r["series_id"] for r in chap_rows if r.get("series_id")})
    try:
        series_rows = (
            sb.table("manga_series")
            .select("series_id,title,description,cover_image_url,author,tags,user_id")
            .in_("series_id", series_ids)
            .execute()
            .data
            or []
        )
    except Exception:
        series_rows = []

    series_by_id = {s["series_id"]: s for s in series_rows}

    chapter_count: dict[str, int] = {}
    latest_publish: dict[str, str] = {}
    for r in chap_rows:
        sid = r.get("series_id")
        if not sid:
            continue
        chapter_count[sid] = chapter_count.get(sid, 0) + 1
        if sid not in latest_publish:
            latest_publish[sid] = r.get("published_at") or ""

    items: list[dict[str, Any]] = []
    for sid in series_ids:
        s = series_by_id.get(sid)
        if not s:
            continue
        items.append({
            "series_id": sid,
            "title": s.get("title") or "Untitled",
            "description": s.get("description"),
            "cover_image_url": s.get("cover_image_url"),
            "author": s.get("author"),
            "tags": s.get("tags") or [],
            "published_chapter_count": chapter_count.get(sid, 0),
            "latest_published_at": latest_publish.get(sid),
        })
    items.sort(key=lambda x: x.get("latest_published_at") or "", reverse=True)
    return {
        "total": len(items),
        "items": items[offset : offset + limit],
    }


@router.get("/library/{series_id}/chapters")
def public_series_chapters(series_id: str):
    """List the published chapters of a series — anonymous."""
    sb = get_supabase()
    series = sb.table("manga_series").select("series_id,title,description,cover_image_url,author,tags").eq("series_id", series_id).maybe_single().execute()
    if not series.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ truyện.")
    chap_rows = (
        sb.table("manga_chapters")
        .select("chapter_id,chapter_number,title,published_at,cover_image_url")
        .eq("series_id", series_id)
        .not_.is_("published_at", "null")
        .order("chapter_number")
        .execute()
        .data
        or []
    )
    return {
        "series": series.data,
        "chapters": chap_rows,
    }


@router.get("/library/chapters/{chapter_id}")
def public_chapter_pages(chapter_id: str):
    """List pages of a published chapter — anonymous read-only."""
    sb = get_supabase()
    chap = (
        sb.table("manga_chapters")
        .select("chapter_id,series_id,chapter_number,title,published_at")
        .eq("chapter_id", chapter_id)
        .maybe_single()
        .execute()
    )
    if not chap.data or not chap.data.get("published_at"):
        raise HTTPException(status_code=404, detail="Chương chưa được publish.")

    pages = (
        sb.table("manga_pages")
        .select("page_id,page_number,original_image_url,thumbnail_url,status")
        .eq("chapter_id", chapter_id)
        .eq("status", "completed")
        .order("page_number")
        .execute()
        .data
        or []
    )
    return {
        "chapter": chap.data,
        "pages": [
            {
                "page_id": p["page_id"],
                "page_number": p.get("page_number"),
                "original_image_url": signed_original_image_url(p.get("original_image_url")),
                "thumbnail_url": signed_thumbnail_image_url(p.get("thumbnail_url")),
            }
            for p in pages
        ],
    }
