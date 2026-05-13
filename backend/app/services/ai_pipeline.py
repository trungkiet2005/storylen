"""
StoryLens Backend — AI Pipeline (Render Gateway Version)
This module runs on Render and contains NO heavy ML models.
All AI work is delegated to the HuggingFace Space via HTTP.

Flow:
  1. Update page status → "ocr_running"
  2. Call HF Space /process (image_url) → bubbles with embeddings
  3. Persist bubble_data + translation_history to Supabase
  4. Persist embeddings to Supabase pgvector table
  5. Update page status → "completed"

Fixes:
- Proper exception chaining / re-raise
- Handle HF Space being unavailable gracefully
- Separate DB inserts with individual error handling
- Handle bbox as float list from HF Space (convert to int)
- Handle missing/malformed bubble fields safely
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.config import get_settings
from app.database import get_supabase
from app.models.schemas import BubbleResult, ProcessingStatus
from app.services.ai_module_client import call_translate
from app.storage.supabase_storage import upload_translated_image

logger = logging.getLogger(__name__)
settings = get_settings()


# ─── Status helper ────────────────────────────────────────────────────────────

def _update_status(
    page_id: str,
    status: ProcessingStatus,
    progress: int,
    error: str | None = None,
) -> None:
    supabase = get_supabase()
    payload: dict[str, Any] = {
        "status": status.value,
        "progress": max(0, min(100, progress)),
    }
    if error is not None:
        payload["error"] = error[:2000]  # truncate to avoid DB column overflow
    if status == ProcessingStatus.COMPLETED:
        payload["processed_at"] = datetime.now(timezone.utc).isoformat()
    try:
        supabase.table("manga_pages").update(payload).eq("page_id", page_id).execute()
    except Exception as exc:
        logger.error("Failed to update status for page %s: %s", page_id, exc)


def _safe_bbox(bbox: Any) -> list[int]:
    """Normalise bbox from HF Space: accepts list of int/float, returns list[int] len=4."""
    if not isinstance(bbox, (list, tuple)) or len(bbox) < 4:
        return [0, 0, 0, 0]
    try:
        return [int(float(v)) for v in bbox[:4]]
    except (TypeError, ValueError):
        return [0, 0, 0, 0]


def _safe_confidence(conf: Any) -> float:
    """Clamp confidence to [0.0, 1.0]."""
    try:
        v = float(conf)
        return max(0.0, min(1.0, v))
    except (TypeError, ValueError):
        return 0.0


# ─── Master pipeline ──────────────────────────────────────────────────────────

def process_page(page_id: str, original_image_url: str) -> list[BubbleResult]:
    """
    Orchestrates the full processing pipeline for one manga page.
    Called in a background task by the upload router.

    Args:
        page_id: UUID string of the page record in Supabase.
        original_image_url: Public Supabase Storage URL of the uploaded image.

    Returns:
        List of BubbleResult for the processed page.
    """
    supabase = get_supabase()

    try:
        # ── Step 1: Notify frontend processing has started ─────────────────
        _update_status(page_id, ProcessingStatus.OCR_RUNNING, 10)

        # ── Step 2: Call HF Space — does all heavy lifting ─────────────────
        logger.info("Delegating page %s to ai_module", page_id)
        ai_result = call_translate(page_id, original_image_url)
        raw_bubbles = ai_result.get("bubbles", [])
        rendered_image_bytes = ai_result.get("rendered_image_bytes")
        translated_image_url = (
            upload_translated_image(rendered_image_bytes, page_id)
            if isinstance(rendered_image_bytes, bytes) and rendered_image_bytes
            else None
        ) or ai_result.get("rendered_image_url")
        logger.info(
            "ai_module returned %d text regions for page %s",
            len(raw_bubbles),
            page_id,
        )

        _update_status(page_id, ProcessingStatus.TRANSLATING, 60)

        # ── Step 3: Persist bubble_data ────────────────────────────────────
        db_bubble_rows: list[dict] = []
        db_translation_rows: list[dict] = []
        db_embedding_rows: list[dict] = []

        for b in raw_bubbles:
            bubble_id = b.get("bubble_id") or str(uuid.uuid4())
            bbox = _safe_bbox(b.get("bbox"))
            original_text = str(b.get("original_text") or "")
            translated_text = str(b.get("translated_text") or "")
            confidence = _safe_confidence(b.get("confidence"))

            db_bubble_rows.append({
                "bubble_id": bubble_id,
                "page_id": page_id,
                "x": bbox[0],
                "y": bbox[1],
                "width": bbox[2],
                "height": bbox[3],
                "original_text_jp": original_text,
                "ocr_confidence": confidence,
            })

            if translated_text:
                db_translation_rows.append({
                    "translation_id": str(uuid.uuid4()),
                    "bubble_id": bubble_id,
                    "translated_text_vi": translated_text,
                    "translated_at": datetime.now(timezone.utc).isoformat(),
                    "llm_model_used": f"ai_module:{settings.AI_MODULE_TRANSLATOR}",
                })

            embedding = b.get("embedding")
            if (
                embedding
                and isinstance(embedding, list)
                and len(embedding) > 0
                and translated_text
            ):
                db_embedding_rows.append({
                    "id": str(uuid.uuid4()),
                    "page_id": page_id,
                    "bubble_id": bubble_id,
                    "content": translated_text,
                    "embedding": embedding,
                })

        if db_bubble_rows:
            try:
                supabase.table("bubble_data").upsert(
                    db_bubble_rows, on_conflict="bubble_id"
                ).execute()
            except Exception as exc:
                logger.error("Failed to insert bubble_data for page %s: %s", page_id, exc)

        if db_translation_rows:
            try:
                supabase.table("translation_history").insert(db_translation_rows).execute()
            except Exception as exc:
                logger.error(
                    "Failed to insert translation_history for page %s: %s", page_id, exc
                )

        if db_embedding_rows:
            try:
                supabase.table("embeddings").upsert(
                    db_embedding_rows, on_conflict="id"
                ).execute()
            except Exception as exc:
                logger.error(
                    "Failed to insert embeddings for page %s: %s", page_id, exc
                )

        # ── Step 4: Mark as completed ──────────────────────────────────────
        if translated_image_url:
            try:
                supabase.table("manga_pages").update({
                    "translated_image_url": translated_image_url,
                }).eq("page_id", page_id).execute()
            except Exception as exc:
                logger.warning(
                    "Failed to store translated_image_url for page %s: %s",
                    page_id,
                    exc,
                )

        _update_status(page_id, ProcessingStatus.COMPLETED, 100)

        return [
            BubbleResult(
                bubble_id=b.get("bubble_id") or str(uuid.uuid4()),
                bbox=_safe_bbox(b.get("bbox")),
                original_text=str(b.get("original_text") or ""),
                translated_text=str(b.get("translated_text") or ""),
                confidence=_safe_confidence(b.get("confidence")),
            )
            for b in raw_bubbles
        ]

    except Exception as exc:
        logger.exception("Pipeline failed for page %s", page_id)
        _update_status(page_id, ProcessingStatus.FAILED, 0, error=str(exc))
        raise
