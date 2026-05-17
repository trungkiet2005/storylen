"""
StoryLens Backend — Full-text Search Router

Searches translated bubble text across all pages owned by the current user.
- /search          : ILIKE substring match (fast, exact phrasing)
- /search/semantic : pgvector cosine search (find scenes by meaning, not words)
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.config import get_settings
from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_user
from app.services.hf_client import call_embed

router = APIRouter(prefix="/search", tags=["search"])
logger = logging.getLogger(__name__)
settings = get_settings()


class SearchHit(BaseModel):
    page_id: str
    page_number: int | None = None
    series_id: str | None = None
    series_title: str | None = None
    chapter_id: str | None = None
    chapter_number: int | None = None
    snippet: str
    thumbnail_url: str | None = None
    similarity: float | None = None  # populated for semantic hits only


class SearchResponse(BaseModel):
    query: str
    total: int
    hits: list[SearchHit]
    mode: str = "keyword"


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

    return SearchResponse(query=needle, total=len(hits), hits=hits, mode="keyword")


# ─── Semantic search (Tier A #5) ──────────────────────────────────────────────

def _hydrate_pages(
    sb,
    user_id: str,
    page_snippets: dict[str, tuple[str, float | None]],
    limit: int,
) -> list[SearchHit]:
    """Shared post-processing: turn a {page_id: (snippet, similarity?)} dict into
    a SearchHit list, fetching page/series/chapter metadata in batched queries."""
    if not page_snippets:
        return []

    page_ids = list(page_snippets.keys())
    try:
        pages = (
            sb.table("manga_pages")
            .select("page_id,page_number,series_id,chapter_id,thumbnail_url,user_id")
            .in_("page_id", page_ids)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as exc:
        logger.warning("semantic page lookup failed: %s", exc)
        return []

    pages_data = pages.data or []
    series_ids = {p["series_id"] for p in pages_data if p.get("series_id")}
    series_titles: dict[str, str] = {}
    if series_ids:
        try:
            sres = sb.table("manga_series").select("series_id,title").in_("series_id", list(series_ids)).execute()
            series_titles = {r["series_id"]: r.get("title", "") for r in (sres.data or [])}
        except Exception:
            pass

    chapter_ids = {p["chapter_id"] for p in pages_data if p.get("chapter_id")}
    chapter_numbers: dict[str, int] = {}
    if chapter_ids:
        try:
            cres = sb.table("manga_chapters").select("chapter_id,chapter_number").in_("chapter_id", list(chapter_ids)).execute()
            chapter_numbers = {r["chapter_id"]: r.get("chapter_number") for r in (cres.data or [])}
        except Exception:
            pass

    # Keep semantic ordering (highest similarity first)
    pages_by_id = {p["page_id"]: p for p in pages_data}
    hits: list[SearchHit] = []
    for pid in page_ids:
        page = pages_by_id.get(pid)
        if not page:
            continue
        snippet, similarity = page_snippets[pid]
        hits.append(SearchHit(
            page_id=pid,
            page_number=page.get("page_number"),
            series_id=page.get("series_id"),
            series_title=series_titles.get(page.get("series_id"), None),
            chapter_id=page.get("chapter_id"),
            chapter_number=chapter_numbers.get(page.get("chapter_id"), None),
            snippet=snippet,
            thumbnail_url=page.get("thumbnail_url"),
            similarity=similarity,
        ))
        if len(hits) >= limit:
            break
    return hits


@router.get("/semantic", response_model=SearchResponse)
def search_semantic(
    q: str = Query(..., min_length=2, max_length=256),
    limit: int = Query(20, ge=1, le=50),
    series_id: str | None = Query(default=None),
    user: AuthUser = Depends(get_current_user),
):
    """Find pages by *meaning*, not keyword. Embeds the query and runs cosine
    search against bubble_data embeddings. Free — no credit cost."""
    needle = q.strip()
    sb = get_supabase()

    try:
        q_vector = call_embed(needle)
    except Exception as exc:
        logger.warning("semantic embed failed: %s", exc)
        return SearchResponse(query=needle, total=0, hits=[], mode="semantic")

    if not q_vector:
        return SearchResponse(query=needle, total=0, hits=[], mode="semantic")

    rpc_params: dict = {
        "query_embedding": q_vector,
        "match_count": min(limit * 3, 80),
    }
    if series_id:
        rpc_params["filter_series_id"] = series_id

    try:
        result = sb.rpc("match_embeddings", rpc_params).execute()
        chunks = result.data or []
    except Exception as exc:
        logger.error("semantic vector search failed: %s", exc)
        return SearchResponse(query=needle, total=0, hits=[], mode="semantic")

    # chunks: [{id, page_id, content, similarity}]
    # Collapse to best chunk per page, preserving order.
    page_snippets: dict[str, tuple[str, float | None]] = {}
    for chunk in chunks:
        if not isinstance(chunk, dict):
            continue
        pid = chunk.get("page_id")
        if not pid or pid in page_snippets:
            continue
        content = str(chunk.get("content") or "")[:200]
        sim = chunk.get("similarity")
        page_snippets[pid] = (content, float(sim) if sim is not None else None)

    hits = _hydrate_pages(sb, user.id, page_snippets, limit)
    return SearchResponse(query=needle, total=len(hits), hits=hits, mode="semantic")
