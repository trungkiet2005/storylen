"""
Admin · User management (advanced).

Endpoints (mounted under /admin/users by __init__.py):
    GET    /            list users with filters / search / sort
    GET    /{user_id}   user detail with stats
    PATCH  /{user_id}/role          promote / demote
    PATCH  /{user_id}/profile       edit profile fields
    POST   /{user_id}/ban           ban for a duration
    POST   /{user_id}/unban         lift a ban
    POST   /{user_id}/password-reset send a password-recovery link
    POST   /{user_id}/resend-verification
    DELETE /{user_id}               delete user + cascade
    POST   /bulk-delete             delete N users in one call
"""
from __future__ import annotations

import logging
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field, field_validator

from app.database import get_supabase
from app.routers.auth import ALLOWED_ROLES, AuthUser, ProfileUpdateRequest, get_current_admin

from .deps import (
    audit,
    count_for_user,
    load_profile_map,
    logger as admin_logger,
    serialize_auth_user,
    to_iso,
)

router = APIRouter(prefix="/users", tags=["admin"])
logger = logging.getLogger(__name__)

# Supabase auth.admin.list_users is hard-capped at 1000/page server-side.
_AUTH_PAGE_SIZE = 200
_BAN_DURATION_RE = re.compile(r"^\d+(s|m|h|d|w)$")


# ─── Schemas ──────────────────────────────────────────────────────────────────

class AdminUserItem(BaseModel):
    id: str
    username: str | None
    email: str | None
    role: str
    avatar_url: str | None = None
    display_name: str | None = None
    full_name: str | None = None
    created_at: str | None = None
    last_sign_in_at: str | None = None
    last_seen_at: str | None = None
    banned_until: str | None = None
    email_confirmed: bool = False
    pages_count: int = 0
    qa_count: int = 0


class AdminUserListResponse(BaseModel):
    total: int
    items: list[AdminUserItem]


class AdminUserDetailResponse(AdminUserItem):
    bio: str | None = None
    locale: str | None = None
    timezone: str | None = None
    country: str | None = None
    phone: str | None = None
    preferred_target_lang: str | None = None
    email_confirmed_at: str | None = None
    translations_count: int = 0


class UpdateRoleRequest(BaseModel):
    role: str = Field(..., description="'user' or 'admin'")

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ALLOWED_ROLES:
            raise ValueError(f"Role must be one of: {sorted(ALLOWED_ROLES)}")
        return normalized


class BanRequest(BaseModel):
    duration: str = Field(
        default="24h",
        description='Ban duration in Supabase format: "30m", "24h", "7d", "999999h" (~forever).',
    )
    reason: str | None = Field(default=None, max_length=500)

    @field_validator("duration")
    @classmethod
    def validate_duration(cls, value: str) -> str:
        v = value.strip().lower()
        if not _BAN_DURATION_RE.fullmatch(v):
            raise ValueError("Thời lượng không hợp lệ. Ví dụ: 30m, 24h, 7d, 999999h.")
        return v


class BulkDeleteRequest(BaseModel):
    user_ids: list[str] = Field(..., min_length=1, max_length=100)


class BulkActionResponse(BaseModel):
    succeeded: list[str]
    failed: list[dict[str, str]]


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _list_auth_page(page: int, per_page: int) -> tuple[list[dict[str, Any]], int]:
    """Wrap supabase.auth.admin.list_users so callers always get (list, total)."""
    supabase = get_supabase()
    try:
        result = supabase.auth.admin.list_users(page=page, per_page=per_page)
    except Exception as exc:
        logger.error("auth.admin.list_users failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể tải danh sách người dùng.",
        ) from exc

    users = result if isinstance(result, list) else (getattr(result, "users", None) or [])
    total = getattr(result, "total", None) or len(users)
    return [serialize_auth_user(u) for u in users], int(total)


def _list_all_auth_users() -> list[dict[str, Any]]:
    """Page through every auth user. Use when we need search / sort across the set."""
    out: list[dict[str, Any]] = []
    page = 1
    while True:
        chunk, _ = _list_auth_page(page=page, per_page=_AUTH_PAGE_SIZE)
        if not chunk:
            break
        out.extend(chunk)
        if len(chunk) < _AUTH_PAGE_SIZE:
            break
        page += 1
        if page > 50:  # 10k user safety stop
            logger.warning("list_all_auth_users: aborting after 50 pages")
            break
    return out


def _build_item(auth_user: dict[str, Any], profile: dict[str, Any]) -> AdminUserItem:
    uid = auth_user.get("id") or profile.get("user_id")
    return AdminUserItem(
        id=str(uid),
        username=profile.get("username"),
        email=auth_user.get("email"),
        role=profile.get("role") or "user",
        avatar_url=profile.get("avatar_url"),
        display_name=profile.get("display_name"),
        full_name=profile.get("full_name"),
        created_at=to_iso(auth_user.get("created_at") or profile.get("created_at")),
        last_sign_in_at=to_iso(auth_user.get("last_sign_in_at")),
        last_seen_at=to_iso(profile.get("last_seen_at")),
        banned_until=to_iso(auth_user.get("banned_until")),
        email_confirmed=bool(auth_user.get("email_confirmed_at")),
        pages_count=count_for_user("manga_pages", uid),
        qa_count=count_for_user("qa_history", uid),
    )


def _filter_users(
    users: list[dict[str, Any]],
    profiles: dict[str, dict[str, Any]],
    *,
    search: str | None,
    role: str | None,
    status_filter: str | None,
) -> list[dict[str, Any]]:
    if not (search or role or status_filter):
        return users

    needle = (search or "").strip().lower()
    out: list[dict[str, Any]] = []
    for u in users:
        uid = u.get("id")
        if not uid:
            continue
        profile = profiles.get(uid, {})

        if role and role != "all" and (profile.get("role") or "user") != role:
            continue

        if status_filter == "banned":
            if not u.get("banned_until"):
                continue
        elif status_filter == "unverified":
            if u.get("email_confirmed_at"):
                continue
        elif status_filter == "active":
            if u.get("banned_until") or not u.get("email_confirmed_at"):
                continue

        if needle:
            haystack = " ".join(
                str(x).lower()
                for x in [
                    u.get("email"),
                    profile.get("username"),
                    profile.get("display_name"),
                    profile.get("full_name"),
                    uid,
                ]
                if x
            )
            if needle not in haystack:
                continue

        out.append(u)
    return out


def _sort_users(
    users: list[dict[str, Any]],
    profiles: dict[str, dict[str, Any]],
    sort: str,
) -> list[dict[str, Any]]:
    key, _, direction = sort.partition(":")
    reverse = direction.lower() != "asc"

    def _value(u: dict[str, Any]) -> Any:
        profile = profiles.get(u.get("id"), {})
        if key == "email":
            return (u.get("email") or "").lower()
        if key == "username":
            return (profile.get("username") or "").lower()
        if key == "role":
            return profile.get("role") or "user"
        if key == "last_sign_in_at":
            return u.get("last_sign_in_at") or ""
        # default: created_at
        return u.get("created_at") or ""

    return sorted(users, key=_value, reverse=reverse)


def _get_auth_user(user_id: str) -> dict[str, Any]:
    try:
        result = get_supabase().auth.admin.get_user_by_id(user_id)
    except Exception as exc:
        logger.warning("auth.admin.get_user_by_id failed for %s: %s", user_id, exc)
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.") from exc
    obj = getattr(result, "user", None) or result
    if not obj or not getattr(obj, "id", None):
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    return serialize_auth_user(obj)


def _update_auth_user(user_id: str, attributes: dict[str, Any]) -> None:
    try:
        get_supabase().auth.admin.update_user_by_id(user_id, attributes)
    except Exception as exc:
        logger.error("auth.admin.update_user_by_id failed for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể cập nhật người dùng.",
        ) from exc


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=AdminUserListResponse)
def list_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None, max_length=120),
    role: str | None = Query(None, pattern="^(user|admin|all)$"),
    user_status: str | None = Query(
        None,
        alias="status",
        pattern="^(all|active|banned|unverified)$",
    ),
    sort: str = Query("created_at:desc", max_length=64),
    _admin: AuthUser = Depends(get_current_admin),
) -> AdminUserListResponse:
    """
    List users. When any filter / search / non-default sort is provided we
    page through the full set on the server to compute the answer; otherwise
    we use a single paginated auth call for efficiency.
    """
    needs_full_scan = bool(search or (role and role != "all") or (user_status and user_status != "all") or sort != "created_at:desc")

    if not needs_full_scan:
        page = (offset // limit) + 1
        page_users, total = _list_auth_page(page=page, per_page=limit)
        profiles = load_profile_map([u["id"] for u in page_users if u.get("id")])
        items = [_build_item(u, profiles.get(u.get("id"), {})) for u in page_users if u.get("id")]
        return AdminUserListResponse(total=total, items=items)

    all_users = _list_all_auth_users()
    profiles = load_profile_map([u["id"] for u in all_users if u.get("id")])
    filtered = _filter_users(all_users, profiles, search=search, role=role, status_filter=user_status)
    sorted_users = _sort_users(filtered, profiles, sort)
    page_slice = sorted_users[offset : offset + limit]
    items = [_build_item(u, profiles.get(u.get("id"), {})) for u in page_slice if u.get("id")]
    return AdminUserListResponse(total=len(sorted_users), items=items)


@router.get("/{user_id}", response_model=AdminUserDetailResponse)
def get_user(
    user_id: str,
    _admin: AuthUser = Depends(get_current_admin),
) -> AdminUserDetailResponse:
    auth_user = _get_auth_user(user_id)
    profile = load_profile_map([user_id]).get(user_id, {}) or _profile_row(user_id)

    base = _build_item(auth_user, profile).model_dump()
    base.update(
        bio=profile.get("bio"),
        locale=profile.get("locale"),
        timezone=profile.get("timezone"),
        country=profile.get("country"),
        phone=profile.get("phone"),
        preferred_target_lang=profile.get("preferred_target_lang"),
        email_confirmed_at=to_iso(auth_user.get("email_confirmed_at")),
        translations_count=_count_user_translations(user_id),
    )
    return AdminUserDetailResponse(**base)


def _profile_row(user_id: str) -> dict[str, Any]:
    try:
        res = (
            get_supabase()
            .table("profiles")
            .select("*")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        return res.data or {}
    except Exception as exc:
        admin_logger.warning("profile row fetch failed: %s", exc)
        return {}


def _count_user_translations(user_id: str) -> int:
    try:
        res = (
            get_supabase()
            .table("translation_history")
            .select("*", count="exact", head=True)
            .eq("user_id", user_id)
            .execute()
        )
        return int(res.count or 0)
    except Exception:
        return 0


@router.patch("/{user_id}/role", response_model=AdminUserItem)
def update_user_role(
    user_id: str,
    payload: UpdateRoleRequest,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> AdminUserItem:
    if user_id == admin_user.id and payload.role != "admin":
        raise HTTPException(status_code=400, detail="Không thể tự gỡ quyền quản trị của chính mình.")

    supabase = get_supabase()
    existing = supabase.table("profiles").select("user_id, role").eq("user_id", user_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ người dùng.")

    old_role = existing.data.get("role") or "user"
    if old_role == payload.role:
        # No-op; still return current state.
        auth_user = _get_auth_user(user_id)
        return _build_item(auth_user, _profile_row(user_id))

    try:
        supabase.table("profiles").update({"role": payload.role}).eq("user_id", user_id).execute()
    except Exception as exc:
        logger.error("role update failed for %s: %s", user_id, exc)
        raise HTTPException(status_code=503, detail="Cập nhật quyền thất bại.") from exc

    audit(
        admin_user,
        "user.update_role",
        request=request,
        target_type="user",
        target_id=user_id,
        summary=f"Đổi quyền {old_role} → {payload.role}",
        metadata={"from": old_role, "to": payload.role},
    )

    auth_user = _get_auth_user(user_id)
    return _build_item(auth_user, _profile_row(user_id))


@router.patch("/{user_id}/profile", response_model=AdminUserDetailResponse)
def update_user_profile(
    user_id: str,
    payload: ProfileUpdateRequest,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> AdminUserDetailResponse:
    """Admin edit of any user's profile (re-uses the public profile validator)."""
    updates: dict[str, Any] = {}
    for field, value in payload.model_dump(exclude_unset=True).items():
        if hasattr(value, "isoformat"):
            updates[field] = value.isoformat()
        else:
            updates[field] = value

    if not updates:
        return get_user(user_id, _admin=admin_user)

    try:
        get_supabase().table("profiles").update(updates).eq("user_id", user_id).execute()
    except Exception as exc:
        logger.error("admin profile update failed for %s: %s", user_id, exc)
        raise HTTPException(status_code=503, detail="Không thể cập nhật hồ sơ.") from exc

    audit(
        admin_user,
        "user.update_profile",
        request=request,
        target_type="user",
        target_id=user_id,
        summary=f"Cập nhật hồ sơ ({', '.join(updates.keys())})",
        metadata={"fields": sorted(updates.keys())},
    )
    return get_user(user_id, _admin=admin_user)


@router.post("/{user_id}/ban", response_model=AdminUserItem)
def ban_user(
    user_id: str,
    payload: BanRequest,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> AdminUserItem:
    if user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Không thể tự khoá tài khoản của chính mình.")
    _update_auth_user(user_id, {"ban_duration": payload.duration})
    audit(
        admin_user,
        "user.ban",
        request=request,
        target_type="user",
        target_id=user_id,
        summary=f"Khoá tài khoản ({payload.duration})",
        metadata={"duration": payload.duration, "reason": payload.reason},
    )
    return _build_item(_get_auth_user(user_id), _profile_row(user_id))


@router.post("/{user_id}/unban", response_model=AdminUserItem)
def unban_user(
    user_id: str,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> AdminUserItem:
    _update_auth_user(user_id, {"ban_duration": "none"})
    audit(
        admin_user,
        "user.unban",
        request=request,
        target_type="user",
        target_id=user_id,
        summary="Mở khoá tài khoản",
    )
    return _build_item(_get_auth_user(user_id), _profile_row(user_id))


@router.post("/{user_id}/password-reset")
def send_password_reset(
    user_id: str,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> dict[str, str]:
    auth_user = _get_auth_user(user_id)
    email = auth_user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Người dùng không có email.")
    try:
        get_supabase().auth.admin.generate_link({"type": "recovery", "email": email})
    except Exception as exc:
        logger.error("generate_link(recovery) failed for %s: %s", user_id, exc)
        raise HTTPException(status_code=503, detail="Không thể gửi link khôi phục mật khẩu.") from exc

    audit(
        admin_user,
        "user.password_reset",
        request=request,
        target_type="user",
        target_id=user_id,
        summary="Gửi link đặt lại mật khẩu",
    )
    return {"message": f"Đã gửi link khôi phục mật khẩu tới {email}."}


@router.post("/{user_id}/resend-verification")
def resend_verification(
    user_id: str,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> dict[str, str]:
    auth_user = _get_auth_user(user_id)
    if auth_user.get("email_confirmed_at"):
        return {"message": "Email đã được xác thực, không cần gửi lại."}
    email = auth_user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Người dùng không có email.")
    try:
        get_supabase().auth.admin.generate_link({"type": "signup", "email": email})
    except Exception as exc:
        logger.error("generate_link(signup) failed for %s: %s", user_id, exc)
        raise HTTPException(status_code=503, detail="Không thể gửi lại email xác thực.") from exc

    audit(
        admin_user,
        "user.resend_verification",
        request=request,
        target_type="user",
        target_id=user_id,
        summary="Gửi lại email xác thực",
    )
    return {"message": f"Đã gửi lại email xác thực tới {email}."}


@router.delete("/{user_id}", status_code=204, response_class=Response)
def delete_user(
    user_id: str,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> Response:
    if user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Không thể tự xoá tài khoản của chính mình.")
    try:
        get_supabase().auth.admin.delete_user(user_id)
    except Exception as exc:
        logger.error("auth.admin.delete_user failed for %s: %s", user_id, exc)
        raise HTTPException(status_code=503, detail="Xoá tài khoản thất bại.") from exc

    audit(
        admin_user,
        "user.delete",
        request=request,
        target_type="user",
        target_id=user_id,
        summary="Xoá tài khoản",
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/bulk-delete", response_model=BulkActionResponse)
def bulk_delete_users(
    payload: BulkDeleteRequest,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> BulkActionResponse:
    succeeded: list[str] = []
    failed: list[dict[str, str]] = []
    supabase = get_supabase()
    for uid in payload.user_ids:
        if uid == admin_user.id:
            failed.append({"user_id": uid, "error": "Không thể tự xoá."})
            continue
        try:
            supabase.auth.admin.delete_user(uid)
            succeeded.append(uid)
        except Exception as exc:
            failed.append({"user_id": uid, "error": str(exc)[:200]})

    audit(
        admin_user,
        "user.bulk_delete",
        request=request,
        target_type="user",
        target_id=None,
        summary=f"Xoá hàng loạt: {len(succeeded)} thành công / {len(failed)} thất bại",
        metadata={"succeeded": succeeded, "failed": failed},
    )
    return BulkActionResponse(succeeded=succeeded, failed=failed)
