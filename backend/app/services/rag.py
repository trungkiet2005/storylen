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
from app.models.schemas import QAResponse, QASource
from app.services.embedding import embed_query

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

    def reload(self) -> int:
        """Re-read GEMINI_API_KEY from the environment and rebuild the client pool.
        Useful when keys are rotated without a full service restart."""
        import os
        with self._lock:
            raw = os.environ.get("GEMINI_API_KEY", "")
            if not raw:
                # Fall back to cached settings value
                raw = settings.GEMINI_API_KEY
            keys = [k.strip() for k in raw.split(",") if k.strip()]
            self._clients = [genai.Client(api_key=k) for k in keys]
            self._iterator = itertools.cycle(self._clients) if self._clients else None
            self._initialized = bool(self._clients)
            logger.info("Gemini pool reloaded: %d key(s).", len(self._clients))
            return len(self._clients)


_pool = _GeminiPool()


def reload_gemini_pool() -> int:
    """Public helper called by the admin endpoint."""
    return _pool.reload()


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


def _reader_url(page_id: str) -> str:
    return f"/reader?page={page_id}"


def _bbox_from(row: dict) -> list[float] | None:
    """Extract [x, y, width, height] pixel bbox from a bubble_data row, or None."""
    try:
        return [float(row["x"]), float(row["y"]), float(row["width"]), float(row["height"])]
    except (KeyError, TypeError, ValueError):
        return None


def _owned_page_number(supabase, page_id: str, user_id: str) -> tuple[bool, int | None]:
    """Return (is_owned, page_number). is_owned is False when the page does not
    belong to `user_id` — the caller must then refuse to read its content."""
    try:
        res = (
            supabase.table("manga_pages")
            .select("page_id, page_number")
            .eq("page_id", page_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        logger.error("Ownership check failed for page %s: %s", page_id, exc)
        return False, None
    rows = res.data or []
    if not rows:
        return False, None
    return True, rows[0].get("page_number")


def _page_context_from_db(
    supabase, page_id: str, user_id: str
) -> tuple[str, list[QASource]]:
    """
    Ownership-scoped fallback for a page that has extracted text but no vector
    chunks yet. Returns ("", []) if the page is not owned by `user_id`.
    """
    owned, page_number = _owned_page_number(supabase, page_id, user_id)
    if not owned:
        logger.warning("Q&A denied: page %s not owned by user %s", page_id, user_id)
        return "", []

    try:
        result = (
            supabase.table("bubble_data")
            .select(
                "bubble_id, x, y, width, height, original_text_jp, "
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
    sources: list[QASource] = []
    for index, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            continue
        original_text = str(row.get("original_text_jp") or "").strip()
        translated_text = _latest_translation(row.get("translation_history") or []).strip()
        if not original_text and not translated_text:
            continue

        bubble_id = str(row.get("bubble_id") or index)
        sources.append(
            QASource(
                page_id=page_id,
                bubble_id=bubble_id,
                original=original_text or None,
                translated=translated_text,
                similarity=None,  # extractive fallback, not a vector match
                page_number=page_number,
                bbox=_bbox_from(row),
                reader_url=_reader_url(page_id),
            )
        )
        context_parts.append(
            f"[{index}] Gốc: {original_text or '(không có)'}\n"
            f"[{index}] Dịch: {translated_text or '(không có)'}"
        )

    return "\n\n".join(context_parts), sources


def _enrich_sources(supabase, chunks: list[dict]) -> tuple[str, list[QASource]]:
    """Turn raw match_embeddings rows into a context string + rich QASource list.
    Looks up each bubble's original OCR text and its page number for citations."""
    valid = [c for c in chunks if isinstance(c, dict) and c.get("content")]
    if not valid:
        return "", []

    bubble_ids = [str(c["bubble_id"]) for c in valid if c.get("bubble_id")]
    page_ids = [str(c["page_id"]) for c in valid if c.get("page_id")]

    bubble_meta: dict[str, dict] = {}
    if bubble_ids:
        try:
            res = (
                supabase.table("bubble_data")
                .select("bubble_id, original_text_jp, x, y, width, height")
                .in_("bubble_id", bubble_ids)
                .execute()
            )
            for r in res.data or []:
                if isinstance(r, dict) and r.get("bubble_id"):
                    bubble_meta[str(r["bubble_id"])] = r
        except Exception as exc:
            logger.warning("Source bubble lookup failed: %s", exc)

    page_numbers: dict[str, int | None] = {}
    if page_ids:
        try:
            res = (
                supabase.table("manga_pages")
                .select("page_id, page_number")
                .in_("page_id", page_ids)
                .execute()
            )
            for r in res.data or []:
                if isinstance(r, dict) and r.get("page_id"):
                    page_numbers[str(r["page_id"])] = r.get("page_number")
        except Exception as exc:
            logger.warning("Source page-number lookup failed: %s", exc)

    context_parts: list[str] = []
    sources: list[QASource] = []
    for index, c in enumerate(valid, start=1):
        page_id = str(c.get("page_id") or "")
        bubble_id = str(c["bubble_id"]) if c.get("bubble_id") else None
        translated = str(c.get("content") or "")
        meta = bubble_meta.get(bubble_id or "", {})
        original = str(meta.get("original_text_jp") or "").strip() or None
        similarity = c.get("similarity")
        sources.append(
            QASource(
                page_id=page_id,
                bubble_id=bubble_id,
                original=original,
                translated=translated,
                similarity=float(similarity) if similarity is not None else None,
                page_number=page_numbers.get(page_id),
                bbox=_bbox_from(meta),
                reader_url=_reader_url(page_id),
            )
        )
        context_parts.append(f"[{index}] {translated}")

    return "\n\n".join(context_parts), sources


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


_NO_CONTEXT_ANSWER = (
    "Mình chưa tìm thấy nội dung liên quan trong truyện của bạn. "
    "Hãy chắc chắn truyện đã được dịch xong, hoặc thử diễn đạt câu hỏi khác."
)
_EMBED_ERROR_MSG = "Hiện chưa tạo được embedding cho câu hỏi. Vui lòng thử lại sau."
_SEARCH_ERROR_MSG = "Hệ thống tìm kiếm đang tạm gặp sự cố. Vui lòng thử lại sau."


def _search(
    supabase, q_vector: list[float], user_id: str,
    page_id: str | None = None, series_id: str | None = None,
) -> tuple[list[dict], bool]:
    """Owner-scoped, thresholded pgvector search. Returns (chunks, search_failed).
    Shared by the blocking and streaming answer paths."""
    params: dict = {
        "query_embedding": q_vector,
        "match_count": settings.RAG_TOP_K,
        "min_similarity": settings.RAG_MIN_SIMILARITY,
        "filter_user_id": user_id,
    }
    if page_id:
        params["filter_page_id"] = page_id
    if series_id:
        params["filter_series_id"] = series_id
    try:
        result = supabase.rpc("match_embeddings", params).execute()
        return (result.data or []), False
    except Exception as exc:
        logger.error("Vector search failed: %s", exc)
        return [], True


def _msg_field(msg, field: str) -> str:
    """Read role/content from a dict or a QAMessage-like object."""
    if isinstance(msg, dict):
        return str(msg.get(field) or "")
    return str(getattr(msg, field, "") or "")


def _retrieval_query(question: str, history: list | None) -> str:
    """Fold the previous user turn into the retrieval query so pronoun-y
    follow-ups ('còn nhân vật kia thì sao?') still retrieve well — no extra call."""
    prev = ""
    for msg in reversed(history or []):
        if _msg_field(msg, "role") == "user":
            prev = _msg_field(msg, "content").strip()
            break
    combined = f"{prev} {question}".strip() if prev else question
    return combined[:1500]


def _response(question: str, context: str, sources: list[QASource]) -> QAResponse:
    """Generate an answer from the given context and attach citations."""
    return QAResponse(
        question=question,
        answer=_generate_answer(question, context),
        source_chunks=[
            f"page:{s.page_id}:bubble:{s.bubble_id}" if s.bubble_id else f"page:{s.page_id}"
            for s in sources
        ],
        sources=sources,
    )


def answer_question(
    question: str,
    user_id: str,
    page_id: str | None = None,
    series_id: str | None = None,
) -> QAResponse:
    """
    Ownership-scoped RAG:
    1. Embed the question with Gemini (same model as the stored chunks).
    2. Vector search in pgvector, filtered by owner (+ optional page/series),
       with a cosine-similarity floor.
    3. Fall back to the page's extracted text ONLY for the owner's own page.
    4. Generate the answer with Gemini; degrade honestly if unavailable.
    """
    supabase = get_supabase()

    # ── Step 1: embed the question ────────────────────────────────────────────
    q_vector: list[float] = []
    try:
        q_vector = embed_query(question)
    except Exception as exc:
        logger.warning("Question embedding failed: %s", exc)
        # Without a vector we can only serve the owner's own page (extractive).
        if page_id:
            page_context, page_sources = _page_context_from_db(supabase, page_id, user_id)
            if page_context:
                return _response(question, page_context, page_sources)
        return QAResponse(question=question, answer=_EMBED_ERROR_MSG)

    # ── Step 2: vector search (owner-scoped, thresholded) ─────────────────────
    # search_failed distinguishes "search broke" (mis-deploy) from "found nothing".
    chunks, search_failed = _search(supabase, q_vector, user_id, page_id, series_id)

    context, sources = _enrich_sources(supabase, chunks)
    if context:
        return _response(question, context, sources)

    # ── Step 3: fallback to the owner's own page text ─────────────────────────
    if page_id:
        page_context, page_sources = _page_context_from_db(supabase, page_id, user_id)
        if page_context:
            return _response(question, page_context, page_sources)

    if search_failed:
        return QAResponse(question=question, answer=_SEARCH_ERROR_MSG, source_chunks=[], sources=[])
    return QAResponse(question=question, answer=_NO_CONTEXT_ANSWER, source_chunks=[], sources=[])


# ─── Streaming (conversational assistant) ─────────────────────────────────────

_STREAM_PROMPT = """Bạn là trợ lý hỏi đáp cho độc giả manga. Chỉ trả lời dựa trên các đoạn trích được ĐÁNH SỐ dưới đây.
Khi dùng thông tin từ đoạn nào, hãy chèn số nguồn trong ngoặc vuông ngay sau ý đó — ví dụ [1] hoặc [2][3].
Nếu không đủ thông tin trong đoạn trích, hãy nói rõ là bạn không biết, tuyệt đối không bịa.
Trả lời bằng tiếng Việt, ngắn gọn, tự nhiên như đang trò chuyện.

--- NỘI DUNG TRUYỆN (đã đánh số nguồn) ---
{context}
------------------------------------------
{history_block}Câu hỏi hiện tại: {question}
Trả lời:"""


def _history_block(history: list | None, max_turns: int = 6) -> str:
    """Format the most recent turns for the answer prompt (multi-turn context)."""
    msgs = [m for m in (history or []) if _msg_field(m, "content").strip()]
    if not msgs:
        return ""
    lines = []
    for m in msgs[-max_turns:]:
        who = "Người đọc" if _msg_field(m, "role") == "user" else "Trợ lý"
        lines.append(f"{who}: {_msg_field(m, 'content').strip()}")
    return "--- HỘI THOẠI TRƯỚC ĐÓ ---\n" + "\n".join(lines) + "\n---------------------------\n"


def _stream_answer(question: str, context: str, history: list | None) -> Iterator[dict]:
    """Yield {'type':'token','text':...} from Gemini streaming. Rotates keys only
    BEFORE the first token — rotating mid-stream would duplicate the answer."""
    if not _pool.available:
        yield {"type": "token", "text": _context_fallback_answer(context)}
        return

    prompt = _STREAM_PROMPT.format(
        context=context, question=question, history_block=_history_block(history)
    )
    last_error: Exception | None = None
    for _ in range(_pool.client_count()):
        client = _pool.next_client()
        if client is None:
            break
        produced = False
        try:
            stream = client.models.generate_content_stream(
                model=settings.GEMINI_MODEL, contents=prompt
            )
            for chunk in stream:
                text = getattr(chunk, "text", None)
                if text:
                    produced = True
                    yield {"type": "token", "text": text}
            if produced:
                return
            yield {"type": "token", "text": _context_fallback_answer(context)}
            return
        except Exception as exc:  # noqa: BLE001
            if produced:
                logger.warning("Gemini stream failed mid-answer: %s", exc)
                return
            last_error = exc
            if _is_retryable_gemini_key_error(exc):
                logger.warning("Gemini stream key failed, rotating. Error: %s", exc)
                continue
            logger.error("Unexpected Gemini stream failure: %s", exc)
            break

    logger.error("Gemini streaming failed for all keys: %s", last_error)
    yield {"type": "token", "text": _context_fallback_answer(context)}


def answer_question_stream(
    question: str,
    user_id: str,
    history: list | None = None,
    page_id: str | None = None,
    series_id: str | None = None,
) -> Iterator[dict]:
    """Streaming, multi-turn variant of answer_question. Yields event dicts:
    {'type':'sources','sources':[...]} → {'type':'token','text':...}* → {'type':'done'}
    (or a single honest error/no-context token before done)."""
    supabase = get_supabase()

    # Embed the retrieval query — current question folded with the last user turn.
    try:
        q_vector = embed_query(_retrieval_query(question, history))
    except Exception as exc:
        logger.warning("Question embedding failed (stream): %s", exc)
        if page_id:
            page_context, page_sources = _page_context_from_db(supabase, page_id, user_id)
            if page_context:
                yield {"type": "sources", "sources": [s.model_dump() for s in page_sources]}
                yield from _stream_answer(question, page_context, history)
                yield {"type": "done"}
                return
        yield {"type": "sources", "sources": []}
        yield {"type": "token", "text": _EMBED_ERROR_MSG}
        yield {"type": "done"}
        return

    chunks, search_failed = _search(supabase, q_vector, user_id, page_id, series_id)
    context, sources = _enrich_sources(supabase, chunks)
    if not context and page_id:
        context, sources = _page_context_from_db(supabase, page_id, user_id)

    yield {"type": "sources", "sources": [s.model_dump() for s in sources]}

    if not context:
        yield {"type": "token", "text": _SEARCH_ERROR_MSG if search_failed else _NO_CONTEXT_ANSWER}
        yield {"type": "done"}
        return

    yield from _stream_answer(question, context, history)
    yield {"type": "done"}


# ─── Chapter recap ("Trước đó trong truyện...") ───────────────────────────────

_RECAP_PROMPT = """Bạn tóm tắt lại một chương truyện manga đã dịch, để người đọc \
nhớ lại nội dung trước khi đọc chương tiếp theo.
Chỉ dựa trên nội dung dưới đây, viết 2-4 câu tiếng Việt, tự nhiên, không dùng \
markdown, không thêm suy đoán ngoài nội dung.

--- NỘI DUNG CHƯƠNG ---
{context}
-----------------------

Tóm tắt:"""

_RECAP_CONTEXT_MAX_CHARS = 8000


def _chapter_translation_context(supabase, chapter_id: str) -> str:
    """Ordered translated text for every page of a chapter (position order)."""
    try:
        pages_res = (
            supabase.table("manga_pages")
            .select("page_id, page_number")
            .eq("chapter_id", chapter_id)
            .order("page_number", desc=False)
            .execute()
        )
    except Exception as exc:
        logger.error("Recap: failed to list pages for chapter %s: %s", chapter_id, exc)
        return ""

    page_ids = [p["page_id"] for p in (pages_res.data or []) if isinstance(p, dict) and p.get("page_id")]
    if not page_ids:
        return ""

    try:
        bubbles_res = (
            supabase.table("bubble_data")
            .select("page_id, x, y, translation_history(translated_text_vi, translated_at)")
            .in_("page_id", page_ids)
            .execute()
        )
    except Exception as exc:
        logger.error("Recap: failed to load bubbles for chapter %s: %s", chapter_id, exc)
        return ""

    page_order = {pid: i for i, pid in enumerate(page_ids)}
    rows = [r for r in (bubbles_res.data or []) if isinstance(r, dict)]
    try:
        rows.sort(key=lambda r: (page_order.get(r.get("page_id"), 0), r.get("y") or 0, r.get("x") or 0))
    except Exception:
        pass

    lines = [
        _latest_translation(row.get("translation_history") or []).strip()
        for row in rows
    ]
    context = "\n".join(line for line in lines if line)
    return context[:_RECAP_CONTEXT_MAX_CHARS]


def _all_pages_completed(supabase, chapter_id: str) -> bool:
    try:
        res = (
            supabase.table("manga_pages")
            .select("page_id, status")
            .eq("chapter_id", chapter_id)
            .execute()
        )
    except Exception as exc:
        logger.error("Recap: failed to check page statuses for chapter %s: %s", chapter_id, exc)
        return False
    rows = res.data or []
    if not rows:
        return False
    return all(isinstance(r, dict) and r.get("status") == "completed" for r in rows)


def _generate_recap_text(context: str) -> str | None:
    """Returns the recap text, or None if Gemini is unavailable/fails
    (a transient condition — caller must NOT cache None)."""
    if not _pool.available:
        logger.warning("Recap generation skipped: Gemini pool unavailable.")
        return None
    client = _pool.next_client()
    if client is None:
        return None
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=_RECAP_PROMPT.format(context=context),
        )
        text = (response.text or "").strip()
        return text or None
    except Exception as exc:
        logger.warning("Recap generation failed: %s", exc)
        return None


def _cache_recap(supabase, chapter_id: str, recap_vi: str) -> None:
    try:
        supabase.table("manga_chapters").update({"recap_vi": recap_vi}).eq("chapter_id", chapter_id).execute()
    except Exception as exc:
        logger.warning("Recap: failed to cache recap for chapter %s: %s", chapter_id, exc)


def get_or_generate_chapter_recap(chapter_id: str) -> str | None:
    """
    Ownership must already be enforced by the caller (the router uses
    `_require_chapter`). Returns the cached recap (None if cached as "" —
    meaning 'nothing to summarize'), or generates + caches it on a miss.
    Returns None on any failure without caching, so a later call can retry.
    """
    supabase = get_supabase()

    try:
        res = (
            supabase.table("manga_chapters")
            .select("recap_vi")
            .eq("chapter_id", chapter_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.error("Recap: failed to read cache for chapter %s: %s", chapter_id, exc)
        return None

    row = res.data if res else None
    cached = row.get("recap_vi") if row else None
    if cached is not None:
        return cached or None

    if not _all_pages_completed(supabase, chapter_id):
        return None

    context = _chapter_translation_context(supabase, chapter_id)
    if not context.strip():
        _cache_recap(supabase, chapter_id, "")
        return None

    recap = _generate_recap_text(context)
    if recap is None:
        return None  # transient Gemini failure — do not cache, allow retry

    _cache_recap(supabase, chapter_id, recap)
    return recap
