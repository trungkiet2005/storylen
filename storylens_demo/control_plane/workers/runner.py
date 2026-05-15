"""In-process asyncio job runner — processes jobs from an asyncio.Queue."""
from __future__ import annotations

import asyncio
import logging
import time
from pathlib import Path

from sqlalchemy import update

from control_plane.storage.db import get_session_factory
from control_plane.storage.models import Job, Page, TextBox
from control_plane.storage.artifact_store import artifact_url, save_bytes
from control_plane.workers.image_worker import (
    extract_page,
    ngrok_worker_configured,
    translate_image_via_ngrok,
)
from control_plane.workers.translation_worker import run_translation_pipeline
from control_plane.ws.event_bus import publish

log = logging.getLogger(__name__)

_job_queue: asyncio.Queue = asyncio.Queue()
_runner_task: asyncio.Task | None = None


def enqueue(job_id: str, payload: dict) -> None:
    _job_queue.put_nowait({"job_id": job_id, **payload})


async def start_runner() -> None:
    global _runner_task
    if _runner_task is None or _runner_task.done():
        _runner_task = asyncio.create_task(_run_loop())
        log.info("Job runner started")


async def _run_loop() -> None:
    while True:
        item = await _job_queue.get()
        try:
            await _process_job(item)
        except Exception as exc:
            log.error("Job runner unhandled error: %s", exc, exc_info=True)
        finally:
            _job_queue.task_done()


async def _process_job(item: dict) -> None:
    job_id = item["job_id"]
    manga_id = item["manga_id"]
    chapter_id = item["chapter_id"]
    page_id = item["page_id"]
    page_index = item.get("page_index", 0)
    image_bytes = item["image_bytes"]
    filename = item["filename"]
    style_card = item.get("style_card")

    t0 = time.monotonic()
    session_factory = get_session_factory()

    async def _set_status(status: str, progress: int, error: str | None = None, metrics: dict | None = None):
        async with session_factory() as session:
            await session.execute(
                update(Job).where(Job.id == job_id).values(
                    status=status, progress=progress,
                    error=error, metrics=metrics or {}
                )
            )
            await session.commit()

    try:
        await _set_status("running", 5)
        await publish(job_id, "job.started", "running", 5, {})

        # Save input artifact
        input_path = save_bytes(manga_id, chapter_id, page_id, f"input_{filename}", image_bytes)
        input_url = artifact_url(input_path)
        async with session_factory() as session:
            await session.execute(
                update(Page).where(Page.id == page_id).values(
                    input_artifact_path=input_url,
                    status="running",
                )
            )
            await session.commit()
        await publish(job_id, "image.loaded", "running", 10, {
            "filename": filename,
            "input_url": input_url,
        })

        if ngrok_worker_configured() or (item.get("api_keys", {}).get("kaggle_worker_url")):
            await publish(job_id, "ngrok.forward_started", "running", 20, {})
            custom_url = item.get("api_keys", {}).get("kaggle_worker_url")
            translated_image = await translate_image_via_ngrok(image_bytes, filename, custom_url=custom_url)

            output_name = f"translated_{Path(filename).stem or 'page'}.png"
            output_path = save_bytes(
                manga_id,
                chapter_id,
                page_id,
                output_name,
                translated_image.content,
            )
            output_url = artifact_url(output_path)

            async with session_factory() as session:
                await session.execute(
                    update(Page).where(Page.id == page_id).values(
                        output_artifact_path=output_url,
                        status="translated",
                    )
                )
                await session.commit()

            await publish(job_id, "grok.translation_done", "running", 70, {
                "mode": "ngrok",
                "items": [],
                "media_type": translated_image.media_type,
            })
            await publish(job_id, "render.done", "running", 90, {
                "output_url": output_url,
                "media_type": translated_image.media_type,
            })

            latency_ms = int((time.monotonic() - t0) * 1000)
            metrics = {
                "mode": "ngrok",
                "boxes_detected": 0,
                "boxes_translated": 0,
                "output_bytes": len(translated_image.content),
                "latency_ms": latency_ms,
            }
            await _set_status("done", 100, metrics=metrics)
            await publish(job_id, "job.done", "done", 100, {
                "result_url": f"/api/v1/jobs/{job_id}/result",
                "output_url": output_url,
                "metrics": metrics,
            })
            return

        # --- Image worker (OCR) ---
        await publish(job_id, "detect.started", "running", 15, {})
        page_analysis = await extract_page(image_bytes, filename, manga_id, chapter_id, page_id)
        boxes = page_analysis.get("boxes", [])
        await publish(job_id, "detect.boxes_found", "running", 25, {
            "boxes_count": len(boxes),
            "mock": page_analysis.get("mock", False),
        })
        await publish(job_id, "ocr.done", "running", 30, {
            "boxes": [{"box_id": b["box_id"], "raw_text": b.get("raw_text", "")} for b in boxes]
        })

        # --- Translation pipeline ---
        translated_boxes = await run_translation_pipeline(
            job_id=job_id,
            manga_id=manga_id,
            chapter_id=chapter_id,
            page_id=page_id,
            page_index=page_index,
            boxes=boxes,
            style_card=style_card,
        )

        # --- Persist to DB ---
        trans_map = {t["box_id"]: t for t in translated_boxes}
        async with session_factory() as session:
            for box in boxes:
                tb = TextBox(
                    page_id=page_id,
                    box_index=int(box["box_id"].replace("b", "") or "0"),
                    xyxy=str(box.get("xyxy", [])),
                    raw_text=box.get("raw_text", ""),
                    ocr_confidence=box.get("ocr_confidence"),
                    translated_text=trans_map.get(box["box_id"], {}).get("translated_text"),
                    speaker=trans_map.get(box["box_id"], {}).get("speaker"),
                    tone=trans_map.get(box["box_id"], {}).get("tone"),
                    translation_confidence=trans_map.get(box["box_id"], {}).get("confidence"),
                )
                session.add(tb)

            await session.execute(
                update(Page).where(Page.id == page_id).values(status="translated")
            )
            await session.commit()

        await publish(job_id, "render.done", "running", 90, {"output_url": ""})

        latency_ms = int((time.monotonic() - t0) * 1000)
        metrics = {
            "boxes_detected": len(boxes),
            "boxes_translated": len(translated_boxes),
            "latency_ms": latency_ms,
        }
        await _set_status("done", 100, metrics=metrics)
        await publish(job_id, "job.done", "done", 100, {
            "result_url": f"/api/v1/jobs/{job_id}/result",
            "metrics": metrics,
        })

    except Exception as exc:
        log.error("Job %s failed: %s", job_id, exc, exc_info=True)
        await _set_status("failed", 0, error=str(exc))
        await publish(job_id, "job.failed", "failed", 0, {"error": str(exc)})
