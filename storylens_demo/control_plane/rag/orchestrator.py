"""RAG Orchestrator — assembles context from all 5 agents for Gemini."""
from __future__ import annotations

import logging

from control_plane.rag import (
    glossary_agent,
    layout_agent,
    story_agent,
    style_agent,
)

log = logging.getLogger(__name__)


def build_context(
    manga_id: str,
    chapter_id: str,
    page_id: str,
    boxes: list[dict],
    style_card: dict | None = None,
) -> dict:
    """
    boxes: list of {"box_id", "raw_text", "xyxy"}
    Returns a context dict ready to inject into Gemini prompt.
    """
    ocr_texts = [b.get("raw_text", "") for b in boxes if b.get("raw_text")]

    log.debug("RAG: story_agent for manga=%s chapter=%s", manga_id, chapter_id)
    story_ctx = story_agent.retrieve(manga_id, chapter_id, ocr_texts)

    log.debug("RAG: glossary_agent")
    glossary_ctx = glossary_agent.retrieve(manga_id, ocr_texts)

    log.debug("RAG: style_agent")
    style_ctx = style_agent.retrieve(manga_id, style_card, ocr_texts)

    log.debug("RAG: layout_agent")
    layout_ctx = layout_agent.compute_constraints(boxes)

    return {
        **story_ctx,
        **glossary_ctx,
        **style_ctx,
        **layout_ctx,
    }
