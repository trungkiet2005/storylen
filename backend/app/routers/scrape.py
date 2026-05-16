"""
StoryLens Backend — Scrape Router
POST /scrape/preview — fetch chapter URL, return image list (no download)
POST /scrape         — download all images and start translation pipeline
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from app.config import get_settings
from app.database import get_supabase
from app.models.schemas import ProcessingStatus, UploadResponse
from app.rate_limit import limiter
from app.routers.auth import AuthUser, get_current_user
from app.routers.upload import (
    _parse_ai_config,
    _resolve_target_chapter,
    _start_pipeline_task,
)
from app.services import idempotency
from app.services.credit_service import check_has_credits, deduct
from app.services.image_validation import verify_image_bytes
from app.services.scraper import (
    download_image,
    fetch_chapter_image_urls,
    validate_scrape_url,
)
from app.storage.supabase_storage import upload_original, upload_thumbnail

router = APIRouter(prefix="/scrape", tags=["scrape"])
logger = logging.getLogger(__name__)
settings = get_settings()

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
_MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    chapter_url: str
    series_id: str | None = None
    chapter_id: str | None = None
    new_chapter_title: str | None = None
    ai_config: str | None = None


class ScrapePreviewResponse(BaseModel):
    chapter_title: str
    page_count: int
    # All image URLs — frontend uses the first ~8 for the thumbnail strip and
    # the full list for the in-page reader (scroll / page preview before translation).
    preview_urls: list[str]


# ─── Preview (no download, no credits) ───────────────────────────────────────

@router.post("/preview", response_model=ScrapePreviewResponse)
@limiter.limit("20/minute")
async def preview_chapter(
    request: Request,
    payload: ScrapeRequest,
    user: AuthUser = Depends(get_current_user),
) -> ScrapePreviewResponse:
    """
    Validate chapter URL and return page count + preview thumbnails.
    Does NOT download images or consume credits.
    """
    try:
        validate_scrape_url(payload.chapter_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        chapter_title, image_urls = await fetch_chapter_image_urls(payload.chapter_url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error("Scrape preview error for %s: %s", payload.chapter_url, exc)
        raise HTTPException(status_code=502, detail="Không thể tải thông tin chapter.")

    return ScrapePreviewResponse(
        chapter_title=chapter_title,
        page_count=len(image_urls),
        preview_urls=image_urls,
    )


# ─── Full scrape + translate ──────────────────────────────────────────────────

@router.post("", response_model=UploadResponse, status_code=202)
@limiter.limit("5/minute")
async def scrape_chapter(
    request: Request,
    payload: ScrapeRequest,
    user: AuthUser = Depends(get_current_user),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> UploadResponse:
    """
    Download all images from a manga chapter URL and start the translation pipeline.
    Behaves identically to /upload: deducts 1 credit per image, returns batch_id.

    Pass an `Idempotency-Key` header to make this safely retryable: a duplicate
    request with the same key within 10 minutes returns the original response
    instead of re-charging credits + re-running the pipeline.
    """
    # Idempotency replay — must happen BEFORE any side effects.
    idem_key = idempotency.normalise_key(user.id, idempotency_key, endpoint="scrape")
    cached = idempotency.get(idem_key)
    if cached is not None:
        logger.info("Idempotency hit for scrape: user=%s key=%s", user.id, idempotency_key)
        return cached

    try:
        validate_scrape_url(payload.chapter_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    ai_config_data = _parse_ai_config(payload.ai_config) if payload.ai_config else None
    supabase = get_supabase()

    # ── Fetch image URL list ──────────────────────────────────────────────────
    try:
        chapter_title, image_urls = await fetch_chapter_image_urls(payload.chapter_url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error("Scrape fetch error for %s: %s", payload.chapter_url, exc)
        raise HTTPException(status_code=502, detail="Không thể tải thông tin chapter.")

    if not image_urls:
        raise HTTPException(
            status_code=422,
            detail="Không tìm thấy ảnh nào trong chapter. Kiểm tra lại URL.",
        )

    # ── Credit check (fail-fast before downloading anything) ─────────────────
    check_has_credits(user.id, len(image_urls), supabase)

    # ── Resolve series / chapter ──────────────────────────────────────────────
    effective_title = (payload.new_chapter_title or "").strip() or chapter_title
    target_chapter_id = _resolve_target_chapter(
        supabase,
        user.id,
        payload.series_id,
        payload.chapter_id,
        effective_title,
    )

    starting_page_number: int = 1
    if target_chapter_id:
        try:
            existing = (
                supabase.table("manga_pages")
                .select("page_number")
                .eq("chapter_id", target_chapter_id)
                .order("page_number", desc=True)
                .limit(1)
                .execute()
                .data
                or []
            )
            starting_page_number = (existing[0].get("page_number") or 0) + 1 if existing else 1
        except Exception:
            starting_page_number = 1

    # ── Download, store, and queue each image ─────────────────────────────────
    from urllib.parse import urlparse
    parsed_chapter = urlparse(payload.chapter_url)
    referer = f"{parsed_chapter.scheme}://{parsed_chapter.netloc}/"

    batch_id = str(uuid.uuid4())
    page_ids: list[str] = []
    skipped = 0

    for index, img_url in enumerate(image_urls):
        # Download
        try:
            image_bytes, content_type = await download_image(img_url, referer=referer)
        except Exception as exc:
            logger.warning("Skip image %d (%s): %s", index + 1, img_url, exc)
            skipped += 1
            continue

        # Size guard
        if len(image_bytes) > _MAX_BYTES:
            logger.warning("Skip image %d: too large (%d bytes)", index + 1, len(image_bytes))
            skipped += 1
            continue

        # Validate image bytes
        try:
            verify_image_bytes(image_bytes)
        except ValueError:
            logger.warning("Skip image %d: invalid image bytes", index + 1)
            skipped += 1
            continue

        if content_type not in _ALLOWED_CONTENT_TYPES:
            content_type = "image/jpeg"

        page_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        filename = f"page-{str(index + 1).zfill(3)}.jpg"

        # Upload to Supabase Storage
        try:
            original_url = upload_original(image_bytes, filename, page_id)
        except Exception as exc:
            logger.error("Storage upload failed for image %d: %s", index + 1, exc)
            skipped += 1
            continue

        thumbnail_url = upload_thumbnail(image_bytes, page_id)

        # Insert page record
        page_record: dict = {
            "page_id": page_id,
            "batch_id": batch_id,
            "user_id": user.id,
            "original_image_url": original_url,
            "thumbnail_url": thumbnail_url,
            "status": ProcessingStatus.PENDING.value,
            "progress": 0,
            "uploaded_at": now,
        }
        if target_chapter_id:
            page_record["chapter_id"] = target_chapter_id
            page_record["page_number"] = starting_page_number + index

        try:
            supabase.table("manga_pages").insert(page_record).execute()
        except Exception as exc:
            logger.error("DB insert failed for scraped image %d: %s", index + 1, exc)
            skipped += 1
            continue

        page_ids.append(page_id)

        # Deduct credit
        try:
            deduct(user.id, 1, "upload", supabase, reference_id=page_id)
        except Exception as exc:
            logger.warning("Credit deduction failed for page %s: %s", page_id, exc)

        # Start translation pipeline
        _start_pipeline_task(page_id, original_url, ai_config_data)

    if not page_ids:
        raise HTTPException(
            status_code=422,
            detail=(
                "Không thể tải được ảnh nào từ chapter. "
                "Hãy kiểm tra URL hoặc thử lại sau."
            ),
        )

    # Bump series updated_at for sorting
    if target_chapter_id and payload.series_id:
        try:
            supabase.table("manga_series").update(
                {"updated_at": datetime.now(timezone.utc).isoformat()}
            ).eq("series_id", payload.series_id).execute()
        except Exception:
            pass

    total = len(image_urls)
    msg = f"Đã scrape {len(page_ids)}/{total} trang từ '{chapter_title}' và bắt đầu dịch."
    if skipped:
        msg += f" ({skipped} ảnh bị bỏ qua do lỗi tải hoặc quá kích thước)"

    response = UploadResponse(
        message=msg,
        page_ids=page_ids,
        batch_id=batch_id,
    )
    # Cache the success response so a client retry with the same Idempotency-Key
    # within the TTL gets back the same batch_id instead of paying twice.
    idempotency.put(idem_key, response)
    return response
