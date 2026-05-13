"""
Admin · Audit log viewer.

    GET /audit    Paginated audit-log rows with filter by actor / action.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_admin

from .deps import to_iso

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)


class AuditEntry(BaseModel):
    id: str
    actor_id: str | None
    actor_email: str | None
    action: str
    target_type: str | None
    target_id: str | None
    summary: str | None
    metadata: dict | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: str | None = None


class AuditListResponse(BaseModel):
    total: int
    items: list[AuditEntry]


@router.get("/audit", response_model=AuditListResponse)
def list_audit(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    actor_id: str | None = Query(None),
    action: str | None = Query(None, max_length=64),
    target_type: str | None = Query(None, max_length=32),
    _admin: AuthUser = Depends(get_current_admin),
) -> AuditListResponse:
    supabase = get_supabase()

    def _q(base):
        if actor_id:
            base = base.eq("actor_id", actor_id)
        if action:
            base = base.eq("action", action)
        if target_type:
            base = base.eq("target_type", target_type)
        return base

    try:
        count_res = _q(
            supabase.table("admin_audit_log").select("id", count="exact", head=True)
        ).execute()
        total = int(count_res.count or 0)
    except Exception as exc:
        logger.warning("audit count failed: %s", exc)
        total = 0

    try:
        data_res = (
            _q(supabase.table("admin_audit_log").select("*"))
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = data_res.data or []
    except Exception as exc:
        logger.warning("audit fetch failed: %s", exc)
        rows = []

    items = [
        AuditEntry(
            id=str(r.get("id")),
            actor_id=r.get("actor_id"),
            actor_email=r.get("actor_email"),
            action=r.get("action") or "",
            target_type=r.get("target_type"),
            target_id=r.get("target_id"),
            summary=r.get("summary"),
            metadata=r.get("metadata") or {},
            ip_address=r.get("ip_address"),
            user_agent=r.get("user_agent"),
            created_at=to_iso(r.get("created_at")),
        )
        for r in rows
    ]
    return AuditListResponse(total=total, items=items)
