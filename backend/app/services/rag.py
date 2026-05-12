"""
StoryLens Backend — RAG Q&A Service (Render version)
No Sentence Transformers on Render — delegates embedding to HF Space.
Vector search runs directly against Supabase pgvector via RPC.
Answer generation via Gemini API (lightweight HTTP call).

Fixes:
- Thread-safe Gemini client rotation (no global mutable state)
- Lazy initialization of Gemini clients (not at module import time)
- Handle missing GEMINI_API_KEY gracefully
- Proper key rotation on quota exhaustion
- Handle empty/malformed chunks from vector search
"""
from __future__ import annotations

import itertools
import logging
import threading
from typing import Iterator

from google import genai

from app.config import get_settings
from app.database import get_supabase
from app.models.schemas import QAResponse
from app.services.hf_client import call_embed

logger = logging.getLogger(__name__)
settings = get_settings()

QA_PROMPT = """Bạn là trợ lý hỏi đáp cho độc giả manga. Chỉ trả lời dựa trên đoạn trích sau.
Nếu không có đủ thông tin, hãy nói rõ là bạn không biết — tuyệt đối không bịa thêm.

--- NỘI DUNG TRUYỆN ---
{context}
-----------------------

Câu hỏi: {question}
Trả lời:"""


# ─── Thread-safe Gemini client pool ──────────────────────────────────────────

class _GeminiPool:
    """Thread-safe round-robin pool of Gemini clients."""

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
            raw_key = settings.GEMINI_API_KEY
            keys = [k.strip() for k in raw_key.split(",") if k.strip()]
            self._clients = [genai.Client(api_key=k) for k in keys]
            self._iterator = itertools.cycle(self._clients) if self._clients else None
            self._initialized = True
            logger.info("Initialized Gemini pool with %d API key(s).", len(self._clients))

    @property
    def available(self) -> bool:
        self._ensure_initialized()
        return len(self._clients) > 0

    def next_client(self) -> genai.Client | None:
        self._ensure_initialized()
        if not self._iterator:
            return None
        with self._lock:
            return next(self._iterator)

    def client_count(self) -> int:
        self._ensure_initialized()
        return len(self._clients)


_pool = _GeminiPool()


# ─── Main Q&A function ────────────────────────────────────────────────────────

def answer_question(
    question: str,
    page_id: str | None = None,
    series_id: str | None = None,
) -> QAResponse:
    """
    1. Embed question via HF Space /embed.
    2. Vector search in Supabase pgvector (match_embeddings RPC).
    3. Generate answer with Gemini (key rotation on quota errors).
    """
    supabase = get_supabase()

    # 1. Embed question (via HF Space — no ST on Render)
    try:
        q_vector = call_embed(question)
    except Exception as exc:
        logger.error("Embedding failed: %s", exc)
        return QAResponse(
            question=question,
            answer="Không thể tạo embedding cho câu hỏi. Vui lòng thử lại sau.",
        )

    if not q_vector:
        return QAResponse(
            question=question,
            answer="HF Space trả về embedding rỗng. Vui lòng thử lại.",
        )

    # 2. Vector search
    rpc_params: dict = {
        "query_embedding": q_vector,
        "match_count": settings.RAG_TOP_K,
    }
    if page_id:
        rpc_params["filter_page_id"] = page_id
    if series_id:
        rpc_params["filter_series_id"] = series_id

    try:
        result = supabase.rpc("match_embeddings", rpc_params).execute()
        chunks = result.data or []
    except Exception as exc:
        logger.error("Vector search failed: %s", exc)
        chunks = []

    if not chunks:
        return QAResponse(
            question=question,
            answer="Xin lỗi, tôi không tìm thấy thông tin liên quan trong nội dung truyện.",
            source_chunks=[],
        )

    # Safely extract content from chunks
    context_parts = []
    source_ids = []
    for c in chunks:
        if not isinstance(c, dict):
            continue
        content = c.get("content", "")
        if content:
            context_parts.append(str(content))
        chunk_id = c.get("id")
        if chunk_id:
            source_ids.append(str(chunk_id))

    if not context_parts:
        return QAResponse(
            question=question,
            answer="Xin lỗi, không trích xuất được nội dung từ kết quả tìm kiếm.",
            source_chunks=source_ids,
        )

    context = "\n\n".join(context_parts)

    # 3. Generate answer with Gemini
    if not _pool.available:
        return QAResponse(
            question=question,
            answer="Hệ thống chưa được cấu hình GEMINI_API_KEY.",
            source_chunks=source_ids,
        )

    answer_text = "Đã xảy ra lỗi khi tạo câu trả lời. Vui lòng thử lại."
    prompt = QA_PROMPT.format(context=context, question=question)

    # Try each key once; rotate on quota errors
    for _ in range(_pool.client_count()):
        client = _pool.next_client()
        if client is None:
            break
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )
            answer_text = (response.text or "").strip()
            if not answer_text:
                answer_text = "Gemini trả về phản hồi rỗng. Vui lòng thử lại."
            break  # Success
        except Exception as exc:
            err_msg = str(exc).lower()
            if any(kw in err_msg for kw in ("429", "quota", "exhausted", "rate_limit", "403", "permission", "leaked")):
                logger.warning("Gemini key invalid or exhausted, rotating to next key. Error: %s", exc)
                # continue loop to try next key
            else:
                logger.error("Unexpected Gemini generation failure: %s", exc)
                answer_text = "Lỗi khi gọi Gemini API. Vui lòng thử lại."
                break

    return QAResponse(
        question=question,
        answer=answer_text,
        source_chunks=source_ids,
    )
