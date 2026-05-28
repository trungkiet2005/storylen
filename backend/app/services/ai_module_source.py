"""
Resolves the active AI module base URL at runtime.

The default URL comes from the environment (``AI_MODULE_URL``) and normally
points at the HuggingFace Space. Admins can override it at runtime to point
at an ad-hoc Kaggle/Cloudflare tunnel — the URL is stored in the
``app_settings`` table and changes every Kaggle session.

Layout of the relevant ``app_settings`` rows:

    key                       value (JSON)
    ------------------------- ----------------------------
    ai_module_provider        "huggingface" | "kaggle"
    ai_module_kaggle_url      "https://....trycloudflare.com"

A tiny in-process TTL cache keeps the database out of every translate call.
``invalidate_ai_source_cache()`` is called after admin writes so the next
request picks up the change immediately.
"""
from __future__ import annotations

import logging
import threading
import time
from typing import Literal

from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)

Provider = Literal["huggingface", "kaggle"]

KEY_PROVIDER = "ai_module_provider"
KEY_KAGGLE_URL = "ai_module_kaggle_url"

_CACHE_TTL_SEC = 5.0

_lock = threading.Lock()
_cached_at: float = 0.0
_cached_provider: Provider = "huggingface"
_cached_kaggle_url: str = ""


def _load_from_db() -> tuple[Provider, str]:
    """Read both settings rows in one round trip. Returns ('huggingface', '') on any error."""
    try:
        res = (
            get_supabase()
            .table("app_settings")
            .select("key, value")
            .in_("key", [KEY_PROVIDER, KEY_KAGGLE_URL])
            .execute()
        )
        rows = res.data or []
    except Exception as exc:
        logger.warning("ai_module_source: failed to read app_settings: %s", exc)
        return "huggingface", ""

    provider: Provider = "huggingface"
    kaggle_url = ""
    for row in rows:
        key = row.get("key")
        value = row.get("value")
        if key == KEY_PROVIDER:
            v = str(value).strip().lower() if value is not None else ""
            provider = "kaggle" if v == "kaggle" else "huggingface"
        elif key == KEY_KAGGLE_URL:
            kaggle_url = str(value).strip() if isinstance(value, str) else ""
    return provider, kaggle_url


def _refresh_if_stale() -> tuple[Provider, str]:
    global _cached_at, _cached_provider, _cached_kaggle_url
    now = time.monotonic()
    with _lock:
        if now - _cached_at < _CACHE_TTL_SEC and _cached_at > 0:
            return _cached_provider, _cached_kaggle_url
        provider, kaggle_url = _load_from_db()
        _cached_provider = provider
        _cached_kaggle_url = kaggle_url
        _cached_at = now
        return provider, kaggle_url


def invalidate_ai_source_cache() -> None:
    """Drop the cache so the next call re-reads from the database."""
    global _cached_at
    with _lock:
        _cached_at = 0.0


def get_active_provider() -> Provider:
    provider, _ = _refresh_if_stale()
    return provider


def get_active_ai_module_url() -> str:
    """Return the URL the backend should currently hit for AI module calls."""
    provider, kaggle_url = _refresh_if_stale()
    if provider == "kaggle" and kaggle_url:
        return kaggle_url
    return get_settings().AI_MODULE_URL


def get_ai_source_state() -> dict:
    """Snapshot for the admin UI. Always reads fresh."""
    invalidate_ai_source_cache()
    provider, kaggle_url = _refresh_if_stale()
    settings = get_settings()
    return {
        "provider": provider,
        "kaggle_url": kaggle_url,
        "huggingface_url": settings.AI_MODULE_URL,
        "active_url": kaggle_url if (provider == "kaggle" and kaggle_url) else settings.AI_MODULE_URL,
    }
