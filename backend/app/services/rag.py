"""
StoryLens Backend - RAG Q&A Service.

Vector search runs against Supabase pgvector. If a freshly translated page has
not produced vector chunks yet, Q&A falls back to the extracted translation
context stored in bubble_data + translation_history.
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
Nếu không có đủ thông tin, hãy nói rõ là bạn không biết, tuyệt đối không bịa thêm.
Trả lời bằng tiếng Việt, ngắn gọn, và nêu chi tiết nào trong context đã dẫn tới kết luận.

--- NỘI DUNG TRUYỆN ---
{context}
-----------------------

Câu hỏi: {question}
Trả lời:"""

_GEMINI_KEY_ERROR_MARKERS = (
    "429",
    "quota",
    "exhausted",
    "rate_limit",
    "rate limit",
    "403",
    "permission",
    "leaked",
    "api_key_invalid",
    "api key expired",
    "api key not valid",
    "invalid api key",
    "invalid_api_key",
    "key invalid",
)


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
            keys = [key.strip() for key in settings.GEMINI_API_KEY.split(",") if key.strip()]
            self._clients = [genai.Client(api_key=key) for key in keys]
            self._iterator = itertools.cycle(self._clients) if self._clients else None
            self._initialized = True
            logger.info("Initialized Gemini pool with %d API key(s).", len(self._clients))

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


_pool = _GeminiPool()


def _is_retryable_gemini_key_error(exc: Exception) -> bool:
    err_msg = str(exc).lower()
    return any(marker in err_msg for marker in _GEMINI_KEY_ERROR_MARKERS)


def _latest_translation(translations: list[dict]) -> str:
    if not translations:
        return ""
    try:
        translations = sorted(
            translations,
            key=lambda item: item.get("translated_at") or "",
            reverse=True,
        )
    except Exception:
        pass
    return str(translations[0].get("translated_text_vi") or "")


def _page_context_from_db(supabase, page_id: str) -> tuple[str, list[str]]:
    """
    Fallback context for pages that have extracted text but no vector chunks yet.
    """
    try:
        result = (
            supabase.table("bubble_data")
            .select(
                "bubble_id, x, y, original_text_jp, "
                "translation_history(translated_text_vi, translated_at)"
            )
            .eq("page_id", page_id)
            .execute()
        )
    except Exception as exc:
        logger.error("Page context lookup failed for %s: %s", page_id, exc)
        return "", []

    rows = result.data or []
    try:
        rows = sorted(rows, key=lambda row: (row.get("y") or 0, row.get("x") or 0))
    except Exception:
        pass

    context_parts: list[str] = []
    source_ids: list[str] = []
    for index, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            continue
        original_text = str(row.get("original_text_jp") or "").strip()
        translated_text = _latest_translation(row.get("translation_history") or []).strip()
        if not original_text and not translated_text:
            continue

        bubble_id = str(row.get("bubble_id") or index)
        source_ids.append(f"page:{page_id}:bubble:{bubble_id}")
        context_parts.append(
            f"[{index}] Gốc: {original_text or '(không có)'}\n"
            f"[{index}] Dịch: {translated_text or '(không có)'}"
        )

    return "\n\n".join(context_parts), source_ids


def _translation_lines_from_context(context: str) -> list[str]:
    lines: list[str] = []
    for raw_line in context.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if "] Dịch:" in line:
            line = line.split("] Dịch:", 1)[1].strip()
        elif line.startswith("Dịch:"):
            line = line.split("Dịch:", 1)[1].strip()
        elif "] Gốc:" in line or line.startswith("Gốc:"):
            continue

        if line and line != "(không có)":
            lines.append(line)
    return lines


def _context_fallback_answer(context: str) -> str:
    """
    Keep page-scoped Q&A useful even when Gemini cannot be reached.
    This is intentionally extractive: it only echoes stored translations.
    """
    lines = _translation_lines_from_context(context)
    if not lines:
        compact_context = " ".join(part.strip() for part in context.splitlines() if part.strip())
        if compact_context:
            return (
                "Hiện chưa gọi được Gemini để suy luận sâu. "
                f"Nội dung liên quan đang có: {compact_context[:900]}"
            )
        return "Hiện chưa gọi được Gemini và không có nội dung đã lưu để trả lời."

    preview = "\n".join(f"{index}. {line}" for index, line in enumerate(lines[:10], start=1))
    suffix = "" if len(lines) <= 10 else f"\n... còn {len(lines) - 10} dòng nữa."
    return (
        "Hiện chưa gọi được Gemini, nhưng dựa trên bản dịch đã lưu thì trang này có các lời thoại chính:\n"
        f"{preview}{suffix}"
    )


def _generate_answer(question: str, context: str) -> str:
    if not _pool.available:
        logger.error("Gemini generation skipped: GEMINI_API_KEY is not configured.")
        return _context_fallback_answer(context)

    last_error: Exception | None = None
    prompt = QA_PROMPT.format(context=context, question=question)

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
                logger.warning("Gemini returned an empty response; using context fallback.")
                return _context_fallback_answer(context)
            return answer_text
        except Exception as exc:
            last_error = exc
            if _is_retryable_gemini_key_error(exc):
                logger.warning("Gemini key failed, rotating to next key. Error: %s", exc)
                continue
            logger.error("Unexpected Gemini generation failure: %s", exc)
            break

    logger.error("Gemini generation failed for all attempted keys: %s", last_error)
    return _context_fallback_answer(context)


def answer_question(
    question: str,
    page_id: str | None = None,
    series_id: str | None = None,
) -> QAResponse:
    """
    1. Embed question via HF Space when available.
    2. Vector search in Supabase pgvector.
    3. Fall back to extracted page context when no vector chunks exist.
    4. Generate answer with Gemini, or return extractive page context if Gemini fails.
    """
    supabase = get_supabase()

    q_vector: list[float] = []
    try:
        q_vector = call_embed(question)
    except Exception as exc:
        if page_id:
            logger.warning("Embedding failed; falling back to page context: %s", exc)
        else:
            logger.error("Embedding failed: %s", exc)
        if not page_id:
            return QAResponse(
                question=question,
                answer="Không thể tạo embedding cho câu hỏi. Vui lòng thử lại sau.",
            )

    if not q_vector and not page_id:
        return QAResponse(
            question=question,
            answer="HF Space trả về embedding rỗng. Vui lòng thử lại.",
        )

    chunks = []
    if q_vector:
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

    if not chunks:
        if page_id:
            page_context, page_sources = _page_context_from_db(supabase, page_id)
            if page_context:
                return QAResponse(
                    question=question,
                    answer=_generate_answer(question, page_context),
                    source_chunks=page_sources,
                )
        return QAResponse(
            question=question,
            answer="Xin lỗi, tôi không tìm thấy thông tin liên quan trong nội dung truyện.",
            source_chunks=[],
        )

    context_parts: list[str] = []
    source_ids: list[str] = []
    for chunk in chunks:
        if not isinstance(chunk, dict):
            continue
        content = chunk.get("content")
        if content:
            context_parts.append(str(content))
        chunk_id = chunk.get("id")
        if chunk_id:
            source_ids.append(str(chunk_id))

    if not context_parts:
        if page_id:
            page_context, page_sources = _page_context_from_db(supabase, page_id)
            if page_context:
                return QAResponse(
                    question=question,
                    answer=_generate_answer(question, page_context),
                    source_chunks=page_sources,
                )
        return QAResponse(
            question=question,
            answer="Xin lỗi, không trích xuất được nội dung từ kết quả tìm kiếm.",
            source_chunks=source_ids,
        )

    return QAResponse(
        question=question,
        answer=_generate_answer(question, "\n\n".join(context_parts)),
        source_chunks=source_ids,
    )
