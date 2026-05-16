"""Lightweight bilingual messages for HTTPException.detail strings.

Why not a full i18n framework? The API surface is small and the only English
speakers we expect are global users hitting the public library / share links.
A simple lookup table + `t(key, request)` helper is enough.

Usage:
    from app.i18n import t
    raise HTTPException(404, detail=t("page_not_found", request))

When the request's ``Accept-Language`` starts with ``en`` we return English;
otherwise we return Vietnamese (default). Falls back to the literal key if
no translation is registered — so adding new messages incrementally is safe.
"""
from __future__ import annotations

from typing import Mapping

from starlette.requests import Request

_VI = "vi"
_EN = "en"

# (key) → (vi, en). Add new entries here as you go.
_MESSAGES: Mapping[str, tuple[str, str]] = {
    # Auth
    "auth_required": (
        "Vui lòng đăng nhập để tiếp tục.",
        "Please sign in to continue.",
    ),
    "auth_invalid_credentials": (
        "Email hoặc mật khẩu không đúng.",
        "Email or password is incorrect.",
    ),
    "auth_session_expired": (
        "Phiên đăng nhập đã hết hạn.",
        "Your session has expired.",
    ),
    "auth_email_taken": (
        "Email này đã được sử dụng.",
        "This email is already registered.",
    ),
    "auth_username_taken": (
        "Tên đăng nhập đã được sử dụng.",
        "This username is already taken.",
    ),
    "auth_weak_password": (
        "Mật khẩu chưa đủ mạnh (tối thiểu 8 ký tự).",
        "Password is too weak (minimum 8 characters).",
    ),
    "auth_current_password_wrong": (
        "Mật khẩu hiện tại không đúng.",
        "Current password is incorrect.",
    ),
    "auth_forbidden": (
        "Truy cập bị từ chối.",
        "Access denied.",
    ),
    "auth_admin_required": (
        "Cần quyền quản trị để thực hiện thao tác này.",
        "Admin permission required for this action.",
    ),

    # Resources
    "page_not_found": ("Không tìm thấy trang.", "Page not found."),
    "series_not_found": ("Không tìm thấy bộ truyện.", "Series not found."),
    "chapter_not_found": ("Không tìm thấy chương.", "Chapter not found."),
    "share_link_invalid": ("Liên kết không tồn tại.", "Share link not found."),
    "share_link_expired": ("Liên kết đã hết hạn.", "Share link has expired."),
    "batch_not_found": ("Batch không tồn tại.", "Batch not found."),

    # Pipeline
    "pipeline_terminal": (
        "Trang đã ở trạng thái cuối, không thể huỷ.",
        "Page is already in a terminal state; cannot cancel.",
    ),

    # Billing
    "stripe_not_configured": (
        "Thanh toán chưa được cấu hình. Vui lòng liên hệ admin.",
        "Payments are not configured. Please contact the administrator.",
    ),

    # Generic
    "service_unavailable": (
        "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.",
        "Service temporarily unavailable. Please try again later.",
    ),
    "rate_limited": (
        "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
        "Too many requests. Please try again in a few minutes.",
    ),
    "invalid_input": ("Dữ liệu không hợp lệ.", "Invalid input."),
    "upload_too_large": ("Tệp tải lên vượt quá giới hạn.", "Upload exceeds size limit."),
    "upload_invalid_type": (
        "Định dạng tệp không được hỗ trợ.",
        "Unsupported file type.",
    ),
}


def detect_locale(request: Request | None) -> str:
    """Return ``"en"`` if the request's Accept-Language asks for English,
    else default ``"vi"``. Robust against missing/malformed headers."""
    if request is None:
        return _VI
    raw = request.headers.get("accept-language", "")
    if not raw:
        return _VI
    # Take the highest-q-value language, ignore q parsing for simplicity.
    primary = raw.split(",", 1)[0].strip().lower()
    return _EN if primary.startswith("en") else _VI


def t(key: str, request: Request | None = None) -> str:
    """Translate `key` against the caller's Accept-Language."""
    entry = _MESSAGES.get(key)
    if entry is None:
        return key  # Surface the key itself if untranslated — easier to diagnose than silently returning ""
    vi, en = entry
    return en if detect_locale(request) == _EN else vi
