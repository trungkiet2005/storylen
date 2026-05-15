"""In-memory event bus — asyncio.Queue per job_id for WebSocket delivery."""
from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from datetime import datetime, timezone

log = logging.getLogger(__name__)

# job_id → list of subscriber queues
_subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)
# job_id → replay buffer (last N events)
_buffers: dict[str, list[dict]] = defaultdict(list)
_BUFFER_MAX = 200


def subscribe(job_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=500)
    _subscribers[job_id].append(q)
    return q


def unsubscribe(job_id: str, q: asyncio.Queue) -> None:
    subs = _subscribers.get(job_id, [])
    try:
        subs.remove(q)
    except ValueError:
        pass


def replay(job_id: str, last_event_id: int = 0) -> list[dict]:
    """Return buffered events after last_event_id."""
    return [e for e in _buffers.get(job_id, []) if e.get("event_id", 0) > last_event_id]


async def publish(job_id: str, event_type: str, status: str, progress: int, payload: dict) -> None:
    buf = _buffers[job_id]
    event_id = (buf[-1]["event_id"] + 1) if buf else 1

    event = {
        "event_id": event_id,
        "job_id": job_id,
        "type": event_type,
        "status": status,
        "progress": progress,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }

    buf.append(event)
    if len(buf) > _BUFFER_MAX:
        buf.pop(0)

    for q in list(_subscribers.get(job_id, [])):
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            log.warning("WebSocket queue full for job %s — dropping event", job_id)
