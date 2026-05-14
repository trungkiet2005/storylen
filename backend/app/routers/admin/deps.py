"""
Shared helpers for the admin router package.

- `audit()` — writes a structured row to `admin_audit_log`.
- `count_rows()` — generic row counter using Supabase head-count queries.
- `to_iso()` / `serialize_auth_user()` — small normalisers for the Supabase
  admin SDK which returns either dataclass-style objects or plain dicts
  depending on the library version.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import Request

from app.database import get_supabase
from app.routers.auth import AuthUser

logger = logging.getLogger("storylens.admin")


# ─── Audit logging ────────────────────────────────────────────────────────────

def audit(
    actor: AuthUser,
    action: str,
    *,
    request: Request | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    summary: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """
    Best-effort audit log insertion. Never raises — admin actions must
    not fail because the audit table is unavailable.
    """
    row = {
        "actor_id": actor.id,
        "actor_email": actor.email,
        "action": action,
        "target_type": target_type,
        "target_id": str(target_id) if target_id is not None else None,
        "summary": summary,
        "metadata": metadata or {},
    }
    if request is not None:
        row["ip_address"] = _client_ip(request)
        ua = request.headers.get("user-agent")
        if ua:
            row["user_agent"] = ua[:512]
    try:
        get_supabase().table("admin_audit_log").insert(row).execute()
    except Exception as exc:
        # The audit table may not exist yet (migration not run) — log and
        # continue. Production should have the migration in place.
        logger.warning("audit log insert failed (action=%s): %s", action, exc)


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    client = request.client
    return client.host if client else None


# ─── Supabase helpers ─────────────────────────────────────────────────────────

def count_rows(table: str, filters: dict[str, Any] | None = None) -> int:
    try:
        query = get_supabase().table(table).select("*", count="exact", head=True)
        for column, value in (filters or {}).items():
            query = query.eq(column, value)
        res = query.execute()
        return int(res.count or 0)
    except Exception as exc:
        logger.warning("count_rows(%s) failed: %s", table, exc)
        return 0


def count_for_user(table: str, user_id: str) -> int:
    return count_rows(table, {"user_id": user_id})


def to_iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    iso = getattr(value, "isoformat", None)
    if callable(iso):
        return iso()
    return str(value)


def serialize_auth_user(au: Any) -> dict[str, Any]:
    """Normalise a Supabase auth-user payload (object or dict) to a flat dict."""
    if isinstance(au, dict):
        return au
    return {
        "id": getattr(au, "id", None),
        "email": getattr(au, "email", None),
        "phone": getattr(au, "phone", None),
        "created_at": getattr(au, "created_at", None),
        "last_sign_in_at": getattr(au, "last_sign_in_at", None),
        "email_confirmed_at": getattr(au, "email_confirmed_at", None),
        "banned_until": getattr(au, "banned_until", None),
        "user_metadata": getattr(au, "user_metadata", None) or {},
    }


def load_profile_map(user_ids: list[str]) -> dict[str, dict[str, Any]]:
    if not user_ids:
        return {}
    try:
        res = (
            get_supabase()
            .table("profiles")
            .select(
                "user_id, username, role, full_name, display_name, avatar_url, "
                "preferred_target_lang, locale, created_at, last_seen_at, "
                "plan_tier, credits_balance"
            )
            .in_("user_id", user_ids)
            .execute()
        )
        return {row["user_id"]: row for row in (res.data or [])}
    except Exception as exc:
        logger.warning("load_profile_map failed: %s", exc)
        return {}
