"""WebSocket endpoints for live pipeline progress.

Replaces the existing `GET /v1/status/batch/{batch_id}` polling loop (every 2.5s
from every browser tab uploading) with a single push channel per batch. The
backend still polls Supabase internally, but only one DB hit per `_POLL_SECONDS`
total instead of one per active client per interval.

Auth uses the same Supabase access-token cookie as the REST endpoints. If the
token is missing or rejected the connection is closed with code 4401, which the
frontend treats as "fall back to polling".
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import get_settings
from app.database import get_supabase
from app.routers.auth import _request_auth, _to_auth_user, _user_from_payload

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["websocket"])

_POLL_SECONDS = 2.0          # Server-side DB poll cadence; clients still get push.
_PING_SECONDS = 25.0         # Keepalive — well under any proxy idle timeout.
_TERMINAL = {"completed", "failed", "ocr_failed", "error"}


# ─── Auth helper for WebSocket handshake ─────────────────────────────────────

async def _authenticate(websocket: WebSocket) -> tuple[str, str] | None:
    """Return (user_id, access_token) or None to reject the handshake.

    We don't refresh tokens here — too much complexity for a long-lived socket.
    If the access token has expired the client gets 4401 and reconnects after
    refreshing via the normal REST cookie flow.
    """
    settings = get_settings()
    access_token = websocket.cookies.get(settings.AUTH_ACCESS_COOKIE_NAME)
    if not access_token:
        return None
    try:
        payload = _request_auth("GET", "user", settings=settings, token=access_token)
        user = _user_from_payload(payload) or payload
        auth_user = _to_auth_user(user)
        return auth_user.id, access_token
    except Exception as exc:
        logger.info("WS auth failed: %s", exc)
        return None


# ─── Snapshot fetch ──────────────────────────────────────────────────────────

def _fetch_batch_snapshot(batch_id: str, user_id: str) -> dict[str, Any] | None:
    """Return the same shape as GET /v1/status/batch/{id} — or None if no pages."""
    try:
        sb = get_supabase()
        rows = (
            sb.table("manga_pages")
            .select("page_id, status, progress, error, original_image_url, thumbnail_url")
            .eq("batch_id", batch_id)
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.warning("WS snapshot DB error for batch %s: %s", batch_id, exc)
        return None

    if not rows:
        return None

    pages = [
        {
            "page_id": r["page_id"],
            "status": r.get("status") or "pending",
            "progress": int(r.get("progress") or 0),
            "error": r.get("error"),
            "original_image_url": r.get("original_image_url"),
            "thumbnail_url": r.get("thumbnail_url"),
        }
        for r in rows
    ]
    return {
        "batch_id": batch_id,
        "total": len(pages),
        "completed": sum(1 for p in pages if p["status"] == "completed"),
        "failed": sum(1 for p in pages if p["status"] in ("failed", "ocr_failed", "error")),
        "pages": pages,
    }


def _snapshot_signature(snapshot: dict[str, Any]) -> tuple:
    """Hashable signature used to detect "anything changed?" without diffing the full dict."""
    return tuple((p["page_id"], p["status"], p["progress"]) for p in snapshot["pages"])


def _is_terminal(snapshot: dict[str, Any]) -> bool:
    return all(p["status"] in _TERMINAL for p in snapshot["pages"])


# ─── Endpoint ────────────────────────────────────────────────────────────────

@router.websocket("/batch/{batch_id}")
async def batch_progress(websocket: WebSocket, batch_id: str):
    """Stream `BatchStatus` snapshots until all pages reach a terminal state."""
    auth = await _authenticate(websocket)
    if not auth:
        # Reject BEFORE accepting so the browser sees a clean handshake error.
        await websocket.close(code=4401, reason="unauthenticated")
        return
    user_id, _token = auth

    await websocket.accept()

    # ── Event-bus replay: send any events the client may have missed ─────
    # Client may pass `?since=<epoch>` so reconnects skip events already seen.
    try:
        since_raw = websocket.query_params.get("since")
        since = float(since_raw) if since_raw else None
    except Exception:
        since = None
    try:
        from app.services.pipeline_control import subscribe as _replay
        replay_events = _replay(batch_id, since)
        if replay_events:
            await websocket.send_json({"type": "replay", "events": replay_events})
    except Exception as exc:
        logger.debug("event replay skipped for %s: %s", batch_id, exc)

    last_sig: tuple | None = None
    last_ping = asyncio.get_event_loop().time()

    try:
        while True:
            snapshot = _fetch_batch_snapshot(batch_id, user_id)
            if snapshot is None:
                await websocket.send_json({"type": "error", "detail": "Batch not found or no access."})
                await websocket.close(code=4404, reason="not found")
                return

            sig = _snapshot_signature(snapshot)
            if sig != last_sig:
                await websocket.send_json({"type": "batch", "data": snapshot})
                last_sig = sig

            if _is_terminal(snapshot):
                await websocket.send_json({"type": "done"})
                # Give the client a moment to receive the final frame.
                await asyncio.sleep(0.1)
                await websocket.close(code=1000, reason="terminal")
                return

            # Lightweight keepalive ping to defeat proxy idle timeouts.
            now = asyncio.get_event_loop().time()
            if now - last_ping > _PING_SECONDS:
                await websocket.send_json({"type": "ping"})
                last_ping = now

            await asyncio.sleep(_POLL_SECONDS)
    except WebSocketDisconnect:
        # Client closed normally — nothing to log.
        return
    except Exception as exc:
        logger.warning("WS error for batch %s: %s", batch_id, exc)
        try:
            await websocket.close(code=1011, reason="server error")
        except Exception:
            pass
