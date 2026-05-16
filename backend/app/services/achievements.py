"""
StoryLens Backend — Achievement Unlock Engine

Inspects user state and inserts rows into `user_achievements` for any newly
earned badges. Idempotent — `user_achievements` has a UNIQUE(user_id, achievement_id)
constraint, so re-running is safe.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.database import get_supabase

logger = logging.getLogger(__name__)


# (id, display name) — frontend should keep its own catalogue with descriptions.
ACHIEVEMENTS = {
    "first_translation": "Bản dịch đầu tiên",
    "ten_translations": "10 trang đã dịch",
    "hundred_translations": "Bậc thầy dịch giả",
    "first_qa": "Hỏi đáp đầu tiên",
    "streak_7": "Cháy 7 ngày liên tiếp",
    "streak_30": "Cháy 30 ngày liên tiếp",
    "first_bookmark": "Người sưu tầm",
    "ten_bookmarks": "Mọt sách",
}


def _count(sb, table: str, column: str, user_id: str) -> int:
    try:
        res = sb.table(table).select(column, count="exact").eq("user_id", user_id).execute()
        return int(getattr(res, "count", 0) or 0)
    except Exception:
        return 0


def check_and_unlock(user_id: str) -> list[str]:
    """Compute which achievements this user should have, persist any newly unlocked ones.

    Returns the list of achievement IDs newly unlocked in this call.
    """
    sb = get_supabase()

    try:
        owned = sb.table("user_achievements").select("achievement_id").eq("user_id", user_id).execute()
        already = {r["achievement_id"] for r in (owned.data or [])}
    except Exception as exc:
        logger.info("Could not load existing achievements: %s", exc)
        already = set()

    newly: list[str] = []

    translations = _count(sb, "manga_pages", "page_id", user_id)
    if translations >= 1 and "first_translation" not in already:
        newly.append("first_translation")
    if translations >= 10 and "ten_translations" not in already:
        newly.append("ten_translations")
    if translations >= 100 and "hundred_translations" not in already:
        newly.append("hundred_translations")

    qa_count = _count(sb, "qa_history", "qa_id", user_id)
    if qa_count >= 1 and "first_qa" not in already:
        newly.append("first_qa")

    bookmarks = _count(sb, "user_bookmarks", "page_id", user_id)
    if bookmarks >= 1 and "first_bookmark" not in already:
        newly.append("first_bookmark")
    if bookmarks >= 10 and "ten_bookmarks" not in already:
        newly.append("ten_bookmarks")

    try:
        stats = sb.table("user_reading_stats").select("current_streak,longest_streak").eq("user_id", user_id).limit(1).execute()
        if stats.data:
            longest = int(stats.data[0].get("longest_streak") or 0)
            if longest >= 7 and "streak_7" not in already:
                newly.append("streak_7")
            if longest >= 30 and "streak_30" not in already:
                newly.append("streak_30")
    except Exception:
        pass

    if not newly:
        return []

    now = datetime.now(timezone.utc).isoformat()
    rows = [{"user_id": user_id, "achievement_id": aid, "unlocked_at": now} for aid in newly]
    try:
        sb.table("user_achievements").upsert(rows, on_conflict="user_id,achievement_id").execute()
    except Exception as exc:
        logger.warning("Persist achievements failed: %s", exc)
        return []

    # Emit notifications.
    try:
        from app.routers.notifications import emit_notification
        for aid in newly:
            emit_notification(
                user_id,
                type="achievement",
                title=f"🏆 Mở khóa: {ACHIEVEMENTS.get(aid, aid)}",
                body="Vào hồ sơ để xem tất cả huy hiệu.",
                url="/profile",
            )
    except Exception:
        pass

    return newly
