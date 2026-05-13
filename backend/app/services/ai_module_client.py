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
_OPTIONS_TIMEOUT = httpx.Timeout(connect=2.0, read=4.0, write=2.0, pool=2.0)
_MAX_RETRIES = 2
_RETRY_DELAY_SEC = 3.0

_FALLBACK_TRANSLATORS = [
    "google",
    "youdao",
    "baidu",
    "deepl",
    "papago",
    "caiyun",
    "chatgpt",
    "chatgpt_2stage",
    "none",
    "original",
    "sakura",
    "deepseek",
    "groq",
    "gemini",
    "gemini_2stage",
    "custom_openai",
    "offline",
    "nllb",
    "nllb_big",
    "sugoi",
    "jparacrawl",
    "jparacrawl_big",
    "m2m100",
    "m2m100_big",
    "mbart50",
    "qwen2",
    "qwen2_big",
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
    payload = {
        "image": image_url,
        "config": _translation_config(config_override),
    }
    headers = _build_headers()
    last_exc: Exception | None = None

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            logger.info(
                "Calling ai_module /translate/image for page %s target=%s translator=%s (attempt %d/%d)",
                page_id,
                payload["config"]["translator"]["target_lang"],
                payload["config"]["translator"]["translator"],
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
