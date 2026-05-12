"""
StoryLens Backend — RAG Q&A Service (Render version)
No Sentence Transformers on Render — delegates embedding to HF Space.
Vector search runs directly against Supabase pgvector via RPC.
Answer generation via Gemini API (lightweight HTTP call).
"""
from __future__ import annotations

import logging

from google import genai
import itertools

from app.config import get_settings
from app.database import get_supabase
from app.models.schemas import QAResponse
from app.services.hf_client import call_embed

logger = logging.getLogger(__name__)
settings = get_settings()

_gemini_api_keys = [k.strip() for k in settings.GEMINI_API_KEY.split(",") if k.strip()]
_gemini_clients = [genai.Client(api_key=k) for k in _gemini_api_keys]
_client_iterator = itertools.cycle(_gemini_clients) if _gemini_clients else None
_current_client = next(_client_iterator) if _client_iterator else None

QA_PROMPT = """Bạn là trợ lý hỏi đáp cho độc giả manga. Chỉ trả lời dựa trên đoạn trích sau.
Nếu không có đủ thông tin, hãy nói rõ là bạn không biết — tuyệt đối không bịa thêm.

--- NỘI DUNG TRUYỆN ---
{context}
-----------------------

Câu hỏi: {question}
Trả lời:"""


def answer_question(
    question: str,
    page_id: str | None = None,
    series_id: str | None = None,
) -> QAResponse:
    """
    1. Embed question via HF Space /embed.
    2. Vector search in Supabase pgvector (match_embeddings RPC).
    3. Generate answer with Gemini.
    """
    supabase = get_supabase()

    # 1. Embed question (via HF Space — no ST on Render)
    try:
        q_vector = call_embed(question)
    except Exception as exc:
        logger.error("Embedding failed: %s", exc)
        return QAResponse(
            question=question,
            answer="Không thể tạo embedding cho câu hỏi. Vui lòng thử lại.",
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

    context = "\n\n".join(c["content"] for c in chunks)
    source_ids = [c["id"] for c in chunks]

    # 3. Generate answer with Gemini
    if not _gemini_clients:
        return QAResponse(
            question=question,
            answer="Hệ thống chưa được cấu hình GEMINI_API_KEY.",
            source_chunks=source_ids,
        )

    global _current_client
    answer_text = "Đã xảy ra lỗi khi tạo câu trả lời. Vui lòng thử lại."

    for _ in range(len(_gemini_clients)):
        try:
            prompt = QA_PROMPT.format(context=context, question=question)
            response = _current_client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt
            )
            answer_text = response.text.strip()
            break  # Success
        except Exception as exc:
            err_msg = str(exc).lower()
            if "429" in err_msg or "quota" in err_msg or "exhausted" in err_msg:
                logger.warning(f"Gemini API key exhausted, switching to next key. Error: {exc}")
                _current_client = next(_client_iterator)
                answer_text = "Tất cả API keys của hệ thống đều đã hết Quota hoặc bị giới hạn."
            else:
                logger.error("Gemini QA failed: %s", exc)
                break

    return QAResponse(
        question=question,
        answer=answer_text,
        source_chunks=source_ids,
    )
