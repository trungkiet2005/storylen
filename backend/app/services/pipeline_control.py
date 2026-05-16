"""Cooperative cancellation + event-replay bus for the translation pipeline.

Two responsibilities, one module because they share the same in-process state.

1. **Cancellation registry** — `register(page_id) → Event`. Pipeline threads
   call `is_cancelled(page_id)` at safe checkpoints; an HTTP endpoint flips
   the flag via `request_cancel(page_id)`.

2. **Event bus with replay** — pipeline emits `publish(batch_id, payload)`;
   the WS handler calls `subscribe(batch_id)` to get past events on reconnect.
   Events older than ``EVENT_TTL_SECONDS`` are dropped.

State lives in module-level dicts because the FastAPI app is a single
process (Render free tier). If we ever scale to multiple workers this needs
Redis — but the rest of the architecture (semaphore, etc.) shares the same
constraint, so we punt on that until it actually matters.
"""
from __future__ import annotations

import threading
import time
from collections import deque
from typing import Any, Deque, Iterable

EVENT_TTL_SECONDS = 5 * 60
MAX_EVENTS_PER_BATCH = 200


# ─── Cancellation ─────────────────────────────────────────────────────────────

_cancel_flags: dict[str, threading.Event] = {}
_cancel_lock = threading.Lock()


def register(page_id: str) -> threading.Event:
    """Register a cancellation-capable job. Returns an Event the worker can check."""
    with _cancel_lock:
        ev = _cancel_flags.get(page_id)
        if ev is None:
            ev = threading.Event()
            _cancel_flags[page_id] = ev
        return ev


def request_cancel(page_id: str) -> bool:
    """Flip the flag. Returns True if the job was known, False if it already
    finished (no event registered)."""
    with _cancel_lock:
        ev = _cancel_flags.get(page_id)
    if ev is None:
        return False
    ev.set()
    return True


def is_cancelled(page_id: str) -> bool:
    with _cancel_lock:
        ev = _cancel_flags.get(page_id)
    return bool(ev and ev.is_set())


def clear(page_id: str) -> None:
    """Remove the flag after the job exits (success, failure, or cancellation)."""
    with _cancel_lock:
        _cancel_flags.pop(page_id, None)


class CancelledError(Exception):
    """Raised by pipeline checkpoints when cancellation has been requested."""


def raise_if_cancelled(page_id: str) -> None:
    if is_cancelled(page_id):
        raise CancelledError(f"Pipeline cancelled for page {page_id}")


# ─── Event bus ────────────────────────────────────────────────────────────────

_events: dict[str, Deque[tuple[float, dict[str, Any]]]] = {}
_events_lock = threading.Lock()


def publish(batch_id: str, event: dict[str, Any]) -> None:
    """Record a batch event for replay. Trimming runs lazily on each write."""
    now = time.time()
    with _events_lock:
        q = _events.setdefault(batch_id, deque(maxlen=MAX_EVENTS_PER_BATCH))
        q.append((now, event))
        # Drop expired events from the front.
        cutoff = now - EVENT_TTL_SECONDS
        while q and q[0][0] < cutoff:
            q.popleft()


def subscribe(batch_id: str, since: float | None = None) -> list[dict[str, Any]]:
    """Return events recorded after ``since`` (epoch seconds). Defaults to all
    events still inside the TTL window."""
    cutoff = since if since is not None else (time.time() - EVENT_TTL_SECONDS)
    with _events_lock:
        q = _events.get(batch_id)
        if not q:
            return []
        return [evt for ts, evt in q if ts > cutoff]


def drop_batch(batch_id: str) -> None:
    """Forget all events for a batch — call after the batch fully terminates."""
    with _events_lock:
        _events.pop(batch_id, None)


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
