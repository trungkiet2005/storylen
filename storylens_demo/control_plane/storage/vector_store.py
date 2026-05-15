"""ChromaDB vector store — 3 collections for multi-RAG agents."""
from __future__ import annotations

import logging
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings

from control_plane.config import get_settings

log = logging.getLogger(__name__)

_client: chromadb.ClientAPI | None = None


def get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        settings = get_settings()
        settings.vector_db_dir.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=str(settings.vector_db_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _client


def _collection(name: str):
    return get_client().get_or_create_collection(name, metadata={"hnsw:space": "cosine"})


# Public helpers -----------------------------------------------------------

def upsert(collection_name: str, ids: list[str], documents: list[str],
           embeddings: list[list[float]], metadatas: list[dict] | None = None) -> None:
    col = _collection(collection_name)
    col.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas or [{}] * len(ids))


def query(collection_name: str, query_embeddings: list[list[float]],
          n_results: int = 5, where: dict | None = None) -> list[dict[str, Any]]:
    col = _collection(collection_name)
    try:
        results = col.query(
            query_embeddings=query_embeddings,
            n_results=min(n_results, col.count() or 1),
            where=where,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as exc:
        log.warning("ChromaDB query failed: %s", exc)
        return []

    output = []
    for i, doc in enumerate(results["documents"][0]):
        output.append({
            "text": doc,
            "metadata": (results["metadatas"][0][i] if results["metadatas"] else {}),
            "distance": (results["distances"][0][i] if results["distances"] else 1.0),
        })
    return output


# Collection names
STORY_MEMORY = "story_memory"
STYLE_MEMORY = "style_memory"
GLOSSARY_MEMORY = "glossary_memory"
