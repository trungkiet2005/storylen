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
    tag: str | None = Query(default=None, description="Filter series by single tag (case-insensitive)"),
    sort: str = Query(default="recent", regex="^(recent|trending)$"),
):
    """List series that have at least one published chapter. Anonymous access.

    - sort=recent (default): most recently published first
    - sort=trending: ranked by chapters published in the last 7 days, then total
    - tag: filter to series that have this tag (matched case-insensitively)
    """
    from datetime import timedelta as _td  # local — used only here
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
        return {"total": 0, "items": [], "all_tags": []}

    if not chap_rows:
        return {"total": 0, "items": [], "all_tags": []}

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
    recent_count: dict[str, int] = {}
    latest_publish: dict[str, str] = {}
    seven_days_ago = (datetime.now(timezone.utc) - _td(days=7)).isoformat()

    for r in chap_rows:
        sid = r.get("series_id")
        if not sid:
            continue
        chapter_count[sid] = chapter_count.get(sid, 0) + 1
        published_at = r.get("published_at") or ""
        if published_at and published_at >= seven_days_ago:
            recent_count[sid] = recent_count.get(sid, 0) + 1
        if sid not in latest_publish:
            latest_publish[sid] = published_at

    # Collect all unique tags for the filter UI
    all_tags_set: set[str] = set()
    items: list[dict[str, Any]] = []
    needle_tag = (tag or "").strip().lower() or None

    for sid in series_ids:
        s = series_by_id.get(sid)
        if not s:
            continue
        tags = [str(t) for t in (s.get("tags") or []) if t]
        for t in tags:
            all_tags_set.add(t)

        if needle_tag and not any(t.lower() == needle_tag for t in tags):
            continue

        items.append({
            "series_id": sid,
            "title": s.get("title") or "Untitled",
            "description": s.get("description"),
            "cover_image_url": s.get("cover_image_url"),
            "author": s.get("author"),
            "tags": tags,
            "published_chapter_count": chapter_count.get(sid, 0),
            "trending_score": recent_count.get(sid, 0),
            "latest_published_at": latest_publish.get(sid),
        })

    if sort == "trending":
        items.sort(
            key=lambda x: (x.get("trending_score") or 0, x.get("published_chapter_count") or 0, x.get("latest_published_at") or ""),
            reverse=True,
        )
    else:
        items.sort(key=lambda x: x.get("latest_published_at") or "", reverse=True)

    return {
        "total": len(items),
        "items": items[offset : offset + limit],
        "all_tags": sorted(all_tags_set),
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


@router.get("/u/{username}")
def public_profile(username: str):
    """Public read-only profile page (Tier C). Anonymous.

    Returns: username, joined_at, published series counts, recent published
    chapters. Hidden if the user has no published chapters.
    """
    sb = get_supabase()
    needle = username.strip()
    if not needle:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    try:
        profile_res = (
            sb.table("profiles")
            .select("user_id, username, avatar_url, created_at, bio")
            .eq("username", needle)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.warning("public_profile lookup failed: %s", exc)
        raise HTTPException(status_code=503, detail="Không truy cập được hồ sơ.") from exc

    if not profile_res or not profile_res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    profile = profile_res.data
    user_id = profile["user_id"]

    # Pull owned series
    try:
        series_rows = (
            sb.table("manga_series")
            .select("series_id, title, cover_image_url, tags, created_at")
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
    except Exception:
        series_rows = []

    series_ids = [s["series_id"] for s in series_rows]
    published_count: dict[str, int] = {}
    latest_publish: dict[str, str] = {}
    recent_chapters: list[dict[str, Any]] = []

    if series_ids:
        try:
            chap_rows = (
                sb.table("manga_chapters")
                .select("chapter_id, series_id, chapter_number, title, published_at")
                .in_("series_id", series_ids)
                .not_.is_("published_at", "null")
                .order("published_at", desc=True)
                .limit(30)
                .execute()
                .data
                or []
            )
        except Exception:
            chap_rows = []

        for c in chap_rows:
            sid = c["series_id"]
            published_count[sid] = published_count.get(sid, 0) + 1
            if sid not in latest_publish:
                latest_publish[sid] = c.get("published_at") or ""
            if len(recent_chapters) < 10:
                series = next((s for s in series_rows if s["series_id"] == sid), None)
                recent_chapters.append({
                    "chapter_id": c["chapter_id"],
                    "series_id": sid,
                    "series_title": series.get("title") if series else None,
                    "chapter_number": c.get("chapter_number"),
                    "title": c.get("title"),
                    "published_at": c.get("published_at"),
                })

    public_series = [
        {
            "series_id": s["series_id"],
            "title": s.get("title") or "Untitled",
            "cover_image_url": s.get("cover_image_url"),
            "tags": s.get("tags") or [],
            "published_chapter_count": published_count.get(s["series_id"], 0),
            "latest_published_at": latest_publish.get(s["series_id"]),
        }
        for s in series_rows
        if published_count.get(s["series_id"], 0) > 0
    ]
    public_series.sort(key=lambda x: x.get("latest_published_at") or "", reverse=True)

    if not public_series:
        # Don't reveal user existence if they have nothing published
        raise HTTPException(status_code=404, detail="Người dùng chưa publish chương nào.")

    return {
        "username": profile.get("username"),
        "avatar_url": profile.get("avatar_url"),
        "bio": profile.get("bio"),
        "joined_at": profile.get("created_at"),
        "published_series": public_series,
        "total_published_chapters": sum(published_count.values()),
        "recent_chapters": recent_chapters,
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
