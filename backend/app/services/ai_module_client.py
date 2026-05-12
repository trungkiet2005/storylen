"""
StoryLens Backend - ai_module client.

Delegates manga image translation to the local/remote ai_module FastAPI service
and normalises its JSON response into the BubbleResult shape used by StoryLens.
"""
from __future__ import annotations

import logging
import time
import uuid
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
        },
        "detector": {"detector": settings.AI_MODULE_DETECTOR},
        "ocr": {"ocr": settings.AI_MODULE_OCR},
        "inpainter": {"inpainter": settings.AI_MODULE_INPAINTER},
        "render": {"renderer": settings.AI_MODULE_RENDERER},
    }


def _normalise_bbox(item: dict[str, Any]) -> list[int]:
    try:
        min_x = int(float(item.get("minX", 0)))
        min_y = int(float(item.get("minY", 0)))
        max_x = int(float(item.get("maxX", min_x)))
        max_y = int(float(item.get("maxY", min_y)))
    except (TypeError, ValueError):
        return [0, 0, 0, 0]

    return [
        max(0, min_x),
        max(0, min_y),
        max(0, max_x - min_x),
        max(0, max_y - min_y),
    ]


def _normalise_text(text_map: Any) -> tuple[str, str]:
    if not isinstance(text_map, dict):
        return "", ""

    target_lang = settings.AI_MODULE_TARGET_LANG
    translated = str(
        text_map.get(target_lang)
        or text_map.get(target_lang.lower())
        or text_map.get(target_lang.upper())
        or ""
    )

    original = ""
    for key in ("JPN", "JA", "ja", "jpn"):
        if key != target_lang and text_map.get(key):
            original = str(text_map[key])
            break

    if not original:
        for key, value in text_map.items():
            if key != target_lang and value:
                original = str(value)
                break

    if not translated:
        for key, value in text_map.items():
            if key != target_lang and str(value) != original and value:
                translated = str(value)
                break

    return original, translated


def _normalise_translation(page_id: str, index: int, item: dict[str, Any]) -> dict[str, Any]:
    bbox = _normalise_bbox(item)
    original_text, translated_text = _normalise_text(item.get("text"))
    try:
        confidence = float(item.get("prob", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))

    bubble_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{page_id}:{index}:{bbox}"))
    return {
        "bubble_id": bubble_id,
        "bbox": bbox,
        "original_text": original_text,
        "translated_text": translated_text,
        "confidence": confidence,
    }


def call_translate(page_id: str, image_url: str) -> list[dict[str, Any]]:
    """
    Call ai_module POST /translate/json with the Supabase image URL.

    Returns StoryLens-compatible bubble dicts:
    bubble_id, bbox [x, y, w, h], original_text, translated_text, confidence.
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
                "Calling ai_module /translate/json for page %s (attempt %d/%d)",
                page_id,
                attempt,
                _MAX_RETRIES,
            )
            with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
                resp = client.post(
                    _ai_module_url("/translate/json"),
                    json=payload,
                    headers=headers,
                )

            if resp.status_code == 200:
                data = resp.json()
                raw_translations = data.get("translations", [])
                if not isinstance(raw_translations, list):
                    raise RuntimeError(
                        "ai_module returned unexpected 'translations' type: "
                        f"{type(raw_translations)}"
                    )
                return [
                    _normalise_translation(page_id, index, item)
                    for index, item in enumerate(raw_translations)
                    if isinstance(item, dict)
                ]

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
        f"ai_module /translate/json failed after {_MAX_RETRIES} attempts: {last_exc}"
    ) from last_exc
