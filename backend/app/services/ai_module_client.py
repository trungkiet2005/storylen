"""
StoryLens Backend - ai_module client.

Delegates manga image rendering to the local/remote ai_module FastAPI service.
"""
from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_HTTP_TIMEOUT = httpx.Timeout(connect=15.0, read=600.0, write=30.0, pool=5.0)
_MAX_RETRIES = 2
_RETRY_DELAY_SEC = 3.0


def _ai_module_url(path: str) -> str:
    base = settings.AI_MODULE_URL.rstrip("/")
    return f"{base}{path}"


def _build_headers() -> dict[str, str]:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    token = settings.AI_MODULE_TOKEN.strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _translation_config() -> dict[str, Any]:
    return {
        "translator": {
            "translator": settings.AI_MODULE_TRANSLATOR,
            "target_lang": settings.AI_MODULE_TARGET_LANG,
            "no_text_lang_skip": True,
        },
        "detector": {"detector": settings.AI_MODULE_DETECTOR},
        "ocr": {"ocr": settings.AI_MODULE_OCR},
        "inpainter": {"inpainter": settings.AI_MODULE_INPAINTER},
        "render": {"renderer": settings.AI_MODULE_RENDERER},
    }


def call_translate(page_id: str, image_url: str) -> dict[str, Any]:
    """
    Call ai_module POST /translate/image with the Supabase image URL.

    Returns:
    {
      "bubbles": [],
      "rendered_image_url": None,
      "rendered_image_bytes": PNG bytes returned directly by ai_module.
    }
    """
    payload = {
        "image": image_url,
        "config": _translation_config(),
    }
    headers = _build_headers()
    last_exc: Exception | None = None

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            logger.info(
                "Calling ai_module /translate/image for page %s target=%s translator=%s (attempt %d/%d)",
                page_id,
                settings.AI_MODULE_TARGET_LANG,
                settings.AI_MODULE_TRANSLATOR,
                attempt,
                _MAX_RETRIES,
            )
            with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
                resp = client.post(
                    _ai_module_url("/translate/image"),
                    json=payload,
                    headers=headers,
                )

            if resp.status_code == 200:
                return {
                    "bubbles": [],
                    "rendered_image_url": None,
                    "rendered_image_bytes": resp.content,
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
            raise RuntimeError(
                f"ai_module returned HTTP {exc.response.status_code}"
            ) from exc

        if attempt < _MAX_RETRIES:
            time.sleep(_RETRY_DELAY_SEC)

    raise RuntimeError(
        f"ai_module /translate/image failed after {_MAX_RETRIES} attempts: {last_exc}"
    ) from last_exc
