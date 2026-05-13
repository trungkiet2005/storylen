"""
StoryLens Backend - ai_module configuration router.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import AIModuleOptionsResponse
from app.services.ai_module_client import get_ai_module_options

router = APIRouter(prefix="/ai-module", tags=["ai-module"])


@router.get("/options", response_model=AIModuleOptionsResponse)
def get_options():
    """Return ai_module model choices and the backend's active defaults."""
    return get_ai_module_options()
