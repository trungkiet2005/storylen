"""
Resolves the active VLM (vision LLM) base URL at runtime.

The narration feature calls a vision model served behind an ollama-compatible
endpoint on a GPU pod. That pod is reached through a Cloudflare quick-tunnel
whose hostname changes every session (and after each pod reboot) — so, exactly
like ``ai_module_source``, the default URL comes from the environment
(``VLM_BASE_URL``) but admins can override it at runtime without a redeploy.

Layout of the relevant ``app_settings`` rows:

    key                value (JSON / text)
    ------------------ -------------------------------------------
    vlm_provider       "env" | "tunnel"
    vlm_tunnel_url     "https://<slug>.trycloudflare.com"

A tiny in-process TTL cache keeps the database out of every narrate call.
``invalidate_vlm_source_cache()`` is called after admin writes so the next
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

Provider = Literal["env", "tunnel"]

KEY_PROVIDER = "vlm_provider"
KEY_TUNNEL_URL = "vlm_tunnel_url"

_CACHE_TTL_SEC = 5.0

_lock = threading.Lock()
_cached_at: float = 0.0
_cached_provider: Provider = "env"
_cached_tunnel_url: str = ""


def _load_from_db() -> tuple[Provider, str]:
    """Read both settings rows in one round trip. Returns ('env', '') on any error."""
    try:
        res = (
            get_supabase()
            .table("app_settings")
            .select("key, value")
            .in_("key", [KEY_PROVIDER, KEY_TUNNEL_URL])
            .execute()
        )
        rows = res.data or []
    except Exception as exc:
        logger.warning("narration_source: failed to read app_settings: %s", exc)
        return "env", ""

    provider: Provider = "env"
    tunnel_url = ""
    for row in rows:
        key = row.get("key")
        value = row.get("value")
        if key == KEY_PROVIDER:
            v = str(value).strip().lower() if value is not None else ""
            provider = "tunnel" if v == "tunnel" else "env"
        elif key == KEY_TUNNEL_URL:
            tunnel_url = str(value).strip() if isinstance(value, str) else ""
    return provider, tunnel_url


def _refresh_if_stale() -> tuple[Provider, str]:
    global _cached_at, _cached_provider, _cached_tunnel_url
    now = time.monotonic()
    with _lock:
        if now - _cached_at < _CACHE_TTL_SEC and _cached_at > 0:
            return _cached_provider, _cached_tunnel_url
        provider, tunnel_url = _load_from_db()
        _cached_provider = provider
        _cached_tunnel_url = tunnel_url
        _cached_at = now
        return provider, tunnel_url


def invalidate_vlm_source_cache() -> None:
    """Drop the cache so the next call re-reads from the database."""
    global _cached_at
    with _lock:
        _cached_at = 0.0


def get_active_provider() -> Provider:
    provider, _ = _refresh_if_stale()
    return provider


def get_active_vlm_url() -> str:
    """Return the base URL the backend should currently hit for VLM calls."""
    provider, tunnel_url = _refresh_if_stale()
    if provider == "tunnel" and tunnel_url:
        return tunnel_url
    return get_settings().VLM_BASE_URL


def get_vlm_source_state() -> dict:
    """Snapshot for the admin UI. Always reads fresh."""
    invalidate_vlm_source_cache()
    provider, tunnel_url = _refresh_if_stale()
    settings = get_settings()
    return {
        "provider": provider,
        "tunnel_url": tunnel_url,
        "env_url": settings.VLM_BASE_URL,
        "active_url": tunnel_url if (provider == "tunnel" and tunnel_url) else settings.VLM_BASE_URL,
        "model": settings.VLM_MODEL,
    }
