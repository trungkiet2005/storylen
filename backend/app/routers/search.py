"""
StoryLens Backend — Full-text Search Router

Searches translated bubble text across all pages owned by the current user.
Uses ILIKE for simplicity. If the deployment has a tsvector index on
bubble_data.translated_text, the query planner uses it automatically.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_user

router = APIRouter(prefix="/search", tags=["search"])
logger = logging.getLogger(__name__)


class SearchHit(BaseModel):
    page_id: str
    page_number: int | None = None
    series_id: str | None = None
    series_title: str | None = None
    chapter_id: str | None = None
    chapter_number: int | None = None
    snippet: str
    thumbnail_url: str | None = None


class SearchResponse(BaseModel):
    query: str
    total: int
    hits: list[SearchHit]


@router.get("", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=2, max_length=128),
    limit: int = Query(30, ge=1, le=100),
    user: AuthUser = Depends(get_current_user),
):
    sb = get_supabase()
    needle = q.strip()
    try:
        # Find matching bubbles for this user. Owner is enforced by joining manga_pages.
        result = (
            sb.table("bubble_data")
            .select("page_id,translated_text")
            .ilike("translated_text", f"%{needle}%")
            .limit(limit * 3)
            .execute()
        )
    except Exception as exc:
        logger.warning("search ilike failed: %s", exc)
        return SearchResponse(query=needle, total=0, hits=[])

    page_to_snippet: dict[str, str] = {}
    for row in result.data or []:
        pid = row.get("page_id")
        text = row.get("translated_text") or ""
        if pid and pid not in page_to_snippet:
            page_to_snippet[pid] = text[:200]

    if not page_to_snippet:
        return SearchResponse(query=needle, total=0, hits=[])

    page_ids = list(page_to_snippet.keys())
    try:
        pages = (
            sb.table("manga_pages")
            .select("page_id,page_number,series_id,chapter_id,thumbnail_url,user_id")
            .in_("page_id", page_ids)
            .eq("user_id", user.id)
            .execute()
        )
    except Exception as exc:
        logger.warning("search page lookup failed: %s", exc)
        return SearchResponse(query=needle, total=0, hits=[])

    hits: list[SearchHit] = []
    series_ids = {p["series_id"] for p in pages.data or [] if p.get("series_id")}
    series_titles: dict[str, str] = {}
    if series_ids:
        try:
            sres = sb.table("manga_series").select("series_id,title").in_("series_id", list(series_ids)).execute()
            series_titles = {r["series_id"]: r.get("title", "") for r in (sres.data or [])}
        except Exception:
            pass

    chapter_ids = {p["chapter_id"] for p in pages.data or [] if p.get("chapter_id")}
    chapter_numbers: dict[str, int] = {}
    if chapter_ids:
        try:
            cres = sb.table("manga_chapters").select("chapter_id,chapter_number").in_("chapter_id", list(chapter_ids)).execute()
            chapter_numbers = {r["chapter_id"]: r.get("chapter_number") for r in (cres.data or [])}
        except Exception:
            pass

    for page in pages.data or []:
        pid = page["page_id"]
        hits.append(SearchHit(
            page_id=pid,
            page_number=page.get("page_number"),
            series_id=page.get("series_id"),
            series_title=series_titles.get(page.get("series_id"), None),
            chapter_id=page.get("chapter_id"),
            chapter_number=chapter_numbers.get(page.get("chapter_id"), None),
            snippet=page_to_snippet.get(pid, ""),
            thumbnail_url=page.get("thumbnail_url"),
        ))
        if len(hits) >= limit:
            break

    return SearchResponse(query=needle, total=len(hits), hits=hits)
