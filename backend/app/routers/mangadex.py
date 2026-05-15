"""MangaDex proxy — forwards requests server-side to avoid browser CORS."""
from __future__ import annotations

import asyncio
import logging

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse

router = APIRouter(prefix="/mdx", tags=["mangadex"])
log = logging.getLogger(__name__)

_MDX_BASE = "https://api.mangadex.org"
_TIMEOUT = httpx.Timeout(20.0)


async def _get(path: str, params: dict, *, retries: int = 1) -> dict:
    """Fetch from MangaDex API with retry on 429."""
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                resp = await client.get(f"{_MDX_BASE}{path}", params=params)

            if resp.status_code == 429:
                retry_after = float(resp.headers.get("Retry-After", 2))
                if attempt < retries:
                    await asyncio.sleep(min(retry_after, 3.0))
                    continue
                raise HTTPException(
                    status_code=429,
                    detail="MangaDex rate limit — thử lại sau vài giây",
                )

            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"MangaDex HTTP {resp.status_code}",
                )

            data: dict = resp.json()
            # at-home server returns {"result":"error"} with HTTP 200 on some cases
            if data.get("result") == "error":
                errors = data.get("errors") or [{}]
                detail = errors[0].get("detail") or "MangaDex trả về lỗi không xác định"
                raise HTTPException(status_code=422, detail=detail)

            return data

        except HTTPException:
            raise
        except httpx.TimeoutException:
            last_error = Exception("Timeout kết nối MangaDex")
            if attempt < retries:
                await asyncio.sleep(1.0)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if attempt < retries:
                await asyncio.sleep(1.0)

    raise HTTPException(status_code=502, detail=f"Không thể kết nối MangaDex: {last_error}")


# ─── Manga endpoints ──────────────────────────────────────────────────────────

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
    limit: int = Query(default=200, le=500),
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


# ─── Chapter endpoints ────────────────────────────────────────────────────────

@router.get("/chapter/{chapter_id}/pages")
async def chapter_pages(chapter_id: str):
    """Return at-home server response for a chapter."""
    data = await _get(f"/at-home/server/{chapter_id}", {}, retries=2)
    # Validate expected fields so frontend doesn't get a confusing error
    if not data.get("baseUrl") or not data.get("chapter"):
        raise HTTPException(status_code=502, detail="Dữ liệu trang từ MangaDex không hợp lệ")
    return JSONResponse(content=data)


@router.get("/chapter/{chapter_id}")
async def chapter_detail(chapter_id: str):
    data = await _get(f"/chapter/{chapter_id}", {"includes[]": ["manga", "scanlation_group"]})
    return JSONResponse(content=data)


# ─── Image proxy ──────────────────────────────────────────────────────────────

@router.get("/cover-proxy")
async def cover_proxy(url: str = Query(...)):
    """Stream images to avoid CORS and MangaDex hotlink restrictions."""
    async def _stream():
        async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
            async with client.stream(
                "GET", url,
                headers={
                    "Referer": "https://mangadex.org/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
            ) as resp:
                async for chunk in resp.aiter_bytes(chunk_size=8192):
                    yield chunk

    return StreamingResponse(
        _stream(),
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )
