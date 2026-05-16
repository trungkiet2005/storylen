"""
Gemini provider — wraps Google AI Studio API (google-genai SDK).
Handles: translate_batch, critique_batch, embed, summarize.
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any

from google import genai
from google.genai import types as genai_types

from control_plane.config import get_settings

log = logging.getLogger(__name__)

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = get_settings().gemini_api_key
        if not api_key:
            raise RuntimeError(
                "Gemini API key not configured. "
                "Add it to secrets/keys.json \u2192 gemini_api_key"
            )
        _client = genai.Client(api_key=api_key)
    return _client


def _ensure_init() -> None:
    _get_client()  # validates key on first call


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------
@dataclass
class BoxInput:
    box_id: str
    raw_text: str
    reading_order: int = 0
    max_chars_hint: int | None = None


@dataclass
class BoxTranslation:
    box_id: str
    translated_text: str
    speaker: str | None = None
    tone: str | None = None
    confidence: float = 0.8
    notes: str | None = None


@dataclass
class MemoryUpdate:
    type: str  # glossary|style|story_event
    content: str
    confidence: float = 0.5


@dataclass
class TranslationResponse:
    items: list[BoxTranslation] = field(default_factory=list)
    memory_updates: list[MemoryUpdate] = field(default_factory=list)
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int = 0


@dataclass
class CritiqueIssue:
    box_id: str
    old_text: str
    new_text: str
    reason: str


@dataclass
class CritiqueResponse:
    passed: bool = True
    issues: list[CritiqueIssue] = field(default_factory=list)
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int = 0


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
_RETRY_STATUSES = {429, 500, 503}


def _call_with_retry(model_name: str, prompt: str, max_retries: int = 3, client: genai.Client | None = None) -> Any:
    client = client or _get_client()
    backoff = 2.0
    last_exc = None
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            return response
        except Exception as exc:
            last_exc = exc
            code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
            if attempt < max_retries - 1:
                log.warning("Gemini attempt %d failed (%s): %s — retrying in %.1fs", attempt + 1, code, exc, backoff)
                time.sleep(backoff)
                backoff = min(backoff * 2, 30)
            else:
                log.error("Gemini failed after %d attempts: %s", max_retries, exc)
    raise RuntimeError(f"Gemini API failed after {max_retries} retries: {last_exc}") from last_exc


def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
    return json.loads(text)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
class GeminiProvider:
    def __init__(self):
        self._settings = get_settings()

    def translate_batch(
        self,
        boxes: list[BoxInput],
        context: dict,
        prompt_template: str,
        page_index: int = 0,
        api_key: str | None = None,
    ) -> TranslationResponse:
        client = genai.Client(api_key=api_key) if api_key else _get_client()
        t0 = time.monotonic()

        user_input = json.dumps({
            "page_index": page_index,
            "boxes": [
                {
                    "box_id": b.box_id,
                    "raw_text": b.raw_text,
                    "reading_order": b.reading_order,
                    **({"max_chars_hint": b.max_chars_hint} if b.max_chars_hint else {}),
                }
                for b in boxes
            ],
        }, ensure_ascii=False)

        context_block = json.dumps(context, ensure_ascii=False)
        full_prompt = f"{prompt_template}\n\n### Context\n{context_block}\n\n### Input\n{user_input}"

        response = _call_with_retry(self._settings.gemini_translation_model, full_prompt, client=client)
        raw = response.text or "{}"

        latency_ms = int((time.monotonic() - t0) * 1000)
        try:
            data = _parse_json(raw)
        except json.JSONDecodeError as exc:
            log.error("Failed to parse Gemini translation JSON: %s\nRaw: %s", exc, raw[:500])
            data = {}

        items = [
            BoxTranslation(
                box_id=item.get("box_id", ""),
                translated_text=item.get("translated_text", ""),
                speaker=item.get("speaker"),
                tone=item.get("tone"),
                confidence=float(item.get("confidence", 0.8)),
                notes=item.get("notes"),
            )
            for item in data.get("items", [])
        ]

        memory_updates = [
            MemoryUpdate(
                type=m.get("type", "glossary"),
                content=m.get("content", ""),
                confidence=float(m.get("confidence", 0.5)),
            )
            for m in data.get("memory_updates", [])
        ]

        usage = response.usage_metadata if hasattr(response, "usage_metadata") else None
        return TranslationResponse(
            items=items,
            memory_updates=memory_updates,
            input_tokens=getattr(usage, "prompt_token_count", 0) or 0,
            output_tokens=getattr(usage, "candidates_token_count", 0) or 0,
            latency_ms=latency_ms,
        )

    def critique_batch(
        self,
        translations: list[BoxTranslation],
        context: dict,
        prompt_template: str,
        api_key: str | None = None,
    ) -> CritiqueResponse:
        client = genai.Client(api_key=api_key) if api_key else _get_client()
        t0 = time.monotonic()

        items_json = json.dumps(
            [{"box_id": t.box_id, "translated_text": t.translated_text, "speaker": t.speaker}
             for t in translations],
            ensure_ascii=False,
        )
        context_block = json.dumps(context, ensure_ascii=False)
        full_prompt = f"{prompt_template}\n\n### Context\n{context_block}\n\n### Translations to review\n{items_json}"

        response = _call_with_retry(self._settings.gemini_critic_model, full_prompt, client=client)
        raw = response.text or "{}"
        latency_ms = int((time.monotonic() - t0) * 1000)

        try:
            data = _parse_json(raw)
        except json.JSONDecodeError:
            data = {"pass": True, "issues": []}

        issues = [
            CritiqueIssue(
                box_id=i.get("box_id", ""),
                old_text=i.get("old", ""),
                new_text=i.get("new", ""),
                reason=i.get("reason", ""),
            )
            for i in data.get("issues", [])
        ]

        usage = response.usage_metadata if hasattr(response, "usage_metadata") else None
        return CritiqueResponse(
            passed=data.get("pass", True),
            issues=issues,
            input_tokens=getattr(usage, "prompt_token_count", 0) or 0,
            output_tokens=getattr(usage, "candidates_token_count", 0) or 0,
            latency_ms=latency_ms,
        )

    def embed(self, texts: list[str], api_key: str | None = None) -> list[list[float]]:
        """Embed a list of texts using Gemini embedding model."""
        client = genai.Client(api_key=api_key) if api_key else _get_client()
        if not texts:
            return []
        result = client.models.embed_content(
            model=self._settings.gemini_embedding_model,
            contents=texts,
        )
        embeddings = result.embeddings
        if not embeddings:
            return []
        # Single text returns one embedding, multiple returns list
        if isinstance(embeddings[0], list):
            return embeddings
        return [e.values for e in embeddings] if hasattr(embeddings[0], 'values') else [embeddings]

    def summarize(self, text: str, style: str = "concise") -> str:
        """Generate a chapter/scene summary."""
        client = _get_client()
        prompt = (
            f"Tóm tắt nội dung sau bằng tiếng Việt, phong cách {style}, "
            f"tối đa 200 từ:\n\n{text}"
        )
        response = client.models.generate_content(
            model=self._settings.gemini_translation_model,
            contents=prompt,
        )
        return response.text or ""


# Singleton
_provider: GeminiProvider | None = None


def get_provider() -> GeminiProvider:
    global _provider
    if _provider is None:
        _provider = GeminiProvider()
    return _provider
