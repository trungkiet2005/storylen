"""
StoryLens Backend — Community forum.

Site-wide discussion forum with categories, nested replies (1 level deep),
up/down voting, hot/top/new sorting, and admin pin/lock. Anonymous users can
read; authenticated users can post, reply, and vote.

If the forum_* tables are missing (v5 migration not yet applied), the router
degrades to empty-list reads and 503 on writes — no crashes.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, Field, field_validator

from app.config import get_settings
from app.database import get_supabase
from app.rate_limit import limiter
from app.routers.auth import (
    AuthUser,
    get_current_admin,
    get_current_user,
    get_optional_current_user,
)
from app.services.forum_service import (
    detect_mime_from_filename,
    normalize_attachments,
    notify_mentions,
    notify_reply_to_owner,
    upload_forum_attachment,
)

router = APIRouter(prefix="/forum", tags=["forum"])
logger = logging.getLogger(__name__)

CATEGORIES = {"discussion", "qna", "recommend", "feedback", "announcement"}
EDIT_WINDOW = timedelta(minutes=15)


# ─── Schemas ─────────────────────────────────────────────────────────────────

class AttachmentIn(BaseModel):
    """Attachment metadata referenced by a thread or reply. URL must point to an
    already-uploaded file in the forum-attachments bucket (use POST /forum/upload)."""
    type: Literal["image", "video"]
    url: str = Field(..., min_length=1, max_length=2048)
    mime: str = Field(..., min_length=3, max_length=64)
    size: int = Field(..., ge=0)
    width: Optional[int] = None
    height: Optional[int] = None
    thumbnail_url: Optional[str] = None


class ThreadCreateRequest(BaseModel):
    category: str = Field(..., min_length=1, max_length=32)
    title: str = Field(..., min_length=5, max_length=200)
    body: str = Field(..., min_length=1, max_length=10000)
    attachments: list[AttachmentIn] = Field(default_factory=list, max_length=10)

    @field_validator("category")
    @classmethod
    def _valid_category(cls, v: str) -> str:
        if v not in CATEGORIES:
            raise ValueError(f"Category không hợp lệ. Cho phép: {sorted(CATEGORIES)}")
        return v


class ThreadEditRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    body: Optional[str] = Field(None, min_length=1, max_length=10000)
    attachments: Optional[list[AttachmentIn]] = Field(default=None, max_length=10)


class ReplyCreateRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)
    parent_reply_id: Optional[str] = None
    attachments: list[AttachmentIn] = Field(default_factory=list, max_length=10)


class AttachmentOut(BaseModel):
    type: Literal["image", "video"]
    url: str
    mime: str
    size: int
    width: Optional[int] = None
    height: Optional[int] = None
    thumbnail_url: Optional[str] = None


class VoteRequest(BaseModel):
    target_type: Literal["thread", "reply"]
    target_id: str
    value: Literal[-1, 0, 1]


class ThreadOut(BaseModel):
    thread_id: str
    user_id: str
    username: Optional[str] = None
    category: str
    title: str
    body: str
    is_pinned: bool
    is_locked: bool
    score: int
    reply_count: int
    my_vote: int = 0  # -1, 0, 1
    last_reply_at: Optional[datetime] = None
    created_at: datetime
    can_edit: bool = False
    can_delete: bool = False
    attachments: list[AttachmentOut] = Field(default_factory=list)


class ThreadListResponse(BaseModel):
    items: list[ThreadOut]
    total: int
    limit: int
    offset: int


class ReplyOut(BaseModel):
    reply_id: str
    thread_id: str
    parent_reply_id: Optional[str] = None
    user_id: str
    username: Optional[str] = None
    body: str
    score: int
    my_vote: int = 0
    created_at: datetime
    can_delete: bool = False
    attachments: list[AttachmentOut] = Field(default_factory=list)


class ThreadDetailResponse(BaseModel):
    thread: ThreadOut
    replies: list[ReplyOut]


class VoteResponse(BaseModel):
    target_type: str
    target_id: str
    score: int
    my_vote: int


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _is_missing_table(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(t in text for t in ("forum_threads", "forum_replies", "forum_votes")) and (
        "does not exist" in text or "could not find" in text or "42p01" in text
    )


def _resolve_usernames(user_ids: list[str]) -> dict[str, str]:
    if not user_ids:
        return {}
    sb = get_supabase()
    try:
        rows = (
            sb.table("profiles")
            .select("user_id, username")
            .in_("user_id", list(set(user_ids)))
            .execute()
            .data
            or []
        )
        return {r["user_id"]: r.get("username") or "" for r in rows if r.get("user_id")}
    except Exception:
        return {}


def _fetch_votes(
    user_id: Optional[str],
    targets: list[tuple[str, str]],
) -> dict[tuple[str, str], int]:
    """Return {(target_type, target_id): value} for the given user, empty if anon."""
    if not user_id or not targets:
        return {}
    sb = get_supabase()
    thread_ids = [tid for tt, tid in targets if tt == "thread"]
    reply_ids = [tid for tt, tid in targets if tt == "reply"]
    out: dict[tuple[str, str], int] = {}
    try:
        if thread_ids:
            rows = (
                sb.table("forum_votes")
                .select("target_id, value")
                .eq("user_id", user_id)
                .eq("target_type", "thread")
                .in_("target_id", thread_ids)
                .execute()
                .data
                or []
            )
            for r in rows:
                out[("thread", r["target_id"])] = int(r["value"])
        if reply_ids:
            rows = (
                sb.table("forum_votes")
                .select("target_id, value")
                .eq("user_id", user_id)
                .eq("target_type", "reply")
                .in_("target_id", reply_ids)
                .execute()
                .data
                or []
            )
            for r in rows:
                out[("reply", r["target_id"])] = int(r["value"])
    except Exception as exc:
        logger.warning("fetch_votes failed: %s", exc)
    return out


def _thread_to_out(
    row: dict,
    *,
    usernames: dict[str, str],
    votes: dict[tuple[str, str], int],
    current_user: Optional[AuthUser],
) -> ThreadOut:
    tid = row["thread_id"]
    current_id = current_user.id if current_user else None
    is_owner = current_id is not None and row["user_id"] == current_id
    is_admin = current_user is not None and current_user.role == "admin"
    can_edit = False
    if is_owner and row.get("created_at"):
        try:
            created = row["created_at"]
            if isinstance(created, str):
                created = datetime.fromisoformat(created.replace("Z", "+00:00"))
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            can_edit = datetime.now(timezone.utc) - created <= EDIT_WINDOW
        except Exception:
            can_edit = False
    return ThreadOut(
        thread_id=tid,
        user_id=row["user_id"],
        username=usernames.get(row["user_id"]) or None,
        category=row["category"],
        title=row["title"],
        body=row["body"],
        is_pinned=bool(row.get("is_pinned")),
        is_locked=bool(row.get("is_locked")),
        score=int(row.get("score") or 0),
        reply_count=int(row.get("reply_count") or 0),
        my_vote=votes.get(("thread", tid), 0),
        last_reply_at=row.get("last_reply_at"),
        created_at=row["created_at"],
        can_edit=can_edit,
        can_delete=is_owner or is_admin,
        attachments=_safe_attachments(row.get("attachments")),
    )


def _reply_to_out(
    row: dict,
    *,
    usernames: dict[str, str],
    votes: dict[tuple[str, str], int],
    current_user: Optional[AuthUser],
) -> ReplyOut:
    rid = row["reply_id"]
    current_id = current_user.id if current_user else None
    is_owner = current_id is not None and row["user_id"] == current_id
    is_admin = current_user is not None and current_user.role == "admin"
    return ReplyOut(
        reply_id=rid,
        thread_id=row["thread_id"],
        parent_reply_id=row.get("parent_reply_id"),
        user_id=row["user_id"],
        username=usernames.get(row["user_id"]) or None,
        body=row["body"],
        score=int(row.get("score") or 0),
        my_vote=votes.get(("reply", rid), 0),
        created_at=row["created_at"],
        can_delete=is_owner or is_admin,
        attachments=_safe_attachments(row.get("attachments")),
    )


def _safe_attachments(raw: Any) -> list[AttachmentOut]:
    """Coerce a JSONB attachments field (could be None / list / str) into AttachmentOut[]."""
    if raw is None:
        return []
    if isinstance(raw, str):
        try:
            import json as _json
            raw = _json.loads(raw)
        except Exception:
            return []
    if not isinstance(raw, list):
        return []
    out: list[AttachmentOut] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            out.append(AttachmentOut(**item))
        except Exception:
            continue
    return out


def _load_thread_row(thread_id: str, *, include_deleted: bool = False) -> dict:
    sb = get_supabase()
    res = (
        sb.table("forum_threads")
        .select("*")
        .eq("thread_id", thread_id)
        .maybe_single()
        .execute()
    )
    row = res.data if res else None
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy thread.")
    if not include_deleted and row.get("deleted_at"):
        raise HTTPException(status_code=404, detail="Không tìm thấy thread.")
    return row


# ─── Threads — list / detail ─────────────────────────────────────────────────

@router.get("/threads", response_model=ThreadListResponse)
def list_threads(
    category: Optional[str] = Query(None),
    sort: Literal["hot", "top", "new"] = Query("hot"),
    q: Optional[str] = Query(None, max_length=200),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: Optional[AuthUser] = Depends(get_optional_current_user),
):
    """Public list of threads with sorting and optional category / search filter."""
    if category and category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Category không hợp lệ.")

    sb = get_supabase()
    try:
        builder = (
            sb.table("forum_threads")
            .select("*", count="exact")
            .is_("deleted_at", "null")
        )
        if category:
            builder = builder.eq("category", category)
        if q:
            builder = builder.ilike("title", f"%{q}%")

        builder = builder.order("is_pinned", desc=True)
        if sort == "hot":
            builder = builder.order("hot_score", desc=True)
        elif sort == "top":
            builder = builder.order("score", desc=True)
        else:  # new
            builder = builder.order("created_at", desc=True)

        result = builder.range(offset, offset + limit - 1).execute()
        rows = result.data or []
        total = result.count if getattr(result, "count", None) is not None else len(rows)
    except Exception as exc:
        if _is_missing_table(exc):
            return ThreadListResponse(items=[], total=0, limit=limit, offset=offset)
        logger.warning("list_threads failed: %s", exc)
        return ThreadListResponse(items=[], total=0, limit=limit, offset=offset)

    usernames = _resolve_usernames([r["user_id"] for r in rows])
    votes = _fetch_votes(
        current_user.id if current_user else None,
        [("thread", r["thread_id"]) for r in rows],
    )
    items = [_thread_to_out(r, usernames=usernames, votes=votes, current_user=current_user) for r in rows]
    return ThreadListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/threads/{thread_id}", response_model=ThreadDetailResponse)
def get_thread(
    thread_id: str,
    current_user: Optional[AuthUser] = Depends(get_optional_current_user),
):
    """Public thread detail + all non-deleted replies (flat list ordered by created_at)."""
    sb = get_supabase()
    try:
        row = _load_thread_row(thread_id)
        rep_rows = (
            sb.table("forum_replies")
            .select("*")
            .eq("thread_id", thread_id)
            .is_("deleted_at", "null")
            .order("created_at", desc=False)
            .execute()
            .data
            or []
        )
    except HTTPException:
        raise
    except Exception as exc:
        if _is_missing_table(exc):
            raise HTTPException(status_code=404, detail="Không tìm thấy thread.") from exc
        logger.error("get_thread failed: %s", exc)
        raise HTTPException(status_code=503, detail="Không tải được thread.") from exc

    all_user_ids = [row["user_id"]] + [r["user_id"] for r in rep_rows]
    usernames = _resolve_usernames(all_user_ids)
    targets: list[tuple[str, str]] = [("thread", thread_id)]
    targets.extend(("reply", r["reply_id"]) for r in rep_rows)
    votes = _fetch_votes(current_user.id if current_user else None, targets)

    thread_out = _thread_to_out(row, usernames=usernames, votes=votes, current_user=current_user)
    replies = [_reply_to_out(r, usernames=usernames, votes=votes, current_user=current_user) for r in rep_rows]
    return ThreadDetailResponse(thread=thread_out, replies=replies)


# ─── Threads — create / edit / delete ────────────────────────────────────────

@router.post("/threads", response_model=ThreadOut, status_code=201)
@limiter.limit(lambda: get_settings().RATE_LIMIT_FORUM_THREAD)
def create_thread(
    request: Request,
    payload: ThreadCreateRequest,
    user: AuthUser = Depends(get_current_user),
):
    title = payload.title.strip()
    body = payload.body.strip()
    if not title or not body:
        raise HTTPException(status_code=400, detail="Tiêu đề và nội dung không được để trống.")
    if payload.category == "announcement" and user.role != "admin":
        raise HTTPException(status_code=403, detail="Chỉ quản trị viên mới đăng được thông báo.")

    sb = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        attachments = normalize_attachments(
            [a.model_dump() for a in payload.attachments],
            get_settings().FORUM_MAX_ATTACHMENTS,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    row = {
        "thread_id": str(uuid.uuid4()),
        "user_id": user.id,
        "category": payload.category,
        "title": title,
        "body": body,
        "is_pinned": False,
        "is_locked": False,
        "score": 0,
        "reply_count": 0,
        "hot_score": 0,
        "attachments": attachments,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        sb.table("forum_threads").insert(row).execute()
    except Exception as exc:
        if _is_missing_table(exc):
            raise HTTPException(
                status_code=503,
                detail="Diễn đàn chưa sẵn sàng (DB migration v5 chưa chạy).",
            ) from exc
        logger.error("create_thread failed: %s", exc)
        raise HTTPException(status_code=500, detail="Không lưu được thread.") from exc

    try:
        notify_mentions(
            author_id=user.id,
            author_username=user.username,
            body=body,
            thread_id=row["thread_id"],
            thread_title=title,
        )
    except Exception as exc:
        logger.info("notify_mentions skipped: %s", exc)

    return _thread_to_out(row, usernames={user.id: user.username or ""}, votes={}, current_user=user)


@router.patch("/threads/{thread_id}", response_model=ThreadOut)
def edit_thread(
    thread_id: str,
    payload: ThreadEditRequest,
    user: AuthUser = Depends(get_current_user),
):
    if payload.title is None and payload.body is None and payload.attachments is None:
        raise HTTPException(status_code=400, detail="Không có gì để cập nhật.")

    sb = get_supabase()
    row = _load_thread_row(thread_id)
    if row["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Bạn không phải chủ thread này.")

    try:
        created = row["created_at"]
        if isinstance(created, str):
            created = datetime.fromisoformat(created.replace("Z", "+00:00"))
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - created > EDIT_WINDOW:
            raise HTTPException(status_code=403, detail="Đã quá thời gian chỉnh sửa (15 phút).")
    except HTTPException:
        raise
    except Exception:
        pass

    updates: dict = {}
    if payload.title is not None:
        updates["title"] = payload.title.strip()
    if payload.body is not None:
        updates["body"] = payload.body.strip()
    if payload.attachments is not None:
        try:
            updates["attachments"] = normalize_attachments(
                [a.model_dump() for a in payload.attachments],
                get_settings().FORUM_MAX_ATTACHMENTS,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        sb.table("forum_threads").update(updates).eq("thread_id", thread_id).execute()
    except Exception as exc:
        logger.error("edit_thread failed: %s", exc)
        raise HTTPException(status_code=500, detail="Không cập nhật được thread.") from exc

    row.update(updates)
    usernames = _resolve_usernames([row["user_id"]])
    return _thread_to_out(row, usernames=usernames, votes={}, current_user=user)


@router.delete("/threads/{thread_id}", status_code=204)
def delete_thread(thread_id: str, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    row = _load_thread_row(thread_id)
    if row["user_id"] != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không phải chủ thread này.")
    try:
        sb.table("forum_threads").update(
            {"deleted_at": datetime.now(timezone.utc).isoformat()}
        ).eq("thread_id", thread_id).execute()
    except Exception as exc:
        logger.error("delete_thread failed: %s", exc)
        raise HTTPException(status_code=500, detail="Không xoá được thread.") from exc
    return None


# ─── Replies ─────────────────────────────────────────────────────────────────

@router.post("/threads/{thread_id}/replies", response_model=ReplyOut, status_code=201)
@limiter.limit(lambda: get_settings().RATE_LIMIT_FORUM_REPLY)
def create_reply(
    request: Request,
    thread_id: str,
    payload: ReplyCreateRequest,
    user: AuthUser = Depends(get_current_user),
):
    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=400, detail="Nội dung không được để trống.")

    sb = get_supabase()
    thread_row = _load_thread_row(thread_id)
    if thread_row.get("is_locked"):
        raise HTTPException(status_code=403, detail="Thread đã khoá, không thể trả lời.")

    parent_owner_id: Optional[str] = thread_row["user_id"]
    parent_kind = "thread"
    if payload.parent_reply_id:
        try:
            parent_res = (
                sb.table("forum_replies")
                .select("reply_id, thread_id, user_id, parent_reply_id, deleted_at")
                .eq("reply_id", payload.parent_reply_id)
                .maybe_single()
                .execute()
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Không truy cập được reply gốc.") from exc
        parent = parent_res.data if parent_res else None
        if not parent or parent.get("deleted_at"):
            raise HTTPException(status_code=404, detail="Không tìm thấy reply gốc.")
        if parent["thread_id"] != thread_id:
            raise HTTPException(status_code=400, detail="Reply gốc không thuộc thread này.")
        if parent.get("parent_reply_id"):
            raise HTTPException(status_code=400, detail="Chỉ cho phép reply lồng 1 cấp.")
        parent_owner_id = parent["user_id"]
        parent_kind = "reply"

    try:
        attachments = normalize_attachments(
            [a.model_dump() for a in payload.attachments],
            get_settings().FORUM_MAX_ATTACHMENTS,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    row = {
        "reply_id": str(uuid.uuid4()),
        "thread_id": thread_id,
        "user_id": user.id,
        "parent_reply_id": payload.parent_reply_id,
        "body": body,
        "score": 0,
        "attachments": attachments,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        sb.table("forum_replies").insert(row).execute()
    except Exception as exc:
        if _is_missing_table(exc):
            raise HTTPException(status_code=503, detail="Diễn đàn chưa sẵn sàng.") from exc
        logger.error("create_reply failed: %s", exc)
        raise HTTPException(status_code=500, detail="Không lưu được reply.") from exc

    try:
        notify_mentions(
            author_id=user.id,
            author_username=user.username,
            body=body,
            thread_id=thread_id,
            thread_title=thread_row["title"],
        )
        notify_reply_to_owner(
            author_id=user.id,
            author_username=user.username,
            parent_owner_id=parent_owner_id,
            parent_kind=parent_kind,
            thread_id=thread_id,
            thread_title=thread_row["title"],
        )
    except Exception as exc:
        logger.info("reply notifications skipped: %s", exc)

    usernames = {user.id: user.username or ""}
    return _reply_to_out(row, usernames=usernames, votes={}, current_user=user)


@router.delete("/replies/{reply_id}", status_code=204)
def delete_reply(reply_id: str, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase()
    try:
        existing = (
            sb.table("forum_replies")
            .select("reply_id, user_id, deleted_at")
            .eq("reply_id", reply_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        if _is_missing_table(exc):
            raise HTTPException(status_code=404, detail="Không tìm thấy reply.") from exc
        raise HTTPException(status_code=503, detail="Không truy cập được reply.") from exc
    row = existing.data if existing else None
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy reply.")
    if row.get("user_id") != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không phải chủ reply này.")
    if row.get("deleted_at"):
        return None
    try:
        sb.table("forum_replies").update(
            {"deleted_at": datetime.now(timezone.utc).isoformat()}
        ).eq("reply_id", reply_id).execute()
    except Exception as exc:
        logger.error("delete_reply failed: %s", exc)
        raise HTTPException(status_code=500, detail="Không xoá được reply.") from exc
    return None


# ─── Voting ──────────────────────────────────────────────────────────────────

@router.post("/vote", response_model=VoteResponse)
@limiter.limit(lambda: get_settings().RATE_LIMIT_FORUM_VOTE)
def vote(
    request: Request,
    payload: VoteRequest,
    user: AuthUser = Depends(get_current_user),
):
    sb = get_supabase()

    if payload.target_type == "thread":
        try:
            target = (
                sb.table("forum_threads")
                .select("thread_id, deleted_at")
                .eq("thread_id", payload.target_id)
                .maybe_single()
                .execute()
            )
        except Exception as exc:
            if _is_missing_table(exc):
                raise HTTPException(status_code=404, detail="Không tìm thấy target.") from exc
            raise HTTPException(status_code=503, detail="Không vote được.") from exc
    else:
        try:
            target = (
                sb.table("forum_replies")
                .select("reply_id, deleted_at")
                .eq("reply_id", payload.target_id)
                .maybe_single()
                .execute()
            )
        except Exception as exc:
            if _is_missing_table(exc):
                raise HTTPException(status_code=404, detail="Không tìm thấy target.") from exc
            raise HTTPException(status_code=503, detail="Không vote được.") from exc

    target_row = target.data if target else None
    if not target_row or target_row.get("deleted_at"):
        raise HTTPException(status_code=404, detail="Không tìm thấy target.")

    try:
        if payload.value == 0:
            sb.table("forum_votes").delete().eq("user_id", user.id).eq(
                "target_type", payload.target_type
            ).eq("target_id", payload.target_id).execute()
        else:
            sb.table("forum_votes").upsert(
                {
                    "user_id": user.id,
                    "target_type": payload.target_type,
                    "target_id": payload.target_id,
                    "value": payload.value,
                },
                on_conflict="user_id,target_type,target_id",
            ).execute()
    except Exception as exc:
        logger.error("vote upsert failed: %s", exc)
        raise HTTPException(status_code=500, detail="Không lưu được vote.") from exc

    # Trigger has updated the denormalized score; re-fetch.
    try:
        if payload.target_type == "thread":
            res = (
                sb.table("forum_threads")
                .select("score")
                .eq("thread_id", payload.target_id)
                .maybe_single()
                .execute()
            )
        else:
            res = (
                sb.table("forum_replies")
                .select("score")
                .eq("reply_id", payload.target_id)
                .maybe_single()
                .execute()
            )
        score = int((res.data or {}).get("score") or 0) if res else 0
    except Exception:
        score = 0

    return VoteResponse(
        target_type=payload.target_type,
        target_id=payload.target_id,
        score=score,
        my_vote=payload.value,
    )


# ─── Admin moderation ────────────────────────────────────────────────────────

@router.post("/threads/{thread_id}/pin", response_model=ThreadOut)
def toggle_pin(thread_id: str, admin: AuthUser = Depends(get_current_admin)):
    sb = get_supabase()
    row = _load_thread_row(thread_id, include_deleted=True)
    new_val = not bool(row.get("is_pinned"))
    try:
        sb.table("forum_threads").update({"is_pinned": new_val}).eq("thread_id", thread_id).execute()
    except Exception as exc:
        logger.error("toggle_pin failed: %s", exc)
        raise HTTPException(status_code=500, detail="Không pin được thread.") from exc
    row["is_pinned"] = new_val
    usernames = _resolve_usernames([row["user_id"]])
    return _thread_to_out(row, usernames=usernames, votes={}, current_user=admin)


@router.post("/threads/{thread_id}/lock", response_model=ThreadOut)
def toggle_lock(thread_id: str, admin: AuthUser = Depends(get_current_admin)):
    sb = get_supabase()
    row = _load_thread_row(thread_id, include_deleted=True)
    new_val = not bool(row.get("is_locked"))
    try:
        sb.table("forum_threads").update({"is_locked": new_val}).eq("thread_id", thread_id).execute()
    except Exception as exc:
        logger.error("toggle_lock failed: %s", exc)
        raise HTTPException(status_code=500, detail="Không lock được thread.") from exc
    row["is_locked"] = new_val
    usernames = _resolve_usernames([row["user_id"]])
    return _thread_to_out(row, usernames=usernames, votes={}, current_user=admin)


# ─── Attachment upload ───────────────────────────────────────────────────────

class AttachmentUploadResponse(BaseModel):
    type: Literal["image", "video"]
    url: str
    mime: str
    size: int
    width: Optional[int] = None
    height: Optional[int] = None
    thumbnail_url: Optional[str] = None


@router.post("/upload", response_model=AttachmentUploadResponse)
@limiter.limit(lambda: get_settings().RATE_LIMIT_FORUM_UPLOAD)
async def upload_attachment(
    request: Request,
    file: UploadFile = File(...),
    user: AuthUser = Depends(get_current_user),
):
    """Upload a single image/video to the forum-attachments bucket and return
    the metadata the client should attach to a thread/reply create request."""
    # Trust the client-declared content-type only if it's in the allowlist; otherwise
    # fall back to filename sniffing. The service layer re-validates against allowed mimes.
    mime = (file.content_type or "").lower().strip()
    settings = get_settings()
    allowed = set(settings.FORUM_ALLOWED_IMAGE_MIMES) | set(settings.FORUM_ALLOWED_VIDEO_MIMES)
    if mime not in allowed:
        sniffed = detect_mime_from_filename(file.filename)
        if sniffed and sniffed in allowed:
            mime = sniffed
        else:
            raise HTTPException(status_code=400, detail=f"Loại file không hỗ trợ: {mime or 'unknown'}.")

    # Read fully into memory — limits are small (10MB image / 50MB video).
    content = await file.read()

    try:
        meta = upload_forum_attachment(content=content, mime=mime, owner_id=user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return AttachmentUploadResponse(**meta)
