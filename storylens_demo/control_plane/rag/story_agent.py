"""Story Memory Agent — retrieves chapter/scene context from vector store."""
from __future__ import annotations

import logging

from control_plane.llm.gemini_provider import get_provider
from control_plane.storage import vector_store as vs

log = logging.getLogger(__name__)


def retrieve(manga_id: str, chapter_id: str, ocr_texts: list[str], n: int = 5) -> dict:
    """
    Returns story context relevant to current page OCR content.
    """
    if not ocr_texts:
        return {"story_context": "", "recent_events": [], "speaker_hints": {}}

    combined = " ".join(ocr_texts[:10])  # limit for embedding cost
    try:
        embeddings = get_provider().embed([combined])
        results = vs.query(
            vs.STORY_MEMORY,
            query_embeddings=embeddings,
            n_results=n,
            where={"manga_id": manga_id},
        )
    except Exception as exc:
        log.warning("Story agent query failed: %s", exc)
        results = []

    story_context = " ".join(r["text"] for r in results[:3] if r["distance"] < 0.7)
    recent_events = [r["text"] for r in results[3:] if r["distance"] < 0.7]

    return {
        "story_context": story_context,
        "recent_events": recent_events[:5],
        "speaker_hints": {},
    }
