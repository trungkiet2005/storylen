"""
StoryLens Backend — Gemini Embedding Service.

Produces vector embeddings for RAG entirely from the backend by calling the
Gemini embedding API (no local ML models — this respects the "no ML on Render"
rule the same way translation/Q&A generation already call Gemini remotely).

Used by:
- `ai_pipeline` to embed translated bubble text at persist time.
- `rag` to embed the user's question at query time.

Both sides MUST use the same model + dimension so cosine similarity is meaningful;
that is enforced by routing everything through this module and by truncating +
L2-normalizing every vector to `settings.EMBED_DIM`. `gemini-embedding-001` is
Matryoshka-trained, so truncating a longer vector to a prefix and renormalizing
yields a valid lower-dimensional embedding.
"""
from __future__ import annotations

import itertools
import logging
import math
import threading
from typing import Iterator

from google import genai
from google.genai import types
from pydantic import ValidationError

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Reuse the same retryable-error markers philosophy as the Q&A pool.
_RETRYABLE_MARKERS = (
    "429",
    "quota",
    "exhausted",
    "rate_limit",
    "rate limit",
    "503",
    "unavailable",
    "deadline",
    "timeout",
)
_KEY_ERROR_MARKERS = (
    "403",
    "permission",
    "api_key_invalid",
    "api key not valid",
    "invalid api key",
    "invalid_api_key",
    "api key expired",
    "leaked",
)


class _EmbedPool:
    """Thread-safe round-robin pool of Gemini clients for embeddings."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._clients: list[genai.Client] = []
        self._iterator: Iterator[genai.Client] | None = None
        self._initialized = False

    def _ensure_initialized(self) -> None:
        if self._initialized:
            return
        with self._lock:
            if self._initialized:
                return
            keys = [k.strip() for k in settings.GEMINI_API_KEY.split(",") if k.strip()]
            self._clients = [genai.Client(api_key=k) for k in keys]
            self._iterator = itertools.cycle(self._clients) if self._clients else None
            self._initialized = True
            logger.info("Initialized embedding pool with %d API key(s).", len(self._clients))

    @property
    def available(self) -> bool:
        self._ensure_initialized()
        return bool(self._clients)

    def next_client(self) -> genai.Client | None:
        self._ensure_initialized()
        if not self._iterator:
            return None
        with self._lock:
            return next(self._iterator)

    def client_count(self) -> int:
        self._ensure_initialized()
        return len(self._clients)


_pool = _EmbedPool()


def _is_retryable(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(m in msg for m in (_RETRYABLE_MARKERS + _KEY_ERROR_MARKERS))


def _normalize(vec: list[float], dim: int) -> list[float]:
    """Truncate to `dim` (Matryoshka) then L2-normalize."""
    v = [float(x) for x in vec[:dim]]
    norm = math.sqrt(sum(x * x for x in v))
    if norm == 0.0:
        return v
    return [x / norm for x in v]


def _raw_embed(client: genai.Client, contents: list[str], task_type: str) -> tuple[list[list[float]], int]:
    """One embed_content call. Tries with output_dimensionality, falls back if the
    installed SDK doesn't accept that config field. Returns (vectors, prompt_tokens)."""
    model = settings.GEMINI_EMBED_MODEL
    try:
        resp = client.models.embed_content(
            model=model,
            contents=contents,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=settings.EMBED_DIM,
            ),
        )
    except (TypeError, ValidationError):
        # SDK/model that rejects output_dimensionality — fall back to the model's
        # default dimension; _normalize() truncates it back to EMBED_DIM.
        logger.warning("output_dimensionality rejected; using default dim + truncation.")
        resp = client.models.embed_content(
            model=model,
            contents=contents,
            config=types.EmbedContentConfig(task_type=task_type),
        )
    um = getattr(resp, "usage_metadata", None)
    prompt_tokens = int(getattr(um, "prompt_token_count", 0) or 0) if um is not None else 0
    return [list(e.values or []) for e in (resp.embeddings or [])], prompt_tokens


def _embed(contents: list[str], task_type: str) -> list[list[float]]:
    if not contents:
        return []
    if not _pool.available:
        raise RuntimeError("GEMINI_API_KEY is not configured; cannot embed.")

    from app.services import ai_telemetry

    operation = "embed.document" if task_type == "RETRIEVAL_DOCUMENT" else "embed.query"
    with ai_telemetry.track(
        "gemini", settings.GEMINI_EMBED_MODEL, operation, meta={"inputs": len(contents)}
    ) as tel:
        last_error: Exception | None = None
        # Try each key once (round-robin) before giving up.
        for _ in range(_pool.client_count()):
            client = _pool.next_client()
            if client is None:
                break
            try:
                raw, prompt_tokens = _raw_embed(client, contents, task_type)
                if len(raw) != len(contents):
                    raise RuntimeError(
                        f"embed returned {len(raw)} vectors for {len(contents)} inputs"
                    )
                tel.prompt_tokens = prompt_tokens
                return [_normalize(v, settings.EMBED_DIM) for v in raw]
            except Exception as exc:  # noqa: BLE001 — rotate on key/rate errors
                last_error = exc
                if _is_retryable(exc):
                    logger.warning("Embedding key failed, rotating. Error: %s", exc)
                    continue
                logger.error("Non-retryable embedding failure: %s", exc)
                break

        raise RuntimeError(f"Embedding failed for all keys: {last_error}") from last_error


def embed_documents(texts: list[str]) -> list[list[float]]:
    """Embed stored/translated text chunks (task=RETRIEVAL_DOCUMENT).
    Returns one normalized vector per input, in order. Empty input → []."""
    cleaned = [t for t in texts if t and t.strip()]
    if not cleaned:
        return []
    # Batch to keep any single request modest.
    out: list[list[float]] = []
    batch = 100
    for i in range(0, len(cleaned), batch):
        out.extend(_embed(cleaned[i : i + batch], "RETRIEVAL_DOCUMENT"))
    return out


def embed_query(text: str) -> list[float]:
    """Embed a user question (task=RETRIEVAL_QUERY). Returns a single normalized
    vector. Raises RuntimeError if embedding is unavailable."""
    if not text or not text.strip():
        raise RuntimeError("Cannot embed an empty query.")
    vecs = _embed([text.strip()], "RETRIEVAL_QUERY")
    if not vecs:
        raise RuntimeError("Embedding service returned no vector for the query.")
    return vecs[0]
