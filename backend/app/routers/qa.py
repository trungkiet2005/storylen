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

from fastapi import APIRouter, HTTPException

from app.database import get_supabase
from app.models.schemas import QARequest, QAResponse
from app.services.rag import answer_question

router = APIRouter(prefix="/qa", tags=["qa"])
logger = logging.getLogger(__name__)


@router.post("", response_model=QAResponse)
def ask_question(payload: QARequest):
    """
    Ask a question about a manga page or series.
    Uses RAG (vector search + Gemini) to generate a grounded answer.
    page_id and series_id are both optional — omit both for general Q&A
    (will search across all embeddings).
    """
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    response = answer_question(
        question=question,
        page_id=payload.page_id,
        series_id=payload.series_id,
    )

    # Persist Q&A to history (non-blocking — failure is logged and swallowed)
    try:
        supabase = get_supabase()
        supabase.table("qa_history").insert({
            "qa_id": str(uuid.uuid4()),
            "page_id": payload.page_id,
            "user_question": question,
            "ai_answer": response.answer,
            "asked_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as exc:
        logger.warning("Failed to save Q&A history: %s", exc)

    return response
