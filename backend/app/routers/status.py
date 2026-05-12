"""
StoryLens Backend - Status Router
GET /status/batch/{batch_id} — aggregated status for a batch  ← MUST be first!
GET /status/{page_id}        — returns processing status of a single page

IMPORTANT: /batch/{batch_id} MUST be registered BEFORE /{page_id} to avoid
FastAPI treating "batch" as a page_id path parameter.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.database import get_supabase
from app.models.schemas import BatchStatusResponse, PageStatusResponse, ProcessingStatus

router = APIRouter(prefix="/status", tags=["status"])
logger = logging.getLogger(__name__)


@router.get("/batch/{batch_id}", response_model=BatchStatusResponse)
def get_batch_status(batch_id: str):
    """Return aggregated processing status for all pages in a batch."""
    supabase = get_supabase()
    result = (
        supabase.table("manga_pages")
        .select("page_id, status, progress, error")
        .eq("batch_id", batch_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Batch not found.")

    pages = []
    for r in result.data:
        try:
            status = ProcessingStatus(r["status"])
        except ValueError:
            logger.warning("Unknown status value '%s' for page %s", r["status"], r["page_id"])
            status = ProcessingStatus.FAILED

        pages.append(
            PageStatusResponse(
                page_id=r["page_id"],
                status=status,
                progress=r.get("progress") or 0,
                error=r.get("error"),
            )
        )

    completed = sum(1 for p in pages if p.status == ProcessingStatus.COMPLETED)
    failed = sum(
        1 for p in pages
        if p.status in (ProcessingStatus.FAILED, ProcessingStatus.OCR_FAILED)
    )

    return BatchStatusResponse(
        batch_id=batch_id,
        total=len(pages),
        completed=completed,
        failed=failed,
        pages=pages,
    )


@router.get("/{page_id}", response_model=PageStatusResponse)
def get_page_status(page_id: str):
    """Return the current processing status for a single manga page."""
    supabase = get_supabase()
    result = (
        supabase.table("manga_pages")
        .select("page_id, status, progress, error")
        .eq("page_id", page_id)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Page not found.")

    row = result.data
    try:
        status = ProcessingStatus(row["status"])
    except ValueError:
        logger.warning("Unknown status value '%s' for page %s", row["status"], page_id)
        status = ProcessingStatus.FAILED

    return PageStatusResponse(
        page_id=row["page_id"],
        status=status,
        progress=row.get("progress") or 0,
        error=row.get("error"),
    )
