"""Image worker — calls the ngrok image translator or falls back to mock OCR."""
from __future__ import annotations

from dataclasses import dataclass
import logging

import httpx

from control_plane.config import get_settings

log = logging.getLogger(__name__)

SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


@dataclass(frozen=True)
class NgrokImageResult:
    content: bytes
    media_type: str


def ngrok_worker_configured() -> bool:
    """Return true when secrets/keys.json provides the ngrok upstream URL."""
    return bool(get_settings().kaggle_worker_url)


async def translate_image_via_ngrok(image_bytes: bytes, filename: str, custom_url: str | None = None) -> NgrokImageResult:
    """Forward the uploaded page to the ngrok worker's /translate-image endpoint."""
    settings = get_settings()
    url = custom_url or settings.kaggle_worker_url
    if not url:
        raise RuntimeError("Missing kaggle_worker_url/ngrok worker URL")

    return await _call_ngrok_translate(
        url,
        settings.kaggle_worker_api_key,
        image_bytes,
        filename,
    )


async def extract_page(
    image_bytes: bytes,
    filename: str,
    manga_id: str,
    chapter_id: str,
    page_id: str,
) -> dict:
    """
    Returns mock OCR for dev when no ngrok translation worker is configured.
    Returns page_analysis dict.
    """
    log.warning("No ngrok worker URL configured — using mock OCR")
    return _mock_ocr(page_id)


async def _call_ngrok_translate(
    base_url: str,
    api_key: str,
    image_bytes: bytes,
    filename: str,
) -> NgrokImageResult:
    headers = {"ngrok-skip-browser-warning": "true"}
    if api_key:
        headers["X-StoryLens-Key"] = api_key

    async with httpx.AsyncClient(timeout=3600) as client:
        response = await client.post(
            f"{base_url.rstrip('/')}/translate-image",
            headers=headers,
            files={"file": (filename, image_bytes, "application/octet-stream")},
        )
        if response.status_code >= 400:
            detail = response.text[:1000] if response.text else response.reason_phrase
            raise RuntimeError(f"ngrok worker returned HTTP {response.status_code}: {detail}")

        return NgrokImageResult(
            content=response.content,
            media_type=response.headers.get("content-type", "image/png"),
        )


def _mock_ocr(page_id: str, image_bytes: bytes | None = None) -> dict:
    """Mock page analysis for dev/testing."""
    return {
        "page_id": page_id,
        "width": 900,
        "height": 1300,
        "boxes": [
            {
                "box_id": "b001",
                "xyxy": [50, 50, 350, 110],
                "raw_text": "Give it to me!",
                "ocr_confidence": 0.92,
            },
            {
                "box_id": "b002",
                "xyxy": [400, 200, 700, 260],
                "raw_text": "No way! It's mine!",
                "ocr_confidence": 0.88,
            },
        ],
        "mock": True,
    }
