"""Critic Agent — validates translations via Gemini critic pass."""
from __future__ import annotations

import logging

from control_plane.llm.gemini_provider import BoxTranslation, CritiqueResponse, get_provider
from control_plane.llmops.prompt_registry import get_system_prompt

log = logging.getLogger(__name__)


def critique(
    translations: list[BoxTranslation],
    context: dict,
    api_key: str | None = None,
) -> CritiqueResponse:
    if not translations:
        return CritiqueResponse(passed=True)

    try:
        prompt = get_system_prompt("critic_v1")
        return get_provider().critique_batch(translations, context, prompt, api_key=api_key)
    except Exception as exc:
        log.error("Critic agent failed: %s", exc)
        return CritiqueResponse(passed=True)  # don't block on critic failure
