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
        result = supabase.table("manga_pages").update(payload).eq("page_id", page_id).execute()
    except Exception as exc:
        logger.error("Failed to update status for page %s: %s", page_id, exc)
        return

    # Event bus push for live WS clients (best-effort; replay survives ~5min).
    try:
        from app.services.pipeline_control import publish as _pub
        batch_id = (result.data or [{}])[0].get("batch_id") if result.data else None
        if not batch_id:
            row = supabase.table("manga_pages").select("batch_id").eq("page_id", page_id).limit(1).execute()
            batch_id = (row.data or [{}])[0].get("batch_id") if row.data else None
        if batch_id:
            _pub(batch_id, {
                "type": "page",
                "page_id": page_id,
                "status": status.value,
                "progress": payload["progress"],
                "error": error,
            })
    except Exception as exc:
        logger.debug("event publish skipped: %s", exc)


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

def process_page(
    page_id: str,
    original_image_url: str,
    ai_config: dict[str, Any] | None = None,
) -> list[BubbleResult]:
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

    # Guard: the user may have deleted the page (or their account) while this
    # thread was waiting in the semaphore queue. Skip silently to avoid writing
    # orphaned bubble_data / translation_history rows.
    try:
        check = supabase.table("manga_pages").select("page_id").eq("page_id", page_id).execute()
        if not check.data:
            logger.info("Page %s no longer exists — skipping pipeline", page_id)
            return []
    except Exception as exc:
        logger.warning("Could not verify existence of page %s: %s", page_id, exc)

    translator_name = (
        ai_config.get("translator")
        if isinstance(ai_config, dict) and isinstance(ai_config.get("translator"), str)
        else settings.AI_MODULE_TRANSLATOR
    )

    try:
        # ── Step 1: Notify frontend processing has started ─────────────────
        from app.services.pipeline_control import (
            CancelledError,
            clear as _clear_cancel,
            raise_if_cancelled,
            register as _register_cancel,
        )
        _register_cancel(page_id)
        raise_if_cancelled(page_id)
        _update_status(page_id, ProcessingStatus.OCR_RUNNING, 10)

        # ── Step 2: Call HF Space — does all heavy lifting ─────────────────
        logger.info("Delegating page %s to ai_module", page_id)
        raise_if_cancelled(page_id)
        ai_result = call_translate(page_id, original_image_url, ai_config)
        raise_if_cancelled(page_id)
        raw_bubbles = ai_result.get("bubbles", [])
        rendered_image_bytes = ai_result.get("rendered_image_bytes")
        if not isinstance(rendered_image_bytes, bytes) or not rendered_image_bytes:
            raise RuntimeError("ai_module did not return a translated image.")
        translated_image_url = upload_translated_image(rendered_image_bytes, page_id)
        if not translated_image_url:
            raise RuntimeError("Failed to store translated image.")
        logger.info(
            "ai_module returned rendered image for page %s (%d bytes)",
            page_id,
            len(rendered_image_bytes),
        )

        _update_status(page_id, ProcessingStatus.TRANSLATING, 60)

        # ── Step 3: Persist bubble_data ────────────────────────────────────
        db_bubble_rows: list[dict] = []
        db_translation_rows: list[dict] = []
        db_embedding_rows: list[dict] = []
        embed_targets: list[tuple[str, str]] = []  # (bubble_id, translated_text)

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
                    "llm_model_used": f"ai_module:{translator_name}",
                })

            if translated_text.strip():
                embed_targets.append((bubble_id, translated_text))

        # ── Embed translated bubbles for RAG (best-effort, one batch per page) ──
        # The ai_module does not return embeddings; we generate them here via the
        # Gemini embedding API so the pgvector Q&A actually has data to search.
        if embed_targets:
            try:
                from app.services.embedding import embed_documents

                vectors = embed_documents([text for _, text in embed_targets])
                if len(vectors) == len(embed_targets):
                    for (b_id, text), vec in zip(embed_targets, vectors):
                        db_embedding_rows.append({
                            # id has a DB default; omit so re-translation UPDATES
                            # the existing row (unique on bubble_id) instead of
                            # inserting a duplicate vector.
                            "page_id": page_id,
                            "bubble_id": b_id,
                            "content": text,
                            "embedding": vec,
                        })
                else:
                    logger.warning(
                        "Embedding count mismatch for page %s (%d vectors vs %d texts); "
                        "skipping embeddings for this page.",
                        page_id, len(vectors), len(embed_targets),
                    )
            except Exception as exc:
                # Never fail the translation just because embedding was unavailable.
                logger.warning("Embedding generation skipped for page %s: %s", page_id, exc)

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
                    db_embedding_rows, on_conflict="bubble_id"
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
                error_text = str(exc)
                if "translated_image_url" in error_text and (
                    "schema cache" in error_text or "does not exist" in error_text
                ):
                    logger.info(
                        "translated_image_url column is missing; page API will use the deterministic storage URL for page %s",
                        page_id,
                    )
                else:
                    logger.warning(
                        "Failed to store translated_image_url for page %s: %s",
                        page_id,
                        exc,
                    )

        _update_status(page_id, ProcessingStatus.COMPLETED, 100)

        # Best-effort notification + achievement check (failures must not break pipeline).
        try:
            owner = supabase.table("manga_pages").select("user_id").eq("page_id", page_id).limit(1).execute()
            user_id = (owner.data or [{}])[0].get("user_id")
            if user_id:
                from app.routers.notifications import emit_notification
                emit_notification(
                    user_id,
                    type="translation",
                    title="Dịch xong rồi!",
                    body="Một trang truyện vừa được dịch thành công.",
                    url=f"/reader/{page_id}",
                )
                try:
                    from app.services.achievements import check_and_unlock
                    check_and_unlock(user_id)
                except Exception as ex:
                    logger.info("Achievement check skipped: %s", ex)
        except Exception as ex:
            logger.info("Post-pipeline notify skipped: %s", ex)

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

    except CancelledError:
        logger.info("Pipeline cancelled for page %s", page_id)
        _update_status(
            page_id,
            ProcessingStatus.CANCELLED,
            0,
            error="Đã huỷ theo yêu cầu của bạn.",
        )
        _clear_cancel(page_id)
        return []
    except Exception as exc:
        logger.exception("Pipeline failed for page %s", page_id)
        _update_status(page_id, ProcessingStatus.FAILED, 0, error=str(exc))
        try:
            owner = supabase.table("manga_pages").select("user_id").eq("page_id", page_id).limit(1).execute()
            user_id = (owner.data or [{}])[0].get("user_id")
            if user_id:
                from app.routers.notifications import emit_notification
                emit_notification(
                    user_id,
                    type="translation_failed",
                    title="Dịch thất bại",
                    body=str(exc)[:160],
                )
        except Exception:
            pass
        _clear_cancel(page_id)
        raise
    finally:
        _clear_cancel(page_id)
