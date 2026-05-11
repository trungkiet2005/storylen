"""
StoryLens Backend - Status Router
GET /status/{page_id}       — returns processing status of a single page
GET /status/batch/{batch_id} — aggregated status for a batch
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.database import get_supabase
from app.models.schemas import BatchStatusResponse, PageStatusResponse, ProcessingStatus

router = APIRouter(prefix="/status", tags=["status"])


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
    return PageStatusResponse(
        page_id=row["page_id"],
        status=ProcessingStatus(row["status"]),
        progress=row.get("progress", 0),
        error=row.get("error"),
    )


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

    pages = [
        PageStatusResponse(
            page_id=r["page_id"],
            status=ProcessingStatus(r["status"]),
            progress=r.get("progress", 0),
            error=r.get("error"),
        )
        for r in result.data
    ]

    completed = sum(1 for p in pages if p.status == ProcessingStatus.COMPLETED)
    failed = sum(1 for p in pages if p.status in (ProcessingStatus.FAILED, ProcessingStatus.OCR_FAILED))

    return BatchStatusResponse(
        batch_id=batch_id,
        total=len(pages),
        completed=completed,
        failed=failed,
        pages=pages,
    )
