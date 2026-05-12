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
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from app.config import get_settings
from app.database import get_supabase
from app.models.schemas import ProcessingStatus, UploadResponse
from app.services.ai_pipeline import process_page
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


async def _pipeline_task(page_id: str, original_image_url: str):
    """
    Background task: calls HF Space AI worker with the Supabase Storage URL.
    HF Space downloads the image directly — no raw bytes transferred.
    """
    try:
        process_page(page_id, original_image_url)
    except Exception:
        logger.exception("Background pipeline error for page %s", page_id)


@router.post("", response_model=UploadResponse, status_code=202)
async def upload_manga_images(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
):
    """
    Upload one or more manga images (JPG / PNG / WebP, max 10 MB each).
    Returns page_ids for polling /status/{page_id}.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

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
        validated.append((upload, image_bytes, content_type))

    page_ids: list[str] = []
    batch_id = str(uuid.uuid4())
    supabase = get_supabase()

    for upload, image_bytes, _ct in validated:
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
        try:
            supabase.table("manga_pages").insert({
                "page_id": page_id,
                "batch_id": batch_id,
                "original_image_url": original_url,
                "thumbnail_url": thumbnail_url,
                "status": ProcessingStatus.PENDING.value,
                "progress": 0,
                "uploaded_at": now,
            }).execute()
        except Exception as exc:
            logger.error("DB insert failed for page %s: %s", page_id, exc)
            raise HTTPException(
                status_code=500,
                detail="Failed to register page in database. Please try again.",
            )

        page_ids.append(page_id)

        # ── Kick off background pipeline (calls HF Space) ─────────────────
        background_tasks.add_task(_pipeline_task, page_id, original_url)

    return UploadResponse(
        message=(
            f"Upload successful. Processing started for {len(page_ids)} page(s)."
        ),
        page_ids=page_ids,
        batch_id=batch_id,
    )
