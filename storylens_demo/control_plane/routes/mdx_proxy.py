"""MangaDex proxy — forwards requests to MangaDex API server-side to avoid browser CORS."""
from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/mdx", tags=["mangadex-proxy"])

MDX_BASE = "https://api.mangadex.org"
_CLIENT_TIMEOUT = httpx.Timeout(15.0)


async def _mdx_get(path: str, params: dict) -> dict:
    """Fetch from MangaDex API server-side."""
    async with httpx.AsyncClient(timeout=_CLIENT_TIMEOUT) as client:
        resp = await client.get(f"{MDX_BASE}{path}", params=params)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="MangaDex API error")
        return resp.json()


@router.get("/manga")
async def proxy_manga(
    limit: int = Query(default=24, le=100),
    offset: int = Query(default=0),
    title: str = Query(default=""),
    includedTags: list[str] = Query(default=[]),
    order_followedCount: str = Query(default="desc", alias="order[followedCount]"),
):
    """Proxy /manga list from MangaDex."""
    params: dict = {
        "limit": limit,
        "offset": offset,
        "includes[]": ["cover_art"],
        "contentRating[]": ["safe"],
        "availableTranslatedLanguage[]": ["vi"],
    }
    if title:
        params["title"] = title
    else:
        params["order[followedCount]"] = "desc"
    for tag in includedTags:
        params.setdefault("includedTags[]", []).append(tag)  # type: ignore

    data = await _mdx_get("/manga", params)
    return JSONResponse(content=data)


@router.get("/manga/popular")
async def proxy_popular(limit: int = Query(default=24, le=100)):
    """Proxy popular manga (no title filter, sorted by followedCount)."""
    params: dict = {
        "limit": limit,
        "includes[]": ["cover_art"],
        "contentRating[]": ["safe"],
        "availableTranslatedLanguage[]": ["vi"],
        "order[followedCount]": "desc",
    }
    data = await _mdx_get("/manga", params)
    return JSONResponse(content=data)


@router.get("/manga/{manga_id}")
async def proxy_manga_detail(manga_id: str):
    """Get a single manga's detail."""
    params = {"includes[]": ["cover_art", "author"]}
    data = await _mdx_get(f"/manga/{manga_id}", params)
    return JSONResponse(content=data)


@router.get("/manga/{manga_id}/chapters")
async def proxy_chapters(
    manga_id: str,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
):
    """Get chapters for a manga — Vietnamese only, sorted asc."""
    params = {
        "manga": manga_id,
        "limit": limit,
        "offset": offset,
        "translatedLanguage[]": ["vi"],
        "order[chapter]": "asc",
        "includes[]": ["scanlation_group"],
        "contentRating[]": ["safe"],
    }
    data = await _mdx_get("/chapter", params)
    return JSONResponse(content=data)


@router.get("/chapter/{chapter_id}")
async def proxy_chapter_detail(chapter_id: str):
    """Get a single chapter detail."""
    data = await _mdx_get(f"/chapter/{chapter_id}", {})
    return JSONResponse(content=data)


@router.get("/chapter/{chapter_id}/pages")
async def proxy_chapter_pages(chapter_id: str):
    """Get image URLs for reading a chapter."""
    data = await _mdx_get(f"/at-home/server/{chapter_id}", {})
    return JSONResponse(content=data)


@router.get("/cover-proxy")
async def proxy_cover_image(url: str = Query(...)):
    """Proxy images via streaming — avoids buffering, starts sending immediately."""
    from fastapi.responses import StreamingResponse

    async def _stream():
        async with httpx.AsyncClient(timeout=_CLIENT_TIMEOUT, follow_redirects=True) as client:
            async with client.stream(
                "GET", url,
                headers={"Referer": "https://mangadex.org/", "User-Agent": "Mozilla/5.0"}
            ) as resp:
                async for chunk in resp.aiter_bytes(chunk_size=8192):
                    yield chunk

    return StreamingResponse(
        _stream(),
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )


