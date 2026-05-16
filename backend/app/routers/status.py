"""
StoryLens Backend - Status Router
GET /status/batch/{batch_id} — aggregated status for a batch  ← MUST be first!
GET /status/{page_id}        — returns processing status of a single page

IMPORTANT: /batch/{batch_id} MUST be registered BEFORE /{page_id} to avoid
FastAPI treating "batch" as a page_id path parameter.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.database import get_supabase
from app.models.schemas import BatchStatusResponse, PageStatusResponse, ProcessingStatus
from app.routers.auth import AuthUser, get_current_user
from app.storage.supabase_storage import signed_original_image_url, signed_thumbnail_image_url

router = APIRouter(prefix="/status", tags=["status"])
logger = logging.getLogger(__name__)


@router.get("/batch/{batch_id}", response_model=BatchStatusResponse)
def get_batch_status(batch_id: str, user: AuthUser = Depends(get_current_user)):
    """Return aggregated processing status for all pages in a batch (owner only)."""
    supabase = get_supabase()
    result = (
        supabase.table("manga_pages")
        .select("page_id, status, progress, error, original_image_url, thumbnail_url")
        .eq("batch_id", batch_id)
        .eq("user_id", user.id)
        .order("uploaded_at", desc=False)  # Order by upload sequence to keep logical order!
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
                original_image_url=signed_original_image_url(r.get("original_image_url")),
                thumbnail_url=signed_thumbnail_image_url(r.get("thumbnail_url")),
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
def get_page_status(page_id: str, user: AuthUser = Depends(get_current_user)):
    """Return the current processing status for a single manga page (owner only)."""
    supabase = get_supabase()
    result = (
        supabase.table("manga_pages")
        .select("page_id, status, progress, error, original_image_url, thumbnail_url, user_id")
        .eq("page_id", page_id)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Page not found.")

    row = result.data

    if row.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Truy cập bị từ chối.")
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
        original_image_url=signed_original_image_url(row.get("original_image_url")),
        thumbnail_url=signed_thumbnail_image_url(row.get("thumbnail_url")),
    )


@router.post("/{page_id}/cancel", status_code=202)
def cancel_page(page_id: str, user: AuthUser = Depends(get_current_user)):
    """Request cooperative cancellation of an in-progress translation pipeline.

    Returns 202 on accepted, 404 if page not found / not owned, 409 if the page
    is already in a terminal state.
    """
    supabase = get_supabase()
    result = (
        supabase.table("manga_pages")
        .select("page_id,status,user_id")
        .eq("page_id", page_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Trang không tồn tại.")
    if result.data.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Truy cập bị từ chối.")
    current = result.data.get("status")
    if current in ("completed", "failed", "ocr_failed", "error", "cancelled"):
        raise HTTPException(status_code=409, detail=f"Trang đã ở trạng thái {current}.")

    from app.services.pipeline_control import request_cancel
    known = request_cancel(page_id)
    if not known:
        # Pipeline finished/never registered. Try to mark cancelled anyway if still pending.
        try:
            supabase.table("manga_pages").update({
                "status": "cancelled",
                "error": "Đã huỷ trước khi pipeline khởi động.",
                "progress": 0,
            }).eq("page_id", page_id).eq("status", "pending").execute()
        except Exception:
            pass
    return {"message": "Đã gửi yêu cầu huỷ. Pipeline sẽ dừng tại checkpoint kế tiếp."}


@router.post("/batch/{batch_id}/cancel", status_code=202)
def cancel_batch(batch_id: str, user: AuthUser = Depends(get_current_user)):
    """Cancel all in-progress pages in a batch."""
    supabase = get_supabase()
    result = (
        supabase.table("manga_pages")
        .select("page_id,status,user_id")
        .eq("batch_id", batch_id)
        .eq("user_id", user.id)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Batch không tồn tại.")

    from app.services.pipeline_control import request_cancel
    cancelled = 0
    for r in rows:
        if r.get("status") in ("completed", "failed", "ocr_failed", "error", "cancelled"):
            continue
        if request_cancel(r["page_id"]):
            cancelled += 1
        else:
            try:
                supabase.table("manga_pages").update({
                    "status": "cancelled",
                    "error": "Đã huỷ trước khi pipeline khởi động.",
                    "progress": 0,
                }).eq("page_id", r["page_id"]).eq("status", "pending").execute()
                cancelled += 1
            except Exception:
                pass
    return {"message": f"Đã yêu cầu huỷ {cancelled} trang.", "cancelled": cancelled}
