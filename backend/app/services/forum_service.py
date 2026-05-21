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
from datetime import datetime, timezone
from math import log10
from typing import Iterable

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


def compute_hot_score(score: int, created_at: datetime) -> float:
    """Reddit-style hot ranking. Mirrors the SQL `forum_hot_score()` function so we
    can sort in Python when needed (rare — DB does it via trigger)."""
    s = max(abs(score), 1)
    sign_v = 1 if score > 0 else (-1 if score < 0 else 0)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_secs = (created_at - _EPOCH).total_seconds()
    return round(log10(s) * sign_v + age_secs / 45000.0, 7)
