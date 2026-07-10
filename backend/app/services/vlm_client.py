"""
StoryLens Backend — VLM (vision LLM) client.

Talks to an ollama-compatible ``/api/generate`` endpoint (qwen3-vl by default)
served on a GPU pod. Used by the narration service to turn a manga page image
plus its already-translated dialogue into a short Vietnamese storytelling script.

Mirrors ``ai_module_client``'s resilience: bounded retries on transient gateway
failures plus a simple circuit breaker so a dead pod can't pin request threads.
"""
from __future__ import annotations

import base64
import logging
import threading
import time
from datetime import datetime, timedelta, timezone

import httpx

from app.config import get_settings
from app.services import ai_telemetry
from app.services.narration_source import get_active_vlm_url

logger = logging.getLogger(__name__)
settings = get_settings()

_MAX_RETRIES = 3
_RETRY_DELAY_SEC = 4.0
# trycloudflare / gateway transient failures — a warm retry almost always works.
_RETRYABLE_STATUS = {408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527, 530}

# ─── Circuit breaker ──────────────────────────────────────────────────────────
_CB_THRESHOLD = 4
_CB_COOLDOWN_SEC = 90

_cb_lock = threading.Lock()
_cb_failures = 0
_cb_open_until: datetime | None = None


class VLMError(RuntimeError):
    """Raised when the VLM cannot produce a description."""


def _cb_check() -> None:
    with _cb_lock:
        if _cb_open_until and datetime.now(timezone.utc) < _cb_open_until:
            raise VLMError(
                f"VLM circuit breaker is open until {_cb_open_until.isoformat()} "
                f"(too many consecutive failures). Retry later."
            )


def _cb_record_failure() -> None:
    global _cb_failures, _cb_open_until
    with _cb_lock:
        _cb_failures += 1
        if _cb_failures >= _CB_THRESHOLD:
            _cb_open_until = datetime.now(timezone.utc) + timedelta(seconds=_CB_COOLDOWN_SEC)
            logger.warning(
                "VLM circuit breaker OPEN for %ds after %d consecutive failures.",
                _CB_COOLDOWN_SEC,
                _cb_failures,
            )


def _cb_record_success() -> None:
    global _cb_failures, _cb_open_until
    with _cb_lock:
        if _cb_failures or _cb_open_until:
            logger.info("VLM circuit breaker CLOSED (success after failures).")
        _cb_failures = 0
        _cb_open_until = None


def _timeout() -> httpx.Timeout:
    read = float(settings.VLM_TIMEOUT_SECONDS)
    return httpx.Timeout(connect=15.0, read=read, write=30.0, pool=5.0)


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    token = (settings.VLM_TOKEN or "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _to_base64(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode("ascii")


def describe_image(
    image_bytes: bytes,
    prompt: str,
    *,
    model: str | None = None,
    max_tokens: int | None = None,
    temperature: float | None = None,
) -> str:
    """
    Send one image + prompt to the VLM and return the generated text.

    Raises VLMError on terminal failure (after retries / breaker).
    """
    _cb_check()

    base = get_active_vlm_url().rstrip("/")
    url = f"{base}/api/generate"
    payload = {
        "model": model or settings.VLM_MODEL,
        "prompt": prompt,
        "images": [_to_base64(image_bytes)],
        "stream": False,
        "options": {
            "temperature": settings.VLM_TEMPERATURE if temperature is None else temperature,
            "num_predict": settings.VLM_MAX_TOKENS if max_tokens is None else max_tokens,
        },
    }

    model_name = payload["model"]
    # Telemetry wraps the whole call (all retries) → one record per describe_image,
    # tagged ok/error, with the winning response's token counts.
    with ai_telemetry.track("ollama", model_name, "vlm.describe") as tel:
        last_exc: Exception | None = None
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                logger.info(
                    "VLM describe_image via %s model=%s (attempt %d/%d)",
                    base, model_name, attempt, _MAX_RETRIES,
                )
                with httpx.Client(timeout=_timeout()) as client:
                    resp = client.post(url, json=payload, headers=_headers())

                if resp.status_code == 200:
                    data = resp.json()
                    text = str(data.get("response") or "").strip()
                    if not text:
                        raise VLMError("VLM returned an empty response.")
                    tel.prompt_tokens = int(data.get("prompt_eval_count") or 0)
                    tel.completion_tokens = int(data.get("eval_count") or 0)
                    _cb_record_success()
                    return text

                if resp.status_code in _RETRYABLE_STATUS:
                    last_exc = VLMError(f"VLM returned HTTP {resp.status_code}")
                    logger.warning(
                        "VLM HTTP %d (attempt %d/%d), retrying in %.0fs",
                        resp.status_code, attempt, _MAX_RETRIES, _RETRY_DELAY_SEC,
                    )
                else:
                    resp.raise_for_status()

            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                logger.warning("VLM connection/timeout (attempt %d/%d): %s", attempt, _MAX_RETRIES, exc)
                last_exc = exc
            except httpx.HTTPStatusError as exc:
                _cb_record_failure()
                raise VLMError(f"VLM returned HTTP {exc.response.status_code}") from exc

            if attempt < _MAX_RETRIES:
                time.sleep(_RETRY_DELAY_SEC)

        _cb_record_failure()
        raise VLMError(f"VLM failed after {_MAX_RETRIES} attempts: {last_exc}") from last_exc


def health_check() -> dict:
    """Cheap reachability probe for the admin health panel. Never raises."""
    base = get_active_vlm_url().rstrip("/")
    try:
        with httpx.Client(timeout=httpx.Timeout(connect=3.0, read=5.0, write=3.0, pool=2.0)) as client:
            resp = client.get(f"{base}/api/tags", headers=_headers())
        resp.raise_for_status()
        models = [m.get("name") for m in (resp.json().get("models") or [])]
        want = settings.VLM_MODEL
        return {"reachable": True, "url": base, "model": want, "model_available": want in models}
    except Exception as exc:  # noqa: BLE001 — health probe must not raise
        return {"reachable": False, "url": base, "model": settings.VLM_MODEL, "error": str(exc)[:200]}
