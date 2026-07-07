"""
StoryLens Backend - Q&A Router
POST /qa — accepts a question and optional page_id/series_id,
           runs RAG pipeline and returns a grounded answer.

Fixes:
- Allow question without page_id/series_id (for general Q&A)
- More specific error handling
- Q&A history insert failure doesn't affect the response
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.database import get_supabase
from app.models.schemas import QARequest, QAResponse, QAStreamRequest
from app.rate_limit import limiter
from app.routers.auth import AuthUser, get_current_user
from app.services.credit_service import check_has_credits, deduct
from app.services.rag import answer_question, answer_question_stream

router = APIRouter(prefix="/qa", tags=["qa"])
logger = logging.getLogger(__name__)


@router.post("", response_model=QAResponse)
@limiter.limit(lambda: get_settings().RATE_LIMIT_QA)
def ask_question(request: Request, payload: QARequest, user: AuthUser = Depends(get_current_user)):
    """
    Ask a question about a manga page or series.
    Uses RAG (vector search + Gemini) to generate a grounded answer.
    page_id and series_id are both optional — omit both for general Q&A
    (will search across all embeddings).
    """
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    supabase = get_supabase()

    # ── Credit check before calling RAG ───────────────────────────────────────
    check_has_credits(user.id, 1, supabase)

    qa_result = answer_question(
        question=question,
        user_id=user.id,
        page_id=payload.page_id,
        series_id=payload.series_id,
    )

    # Deduct 1 credit after successful RAG call
    try:
        deduct(user.id, 1, "qa", supabase)
    except Exception as exc:
        logger.warning("Credit deduction failed after Q&A for %s: %s", user.id, exc)

    # Persist Q&A to history (non-blocking — failure is logged and swallowed)
    try:
        supabase.table("qa_history").insert({
            "qa_id": str(uuid.uuid4()),
            "page_id": payload.page_id,
            "user_id": user.id,
            "user_question": question,
            "ai_answer": qa_result.answer,
            "asked_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as exc:
        logger.warning("Failed to save Q&A history: %s", exc)

    try:
        from app.services.achievements import check_and_unlock
        check_and_unlock(user.id)
    except Exception as exc:
        logger.info("Achievement check after Q&A failed: %s", exc)

    return qa_result


@router.post("/stream")
@limiter.limit(lambda: get_settings().RATE_LIMIT_QA)
def ask_question_stream(
    request: Request, payload: QAStreamRequest, user: AuthUser = Depends(get_current_user)
):
    """Streaming, multi-turn Q&A. Emits NDJSON events (sources → tokens → done).
    1 credit is deducted only AFTER the answer streams successfully."""
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    supabase = get_supabase()
    check_has_credits(user.id, 1, supabase)

    def event_stream():
        answered = False
        answer_parts: list[str] = []
        try:
            for ev in answer_question_stream(
                question=question,
                user_id=user.id,
                history=payload.history,
                page_id=payload.page_id,
                series_id=payload.series_id,
            ):
                if ev.get("type") == "token":
                    answer_parts.append(str(ev.get("text") or ""))
                elif ev.get("type") == "done":
                    answered = True
                yield json.dumps(ev, ensure_ascii=False) + "\n"
        except Exception as exc:
            logger.error("Q&A stream failed for %s: %s", user.id, exc)
            yield json.dumps({"type": "error", "message": "Có lỗi khi tạo câu trả lời."}) + "\n"
            return

        if not answered:
            return

        # Deduct 1 credit + persist history only after a full successful stream.
        try:
            deduct(user.id, 1, "qa", supabase)
        except Exception as exc:
            logger.warning("Credit deduction failed after streamed Q&A for %s: %s", user.id, exc)
        try:
            supabase.table("qa_history").insert({
                "qa_id": str(uuid.uuid4()),
                "page_id": payload.page_id,
                "user_id": user.id,
                "user_question": question,
                "ai_answer": "".join(answer_parts),
                "asked_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as exc:
            logger.warning("Failed to save streamed Q&A history: %s", exc)
        try:
            from app.services.achievements import check_and_unlock
            check_and_unlock(user.id)
        except Exception as exc:
            logger.info("Achievement check after streamed Q&A failed: %s", exc)

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")
