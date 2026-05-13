"""
Admin · Analytics & dashboard.

    GET /stats                  high-level system counters
    GET /activity?days=30       daily new_users / pages / qa time series
    GET /top-users?metric=...   top users by pages / qa / total
    GET /breakdown/status       manga_pages count grouped by status
    GET /breakdown/target-lang  user preferred_target_lang breakdown
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_admin

from .deps import count_rows

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)


class AdminStatsResponse(BaseModel):
    total_users: int
    total_admins: int
    total_pages: int
    total_qa: int
    total_translations: int
    pages_today: int
    qa_today: int
    new_users_today: int


class DailyActivityPoint(BaseModel):
    day: str
    new_users: int
    pages_uploaded: int
    qa_asked: int


class DailyActivityResponse(BaseModel):
    days: int
    points: list[DailyActivityPoint]


class TopUser(BaseModel):
    user_id: str
    username: str | None
    pages_count: int
    qa_count: int


class TopUsersResponse(BaseModel):
    metric: str
    items: list[TopUser]


class BreakdownItem(BaseModel):
    label: str
    count: int


class BreakdownResponse(BaseModel):
    items: list[BreakdownItem]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _count_since_today(table: str, column: str) -> int:
    """Approximate "today" count using server-side timestamptz comparison."""
    from datetime import datetime, timezone

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    try:
        res = (
            get_supabase()
            .table(table)
            .select("*", count="exact", head=True)
            .gte(column, today_start.isoformat())
            .execute()
        )
        return int(res.count or 0)
    except Exception as exc:
        logger.warning("count_since_today(%s) failed: %s", table, exc)
        return 0


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(_admin: AuthUser = Depends(get_current_admin)) -> AdminStatsResponse:
    return AdminStatsResponse(
        total_users=count_rows("profiles"),
        total_admins=count_rows("profiles", {"role": "admin"}),
        total_pages=count_rows("manga_pages"),
        total_qa=count_rows("qa_history"),
        total_translations=count_rows("translation_history"),
        pages_today=_count_since_today("manga_pages", "uploaded_at"),
        qa_today=_count_since_today("qa_history", "asked_at"),
        new_users_today=_count_since_today("profiles", "created_at"),
    )


@router.get("/activity", response_model=DailyActivityResponse)
def get_daily_activity(
    days: int = Query(30, ge=1, le=180),
    _admin: AuthUser = Depends(get_current_admin),
) -> DailyActivityResponse:
    try:
        res = get_supabase().rpc("admin_daily_activity", {"days": days}).execute()
        rows = res.data or []
    except Exception as exc:
        logger.warning("admin_daily_activity RPC failed: %s", exc)
        rows = []

    points = [
        DailyActivityPoint(
            day=str(r.get("day")),
            new_users=int(r.get("new_users") or 0),
            pages_uploaded=int(r.get("pages_uploaded") or 0),
            qa_asked=int(r.get("qa_asked") or 0),
        )
        for r in rows
    ]
    return DailyActivityResponse(days=days, points=points)


@router.get("/top-users", response_model=TopUsersResponse)
def get_top_users(
    metric: str = Query("pages", pattern="^(pages|qa|total)$"),
    limit: int = Query(10, ge=1, le=50),
    _admin: AuthUser = Depends(get_current_admin),
) -> TopUsersResponse:
    try:
        res = (
            get_supabase()
            .rpc("admin_top_users", {"metric": metric, "max_rows": limit})
            .execute()
        )
        rows = res.data or []
    except Exception as exc:
        logger.warning("admin_top_users RPC failed: %s", exc)
        rows = []

    items = [
        TopUser(
            user_id=str(r.get("user_id")),
            username=r.get("username"),
            pages_count=int(r.get("pages_count") or 0),
            qa_count=int(r.get("qa_count") or 0),
        )
        for r in rows
    ]
    return TopUsersResponse(metric=metric, items=items)


@router.get("/breakdown/status", response_model=BreakdownResponse)
def status_breakdown(_admin: AuthUser = Depends(get_current_admin)) -> BreakdownResponse:
    try:
        res = get_supabase().rpc("admin_status_breakdown").execute()
        rows = res.data or []
    except Exception as exc:
        logger.warning("admin_status_breakdown RPC failed: %s", exc)
        rows = []
    items = [BreakdownItem(label=str(r.get("status") or "?"), count=int(r.get("cnt") or 0)) for r in rows]
    return BreakdownResponse(items=items)


@router.get("/breakdown/target-lang", response_model=BreakdownResponse)
def target_lang_breakdown(_admin: AuthUser = Depends(get_current_admin)) -> BreakdownResponse:
    try:
        res = get_supabase().rpc("admin_target_lang_breakdown").execute()
        rows = res.data or []
    except Exception as exc:
        logger.warning("admin_target_lang_breakdown RPC failed: %s", exc)
        rows = []
    items = [BreakdownItem(label=str(r.get("target_lang") or "?"), count=int(r.get("cnt") or 0)) for r in rows]
    return BreakdownResponse(items=items)
