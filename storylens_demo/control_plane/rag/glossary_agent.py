"""Glossary Agent — retrieves relevant glossary terms."""
from __future__ import annotations

import logging

from control_plane.llm.gemini_provider import get_provider
from control_plane.storage import vector_store as vs

log = logging.getLogger(__name__)


def retrieve(manga_id: str, ocr_texts: list[str], n: int = 10) -> dict:
    if not ocr_texts:
        return {"terms": []}

    combined = " ".join(ocr_texts[:10])
    try:
        embeddings = get_provider().embed([combined])
        results = vs.query(
            vs.GLOSSARY_MEMORY,
            query_embeddings=embeddings,
            n_results=n,
            where={"manga_id": manga_id},
        )
    except Exception as exc:
        log.warning("Glossary agent query failed: %s", exc)
        results = []

    terms = []
    for r in results:
        meta = r.get("metadata", {})
        if meta.get("source") and meta.get("target"):
            terms.append({
                "source": meta["source"],
                "target": meta["target"],
                "rule": meta.get("rule", ""),
            })

    return {"terms": terms}
