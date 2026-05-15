"""WebSocket gateway — /ws/v1/jobs/{job_id}"""
from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from control_plane.ws.event_bus import replay, subscribe, unsubscribe

log = logging.getLogger(__name__)
router = APIRouter()

_PING_INTERVAL = 20  # seconds


@router.websocket("/ws/v1/jobs/{job_id}")
async def job_websocket(websocket: WebSocket, job_id: str, last_event_id: int = 0):
    await websocket.accept()
    log.info("WS connect: job=%s last_event_id=%d", job_id, last_event_id)

    # Replay missed events
    for event in replay(job_id, last_event_id):
        await websocket.send_text(json.dumps(event))

    q = subscribe(job_id)
    ping_task = asyncio.create_task(_ping_loop(websocket))

    try:
        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=_PING_INTERVAL)
            except asyncio.TimeoutError:
                continue  # ping loop handles keepalive

            await websocket.send_text(json.dumps(event))

            if event.get("type") in ("job.done", "job.failed", "job.cancelled"):
                break

    except WebSocketDisconnect:
        log.info("WS disconnect: job=%s", job_id)
    except Exception as exc:
        log.error("WS error job=%s: %s", job_id, exc)
    finally:
        ping_task.cancel()
        unsubscribe(job_id, q)


async def _ping_loop(ws: WebSocket) -> None:
    """Send periodic pings to keep the connection alive."""
    try:
        while True:
            await asyncio.sleep(_PING_INTERVAL)
            await ws.send_text(json.dumps({"type": "ping"}))
    except Exception:
        pass
