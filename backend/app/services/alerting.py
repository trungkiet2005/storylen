"""
StoryLens Backend — Alerting sink.

Turns "something is wrong" signals (model drift, degraded health) into an
actual notification. Posts a Slack/Discord/webhook-compatible payload to
``ALERT_WEBHOOK_URL`` when set; otherwise it just logs at WARNING so alerts are
never silently lost. Best-effort and non-raising.

De-duplicates repeated alerts within a short window so a persistently-degraded
model doesn't spam the channel on every dashboard refresh.
"""
from __future__ import annotations

import logging
import threading
import time

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

_SEVERITY_EMOJI = {"info": "ℹ️", "warning": "⚠️", "critical": "🚨"}

# In-process de-dupe: key → last-sent monotonic time.
_DEDUPE_TTL_SEC = 300.0
_lock = threading.Lock()
_last_sent: dict[str, float] = {}


def _should_send(key: str) -> bool:
    now = time.monotonic()
    with _lock:
        last = _last_sent.get(key, 0.0)
        if now - last < _DEDUPE_TTL_SEC:
            return False
        _last_sent[key] = now
        return True


def send_alert(
    title: str,
    message: str,
    *,
    severity: str = "warning",
    dedupe_key: str | None = None,
    meta: dict | None = None,
) -> bool:
    """Emit an alert. Returns True if a webhook was posted, False otherwise."""
    emoji = _SEVERITY_EMOJI.get(severity, "⚠️")
    log_line = f"ALERT[{severity}] {title} — {message}"
    if severity == "critical":
        logger.error(log_line)
    else:
        logger.warning(log_line)

    key = dedupe_key or f"{severity}:{title}"
    if not _should_send(key):
        logger.debug("alerting: suppressed duplicate alert %s", key)
        return False

    url = (get_settings().ALERT_WEBHOOK_URL or "").strip()
    if not url:
        return False

    text = f"{emoji} *StoryLens · {title}*\n{message}"
    if meta:
        text += "\n" + "\n".join(f"• {k}: {v}" for k, v in meta.items())
    try:
        with httpx.Client(timeout=httpx.Timeout(connect=4.0, read=6.0, write=4.0, pool=2.0)) as client:
            resp = client.post(url, json={"text": text})
        resp.raise_for_status()
        return True
    except Exception as exc:  # never raise on alert failure
        logger.warning("alerting: failed to post webhook: %s", exc)
        return False


def reset_dedupe() -> None:
    """Clear the de-dupe cache (used by tests)."""
    with _lock:
        _last_sent.clear()
