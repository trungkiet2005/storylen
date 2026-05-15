"""MangaDex proxy — forwards requests server-side to avoid browser CORS."""
from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse

router = APIRouter(prefix="/mdx", tags=["mangadex"])

_MDX_BASE = "https://api.mangadex.org"
_TIMEOUT = httpx.Timeout(15.0)


async def _get(path: str, params: dict) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(f"{_MDX_BASE}{path}", params=params)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="MangaDex API error")
        return resp.json()


@router.get("/manga/popular")
async def popular(limit: int = Query(default=24, le=100)):
    data = await _get("/manga", {
        "limit": limit,
        "includes[]": ["cover_art"],
        "contentRating[]": ["safe"],
        "availableTranslatedLanguage[]": ["vi"],
        "order[followedCount]": "desc",
    })
    return JSONResponse(content=data)


@router.get("/manga")
async def search(
    limit: int = Query(default=24, le=100),
    offset: int = Query(default=0),
    title: str = Query(default=""),
    includedTags: list[str] = Query(default=[]),
):
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
        params.setdefault("includedTags[]", []).append(tag)  # type: ignore[union-attr]
    data = await _get("/manga", params)
    return JSONResponse(content=data)


@router.get("/manga/{manga_id}/chapters")
async def chapters(
    manga_id: str,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
):
    data = await _get("/chapter", {
        "manga": manga_id,
        "limit": limit,
        "offset": offset,
        "translatedLanguage[]": ["vi"],
        "order[chapter]": "asc",
        "includes[]": ["scanlation_group"],
        "contentRating[]": ["safe"],
    })
    return JSONResponse(content=data)


@router.get("/manga/{manga_id}")
async def manga_detail(manga_id: str):
    data = await _get(f"/manga/{manga_id}", {"includes[]": ["cover_art", "author"]})
    return JSONResponse(content=data)


@router.get("/chapter/{chapter_id}/pages")
async def chapter_pages(chapter_id: str):
    data = await _get(f"/at-home/server/{chapter_id}", {})
    return JSONResponse(content=data)


@router.get("/chapter/{chapter_id}")
async def chapter_detail(chapter_id: str):
    data = await _get(f"/chapter/{chapter_id}", {})
    return JSONResponse(content=data)


@router.get("/cover-proxy")
async def cover_proxy(url: str = Query(...)):
    """Stream cover images to avoid CORS and hotlink restrictions."""
    async def _stream():
        async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
            async with client.stream(
                "GET", url,
                headers={"Referer": "https://mangadex.org/", "User-Agent": "Mozilla/5.0"},
            ) as resp:
                async for chunk in resp.aiter_bytes(chunk_size=8192):
                    yield chunk

    return StreamingResponse(
        _stream(),
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )
