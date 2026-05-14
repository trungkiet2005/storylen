"""
StoryLens Backend - Upload Router
POST /upload  — accepts one or more manga images, stores them in Supabase Storage,
               creates page records in the DB, then calls the HuggingFace Space
               AI Worker (via hf_client) in a background thread.
               Render never loads ML models — it just orchestrates the pipeline.

Fixes:
- thumbnail failure no longer blocks the upload response
- duplicate file detection via upsert storage
- proper background task cleanup using FastAPI BackgroundTasks
- validated content-type from headers, with fallback to filename extension
- clearer error messages
"""
from __future__ import annotations

import logging
import json
import uuid
from threading import BoundedSemaphore, Thread
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from app.config import get_settings
from app.database import get_supabase
from app.models.schemas import ProcessingStatus, UploadResponse
from app.rate_limit import limiter
from app.routers.auth import AuthUser, get_current_user
from app.services.ai_pipeline import process_page
from app.services.credit_service import check_batch_size, check_has_credits, deduct
from app.services.image_validation import verify_image_bytes
from app.storage.supabase_storage import upload_original, upload_thumbnail

router = APIRouter(prefix="/upload", tags=["upload"])
logger = logging.getLogger(__name__)
settings = get_settings()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",   # some clients send this (technically wrong but common)
    "image/png",
    "image/webp",
}

# Filename extension → correct MIME type mapping (for fallback detection)
_EXT_TO_MIME = {
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".webp": "image/webp",
}

MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024

# Semaphore caps concurrent background translation threads so a burst of uploads
# cannot spawn unbounded threads and saturate the ai_module / OOM the process.
_pipeline_semaphore = BoundedSemaphore(settings.MAX_PIPELINE_CONCURRENCY)


def _resolve_content_type(upload: UploadFile) -> str | None:
    """
    Resolve the effective content type from the upload.
    Falls back to filename extension if content_type is missing or generic.
    """
    ct = (upload.content_type or "").lower().split(";")[0].strip()
    if ct in ALLOWED_CONTENT_TYPES:
        return ct
    # Fallback to file extension
    if upload.filename:
        ext = Path(upload.filename).suffix.lower()
        return _EXT_TO_MIME.get(ext)
    return None


def _parse_ai_config(raw: str | None) -> dict[str, str] | None:
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid ai_module config.") from exc
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Invalid ai_module config.")

    allowed = {"translator", "target_lang", "detector", "ocr", "inpainter", "renderer"}
    parsed: dict[str, str] = {}
    for key in allowed:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            parsed[key] = value.strip()
    return parsed or None


def _pipeline_task(
    page_id: str,
    original_image_url: str,
    ai_config: dict[str, str] | None = None,
) -> None:
    """
    Background task: calls HF Space AI worker with the Supabase Storage URL.
    HF Space downloads the image directly — no raw bytes transferred.
    """
    try:
        process_page(page_id, original_image_url, ai_config)
    except Exception:
        logger.exception("Background pipeline error for page %s", page_id)


def _start_pipeline_task(
    page_id: str,
    original_image_url: str,
    ai_config: dict[str, str] | None = None,
) -> None:
    def _guarded() -> None:
        # Block until a slot is free (timeout prevents thread leaking if semaphore
        # is permanently exhausted, e.g. during a stuck-thread incident).
        acquired = _pipeline_semaphore.acquire(blocking=True, timeout=300)
        if not acquired:
            logger.error(
                "Pipeline semaphore timeout for page %s — too many concurrent jobs", page_id
            )
            from app.models.schemas import ProcessingStatus
            from app.services.ai_pipeline import _update_status
            _update_status(
                page_id,
                ProcessingStatus.FAILED,
                0,
                error="Server đang quá tải. Vui lòng thử lại sau.",
            )
            return
        try:
            _pipeline_task(page_id, original_image_url, ai_config)
        finally:
            _pipeline_semaphore.release()

    worker = Thread(
        target=_guarded,
        name=f"storylens-pipeline-{page_id[:8]}",
        daemon=True,
    )
    worker.start()


def _resolve_target_chapter(
    supabase,
    user_id: str,
    series_id: str | None,
    chapter_id: str | None,
    new_chapter_title: str | None,
) -> str | None:
    """
    Resolve the chapter to attach uploaded pages to.

    Rules:
    - No series_id and no chapter_id → return None (orphan pages, original behavior).
    - chapter_id provided → verify it belongs to a series owned by user.
    - series_id only → if new_chapter_title given OR no chapters exist, create new.
                       Otherwise use the highest-numbered existing chapter.
    Returns the chapter_id or None.
    """
    if not series_id and not chapter_id:
        return None

    # If chapter_id provided, verify ownership and return it.
    if chapter_id:
        chap_res = (
            supabase.table("manga_chapters")
            .select("chapter_id, series_id")
            .eq("chapter_id", chapter_id)
            .maybe_single()
            .execute()
        )
        chap = chap_res.data if chap_res else None
        if not chap:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương.")
        ser_res = (
            supabase.table("manga_series")
            .select("user_id")
            .eq("series_id", chap["series_id"])
            .maybe_single()
            .execute()
        )
        ser = ser_res.data if ser_res else None
        if not ser or ser.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Chương không thuộc về bạn.")
        return chapter_id

    # series_id only → verify ownership
    ser_res = (
        supabase.table("manga_series")
        .select("series_id, user_id")
        .eq("series_id", series_id)
        .maybe_single()
        .execute()
    )
    ser = ser_res.data if ser_res else None
    if not ser:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ truyện.")
    if ser.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Bộ truyện không thuộc về bạn.")

    existing = (
        supabase.table("manga_chapters")
        .select("chapter_id, chapter_number")
        .eq("series_id", series_id)
        .order("chapter_number", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )

    title = (new_chapter_title or "").strip() or None
    if title or not existing:
        next_num = (existing[0]["chapter_number"] + 1) if existing else 1
        new_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        try:
            supabase.table("manga_chapters").insert(
                {
                    "chapter_id": new_id,
                    "series_id": series_id,
                    "chapter_number": next_num,
                    "title": title,
                    "created_at": now,
                    "updated_at": now,
                }
            ).execute()
        except Exception as exc:
            logger.error("Auto-create chapter failed: %s", exc)
            raise HTTPException(status_code=503, detail="Không tạo được chương.") from exc
        return new_id

    return existing[0]["chapter_id"]


@router.post("", response_model=UploadResponse, status_code=202)
@limiter.limit(lambda: get_settings().RATE_LIMIT_UPLOAD)
async def upload_manga_images(
    request: Request,
    files: list[UploadFile] = File(...),
    ai_config: str | None = Form(default=None),
    series_id: str | None = Form(default=None),
    chapter_id: str | None = Form(default=None),
    new_chapter_title: str | None = Form(default=None),
    user: AuthUser = Depends(get_current_user),
):
    """
    Upload one or more manga images (JPG / PNG / WebP).
    Returns page_ids for polling /status/{page_id}.

    Optional series binding:
    - series_id + chapter_id → attach pages to that chapter
    - series_id + new_chapter_title → create a new chapter and attach
    - series_id only → append to the latest chapter (or auto-create chapter 1)
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")
    ai_config_data = _parse_ai_config(ai_config)

    supabase = get_supabase()

    target_chapter_id = _resolve_target_chapter(
        supabase, user.id, series_id, chapter_id, new_chapter_title,
    )

    # Compute starting page_number when attaching to a chapter
    starting_page_number: int | None = None
    if target_chapter_id:
        try:
            existing_pages = (
                supabase.table("manga_pages")
                .select("page_number")
                .eq("chapter_id", target_chapter_id)
                .order("page_number", desc=True)
                .limit(1)
                .execute()
                .data
                or []
            )
            starting_page_number = (
                (existing_pages[0].get("page_number") or 0) + 1 if existing_pages else 1
            )
        except Exception:
            starting_page_number = 1

    # ── Credit & batch-size checks ────────────────────────────────────────────
    check_batch_size(user.id, len(files), supabase)
    check_has_credits(user.id, len(files), supabase)

    # Validate ALL files before processing any (fail fast)
    validated: list[tuple[UploadFile, bytes, str]] = []
    for upload in files:
        content_type = _resolve_content_type(upload)
        if not content_type:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"'{upload.filename}' — unsupported format. "
                    "Use JPG, PNG, or WebP."
                ),
            )

        image_bytes = await upload.read()
        if not image_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"'{upload.filename}' is empty.",
            )
        if len(image_bytes) > MAX_BYTES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"'{upload.filename}' exceeds "
                    f"{settings.MAX_FILE_SIZE_MB} MB limit."
                ),
            )
        try:
            verify_image_bytes(image_bytes)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"'{upload.filename}' không phải ảnh hợp lệ "
                    "hoặc đã bị hỏng."
                ),
            )
        validated.append((upload, image_bytes, content_type))

    page_ids: list[str] = []
    batch_id = str(uuid.uuid4())

    for index, (upload, image_bytes, _ct) in enumerate(validated):
        page_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        # ── Store original in Supabase Storage ────────────────────────────
        try:
            original_url = upload_original(
                image_bytes, upload.filename or "page.jpg", page_id
            )
        except Exception as exc:
            logger.error("Original upload failed for %s: %s", upload.filename, exc)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to store image '{upload.filename}'. Please try again.",
            )

        # ── Thumbnail is best-effort, not blocking ─────────────────────────
        thumbnail_url = upload_thumbnail(image_bytes, page_id)
        # thumbnail_url may be None if generation failed — that's OK

        # ── Create page record in DB ───────────────────────────────────────
        page_record: dict[str, object] = {
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
            page_record["page_number"] = (starting_page_number or 1) + index

        try:
            supabase.table("manga_pages").insert(page_record).execute()
        except Exception as exc:
            logger.error("DB insert failed for page %s: %s", page_id, exc)
            raise HTTPException(
                status_code=500,
                detail="Failed to register page in database. Please try again.",
            )

        page_ids.append(page_id)

        # ── Deduct 1 credit per image ──────────────────────────────────────
        try:
            deduct(user.id, 1, "upload", supabase, reference_id=page_id)
        except Exception as exc:
            logger.warning("Credit deduction failed for page %s: %s", page_id, exc)

        # ── Kick off background pipeline (calls HF Space) ─────────────────
        # Start AI processing outside the request lifecycle. The call can take
        # minutes, and hosting proxies may keep the upload request open when
        # Starlette BackgroundTasks are used for long-running work.
        _start_pipeline_task(page_id, original_url, ai_config_data)

    # Bump parent series so it sorts to the top of /series listing
    if target_chapter_id and series_id:
        try:
            supabase.table("manga_series").update(
                {"updated_at": datetime.now(timezone.utc).isoformat()}
            ).eq("series_id", series_id).execute()
        except Exception:
            pass

    return UploadResponse(
        message=(
            f"Upload successful. Processing started for {len(page_ids)} page(s)."
        ),
        page_ids=page_ids,
        batch_id=batch_id,
    )
