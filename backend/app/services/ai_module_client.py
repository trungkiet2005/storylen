"""
StoryLens Backend - ai_module client.

Delegates manga image rendering to the local/remote ai_module FastAPI service.
"""
from __future__ import annotations

import logging
import base64
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_HTTP_TIMEOUT = httpx.Timeout(connect=15.0, read=600.0, write=30.0, pool=5.0)
_OPTIONS_TIMEOUT = httpx.Timeout(connect=2.0, read=4.0, write=2.0, pool=2.0)
_MAX_RETRIES = 2
_RETRY_DELAY_SEC = 3.0

# ─── Simple circuit breaker ───────────────────────────────────────────────────
# After _CB_THRESHOLD consecutive terminal failures the breaker opens and fast-
# fails all callers for _CB_COOLDOWN_SEC seconds. This prevents a down ai_module
# from pinning every upload thread for up to 20 minutes each.
_CB_THRESHOLD = 5
_CB_COOLDOWN_SEC = 120

_cb_lock = threading.Lock()
_cb_failures = 0
_cb_open_until: datetime | None = None


def _cb_check() -> None:
    """Raise immediately if the circuit is open."""
    with _cb_lock:
        if _cb_open_until and datetime.now(timezone.utc) < _cb_open_until:
            raise RuntimeError(
                f"ai_module circuit breaker is open until {_cb_open_until.isoformat()} "
                f"(too many consecutive failures). Retry later."
            )


def _cb_record_failure() -> None:
    global _cb_failures, _cb_open_until
    with _cb_lock:
        _cb_failures += 1
        if _cb_failures >= _CB_THRESHOLD:
            _cb_open_until = datetime.now(timezone.utc) + timedelta(seconds=_CB_COOLDOWN_SEC)
            logger.warning(
                "ai_module circuit breaker OPEN for %ds after %d consecutive failures.",
                _CB_COOLDOWN_SEC,
                _cb_failures,
            )


def _cb_record_success() -> None:
    global _cb_failures, _cb_open_until
    with _cb_lock:
        if _cb_failures or _cb_open_until:
            logger.info("ai_module circuit breaker CLOSED (success after failures).")
        _cb_failures = 0
        _cb_open_until = None

_FALLBACK_TRANSLATORS = [
    "gemini",
    "m2m100",
    "nllb",
    "mbart50",
]
_FALLBACK_TARGET_LANGUAGES = [
    "CHS",
    "CHT",
    "CSY",
    "NLD",
    "ENG",
    "FRA",
    "DEU",
    "HUN",
    "ITA",
    "JPN",
    "KOR",
    "POL",
    "PTB",
    "ROM",
    "RUS",
    "ESP",
    "TRK",
    "UKR",
    "VIN",
    "ARA",
    "HRV",
    "THA",
    "IND",
    "FIL",
]
_FALLBACK_DETECTORS = ["default", "dbconvnext", "ctd", "craft", "paddle", "none"]
_FALLBACK_OCR_MODELS = ["32px", "48px", "48px_ctc", "mocr"]
_FALLBACK_INPAINTERS = ["default", "lama_large", "lama_mpe", "sd", "none", "original"]
_FALLBACK_RENDERERS = ["default", "manga2eng", "manga2eng_pillow", "none"]


def _ai_module_url(path: str) -> str:
    base = settings.AI_MODULE_URL.rstrip("/")
    return f"{base}{path}"


def _build_headers() -> dict[str, str]:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    token = settings.AI_MODULE_TOKEN.strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _current_config() -> dict[str, str]:
    return {
        "translator": settings.AI_MODULE_TRANSLATOR,
        "target_lang": settings.AI_MODULE_TARGET_LANG,
        "detector": settings.AI_MODULE_DETECTOR,
        "ocr": settings.AI_MODULE_OCR,
        "inpainter": settings.AI_MODULE_INPAINTER,
        "renderer": settings.AI_MODULE_RENDERER,
    }


def _fallback_options() -> dict[str, Any]:
    return {
        "current": _current_config(),
        "translators": _FALLBACK_TRANSLATORS,
        "target_languages": _FALLBACK_TARGET_LANGUAGES,
        "detectors": _FALLBACK_DETECTORS,
        "ocr_models": _FALLBACK_OCR_MODELS,
        "inpainters": _FALLBACK_INPAINTERS,
        "renderers": _FALLBACK_RENDERERS,
    }


def get_ai_module_options() -> dict[str, Any]:
    headers = _build_headers()
    headers.pop("Content-Type", None)

    try:
        with httpx.Client(timeout=_OPTIONS_TIMEOUT) as client:
            resp = client.get(_ai_module_url("/config/options"), headers=headers)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning("Could not read ai_module options, using fallback: %s", exc)
        return _fallback_options()

    fallback = _fallback_options()
    return {
        "current": fallback["current"],
        "translators": data.get("translators") or fallback["translators"],
        "target_languages": data.get("target_languages") or fallback["target_languages"],
        "detectors": data.get("detectors") or fallback["detectors"],
        "ocr_models": data.get("ocr_models") or fallback["ocr_models"],
        "inpainters": data.get("inpainters") or fallback["inpainters"],
        "renderers": data.get("renderers") or fallback["renderers"],
    }


def _translation_config(config_override: dict[str, Any] | None = None) -> dict[str, Any]:
    current = _current_config()
    if config_override:
        for key in current:
            value = config_override.get(key)
            if isinstance(value, str) and value.strip():
                current[key] = value.strip()

    return {
        "translator": {
            "translator": current["translator"],
            "target_lang": current["target_lang"],
            "no_text_lang_skip": True,
        },
        "detector": {"detector": current["detector"]},
        "ocr": {"ocr": current["ocr"]},
        "inpainter": {"inpainter": current["inpainter"]},
        "render": {"renderer": current["renderer"]},
    }


def call_translate(
    page_id: str,
    image_url: str,
    config_override: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Call ai_module POST /translate/image with the Supabase image URL.

    Returns:
    {
      "bubbles": [],
      "rendered_image_url": None,
      "rendered_image_bytes": PNG bytes returned directly by ai_module.
    }
    """
    _cb_check()  # fail-fast if circuit is open

    payload = {
        "image": image_url,
        "config": _translation_config(config_override),
    }
    headers = _build_headers()
    last_exc: Exception | None = None

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            logger.info(
                "Calling ai_module /translate/storylens for page %s target=%s translator=%s (attempt %d/%d)",
                page_id,
                payload["config"]["translator"]["target_lang"],
                payload["config"]["translator"]["translator"],
                attempt,
                _MAX_RETRIES,
            )
            with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
                resp = client.post(
                    _ai_module_url("/translate/storylens"),
                    json=payload,
                    headers=headers,
                )

            if resp.status_code == 200:
                data = resp.json()
                rendered_base64 = str(data.get("rendered_image_base64") or "")
                if rendered_base64.startswith("data:"):
                    rendered_base64 = rendered_base64.split(",", 1)[-1]
                try:
                    rendered_image_bytes = base64.b64decode(rendered_base64, validate=True)
                except Exception as exc:
                    raise RuntimeError("ai_module returned invalid rendered_image_base64") from exc

                bubbles = []
                for item in data.get("bubbles") or []:
                    if not isinstance(item, dict):
                        continue
                    bubbles.append({
                        "bbox": item.get("bbox") or [0, 0, 0, 0],
                        "original_text": item.get("original_text") or "",
                        "translated_text": item.get("translated_text") or "",
                        "confidence": item.get("confidence") or 0.0,
                    })

                _cb_record_success()
                return {
                    "bubbles": bubbles,
                    "rendered_image_url": None,
                    "rendered_image_bytes": rendered_image_bytes,
                }

            if resp.status_code == 404:
                logger.warning(
                    "ai_module has no /translate/storylens endpoint; falling back to image-only translation for page %s",
                    page_id,
                )
                with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
                    image_resp = client.post(
                        _ai_module_url("/translate/image"),
                        json=payload,
                        headers=headers,
                    )
                image_resp.raise_for_status()
                _cb_record_success()
                return {
                    "bubbles": [],
                    "rendered_image_url": None,
                    "rendered_image_bytes": image_resp.content,
                }

            if resp.status_code in (502, 503, 504):
                last_exc = RuntimeError(f"ai_module returned HTTP {resp.status_code}")
                logger.warning(
                    "ai_module returned %d for page %s, retrying in %.0fs",
                    resp.status_code,
                    page_id,
                    _RETRY_DELAY_SEC,
                )
            else:
                resp.raise_for_status()

        except httpx.ConnectError as exc:
            logger.warning(
                "ai_module connection error (attempt %d/%d): %s",
                attempt,
                _MAX_RETRIES,
                exc,
            )
            last_exc = exc
        except httpx.TimeoutException as exc:
            logger.warning(
                "ai_module timeout (attempt %d/%d) for page %s",
                attempt,
                _MAX_RETRIES,
                page_id,
            )
            last_exc = exc
        except httpx.HTTPStatusError as exc:
            logger.error(
                "ai_module HTTP error %d for page %s: %s",
                exc.response.status_code,
                page_id,
                exc.response.text[:500],
            )
            _cb_record_failure()
            raise RuntimeError(
                f"ai_module returned HTTP {exc.response.status_code}"
            ) from exc

        if attempt < _MAX_RETRIES:
            time.sleep(_RETRY_DELAY_SEC)

    _cb_record_failure()
    raise RuntimeError(
        f"ai_module /translate/image failed after {_MAX_RETRIES} attempts: {last_exc}"
    ) from last_exc
