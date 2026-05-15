"""
StoryLens Backend — Wibu (Gamification) Router

Bookmarks, ratings, reading lists, goals, stats,
achievements, read-page tracking, and series progress.

All endpoints require authentication. The service-role Supabase
client is used server-side so RLS is bypassed automatically.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_user

router = APIRouter(prefix="/wibu", tags=["wibu"])
logger = logging.getLogger(__name__)


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class BookmarkIn(BaseModel):
    page_id: str
    page_number: int | None = None
    series_id: str | None = None
    series_title: str | None = None
    chapter_number: int | None = None
    thumbnail_url: str | None = None
    note: str = ""


class BookmarkOut(BookmarkIn):
    saved_at: str


class RatingIn(BaseModel):
    rating: int = Field(..., ge=0, le=5)


class GoalsIn(BaseModel):
    daily_pages: int = Field(20, ge=1)
    weekly_pages: int = Field(100, ge=1)


ReadingListStatus = Literal["reading", "want", "done", "dropped"]


class ListStatusIn(BaseModel):
    status: ReadingListStatus


class MarkReadIn(BaseModel):
    page_id: str


class AddMinutesIn(BaseModel):
    minutes: int = Field(..., ge=1)


class ReadProgressIn(BaseModel):
    series_title: str = ""
    cover_url: str | None = None
    chapter_id: str | None = None
    chapter_number: int | None = None
    page_id: str
    page_number: int = 0
    total_pages: int = 0


class ReadProgressOut(ReadProgressIn):
    series_id: str
    read_at: str


class StatsOut(BaseModel):
    total_pages_read: int
    total_minutes_read: int
    current_streak: int
    longest_streak: int
    last_read_date: str | None
    daily_history: dict[str, int]


class AchievementOut(BaseModel):
    achievement_id: str
    unlocked_at: str


class MeOut(BaseModel):
    bookmarks: list[BookmarkOut]
    ratings: dict[str, int]
    reading_lists: dict[str, str]
    goals: GoalsIn
    stats: StatsOut
    unlocked_achievement_ids: list[str]
    progress: list[ReadProgressOut]


# ─── Internal Helpers ─────────────────────────────────────────────────────────

def _strip(row: dict, exclude: set[str] = frozenset({"user_id", "id"})) -> dict:
    return {k: v for k, v in row.items() if k not in exclude}


def _get_stats(user_id: str, supabase) -> dict:
    result = (
        supabase.table("user_reading_stats")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]
    return {
        "user_id": user_id,
        "total_pages_read": 0,
        "total_minutes_read": 0,
        "current_streak": 0,
        "longest_streak": 0,
        "last_read_date": None,
        "daily_history": {},
    }


def _upsert_stats(user_id: str, raw: dict, supabase) -> None:
    raw["user_id"] = user_id
    raw["updated_at"] = datetime.now(timezone.utc).isoformat()
    supabase.table("user_reading_stats").upsert(raw, on_conflict="user_id").execute()


def _bump_stats(raw: dict) -> dict:
    today = date.today().isoformat()
    raw["total_pages_read"] = raw.get("total_pages_read", 0) + 1
    daily: dict[str, int] = raw.get("daily_history") or {}
    daily[today] = daily.get(today, 0) + 1
    raw["daily_history"] = daily

    last = raw.get("last_read_date")
    last_str = str(last) if last else None
    if last_str != today:
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        if last_str == yesterday:
            raw["current_streak"] = raw.get("current_streak", 0) + 1
        else:
            raw["current_streak"] = 1
        raw["longest_streak"] = max(raw.get("longest_streak", 0), raw["current_streak"])
        raw["last_read_date"] = today
    return raw


def _to_stats_out(raw: dict) -> StatsOut:
    last = raw.get("last_read_date")
    return StatsOut(
        total_pages_read=raw.get("total_pages_read", 0),
        total_minutes_read=raw.get("total_minutes_read", 0),
        current_streak=raw.get("current_streak", 0),
        longest_streak=raw.get("longest_streak", 0),
        last_read_date=str(last) if last else None,
        daily_history=raw.get("daily_history") or {},
    )


# ─── Bulk Load ────────────────────────────────────────────────────────────────

@router.get("/me", response_model=MeOut)
def get_me(user: AuthUser = Depends(get_current_user)):
    """Single round-trip to hydrate all wibu state for the current user."""
    sb = get_supabase()
    uid = user.id

    bm_r  = sb.table("user_bookmarks").select("*").eq("user_id", uid).order("saved_at", desc=True).execute()
    rt_r  = sb.table("user_ratings").select("series_id,rating").eq("user_id", uid).execute()
    ls_r  = sb.table("user_reading_lists").select("series_id,status").eq("user_id", uid).execute()
    gl_r  = sb.table("user_reading_goals").select("daily_pages,weekly_pages").eq("user_id", uid).limit(1).execute()
    ach_r = sb.table("user_achievements").select("achievement_id").eq("user_id", uid).execute()
    pr_r  = sb.table("user_read_progress").select("*").eq("user_id", uid).order("read_at", desc=True).execute()
    raw_stats = _get_stats(uid, sb)

    goals_row = gl_r.data[0] if gl_r.data else {"daily_pages": 20, "weekly_pages": 100}

    return MeOut(
        bookmarks=[BookmarkOut(**_strip(r)) for r in (bm_r.data or [])],
        ratings={r["series_id"]: r["rating"] for r in (rt_r.data or [])},
        reading_lists={r["series_id"]: r["status"] for r in (ls_r.data or [])},
        goals=GoalsIn(**goals_row),
        stats=_to_stats_out(raw_stats),
        unlocked_achievement_ids=[r["achievement_id"] for r in (ach_r.data or [])],
        progress=[ReadProgressOut(**_strip(r)) for r in (pr_r.data or [])],
    )


# ─── Bookmarks ────────────────────────────────────────────────────────────────

@router.get("/bookmarks", response_model=list[BookmarkOut])
def list_bookmarks(user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("user_bookmarks").select("*").eq("user_id", user.id).order("saved_at", desc=True).execute()
    return [BookmarkOut(**_strip(r)) for r in (result.data or [])]


@router.post("/bookmarks", response_model=BookmarkOut, status_code=status.HTTP_201_CREATED)
def add_bookmark(body: BookmarkIn, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    row = {**body.model_dump(), "user_id": user.id, "saved_at": datetime.now(timezone.utc).isoformat()}
    result = sb.table("user_bookmarks").upsert(row, on_conflict="user_id,page_id").execute()
    saved = result.data[0] if result.data else row
    return BookmarkOut(**_strip(saved))


@router.delete("/bookmarks/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_bookmark(page_id: str, user: AuthUser = Depends(get_current_user)):
    get_supabase().table("user_bookmarks").delete().eq("user_id", user.id).eq("page_id", page_id).execute()


# ─── Ratings ──────────────────────────────────────────────────────────────────

@router.get("/ratings", response_model=dict[str, int])
def get_ratings(user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("user_ratings").select("series_id,rating").eq("user_id", user.id).execute()
    return {r["series_id"]: r["rating"] for r in (result.data or [])}


@router.put("/ratings/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
def set_rating(series_id: str, body: RatingIn, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    if body.rating <= 0:
        sb.table("user_ratings").delete().eq("user_id", user.id).eq("series_id", series_id).execute()
    else:
        row = {
            "user_id": user.id, "series_id": series_id,
            "rating": body.rating, "rated_at": datetime.now(timezone.utc).isoformat(),
        }
        sb.table("user_ratings").upsert(row, on_conflict="user_id,series_id").execute()


# ─── Reading Lists ─────────────────────────────────────────────────────────────

@router.get("/lists", response_model=dict[str, str])
def get_lists(user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("user_reading_lists").select("series_id,status").eq("user_id", user.id).execute()
    return {r["series_id"]: r["status"] for r in (result.data or [])}


@router.put("/lists/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
def set_list_status(series_id: str, body: ListStatusIn, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    row = {
        "user_id": user.id, "series_id": series_id,
        "status": body.status, "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("user_reading_lists").upsert(row, on_conflict="user_id,series_id").execute()


@router.delete("/lists/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_list_status(series_id: str, user: AuthUser = Depends(get_current_user)):
    get_supabase().table("user_reading_lists").delete().eq("user_id", user.id).eq("series_id", series_id).execute()


# ─── Goals ────────────────────────────────────────────────────────────────────

@router.get("/goals", response_model=GoalsIn)
def get_goals(user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("user_reading_goals").select("daily_pages,weekly_pages").eq("user_id", user.id).limit(1).execute()
    if result.data:
        return GoalsIn(**result.data[0])
    return GoalsIn(daily_pages=20, weekly_pages=100)


@router.put("/goals", status_code=status.HTTP_204_NO_CONTENT)
def update_goals(body: GoalsIn, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    row = {
        "user_id": user.id,
        "daily_pages": body.daily_pages,
        "weekly_pages": body.weekly_pages,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("user_reading_goals").upsert(row, on_conflict="user_id").execute()


# ─── Reading Stats ─────────────────────────────────────────────────────────────

@router.get("/stats", response_model=StatsOut)
def get_stats(user: AuthUser = Depends(get_current_user)):
    return _to_stats_out(_get_stats(user.id, get_supabase()))


@router.post("/stats/minutes", response_model=StatsOut)
def add_minutes(body: AddMinutesIn, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    raw = _get_stats(user.id, sb)
    raw["total_minutes_read"] = raw.get("total_minutes_read", 0) + body.minutes
    _upsert_stats(user.id, raw, sb)
    return _to_stats_out(raw)


# ─── Pages Read ───────────────────────────────────────────────────────────────

@router.post("/pages/read", response_model=StatsOut)
def mark_page_read(body: MarkReadIn, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    existing = (
        sb.table("user_read_pages")
        .select("page_id")
        .eq("user_id", user.id)
        .eq("page_id", body.page_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return _to_stats_out(_get_stats(user.id, sb))

    sb.table("user_read_pages").insert({"user_id": user.id, "page_id": body.page_id}).execute()
    raw = _bump_stats(_get_stats(user.id, sb))
    _upsert_stats(user.id, raw, sb)
    return _to_stats_out(raw)


# ─── Achievements ─────────────────────────────────────────────────────────────

@router.get("/achievements", response_model=list[AchievementOut])
def get_achievements(user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("user_achievements").select("achievement_id,unlocked_at").eq("user_id", user.id).execute()
    return [AchievementOut(**r) for r in (result.data or [])]


@router.post("/achievements/unlock", response_model=list[str])
def unlock_achievements(achievement_ids: list[str], user: AuthUser = Depends(get_current_user)):
    """Batch-persist newly-unlocked achievements verified client-side."""
    if not achievement_ids:
        return []
    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    rows = [{"user_id": user.id, "achievement_id": aid, "unlocked_at": now} for aid in achievement_ids]
    sb.table("user_achievements").upsert(rows, on_conflict="user_id,achievement_id").execute()
    return achievement_ids


# ─── Reading Progress ─────────────────────────────────────────────────────────

@router.get("/progress", response_model=list[ReadProgressOut])
def get_all_progress(user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("user_read_progress").select("*").eq("user_id", user.id).order("read_at", desc=True).execute()
    return [ReadProgressOut(**_strip(r)) for r in (result.data or [])]


@router.put("/progress/{series_id}", response_model=ReadProgressOut)
def save_progress(series_id: str, body: ReadProgressIn, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    row = {**body.model_dump(), "series_id": series_id, "user_id": user.id, "read_at": now}
    result = sb.table("user_read_progress").upsert(row, on_conflict="user_id,series_id").execute()
    saved = result.data[0] if result.data else row
    return ReadProgressOut(**_strip(saved))
