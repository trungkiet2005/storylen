"""
StoryLens Backend — Forum service.

Cross-cutting helpers for the forum router: mention parsing, notification
dispatch, hot-score computation. Database denormalization (score/reply_count/
hot_score) is handled by Postgres triggers in supabase_migration_v5_forum.sql;
this module only deals with side-effects (notifications).
"""
from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from math import log10
from pathlib import Path
from typing import Any, Iterable

logger = logging.getLogger(__name__)

_MENTION_RE = re.compile(r"(?<!\w)@([A-Za-z0-9_]{3,30})")
_EPOCH = datetime(2025, 1, 1, tzinfo=timezone.utc)


def extract_mentions(text: str) -> list[str]:
    """Return a deduplicated list of @usernames mentioned in text (case-sensitive match,
    deduped case-insensitive). Usernames are 3-30 chars, [A-Za-z0-9_]."""
    if not text:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for match in _MENTION_RE.finditer(text):
        uname = match.group(1)
        key = uname.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(uname)
    return out


def _resolve_usernames_to_ids(usernames: Iterable[str]) -> dict[str, str]:
    """Look up profiles.user_id for each username. Returns {lowercase_username: user_id}."""
    from app.database import get_supabase  # deferred to keep pure helpers import-light
    sb = get_supabase()
    usernames = list({u.lower() for u in usernames})
    if not usernames:
        return {}
    try:
        rows = (
            sb.table("profiles")
            .select("user_id, username")
            .in_("username", usernames)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.warning("resolve_usernames failed: %s", exc)
        return {}
    return {(r.get("username") or "").lower(): r["user_id"] for r in rows if r.get("user_id")}


def notify_mentions(
    *,
    author_id: str,
    author_username: str | None,
    body: str,
    thread_id: str,
    thread_title: str,
) -> None:
    """Emit a 'forum_mention' notification for each unique @user mentioned in body.
    Skip self-mentions. Silently no-ops if the notifications table is unavailable."""
    mentions = extract_mentions(body)
    if not mentions:
        return

    id_map = _resolve_usernames_to_ids(mentions)
    if not id_map:
        return

    from app.routers.notifications import emit_notification  # deferred import

    label = author_username or "Ai đó"
    url = f"/forum/{thread_id}"
    short_title = thread_title if len(thread_title) <= 80 else thread_title[:77] + "…"

    for uname_lc, target_uid in id_map.items():
        if target_uid == author_id:
            continue
        emit_notification(
            target_uid,
            type="forum_mention",
            title=f"@{label} đã nhắc đến bạn",
            body=f"Trong thread: {short_title}",
            url=url,
        )


def notify_reply_to_owner(
    *,
    author_id: str,
    author_username: str | None,
    parent_owner_id: str | None,
    parent_kind: str,  # "thread" or "reply"
    thread_id: str,
    thread_title: str,
) -> None:
    """Notify the owner of a thread/reply that someone replied to them. Skip self-replies."""
    if not parent_owner_id or parent_owner_id == author_id:
        return
    from app.routers.notifications import emit_notification  # deferred import

    label = author_username or "Ai đó"
    url = f"/forum/{thread_id}"
    short_title = thread_title if len(thread_title) <= 80 else thread_title[:77] + "…"
    if parent_kind == "thread":
        title = f"@{label} đã trả lời thread của bạn"
    else:
        title = f"@{label} đã trả lời bình luận của bạn"
    emit_notification(
        parent_owner_id,
        type="forum_reply",
        title=title,
        body=f"Trong thread: {short_title}",
        url=url,
    )


# ─── Attachments ────────────────────────────────────────────────────────────

_MIME_TO_EXT: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
}

_ATTACHMENT_KEYS = {"type", "url", "mime", "size", "width", "height", "thumbnail_url"}


def upload_forum_attachment(*, content: bytes, mime: str, owner_id: str) -> dict:
    """Upload bytes to the forum bucket and return a normalized attachment dict.

    Validates mime against the allowlist + per-type size cap. Raises ValueError
    on policy violations; the router converts these to HTTP 400.
    """
    from app.config import get_settings
    from app.database import get_supabase

    settings = get_settings()
    size = len(content)

    image_mimes = set(settings.FORUM_ALLOWED_IMAGE_MIMES)
    video_mimes = set(settings.FORUM_ALLOWED_VIDEO_MIMES)
    if mime in image_mimes:
        kind = "image"
        max_bytes = settings.FORUM_MAX_IMAGE_MB * 1024 * 1024
    elif mime in video_mimes:
        kind = "video"
        max_bytes = settings.FORUM_MAX_VIDEO_MB * 1024 * 1024
    else:
        raise ValueError(f"Loại file không hỗ trợ: {mime}")

    if size <= 0:
        raise ValueError("File rỗng.")
    if size > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise ValueError(f"File vượt quá {limit_mb}MB.")

    ext = _MIME_TO_EXT.get(mime, "")
    storage_path = f"{owner_id}/{uuid.uuid4().hex}{ext}"

    sb = get_supabase()
    try:
        sb.storage.from_(settings.FORUM_BUCKET).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": mime, "upsert": "false"},
        )
    except Exception as exc:
        logger.error("forum upload to %s/%s failed: %s", settings.FORUM_BUCKET, storage_path, exc)
        raise RuntimeError("Không upload được file.") from exc

    public_url: str
    try:
        resp = sb.storage.from_(settings.FORUM_BUCKET).get_public_url(storage_path)
        if isinstance(resp, str) and resp.startswith("http"):
            public_url = resp
        else:
            public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{settings.FORUM_BUCKET}/{storage_path}"
    except Exception:
        public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{settings.FORUM_BUCKET}/{storage_path}"

    return {
        "type": kind,
        "url": public_url,
        "mime": mime,
        "size": size,
        "width": None,
        "height": None,
        "thumbnail_url": None,
    }


def normalize_attachments(raw: Any, max_count: int) -> list[dict]:
    """Sanitize a client-supplied attachments array.

    Drops unknown keys, validates structure, enforces max_count. Returns a
    list of dicts safe to persist to the JSONB column. Raises ValueError on
    structural problems.
    """
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ValueError("attachments phải là danh sách.")
    if len(raw) > max_count:
        raise ValueError(f"Tối đa {max_count} file/post.")

    out: list[dict] = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            raise ValueError(f"attachments[{i}] phải là object.")
        kind = item.get("type")
        url = item.get("url")
        mime = item.get("mime")
        size = item.get("size")
        if kind not in ("image", "video"):
            raise ValueError(f"attachments[{i}].type không hợp lệ.")
        if not isinstance(url, str) or not url.startswith("http"):
            raise ValueError(f"attachments[{i}].url không hợp lệ.")
        if not isinstance(mime, str) or "/" not in mime:
            raise ValueError(f"attachments[{i}].mime không hợp lệ.")
        if not isinstance(size, int) or size < 0:
            raise ValueError(f"attachments[{i}].size không hợp lệ.")
        clean = {
            "type": kind,
            "url": url,
            "mime": mime,
            "size": size,
            "width": item.get("width") if isinstance(item.get("width"), int) else None,
            "height": item.get("height") if isinstance(item.get("height"), int) else None,
            "thumbnail_url": item.get("thumbnail_url") if isinstance(item.get("thumbnail_url"), str) else None,
        }
        out.append(clean)
    return out


def detect_mime_from_filename(filename: str | None) -> str | None:
    if not filename:
        return None
    ext = Path(filename).suffix.lower()
    for mime, e in _MIME_TO_EXT.items():
        if e == ext:
            return mime
    return None


def compute_hot_score(score: int, created_at: datetime) -> float:
    """Reddit-style hot ranking. Mirrors the SQL `forum_hot_score()` function so we
    can sort in Python when needed (rare — DB does it via trigger)."""
    s = max(abs(score), 1)
    sign_v = 1 if score > 0 else (-1 if score < 0 else 0)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_secs = (created_at - _EPOCH).total_seconds()
    return round(log10(s) * sign_v + age_secs / 45000.0, 7)
