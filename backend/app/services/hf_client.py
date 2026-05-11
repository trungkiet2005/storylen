"""
StoryLens Backend — AI Client
Calls the HuggingFace Space AI Worker via HTTP.
The Render API never loads heavy ML models directly.
"""
from __future__ import annotations

import logging
import os

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Timeout generous enough for full pipeline (OCR + Translate can be slow)
_HTTP_TIMEOUT = httpx.Timeout(connect=10.0, read=300.0, write=30.0, pool=5.0)


def _hf_url(path: str) -> str:
    base = settings.HF_SPACE_URL.rstrip("/")
    return f"{base}{path}"


def call_process(page_id: str, image_url: str) -> list[dict]:
    """
    Call HF Space POST /process.
    Returns list of bubble dicts (bubble_id, bbox, original_text,
    translated_text, confidence, embedding).
    Raises httpx.HTTPStatusError on failure.
    """
    payload = {"page_id": page_id, "image_url": image_url}
    headers = {}
    if settings.HF_SPACE_TOKEN:
        headers["Authorization"] = f"Bearer {settings.HF_SPACE_TOKEN}"

    logger.info("Calling HF Space /process for page %s", page_id)
    with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
        resp = client.post(_hf_url("/process"), json=payload, headers=headers)
        resp.raise_for_status()

    data = resp.json()
    return data.get("bubbles", [])


def call_embed(text: str) -> list[float]:
    """
    Call HF Space POST /embed.
    Returns 384-dim float list.
    Used by the Q&A router to embed user questions without running
    Sentence Transformers on Render.
    """
    headers = {}
    if settings.HF_SPACE_TOKEN:
        headers["Authorization"] = f"Bearer {settings.HF_SPACE_TOKEN}"

    with httpx.Client(timeout=httpx.Timeout(30.0)) as client:
        resp = client.post(_hf_url("/embed"), json={"text": text}, headers=headers)
        resp.raise_for_status()

    return resp.json().get("embedding", [])
