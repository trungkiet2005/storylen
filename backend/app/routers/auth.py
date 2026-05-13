"""
Production authentication endpoints backed by Supabase Auth.

The frontend never receives access or refresh tokens. Sessions are stored in
HTTP-only cookies and hydrated through /auth/me.
"""
from __future__ import annotations

import logging
import re
from datetime import date
from typing import Any

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile, status
from pydantic import BaseModel, Field, field_validator

from app.config import Settings, get_settings
from app.database import get_supabase
from app.rate_limit import limiter
from app.services.image_validation import verify_image_bytes
from app.storage.supabase_storage import delete_avatar, upload_avatar

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,32}$")
PHONE_RE = re.compile(r"^\+?[0-9\s\-().]{6,20}$")
ALLOWED_ROLES = {"user", "admin"}
ALLOWED_GENDERS = {"male", "female", "other", "prefer_not_to_say"}
ALLOWED_LOCALES = {"vi", "en", "ja", "zh", "ko"}
ALLOWED_TARGET_LANGS = {"VIN", "ENG", "JPN", "CHS", "KOR"}
PROFILE_FIELDS = (
    "user_id",
    "username",
    "role",
    "full_name",
    "display_name",
    "avatar_url",
    "bio",
    "locale",
    "timezone",
    "date_of_birth",
    "gender",
    "country",
    "phone",
    "preferred_target_lang",
    "created_at",
    "updated_at",
    "last_seen_at",
)
AVATAR_ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


class AuthUser(BaseModel):
    id: str
    username: str
    email: str
    role: str = "user"
    full_name: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    locale: str = "vi"
    timezone: str = "Asia/Ho_Chi_Minh"
    date_of_birth: date | None = None
    gender: str | None = None
    country: str | None = None
    phone: str | None = None
    preferred_target_lang: str = "VIN"
    created_at: str | None = None
    updated_at: str | None = None
    last_seen_at: str | None = None


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    display_name: str | None = Field(default=None, max_length=64)
    bio: str | None = Field(default=None, max_length=500)
    locale: str | None = None
    timezone: str | None = Field(default=None, max_length=64)
    date_of_birth: date | None = None
    gender: str | None = None
    country: str | None = Field(default=None, max_length=64)
    phone: str | None = Field(default=None, max_length=32)
    preferred_target_lang: str | None = None
    avatar_url: str | None = Field(default=None, max_length=1024)

    @field_validator("locale")
    @classmethod
    def check_locale(cls, value: str | None) -> str | None:
        if value is None:
            return None
        v = value.strip().lower()
        if v not in ALLOWED_LOCALES:
            raise ValueError(f"Ngôn ngữ không hợp lệ. Hỗ trợ: {', '.join(sorted(ALLOWED_LOCALES))}")
        return v

    @field_validator("preferred_target_lang")
    @classmethod
    def check_target_lang(cls, value: str | None) -> str | None:
        if value is None:
            return None
        v = value.strip().upper()
        if v not in ALLOWED_TARGET_LANGS:
            raise ValueError(f"Ngôn ngữ đích không hợp lệ. Hỗ trợ: {', '.join(sorted(ALLOWED_TARGET_LANGS))}")
        return v

    @field_validator("gender")
    @classmethod
    def check_gender(cls, value: str | None) -> str | None:
        if value is None:
            return None
        v = value.strip().lower()
        if v == "":
            return None
        if v not in ALLOWED_GENDERS:
            raise ValueError("Giới tính không hợp lệ.")
        return v

    @field_validator("phone")
    @classmethod
    def check_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        v = value.strip()
        if v == "":
            return None
        if not PHONE_RE.fullmatch(v):
            raise ValueError("Số điện thoại không hợp lệ.")
        return v

    @field_validator("full_name", "display_name", "bio", "country", "timezone", "avatar_url")
    @classmethod
    def trim_strings(cls, value: str | None) -> str | None:
        if value is None:
            return None
        v = value.strip()
        return v or None


class AuthResponse(BaseModel):
    authenticated: bool
    user: AuthUser | None = None
    requires_email_confirmation: bool = False
    message: str | None = None


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=256)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
            raise ValueError("Email không hợp lệ")
        return email


class RegisterRequest(LoginRequest):
    username: str = Field(min_length=3, max_length=32)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        username = value.strip()
        if not USERNAME_RE.fullmatch(username):
            raise ValueError("Tên đăng nhập chỉ gồm chữ, số, dấu gạch dưới và dài 3-32 ký tự")
        return username


def _cookie_secure(settings: Settings) -> bool:
    if settings.AUTH_COOKIE_SECURE is not None:
        return settings.AUTH_COOKIE_SECURE
    return not settings.DEBUG


def _cookie_domain(settings: Settings) -> str | None:
    return settings.AUTH_COOKIE_DOMAIN.strip() or None


def _auth_headers(settings: Settings, token: str | None = None) -> dict[str, str]:
    bearer = token or settings.SUPABASE_ANON_KEY
    return {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {bearer}",
        "Content-Type": "application/json",
    }


def _supabase_auth_url(settings: Settings, path: str) -> str:
    return f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/{path.lstrip('/')}"


def _friendly_auth_error(payload: dict[str, Any], fallback: str) -> str:
    code = payload.get("error_code") or payload.get("code") or payload.get("error")
    raw_message = payload.get("msg") or payload.get("message") or payload.get("error_description")

    messages = {
        "invalid_credentials": "Email hoặc mật khẩu không đúng.",
        "email_not_confirmed": "Email chưa được xác thực. Vui lòng kiểm tra hộp thư trước khi đăng nhập.",
        "email_exists": "Email này đã được sử dụng.",
        "user_already_exists": "Email này đã được sử dụng.",
        "weak_password": "Mật khẩu chưa đủ mạnh. Vui lòng dùng ít nhất 8 ký tự, có chữ và số.",
        "signup_disabled": "Hệ thống hiện chưa mở đăng ký tài khoản mới.",
        "over_email_send_rate_limit": "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
        "over_request_rate_limit": "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
    }
    return messages.get(str(code), str(raw_message or fallback))


def _raise_auth_error(exc: httpx.HTTPStatusError, fallback: str) -> None:
    try:
        payload = exc.response.json()
    except ValueError:
        payload = {}
    detail = _friendly_auth_error(payload, fallback)
    status_code = exc.response.status_code
    if status_code >= 500:
        detail = "Dịch vụ đăng nhập đang gặp sự cố. Vui lòng thử lại sau."
    raise HTTPException(status_code=status_code, detail=detail) from exc


def _request_auth(
    method: str,
    path: str,
    *,
    settings: Settings,
    token: str | None = None,
    json: dict[str, Any] | None = None,
) -> dict[str, Any]:
    try:
        with httpx.Client(timeout=15.0) as client:
            res = client.request(
                method,
                _supabase_auth_url(settings, path),
                headers=_auth_headers(settings, token),
                json=json,
            )
            res.raise_for_status()
            return res.json()
    except httpx.HTTPStatusError as exc:
        _raise_auth_error(exc, "Xác thực thất bại.")
    except httpx.RequestError as exc:
        logger.warning("Supabase Auth request failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể kết nối dịch vụ đăng nhập. Vui lòng thử lại sau.",
        ) from exc


def _get_profile(user_id: str) -> dict[str, Any] | None:
    try:
        result = (
            get_supabase()
            .table("profiles")
            .select(", ".join(PROFILE_FIELDS))
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception as exc:
        logger.warning("Failed to load profile for %s: %s", user_id, exc)
    return None


def _as_iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    try:
        return value.isoformat()
    except Exception:
        return str(value)


def _as_date(value: Any) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except Exception:
        return None


def _get_profile_username(user_id: str) -> str | None:
    profile = _get_profile(user_id)
    return profile.get("username") if profile else None


def _username_available(username: str) -> bool:
    try:
        result = (
            get_supabase()
            .table("profiles")
            .select("user_id")
            .eq("username", username)
            .limit(1)
            .execute()
        )
        return not bool(result.data)
    except Exception as exc:
        logger.warning("Failed to check username availability: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể kiểm tra tên đăng nhập lúc này.",
        ) from exc


def _ensure_profile(user_id: str, username: str | None = None) -> str | None:
    current_username = _get_profile_username(user_id)
    next_username = username or current_username
    if not next_username:
        return None

    try:
        if current_username:
            if username and username != current_username:
                get_supabase().table("profiles").update({"username": username}).eq("user_id", user_id).execute()
        else:
            get_supabase().table("profiles").insert({"user_id": user_id, "username": next_username}).execute()
    except Exception as exc:
        logger.warning("Failed to upsert profile for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tên đăng nhập đã tồn tại hoặc hồ sơ không thể được tạo.",
        ) from exc

    return next_username


def _to_auth_user(payload: dict[str, Any], username: str | None = None) -> AuthUser:
    user_metadata = payload.get("user_metadata") or {}
    email = str(payload.get("email") or "")
    user_id = str(payload["id"])
    profile = _get_profile(user_id) or {}
    resolved_username = (
        username
        or profile.get("username")
        or user_metadata.get("username")
        or user_metadata.get("name")
        or email.split("@", 1)[0]
        or "user"
    )
    role = profile.get("role") or "user"
    if role not in ALLOWED_ROLES:
        role = "user"
    return AuthUser(
        id=user_id,
        username=str(resolved_username),
        email=email,
        role=role,
        full_name=profile.get("full_name"),
        display_name=profile.get("display_name"),
        avatar_url=profile.get("avatar_url"),
        bio=profile.get("bio"),
        locale=profile.get("locale") or "vi",
        timezone=profile.get("timezone") or "Asia/Ho_Chi_Minh",
        date_of_birth=_as_date(profile.get("date_of_birth")),
        gender=profile.get("gender"),
        country=profile.get("country"),
        phone=profile.get("phone"),
        preferred_target_lang=profile.get("preferred_target_lang") or "VIN",
        created_at=_as_iso(profile.get("created_at")),
        updated_at=_as_iso(profile.get("updated_at")),
        last_seen_at=_as_iso(profile.get("last_seen_at")),
    )


def _session_from_payload(payload: dict[str, Any]) -> dict[str, Any] | None:
    if payload.get("access_token") and payload.get("refresh_token"):
        return payload
    session = payload.get("session")
    if isinstance(session, dict) and session.get("access_token") and session.get("refresh_token"):
        return session
    return None


def _user_from_payload(payload: dict[str, Any]) -> dict[str, Any] | None:
    user = payload.get("user")
    if isinstance(user, dict):
        return user
    session = payload.get("session")
    if isinstance(session, dict) and isinstance(session.get("user"), dict):
        return session["user"]
    if payload.get("id") and (payload.get("email") or payload.get("user_metadata") is not None):
        return payload
    return None


def _set_session_cookies(response: Response, session: dict[str, Any], settings: Settings) -> None:
    cookie_options = {
        "httponly": True,
        "secure": _cookie_secure(settings),
        "samesite": settings.AUTH_COOKIE_SAMESITE,
        "domain": _cookie_domain(settings),
        "path": "/",
    }
    response.set_cookie(
        settings.AUTH_ACCESS_COOKIE_NAME,
        session["access_token"],
        max_age=int(session.get("expires_in") or 3600),
        **cookie_options,
    )
    response.set_cookie(
        settings.AUTH_REFRESH_COOKIE_NAME,
        session["refresh_token"],
        max_age=settings.AUTH_REFRESH_COOKIE_MAX_AGE_SECONDS,
        **cookie_options,
    )


def _clear_session_cookies(response: Response, settings: Settings) -> None:
    cookie_options = {
        "secure": _cookie_secure(settings),
        "samesite": settings.AUTH_COOKIE_SAMESITE,
        "domain": _cookie_domain(settings),
        "path": "/",
    }
    response.delete_cookie(settings.AUTH_ACCESS_COOKIE_NAME, **cookie_options)
    response.delete_cookie(settings.AUTH_REFRESH_COOKIE_NAME, **cookie_options)


def _refresh_session(refresh_token: str, response: Response, settings: Settings) -> dict[str, Any]:
    payload = _request_auth(
        "POST",
        "token?grant_type=refresh_token",
        settings=settings,
        json={"refresh_token": refresh_token},
    )
    session = _session_from_payload(payload)
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Phiên đăng nhập đã hết hạn.")
    _set_session_cookies(response, session, settings)
    return session


def get_current_user(
    request: Request,
    response: Response,
    settings: Settings = Depends(get_settings),
) -> AuthUser:
    access_token = request.cookies.get(settings.AUTH_ACCESS_COOKIE_NAME)
    refresh_token = request.cookies.get(settings.AUTH_REFRESH_COOKIE_NAME)

    if not access_token and not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Chưa đăng nhập.")

    if access_token:
        try:
            payload = _request_auth("GET", "user", settings=settings, token=access_token)
            user = _user_from_payload(payload) or payload
            return _to_auth_user(user)
        except HTTPException as exc:
            if exc.status_code not in {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN}:
                raise

    if not refresh_token:
        _clear_session_cookies(response, settings)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Phiên đăng nhập đã hết hạn.")

    session = _refresh_session(refresh_token, response, settings)
    return _to_auth_user(session["user"])


def get_current_admin(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """Require the caller to be an admin. Returns the user or 403."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cần quyền quản trị để thực hiện thao tác này.",
        )
    return user


@router.post("/register", response_model=AuthResponse)
@limiter.limit(lambda: get_settings().RATE_LIMIT_REGISTER)
def register(request: Request, payload: RegisterRequest, response: Response, settings: Settings = Depends(get_settings)) -> AuthResponse:
    if not _username_available(payload.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tên đăng nhập đã được sử dụng.")

    data = _request_auth(
        "POST",
        "signup",
        settings=settings,
        json={
            "email": payload.email,
            "password": payload.password,
            "data": {"username": payload.username},
        },
    )
    user_payload = _user_from_payload(data)
    if not user_payload:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Không nhận được dữ liệu tài khoản.")

    username = _ensure_profile(str(user_payload["id"]), payload.username)
    session = _session_from_payload(data)
    user = _to_auth_user(user_payload, username)

    if not session:
        return AuthResponse(
            authenticated=False,
            user=user,
            requires_email_confirmation=True,
            message="Tài khoản đã được tạo. Vui lòng kiểm tra email để xác thực trước khi đăng nhập.",
        )

    _set_session_cookies(response, session, settings)
    return AuthResponse(authenticated=True, user=user)


@router.post("/login", response_model=AuthResponse)
@limiter.limit(lambda: get_settings().RATE_LIMIT_LOGIN)
def login(request: Request, payload: LoginRequest, response: Response, settings: Settings = Depends(get_settings)) -> AuthResponse:
    data = _request_auth(
        "POST",
        "token?grant_type=password",
        settings=settings,
        json={"email": payload.email, "password": payload.password},
    )
    session = _session_from_payload(data)
    user_payload = _user_from_payload(data)
    if not session or not user_payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email hoặc mật khẩu không đúng.")

    username = _ensure_profile(str(user_payload["id"]), None)
    _set_session_cookies(response, session, settings)
    return AuthResponse(authenticated=True, user=_to_auth_user(user_payload, username))


@router.get("/me", response_model=AuthResponse)
def me(user: AuthUser = Depends(get_current_user)) -> AuthResponse:
    return AuthResponse(authenticated=True, user=user)


@router.patch("/me", response_model=AuthResponse)
def update_me(
    payload: ProfileUpdateRequest,
    user: AuthUser = Depends(get_current_user),
) -> AuthResponse:
    updates: dict[str, Any] = {}
    for field, value in payload.model_dump(exclude_unset=True).items():
        if isinstance(value, date):
            updates[field] = value.isoformat()
        else:
            updates[field] = value

    if not updates:
        return AuthResponse(authenticated=True, user=user)

    try:
        get_supabase().table("profiles").update(updates).eq("user_id", user.id).execute()
    except Exception as exc:
        logger.warning("Profile update failed for %s: %s", user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể cập nhật hồ sơ lúc này.",
        ) from exc

    refreshed = _to_auth_user({"id": user.id, "email": user.email})
    return AuthResponse(authenticated=True, user=refreshed, message="Đã cập nhật hồ sơ.")


@router.post("/me/avatar", response_model=AuthResponse)
async def upload_me_avatar(
    file: UploadFile = File(...),
    user: AuthUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    if content_type not in AVATAR_ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar phải là JPG, PNG hoặc WebP.",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tệp tải lên rỗng.")
    max_bytes = settings.MAX_AVATAR_SIZE_MB * 1024 * 1024
    if len(image_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Avatar vượt quá {settings.MAX_AVATAR_SIZE_MB} MB.",
        )

    try:
        verify_image_bytes(image_bytes)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar không phải ảnh hợp lệ.",
        ) from exc

    try:
        public_url = upload_avatar(image_bytes, user.id)
    except RuntimeError as exc:
        logger.warning("Avatar upload failed for %s: %s", user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể tải avatar lên lúc này.",
        ) from exc

    try:
        get_supabase().table("profiles").update({"avatar_url": public_url}).eq("user_id", user.id).execute()
    except Exception as exc:
        logger.warning("Avatar URL persist failed for %s: %s", user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Đã tải avatar nhưng không lưu được hồ sơ.",
        ) from exc

    refreshed = _to_auth_user({"id": user.id, "email": user.email})
    return AuthResponse(authenticated=True, user=refreshed, message="Đã cập nhật avatar.")


@router.delete("/me/avatar", response_model=AuthResponse)
def remove_me_avatar(user: AuthUser = Depends(get_current_user)) -> AuthResponse:
    delete_avatar(user.id)
    try:
        get_supabase().table("profiles").update({"avatar_url": None}).eq("user_id", user.id).execute()
    except Exception as exc:
        logger.warning("Avatar clear failed for %s: %s", user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể gỡ avatar lúc này.",
        ) from exc

    refreshed = _to_auth_user({"id": user.id, "email": user.email})
    return AuthResponse(authenticated=True, user=refreshed, message="Đã gỡ avatar.")


@router.post("/logout", response_model=AuthResponse)
def logout(
    request: Request,
    response: Response,
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    access_token = request.cookies.get(settings.AUTH_ACCESS_COOKIE_NAME)
    if access_token:
        try:
            _request_auth("POST", "logout", settings=settings, token=access_token, json={})
        except HTTPException as exc:
            if exc.status_code >= 500:
                raise
    _clear_session_cookies(response, settings)
    return AuthResponse(authenticated=False, message="Đã đăng xuất.")
