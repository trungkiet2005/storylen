"""
StoryLens Backend — AI Client
Calls the HuggingFace Space AI Worker via HTTP.
The Render API never loads heavy ML models directly.

Fixes:
- Handle HF Space being down with informative errors
- Retry on transient network errors (once)
- Log request/response details for debugging
- Validate response structure
"""
from __future__ import annotations

import logging
import time

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Timeout generous enough for full pipeline (OCR + Translate can be slow on cold start)
_HTTP_TIMEOUT = httpx.Timeout(connect=15.0, read=300.0, write=30.0, pool=5.0)
_EMBED_TIMEOUT = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=5.0)

# Number of retries on network errors
_MAX_RETRIES = 2
_RETRY_DELAY_SEC = 3.0


def _hf_url(path: str) -> str:
    base = settings.HF_SPACE_URL.rstrip("/")
    return f"{base}{path}"


def _build_headers() -> dict[str, str]:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    token = settings.HF_SPACE_TOKEN.strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def call_process(page_id: str, image_url: str) -> list[dict]:
    """
    Call HF Space POST /process.
    Returns list of bubble dicts (bubble_id, bbox, original_text,
    translated_text, confidence, embedding).
    Raises RuntimeError if the request ultimately fails after retries.
    """
    payload = {"page_id": page_id, "image_url": image_url}
    headers = _build_headers()

    last_exc: Exception | None = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            logger.info(
                "Calling HF Space /process for page %s (attempt %d/%d)",
                page_id,
                attempt,
                _MAX_RETRIES,
            )
            with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
                resp = client.post(_hf_url("/process"), json=payload, headers=headers)

            if resp.status_code == 200:
                data = resp.json()
                bubbles = data.get("bubbles", [])
                if not isinstance(bubbles, list):
                    logger.error(
                        "HF Space /process returned unexpected 'bubbles' type: %s",
                        type(bubbles),
                    )
                    return []
                return bubbles
            elif resp.status_code in (502, 503, 504):
                # HF Space is starting up or overloaded — retry
                logger.warning(
                    "HF Space returned %d for page %s, retrying in %.0fs…",
                    resp.status_code,
                    page_id,
                    _RETRY_DELAY_SEC,
                )
                last_exc = RuntimeError(
                    f"HF Space returned HTTP {resp.status_code}"
                )
            else:
                resp.raise_for_status()

        except httpx.ConnectError as exc:
            logger.warning(
                "HF Space connection error (attempt %d/%d): %s",
                attempt,
                _MAX_RETRIES,
                exc,
            )
            last_exc = exc
        except httpx.TimeoutException as exc:
            logger.warning(
                "HF Space timeout (attempt %d/%d) for page %s",
                attempt,
                _MAX_RETRIES,
                page_id,
            )
            last_exc = exc
        except httpx.HTTPStatusError as exc:
            logger.error(
                "HF Space HTTP error %d for page %s: %s",
                exc.response.status_code,
                page_id,
                exc.response.text[:500],
            )
            raise RuntimeError(
                f"HF Space returned HTTP {exc.response.status_code}"
            ) from exc

        if attempt < _MAX_RETRIES:
            time.sleep(_RETRY_DELAY_SEC)

    raise RuntimeError(
        f"HF Space /process failed after {_MAX_RETRIES} attempts: {last_exc}"
    ) from last_exc


def call_embed(text: str) -> list[float]:
    """
    Call HF Space POST /embed.
    Returns 384-dim float list.
    Used by the Q&A router to embed user questions without running
    Sentence Transformers on Render.
    Raises RuntimeError on failure.
    """
    headers = _build_headers()

    try:
        with httpx.Client(timeout=_EMBED_TIMEOUT) as client:
            resp = client.post(
                _hf_url("/embed"),
                json={"text": text},
                headers=headers,
            )
            resp.raise_for_status()

        data = resp.json()
        embedding = data.get("embedding", [])
        if not isinstance(embedding, list):
            raise RuntimeError(
                f"HF Space /embed returned unexpected type for 'embedding': {type(embedding)}"
            )
        return embedding

    except httpx.ConnectError as exc:
        raise RuntimeError(
            f"Cannot connect to HF Space at {settings.HF_SPACE_URL}: {exc}"
        ) from exc
    except httpx.TimeoutException as exc:
        raise RuntimeError("HF Space /embed request timed out.") from exc
    except httpx.HTTPStatusError as exc:
        raise RuntimeError(
            f"HF Space /embed returned HTTP {exc.response.status_code}: "
            f"{exc.response.text[:200]}"
        ) from exc
