"""Cooperative cancellation + event-replay bus for the translation pipeline.

Two responsibilities, one module because they share the same in-process state.

1. **Cancellation registry** — `register(page_id) → Event`. Pipeline threads
   call `is_cancelled(page_id)` at safe checkpoints; an HTTP endpoint flips
   the flag via `request_cancel(page_id)`.

2. **Event bus with replay** — pipeline emits `publish(batch_id, payload)`;
   the WS handler calls `subscribe(batch_id)` to get past events on reconnect.
   Events older than ``EVENT_TTL_SECONDS`` are dropped.

State storage is pluggable. By default it lives in module-level dicts
(zero ops, perfect for single-replica Render free tier). When you set
``REDIS_URL`` we transparently switch to a Redis backend so cancel + event
bus work across replicas. Same module, same public API — only the storage
shape changes.
"""
from __future__ import annotations

import json
import logging
import os
import threading
import time
from collections import deque
from typing import Any, Deque, Iterable

logger = logging.getLogger(__name__)

EVENT_TTL_SECONDS = 5 * 60
MAX_EVENTS_PER_BATCH = 200

# Lazy-initialised Redis client. None when REDIS_URL is unset → in-memory mode.
_redis_client: Any | None = None
_redis_init_attempted = False


def _redis() -> Any | None:
    """Return a connected Redis client, or None if not configured / unreachable.

    Cached after first call — subsequent calls are essentially free.
    Falls back to None on any error so the in-memory path stays alive.
    """
    global _redis_client, _redis_init_attempted
    if _redis_init_attempted:
        return _redis_client
    _redis_init_attempted = True
    url = os.getenv("REDIS_URL", "").strip()
    if not url:
        return None
    try:
        import redis  # type: ignore
        _redis_client = redis.Redis.from_url(url, decode_responses=True, socket_timeout=2)
        _redis_client.ping()
        logger.info("pipeline_control: Redis backend active (%s)", url.split("@")[-1])
    except Exception as exc:
        logger.warning("pipeline_control: REDIS_URL set but unreachable — falling back to in-memory: %s", exc)
        _redis_client = None
    return _redis_client


# ─── Cancellation ─────────────────────────────────────────────────────────────

_cancel_flags: dict[str, threading.Event] = {}
_cancel_lock = threading.Lock()


def _cancel_key(page_id: str) -> str:
    return f"sl:cancel:{page_id}"


def register(page_id: str) -> threading.Event:
    """Register a cancellation-capable job.

    Returns an Event the worker checks in-process. In Redis mode the Event
    still exists locally — workers stay in the process that started them —
    but the *signal* may originate from another replica via `request_cancel`.
    """
    with _cancel_lock:
        ev = _cancel_flags.get(page_id)
        if ev is None:
            ev = threading.Event()
            _cancel_flags[page_id] = ev
        return ev


def request_cancel(page_id: str) -> bool:
    """Flip the flag. Returns True if the job was known, False otherwise.

    Cross-replica: writes a short-lived key to Redis. The replica running the
    pipeline polls `is_cancelled` and picks it up at the next checkpoint.
    """
    r = _redis()
    if r is not None:
        try:
            r.set(_cancel_key(page_id), "1", ex=600)
        except Exception as exc:
            logger.warning("Redis cancel write failed for %s: %s", page_id, exc)

    with _cancel_lock:
        ev = _cancel_flags.get(page_id)
    if ev is None:
        # Not registered on this replica. With Redis, another replica may pick it up.
        return r is not None
    ev.set()
    return True


def is_cancelled(page_id: str) -> bool:
    """Check both local Event and Redis flag."""
    with _cancel_lock:
        ev = _cancel_flags.get(page_id)
    if ev and ev.is_set():
        return True
    r = _redis()
    if r is not None:
        try:
            return bool(r.get(_cancel_key(page_id)))
        except Exception as exc:
            logger.debug("Redis cancel check failed: %s", exc)
    return False


def clear(page_id: str) -> None:
    """Remove the flag after the job exits (success, failure, or cancellation)."""
    with _cancel_lock:
        _cancel_flags.pop(page_id, None)
    r = _redis()
    if r is not None:
        try:
            r.delete(_cancel_key(page_id))
        except Exception:
            pass


class CancelledError(Exception):
    """Raised by pipeline checkpoints when cancellation has been requested."""


def raise_if_cancelled(page_id: str) -> None:
    if is_cancelled(page_id):
        raise CancelledError(f"Pipeline cancelled for page {page_id}")


# ─── Event bus ────────────────────────────────────────────────────────────────

_events: dict[str, Deque[tuple[float, dict[str, Any]]]] = {}
_events_lock = threading.Lock()


def _events_key(batch_id: str) -> str:
    return f"sl:events:{batch_id}"


def publish(batch_id: str, event: dict[str, Any]) -> None:
    """Record a batch event for replay. Trimming runs lazily on each write."""
    now = time.time()

    # Local store (for the single-replica fast path).
    with _events_lock:
        q = _events.setdefault(batch_id, deque(maxlen=MAX_EVENTS_PER_BATCH))
        q.append((now, event))
        cutoff = now - EVENT_TTL_SECONDS
        while q and q[0][0] < cutoff:
            q.popleft()

    # Cross-replica fanout via Redis sorted set (score = timestamp).
    r = _redis()
    if r is not None:
        try:
            key = _events_key(batch_id)
            r.zadd(key, {json.dumps(event): now})
            # Trim the set: keep only entries inside the TTL window, capped at MAX.
            r.zremrangebyscore(key, 0, now - EVENT_TTL_SECONDS)
            r.zremrangebyrank(key, 0, -(MAX_EVENTS_PER_BATCH + 1))
            r.expire(key, EVENT_TTL_SECONDS * 2)
        except Exception as exc:
            logger.debug("Redis publish failed for %s: %s", batch_id, exc)


def subscribe(batch_id: str, since: float | None = None) -> list[dict[str, Any]]:
    """Return events recorded after ``since`` (epoch seconds).

    Redis is the source of truth in multi-replica mode (events emitted by
    replica A must be visible to a WS connection on replica B). Falls back
    to local deque when Redis is unconfigured.
    """
    cutoff = since if since is not None else (time.time() - EVENT_TTL_SECONDS)

    r = _redis()
    if r is not None:
        try:
            raw = r.zrangebyscore(_events_key(batch_id), f"({cutoff}", "+inf")
            return [json.loads(item) for item in raw]
        except Exception as exc:
            logger.debug("Redis subscribe failed for %s: %s", batch_id, exc)

    with _events_lock:
        q = _events.get(batch_id)
        if not q:
            return []
        return [evt for ts, evt in q if ts > cutoff]


def drop_batch(batch_id: str) -> None:
    """Forget all events for a batch — call after the batch fully terminates."""
    with _events_lock:
        _events.pop(batch_id, None)
    r = _redis()
    if r is not None:
        try:
            r.delete(_events_key(batch_id))
        except Exception:
            pass


def gc_expired() -> None:
    """Sweep batches whose events have all expired. Cheap; call from periodic
    task or lazily before subscribe."""
    cutoff = time.time() - EVENT_TTL_SECONDS
    with _events_lock:
        empty: list[str] = []
        for bid, q in _events.items():
            while q and q[0][0] < cutoff:
                q.popleft()
            if not q:
                empty.append(bid)
        for bid in empty:
            _events.pop(bid, None)


def iter_active_batches() -> Iterable[str]:
    with _events_lock:
        return list(_events.keys())
