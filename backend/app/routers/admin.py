"""
StoryLens Backend - Admin Router
Endpoints for user management. Restricted to users with role='admin'.

GET    /admin/users              — paginated list of users with stats
GET    /admin/users/{user_id}    — single user detail with stats
PATCH  /admin/users/{user_id}/role  — promote / demote user
DELETE /admin/users/{user_id}    — delete user (cascades pages, qa, profile)
GET    /admin/stats              — system-wide totals
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator

from app.database import get_supabase
from app.routers.auth import ALLOWED_ROLES, AuthUser, get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


# ─── Schemas ──────────────────────────────────────────────────────────────────

class AdminUserItem(BaseModel):
    id: str
    username: str | None
    email: str | None
    role: str
    created_at: str | None
    last_sign_in_at: str | None = None
    pages_count: int = 0
    qa_count: int = 0


class AdminUserListResponse(BaseModel):
    total: int
    items: list[AdminUserItem]


class AdminUserDetailResponse(AdminUserItem):
    email_confirmed_at: str | None = None
    banned_until: str | None = None


class UpdateRoleRequest(BaseModel):
    role: str = Field(..., description="'user' or 'admin'")

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ALLOWED_ROLES:
            raise ValueError(f"Role must be one of: {sorted(ALLOWED_ROLES)}")
        return normalized


class AdminStatsResponse(BaseModel):
    total_users: int
    total_admins: int
    total_pages: int
    total_qa: int


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _list_auth_users(page: int, per_page: int) -> tuple[list[dict[str, Any]], int]:
    """
    List Supabase auth users (paginated). Returns (users, total).
    Uses the service-role admin API.
    """
    supabase = get_supabase()
    try:
        result = supabase.auth.admin.list_users(page=page, per_page=per_page)
    except Exception as exc:
        logger.error("Failed to list auth users: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể tải danh sách người dùng.",
        ) from exc

    # supabase-py returns either a list or an object with .users depending on version
    if isinstance(result, list):
        users = result
    else:
        users = getattr(result, "users", None) or []

    # Best-effort total: list_users does not always return a total count.
    total = getattr(result, "total", None) or len(users)
    return users, int(total)


def _serialize_auth_user(au: Any) -> dict[str, Any]:
    """Normalize an auth user (supabase-py model or dict) to a flat dict."""
    if isinstance(au, dict):
        return au
    return {
        "id": getattr(au, "id", None),
        "email": getattr(au, "email", None),
        "created_at": getattr(au, "created_at", None),
        "last_sign_in_at": getattr(au, "last_sign_in_at", None),
        "email_confirmed_at": getattr(au, "email_confirmed_at", None),
        "banned_until": getattr(au, "banned_until", None),
    }


def _load_profile_map(user_ids: list[str]) -> dict[str, dict[str, Any]]:
    """Return {user_id: {username, role}} for the given user_ids."""
    if not user_ids:
        return {}
    try:
        res = (
            get_supabase()
            .table("profiles")
            .select("user_id, username, role")
            .in_("user_id", user_ids)
            .execute()
        )
        return {row["user_id"]: row for row in (res.data or [])}
    except Exception as exc:
        logger.warning("Failed to load profiles batch: %s", exc)
        return {}


def _count_for_user(table: str, user_id: str) -> int:
    try:
        res = (
            get_supabase()
            .table(table)
            .select("*", count="exact", head=True)
            .eq("user_id", user_id)
            .execute()
        )
        return res.count or 0
    except Exception as exc:
        logger.warning("Failed to count %s for user %s: %s", table, user_id, exc)
        return 0


def _count_rows(table: str, filters: dict[str, str] | None = None) -> int:
    try:
        query = get_supabase().table(table).select("*", count="exact", head=True)
        for column, value in (filters or {}).items():
            query = query.eq(column, value)
        res = query.execute()
        return res.count or 0
    except Exception as exc:
        logger.warning("Failed to count %s: %s", table, exc)
        return 0


def _to_iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    iso = getattr(value, "isoformat", None)
    if callable(iso):
        return iso()
    return str(value)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin: AuthUser = Depends(get_current_admin),
) -> AdminUserListResponse:
    """List users with their profile info and per-user stats."""
    page = (offset // limit) + 1
    auth_users, total = _list_auth_users(page=page, per_page=limit)

    serialized = [_serialize_auth_user(u) for u in auth_users]
    user_ids = [u["id"] for u in serialized if u.get("id")]
    profile_map = _load_profile_map(user_ids)

    items: list[AdminUserItem] = []
    for u in serialized:
        uid = u.get("id")
        if not uid:
            continue
        profile = profile_map.get(uid, {})
        items.append(
            AdminUserItem(
                id=uid,
                username=profile.get("username"),
                email=u.get("email"),
                role=(profile.get("role") or "user"),
                created_at=_to_iso(u.get("created_at")),
                last_sign_in_at=_to_iso(u.get("last_sign_in_at")),
                pages_count=_count_for_user("manga_pages", uid),
                qa_count=_count_for_user("qa_history", uid),
            )
        )

    return AdminUserListResponse(total=total, items=items)


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
def get_user(
    user_id: str,
    _admin: AuthUser = Depends(get_current_admin),
) -> AdminUserDetailResponse:
    """Fetch a single user's detail (auth info + profile + stats)."""
    supabase = get_supabase()
    try:
        result = supabase.auth.admin.get_user_by_id(user_id)
    except Exception as exc:
        logger.error("Failed to fetch auth user %s: %s", user_id, exc)
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.") from exc

    auth_user = getattr(result, "user", None) or result
    if not auth_user or not getattr(auth_user, "id", None):
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    flat = _serialize_auth_user(auth_user)
    profile = _load_profile_map([user_id]).get(user_id, {})

    return AdminUserDetailResponse(
        id=user_id,
        username=profile.get("username"),
        email=flat.get("email"),
        role=(profile.get("role") or "user"),
        created_at=_to_iso(flat.get("created_at")),
        last_sign_in_at=_to_iso(flat.get("last_sign_in_at")),
        email_confirmed_at=_to_iso(flat.get("email_confirmed_at")),
        banned_until=_to_iso(flat.get("banned_until")),
        pages_count=_count_for_user("manga_pages", user_id),
        qa_count=_count_for_user("qa_history", user_id),
    )


@router.patch("/users/{user_id}/role", response_model=AdminUserItem)
def update_user_role(
    user_id: str,
    payload: UpdateRoleRequest,
    admin_user: AuthUser = Depends(get_current_admin),
) -> AdminUserItem:
    """Change a user's role. Admins cannot demote themselves."""
    if user_id == admin_user.id and payload.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự gỡ quyền quản trị của chính mình.",
        )

    supabase = get_supabase()
    try:
        existing = (
            supabase.table("profiles")
            .select("user_id, username, role")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.error("Profile lookup failed for %s: %s", user_id, exc)
        raise HTTPException(status_code=503, detail="Không thể đọc hồ sơ người dùng.") from exc

    if not existing.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ người dùng.")

    try:
        supabase.table("profiles").update({"role": payload.role}).eq("user_id", user_id).execute()
    except Exception as exc:
        logger.error("Failed to update role for %s: %s", user_id, exc)
        raise HTTPException(status_code=503, detail="Cập nhật quyền thất bại.") from exc

    # Re-fetch the user for the response
    return get_user(user_id, _admin=admin_user)  # type: ignore[arg-type]


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    admin_user: AuthUser = Depends(get_current_admin),
) -> None:
    """Delete a user and cascade their data (pages, qa, profile)."""
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự xóa tài khoản của chính mình.",
        )

    supabase = get_supabase()
    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception as exc:
        logger.error("Failed to delete auth user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Xóa tài khoản thất bại.",
        ) from exc
    # The auth.users → profiles FK has ON DELETE CASCADE, which in turn cascades
    # manga_pages → bubble_data → translation_history / embeddings via FKs.


@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(_admin: AuthUser = Depends(get_current_admin)) -> AdminStatsResponse:
    """Return system-wide statistics."""
    return AdminStatsResponse(
        total_users=_count_rows("profiles"),
        total_admins=_count_rows("profiles", {"role": "admin"}),
        total_pages=_count_rows("manga_pages"),
        total_qa=_count_rows("qa_history"),
    )
