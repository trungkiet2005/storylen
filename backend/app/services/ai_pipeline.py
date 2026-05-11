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
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.config import get_settings
from app.database import get_supabase
from app.models.schemas import BubbleResult, ProcessingStatus
from app.services.hf_client import call_process

logger = logging.getLogger(__name__)
settings = get_settings()


# ─── Status helper ────────────────────────────────────────────────────────────

def _update_status(page_id: str, status: ProcessingStatus, progress: int, error: str | None = None):
    supabase = get_supabase()
    payload: dict[str, Any] = {
        "status": status.value,
        "progress": progress,
    }
    if error:
        payload["error"] = error
    if status == ProcessingStatus.COMPLETED:
        payload["processed_at"] = datetime.now(timezone.utc).isoformat()
    supabase.table("manga_pages").update(payload).eq("page_id", page_id).execute()


# ─── Master pipeline ──────────────────────────────────────────────────────────

def process_page(page_id: str, original_image_url: str) -> list[BubbleResult]:
    """
    Orchestrates the full processing pipeline for one manga page.
    Called in a background thread by the upload router.

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
        logger.info("Delegating page %s to HF Space…", page_id)
        raw_bubbles = call_process(page_id, original_image_url)
        logger.info("HF Space returned %d bubbles for page %s", len(raw_bubbles), page_id)

        _update_status(page_id, ProcessingStatus.TRANSLATING, 60)

        # ── Step 3: Persist bubble_data ────────────────────────────────────
        db_bubble_rows = []
        db_translation_rows = []
        db_embedding_rows = []

        for b in raw_bubbles:
            bubble_id = b.get("bubble_id") or str(uuid.uuid4())
            bbox = b.get("bbox", [0, 0, 0, 0])

            db_bubble_rows.append({
                "bubble_id": bubble_id,
                "page_id": page_id,
                "x": bbox[0],
                "y": bbox[1],
                "width": bbox[2],
                "height": bbox[3],
                "original_text_jp": b.get("original_text", ""),
                "ocr_confidence": b.get("confidence", 0.0),
            })

            if b.get("translated_text"):
                db_translation_rows.append({
                    "translation_id": str(uuid.uuid4()),
                    "bubble_id": bubble_id,
                    "translated_text_vi": b["translated_text"],
                    "translated_at": datetime.now(timezone.utc).isoformat(),
                    "llm_model_used": settings.GEMINI_MODEL,
                })

            embedding = b.get("embedding", [])
            if embedding and b.get("translated_text"):
                db_embedding_rows.append({
                    "id": str(uuid.uuid4()),
                    "page_id": page_id,
                    "bubble_id": bubble_id,
                    "content": b["translated_text"],
                    "embedding": embedding,
                })

        if db_bubble_rows:
            supabase.table("bubble_data").insert(db_bubble_rows).execute()
        if db_translation_rows:
            supabase.table("translation_history").insert(db_translation_rows).execute()
        if db_embedding_rows:
            supabase.table("embeddings").upsert(db_embedding_rows).execute()

        # ── Step 4: Mark as completed ──────────────────────────────────────
        _update_status(page_id, ProcessingStatus.COMPLETED, 100)

        return [
            BubbleResult(
                bubble_id=b.get("bubble_id", str(uuid.uuid4())),
                bbox=b.get("bbox", [0, 0, 0, 0]),
                original_text=b.get("original_text", ""),
                translated_text=b.get("translated_text", ""),
                confidence=b.get("confidence", 0.0),
            )
            for b in raw_bubbles
        ]

    except Exception as exc:
        logger.exception("Pipeline failed for page %s", page_id)
        _update_status(page_id, ProcessingStatus.FAILED, 0, error=str(exc))
        raise
