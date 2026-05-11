"""
StoryLens Backend - Upload Router
POST /upload  — accepts one or more manga images, stores them in Supabase Storage,
               creates page records in the DB, then calls the HuggingFace Space
               AI Worker (via hf_client) in a background thread.
               Render never loads ML models — it just orchestrates the pipeline.
"""
from __future__ import annotations

import logging
import threading
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from app.config import get_settings
from app.database import get_supabase
from app.models.schemas import ProcessingStatus, UploadResponse
from app.services.ai_pipeline import process_page
from app.storage.supabase_storage import upload_original, upload_thumbnail

router = APIRouter(prefix="/upload", tags=["upload"])
logger = logging.getLogger(__name__)
settings = get_settings()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


def _pipeline_task(page_id: str, original_image_url: str):
    """
    Background thread: calls HF Space AI worker with the Supabase Storage URL.
    HF Space downloads the image directly — no raw bytes transferred to Render.
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

    page_ids: list[str] = []
    batch_id = str(uuid.uuid4())
    supabase = get_supabase()

    for upload in files:
        # ── Validate content type ──────────────────────────────────────────
        if upload.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"'{upload.filename}' — unsupported format. Use JPG, PNG, or WebP.",
            )

        image_bytes = await upload.read()
        if len(image_bytes) > MAX_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"'{upload.filename}' exceeds {settings.MAX_FILE_SIZE_MB} MB limit.",
            )

        # ── Create page record in DB ───────────────────────────────────────
        page_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        # Store original + thumbnail in Supabase Storage
        try:
            original_url = upload_original(image_bytes, upload.filename or "page.jpg", page_id)
            thumbnail_url = upload_thumbnail(image_bytes, page_id)
        except Exception as exc:
            logger.error("Storage upload failed: %s", exc)
            raise HTTPException(status_code=500, detail="Failed to store image.")

        supabase.table("manga_pages").insert({
            "page_id": page_id,
            "batch_id": batch_id,
            "original_image_url": original_url,
            "thumbnail_url": thumbnail_url,
            "status": ProcessingStatus.PENDING.value,
            "progress": 0,
            "uploaded_at": now,
        }).execute()

        page_ids.append(page_id)

        # ── Kick off background pipeline (calls HF Space) ────────────────
        # Thread passes only the Supabase URL — HF Space fetches the image.
        t = threading.Thread(
            target=_pipeline_task,
            args=(page_id, original_url),
            daemon=True,
        )
        t.start()

    return UploadResponse(
        message=f"Upload successful. Processing started for {len(page_ids)} page(s).",
        page_ids=page_ids,
        batch_id=batch_id,
    )
