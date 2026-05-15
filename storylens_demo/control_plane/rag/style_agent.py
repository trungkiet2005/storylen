"""Style Agent — retrieves style card and approved examples."""
from __future__ import annotations

import logging

from control_plane.llm.gemini_provider import get_provider
from control_plane.storage import vector_store as vs

log = logging.getLogger(__name__)

_DEFAULT_STYLE = {
    "register": "tự nhiên, gọn",
    "honorific_policy": "giữ tự nhiên",
    "name_policy": "giữ tên gốc",
    "sentence_length": "ngắn, fit bubble",
    "sound_effect_policy": "giữ SFX gốc",
}


def retrieve(manga_id: str, style_card: dict | None = None, ocr_texts: list[str] | None = None) -> dict:
    base = style_card or _DEFAULT_STYLE

    approved_examples: list[str] = []
    if ocr_texts:
        try:
            embeddings = get_provider().embed([" ".join(ocr_texts[:5])])
            results = vs.query(
                vs.STYLE_MEMORY,
                query_embeddings=embeddings,
                n_results=3,
                where={"manga_id": manga_id},
            )
            approved_examples = [r["text"] for r in results if r["distance"] < 0.6]
        except Exception as exc:
            log.warning("Style agent query failed: %s", exc)

    return {
        "manga_style": base,
        "approved_examples": approved_examples,
    }
