"""In-memory idempotency cache.

The flow we want for `/upload` and `/scrape`: if a client retries the same
request (same `Idempotency-Key` header) within a short window, we replay the
first response instead of re-running the work — protecting users from
double-charging credits when a network flake makes them tap "Upload" twice.

This is intentionally not Redis-backed. The cache is per-process, TTL-bounded,
and a multi-replica deploy would still avoid the *common* double-tap case
(same user → same replica via sticky session). Migrate to Redis when scaling
out, but don't block on it.

Note: only successful responses are cached. Failed responses let the client
retry against fresh state.
"""
from __future__ import annotations

import threading
import time
import uuid
from typing import Any

_TTL_SECONDS = 10 * 60          # 10 minutes; tune if you see real duplicates outside this window
_MAX_ENTRIES = 1024             # bounded; oldest entries get evicted

_lock = threading.Lock()
_store: dict[str, tuple[float, Any]] = {}   # key -> (expires_at, response)


def _gc_locked(now: float) -> None:
    expired = [k for k, (exp, _) in _store.items() if exp < now]
    for k in expired:
        _store.pop(k, None)
    # Evict oldest if still too big.
    if len(_store) > _MAX_ENTRIES:
        sorted_items = sorted(_store.items(), key=lambda kv: kv[1][0])
        for k, _ in sorted_items[: len(_store) - _MAX_ENTRIES]:
            _store.pop(k, None)


def normalise_key(user_id: str, raw_key: str | None, endpoint: str) -> str | None:
    """Build a process-wide unique key. Returns None if client omitted the header.

    The endpoint is included so the same key can't be reused across different
    routes (a client mistakenly sending one key to both /upload and /scrape
    shouldn't get cross-contaminated responses).
    """
    if not raw_key:
        return None
    raw_key = raw_key.strip()
    if not raw_key:
        return None
    # Defend against pathological values.
    if len(raw_key) > 200:
        raw_key = raw_key[:200]
    return f"{user_id}:{endpoint}:{raw_key}"


def get(key: str | None) -> Any | None:
    if not key:
        return None
    with _lock:
        now = time.time()
        entry = _store.get(key)
        if not entry:
            return None
        exp, value = entry
        if exp < now:
            _store.pop(key, None)
            return None
        return value


def put(key: str | None, value: Any) -> None:
    if not key:
        return
    with _lock:
        now = time.time()
        _gc_locked(now)
        _store[key] = (now + _TTL_SECONDS, value)


def generate_key() -> str:
    """Server-side fallback when client didn't supply a key — still better than
    nothing for the rare case of an intra-request retry. Caller should still
    accept client-provided keys preferentially."""
    return uuid.uuid4().hex
