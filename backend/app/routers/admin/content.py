"""
Admin · Content management.

Lets admins inspect & delete content owned by any user:
    GET    /pages                paginated manga_pages across all users
    DELETE /pages/{page_id}      delete page + cascading cleanup
    POST   /pages/bulk-delete    delete many pages

    GET    /qa                   paginated qa_history across all users
    DELETE /qa/{qa_id}           delete one Q&A row
    POST   /qa/bulk-delete       delete many Q&A rows
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field

from app.config import get_settings
from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_admin

from .deps import audit, to_iso

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)


# ─── Schemas ──────────────────────────────────────────────────────────────────

class AdminPageItem(BaseModel):
    page_id: str
    user_id: str | None
    username: str | None
    thumbnail_url: str | None
    original_image_url: str | None
    status: str
    progress: int = 0
    page_number: int | None = None
    uploaded_at: str | None = None
    processed_at: str | None = None


class AdminPageListResponse(BaseModel):
    total: int
    items: list[AdminPageItem]


class AdminQAItem(BaseModel):
    qa_id: str
    user_id: str | None
    username: str | None
    page_id: str | None
    user_question: str
    ai_answer: str | None
    asked_at: str | None


class AdminQAListResponse(BaseModel):
    total: int
    items: list[AdminQAItem]


class BulkIdsRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1, max_length=200)


class BulkResultResponse(BaseModel):
    succeeded: list[str]
    failed: list[dict[str, str]]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _username_map(user_ids: list[str | None]) -> dict[str, str]:
    cleaned = [uid for uid in user_ids if uid]
    if not cleaned:
        return {}
    try:
        res = (
            get_supabase()
            .table("profiles")
            .select("user_id, username")
            .in_("user_id", cleaned)
            .execute()
        )
        return {row["user_id"]: row.get("username") or "" for row in (res.data or [])}
    except Exception as exc:
        logger.warning("username_map lookup failed: %s", exc)
        return {}


def _delete_page_storage(row: dict[str, Any]) -> None:
    """Best-effort removal of the Supabase storage objects for a page."""
    from app.storage.supabase_storage import _storage_path_from_public_url

    settings = get_settings()
    supabase = get_supabase()
    originals = settings.SUPABASE_BUCKET_ORIGINALS
    thumbs = settings.SUPABASE_BUCKET_THUMBNAILS
    page_id = row.get("page_id")

    original_path = _storage_path_from_public_url(originals, row.get("original_image_url"))
    thumbnail_path = _storage_path_from_public_url(thumbs, row.get("thumbnail_url"))

    paths_originals = [p for p in (original_path, f"{page_id}/translated.png") if p]
    if paths_originals:
        try:
            supabase.storage.from_(originals).remove(paths_originals)
        except Exception as exc:
            logger.warning("storage cleanup (originals) failed for %s: %s", page_id, exc)
    if thumbnail_path:
        try:
            supabase.storage.from_(thumbs).remove([thumbnail_path])
        except Exception as exc:
            logger.warning("storage cleanup (thumb) failed for %s: %s", page_id, exc)


# ─── Pages ────────────────────────────────────────────────────────────────────

@router.get("/pages", response_model=AdminPageListResponse)
def list_pages(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status", max_length=32),
    _admin: AuthUser = Depends(get_current_admin),
) -> AdminPageListResponse:
    supabase = get_supabase()

    def _q(base: Any) -> Any:
        if user_id:
            base = base.eq("user_id", user_id)
        if status_filter:
            base = base.eq("status", status_filter)
        return base

    try:
        count_res = _q(
            supabase.table("manga_pages").select("page_id", count="exact", head=True)
        ).execute()
        total = int(count_res.count or 0)
    except Exception as exc:
        logger.error("count manga_pages failed: %s", exc)
        total = 0

    try:
        data_res = (
            _q(
                supabase.table("manga_pages").select(
                    "page_id, user_id, thumbnail_url, original_image_url, status, "
                    "progress, page_number, uploaded_at, processed_at"
                )
            )
            .order("uploaded_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = data_res.data or []
    except Exception as exc:
        logger.error("list manga_pages failed: %s", exc)
        rows = []

    names = _username_map([r.get("user_id") for r in rows])

    items = [
        AdminPageItem(
            page_id=r["page_id"],
            user_id=r.get("user_id"),
            username=names.get(r.get("user_id") or "") or None,
            thumbnail_url=r.get("thumbnail_url"),
            original_image_url=r.get("original_image_url"),
            status=r.get("status") or "pending",
            progress=int(r.get("progress") or 0),
            page_number=r.get("page_number"),
            uploaded_at=to_iso(r.get("uploaded_at")),
            processed_at=to_iso(r.get("processed_at")),
        )
        for r in rows
    ]
    return AdminPageListResponse(total=total, items=items)


@router.delete("/pages/{page_id}", status_code=204, response_class=Response)
def delete_page(
    page_id: str,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> Response:
    supabase = get_supabase()
    try:
        page_res = (
            supabase.table("manga_pages")
            .select("page_id, user_id, original_image_url, thumbnail_url")
            .eq("page_id", page_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.error("page lookup failed for %s: %s", page_id, exc)
        raise HTTPException(status_code=503, detail="Không thể truy cập cơ sở dữ liệu.") from exc

    if not page_res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy trang.")

    try:
        supabase.table("manga_pages").delete().eq("page_id", page_id).execute()
    except Exception as exc:
        logger.error("delete page %s failed: %s", page_id, exc)
        raise HTTPException(status_code=503, detail="Xoá trang thất bại.") from exc

    _delete_page_storage(page_res.data)
    audit(
        admin_user,
        "content.delete_page",
        request=request,
        target_type="page",
        target_id=page_id,
        summary="Xoá trang manga",
        metadata={"owner_id": page_res.data.get("user_id")},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/pages/bulk-delete", response_model=BulkResultResponse)
def bulk_delete_pages(
    payload: BulkIdsRequest,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> BulkResultResponse:
    supabase = get_supabase()
    succeeded: list[str] = []
    failed: list[dict[str, str]] = []

    try:
        rows_res = (
            supabase.table("manga_pages")
            .select("page_id, user_id, original_image_url, thumbnail_url")
            .in_("page_id", payload.ids)
            .execute()
        )
        rows = {r["page_id"]: r for r in (rows_res.data or [])}
    except Exception as exc:
        logger.error("bulk page lookup failed: %s", exc)
        rows = {}

    for pid in payload.ids:
        row = rows.get(pid)
        if not row:
            failed.append({"id": pid, "error": "Không tồn tại."})
            continue
        try:
            supabase.table("manga_pages").delete().eq("page_id", pid).execute()
            _delete_page_storage(row)
            succeeded.append(pid)
        except Exception as exc:
            failed.append({"id": pid, "error": str(exc)[:200]})

    audit(
        admin_user,
        "content.bulk_delete_page",
        request=request,
        target_type="page",
        target_id=None,
        summary=f"Xoá hàng loạt trang: {len(succeeded)} OK / {len(failed)} lỗi",
        metadata={"succeeded_count": len(succeeded), "failed_count": len(failed)},
    )
    return BulkResultResponse(succeeded=succeeded, failed=failed)


# ─── Q&A ──────────────────────────────────────────────────────────────────────

@router.get("/qa", response_model=AdminQAListResponse)
def list_qa(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: str | None = Query(None),
    page_id: str | None = Query(None),
    _admin: AuthUser = Depends(get_current_admin),
) -> AdminQAListResponse:
    supabase = get_supabase()

    def _q(base: Any) -> Any:
        if user_id:
            base = base.eq("user_id", user_id)
        if page_id:
            base = base.eq("page_id", page_id)
        return base

    try:
        count_res = _q(
            supabase.table("qa_history").select("qa_id", count="exact", head=True)
        ).execute()
        total = int(count_res.count or 0)
    except Exception as exc:
        logger.error("count qa_history failed: %s", exc)
        total = 0

    try:
        data_res = (
            _q(
                supabase.table("qa_history").select(
                    "qa_id, user_id, page_id, user_question, ai_answer, asked_at"
                )
            )
            .order("asked_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = data_res.data or []
    except Exception as exc:
        logger.error("list qa_history failed: %s", exc)
        rows = []

    names = _username_map([r.get("user_id") for r in rows])
    items = [
        AdminQAItem(
            qa_id=r["qa_id"],
            user_id=r.get("user_id"),
            username=names.get(r.get("user_id") or "") or None,
            page_id=r.get("page_id"),
            user_question=r.get("user_question") or "",
            ai_answer=r.get("ai_answer"),
            asked_at=to_iso(r.get("asked_at")),
        )
        for r in rows
    ]
    return AdminQAListResponse(total=total, items=items)


@router.delete("/qa/{qa_id}", status_code=204, response_class=Response)
def delete_qa(
    qa_id: str,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> Response:
    try:
        get_supabase().table("qa_history").delete().eq("qa_id", qa_id).execute()
    except Exception as exc:
        logger.error("delete qa %s failed: %s", qa_id, exc)
        raise HTTPException(status_code=503, detail="Xoá câu hỏi thất bại.") from exc
    audit(
        admin_user,
        "content.delete_qa",
        request=request,
        target_type="qa",
        target_id=qa_id,
        summary="Xoá câu hỏi Q&A",
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/qa/bulk-delete", response_model=BulkResultResponse)
def bulk_delete_qa(
    payload: BulkIdsRequest,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> BulkResultResponse:
    supabase = get_supabase()
    try:
        supabase.table("qa_history").delete().in_("qa_id", payload.ids).execute()
        succeeded = list(payload.ids)
        failed: list[dict[str, str]] = []
    except Exception as exc:
        logger.error("bulk delete qa failed: %s", exc)
        succeeded = []
        failed = [{"id": qid, "error": str(exc)[:200]} for qid in payload.ids]

    audit(
        admin_user,
        "content.bulk_delete_qa",
        request=request,
        target_type="qa",
        target_id=None,
        summary=f"Xoá hàng loạt Q&A: {len(succeeded)} / {len(payload.ids)}",
    )
    return BulkResultResponse(succeeded=succeeded, failed=failed)
