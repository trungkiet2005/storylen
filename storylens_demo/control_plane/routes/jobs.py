"""Jobs routes — status, result, cancel."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select, update

from control_plane.storage.db import get_session_factory
from control_plane.storage.models import Job, Page, TextBox

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


@router.get("/{job_id}")
async def get_job(job_id: str):
    async with get_session_factory()() as session:
        job = await session.get(Job, job_id)
        if not job:
            raise HTTPException(404, "Job not found")
        return _job_dict(job)


@router.get("/{job_id}/result")
async def get_job_result(job_id: str):
    async with get_session_factory()() as session:
        job = await session.get(Job, job_id)
        if not job:
            raise HTTPException(404, "Job not found")

        if job.status not in ("done", "rendered"):
            return {"status": job.status, "boxes": []}

        boxes = []
        page_data = None
        if job.page_id:
            page = await session.get(Page, job.page_id)
            if page:
                page_data = {
                    "page_id": page.id,
                    "page_index": page.page_index,
                    "input_url": page.input_artifact_path,
                    "output_url": page.output_artifact_path,
                    "status": page.status,
                }
            result = await session.execute(
                select(TextBox).where(TextBox.page_id == job.page_id)
                .order_by(TextBox.box_index)
            )
            boxes = [_box_dict(b) for b in result.scalars()]

        return {
            "job": _job_dict(job),
            "page": page_data,
            "boxes": boxes,
        }


@router.post("/{job_id}/cancel", status_code=202)
async def cancel_job(job_id: str):
    async with get_session_factory()() as session:
        job = await session.get(Job, job_id)
        if not job:
            raise HTTPException(404, "Job not found")
        if job.status in ("done", "failed", "cancelled"):
            return {"status": job.status, "message": "Already finished"}
        await session.execute(
            update(Job).where(Job.id == job_id).values(cancel_requested=True)
        )
        await session.commit()
    return {"status": "cancelling", "job_id": job_id}


@router.get("")
async def list_jobs(limit: int = 20):
    async with get_session_factory()() as session:
        result = await session.execute(
            select(Job).order_by(Job.created_at.desc()).limit(limit)
        )
        return [_job_dict(j) for j in result.scalars()]


def _job_dict(j: Job) -> dict:
    return {
        "id": j.id, "manga_id": j.manga_id, "chapter_id": j.chapter_id,
        "page_id": j.page_id, "status": j.status, "progress": j.progress,
        "error": j.error, "metrics": j.metrics,
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "cancel_requested": j.cancel_requested,
    }


def _box_dict(b: TextBox) -> dict:
    return {
        "id": b.id, "page_id": b.page_id, "box_index": b.box_index,
        "xyxy": b.xyxy, "raw_text": b.raw_text,
        "translated_text": b.translated_text, "speaker": b.speaker,
        "tone": b.tone, "ocr_confidence": b.ocr_confidence,
        "translation_confidence": b.translation_confidence,
        "review_status": b.review_status,
    }
