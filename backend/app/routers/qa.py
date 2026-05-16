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

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import get_settings
from app.database import get_supabase
from app.models.schemas import QARequest, QAResponse
from app.rate_limit import limiter
from app.routers.auth import AuthUser, get_current_user
from app.services.credit_service import check_has_credits, deduct
from app.services.rag import answer_question

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
