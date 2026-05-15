"""MangaDex proxy — forwards requests server-side to avoid browser CORS and hotlink blocking."""
from __future__ import annotations

import asyncio
import logging

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mdx", tags=["mangadex"])

_MDX_BASE = "https://api.mangadex.org"
_TIMEOUT = httpx.Timeout(15.0)
_UA = "StoryLens/1.0 (+https://storylens.app)"
_RETRY_STATUSES = {429, 502, 503, 504}
_RETRY_DELAYS = (0.6, 1.5)  # seconds; two retries → max ~17s end-to-end


async def _get(path: str, params: dict) -> dict:
    """GET from MangaDex with light retry on transient failures.

    Surfaces the upstream status code and error body so the frontend can show
    something more useful than 'MangaDex API error'.
    """
    headers = {"User-Agent": _UA, "Accept": "application/json"}
    last_status = 502
    last_detail = "Unknown MangaDex error"

    async with httpx.AsyncClient(timeout=_TIMEOUT, headers=headers) as client:
        for attempt in range(len(_RETRY_DELAYS) + 1):
            try:
                resp = await client.get(f"{_MDX_BASE}{path}", params=params)
            except httpx.HTTPError as exc:
                last_status, last_detail = 504, f"Upstream timeout: {exc}"
            else:
                if resp.status_code == 200:
                    return resp.json()
                last_status = resp.status_code
                last_detail = _summarise_upstream_error(resp)
                if resp.status_code not in _RETRY_STATUSES:
                    break

            if attempt < len(_RETRY_DELAYS):
                await asyncio.sleep(_RETRY_DELAYS[attempt])

    logger.warning("MangaDex %s failed: %s — %s", path, last_status, last_detail)
    raise HTTPException(
        status_code=last_status if 400 <= last_status < 600 else 502,
        detail=f"MangaDex {last_status}: {last_detail}",
    )


def _summarise_upstream_error(resp: httpx.Response) -> str:
    """Try hard to extract a meaningful message from the upstream error body."""
    try:
        body = resp.json()
    except ValueError:
        return (resp.text or "").strip()[:200] or resp.reason_phrase
    errors = body.get("errors") if isinstance(body, dict) else None
    if isinstance(errors, list) and errors:
        first = errors[0] or {}
        detail = first.get("detail") or first.get("title") or ""
        if detail:
            return str(detail)
    return resp.reason_phrase or "request failed"


@router.get("/manga/popular")
async def popular(
    limit: int = Query(default=24, le=100),
    langs: list[str] = Query(default=None, alias="lang"),
):
    """Popular manga. Pass `?lang=vi&lang=en` to restrict; omit for all languages."""
    params: dict = {
        "limit": limit,
        "includes[]": ["cover_art"],
        "contentRating[]": ["safe"],
        "order[followedCount]": "desc",
    }
    if langs:
        params["availableTranslatedLanguage[]"] = langs
    data = await _get("/manga", params)
    return JSONResponse(content=data)


@router.get("/manga")
async def search(
    limit: int = Query(default=24, le=100),
    offset: int = Query(default=0),
    title: str = Query(default=""),
    includedTags: list[str] = Query(default=[]),
    langs: list[str] = Query(default=None, alias="lang"),
):
    """Search manga. Pass `?lang=...` to filter by available translation; omit for any."""
    params: dict = {
        "limit": limit,
        "offset": offset,
        "includes[]": ["cover_art"],
        "contentRating[]": ["safe"],
    }
    if langs:
        params["availableTranslatedLanguage[]"] = langs
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
    # MangaDex /chapter caps `limit` at 100 — anything above returns 400.
    limit: int = Query(default=100, le=100),
    offset: int = Query(default=0),
    langs: list[str] = Query(default=None, alias="lang"),
):
    """List chapters. Pass `?lang=...` to filter; omit for every translated language."""
    params: dict = {
        "manga": manga_id,
        "limit": limit,
        "offset": offset,
        "order[chapter]": "asc",
        "includes[]": ["scanlation_group"],
        "contentRating[]": ["safe"],
    }
    if langs:
        params["translatedLanguage[]"] = langs
    data = await _get("/chapter", params)
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


_ALLOWED_PROXY_HOSTS = (
    "https://uploads.mangadex.org/",
    "https://cdn.mangadex.network/",
)


@router.get("/cover-proxy")
async def cover_proxy(url: str = Query(...)):
    """Stream MangaDex CDN images through the backend.

    MangaDex's CDN enforces a referer/hotlink check that blocks direct browser
    `<img>` requests, so we relay the bytes ourselves with the right headers.
    Used for both cover thumbnails and chapter page images.
    """
    if not (url.startswith(_ALLOWED_PROXY_HOSTS) or ".mangadex.network/" in url):
        # Be conservative — only proxy MangaDex-owned URLs to avoid SSRF.
        raise HTTPException(status_code=400, detail="Only MangaDex URLs are allowed.")

    headers = {"Referer": "https://mangadex.org/", "User-Agent": _UA}
    client = httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True)
    req = client.build_request("GET", url, headers=headers)
    resp = await client.send(req, stream=True)

    if resp.status_code != 200:
        body = await resp.aread()
        await resp.aclose()
        await client.aclose()
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"MangaDex CDN {resp.status_code}: {(body[:120].decode(errors='ignore') or 'request failed').strip()}",
        )

    media_type = resp.headers.get("content-type", "image/jpeg")

    async def _stream():
        try:
            async for chunk in resp.aiter_bytes(chunk_size=16384):
                yield chunk
        finally:
            await resp.aclose()
            await client.aclose()

    return StreamingResponse(
        _stream(),
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )
