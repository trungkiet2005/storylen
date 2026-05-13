"""
StoryLens Backend - Pydantic Models
Request/Response schemas for all API endpoints.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ─── Enums ────────────────────────────────────────────────────────────────────

class ProcessingStatus(str, Enum):
    PENDING = "pending"
    OCR_RUNNING = "ocr_running"
    OCR_FAILED = "ocr_failed"
    TRANSLATING = "translating"
    TRANSLATED = "translated"
    COMPLETED = "completed"
    FAILED = "failed"


# ─── Upload ────────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    message: str
    page_ids: list[str]
    batch_id: Optional[str] = None


class AIModuleCurrentConfig(BaseModel):
    translator: str
    target_lang: str
    detector: str
    ocr: str
    inpainter: str
    renderer: str


class AIModuleOptionsResponse(BaseModel):
    current: AIModuleCurrentConfig
    translators: list[str]
    target_languages: list[str]
    detectors: list[str]
    ocr_models: list[str]
    inpainters: list[str]
    renderers: list[str]


# ─── Status ────────────────────────────────────────────────────────────────────

class PageStatusResponse(BaseModel):
    page_id: str
    status: ProcessingStatus
    progress: int = Field(ge=0, le=100, description="Processing progress percentage")
    error: Optional[str] = None


class BatchStatusResponse(BaseModel):
    batch_id: str
    total: int
    completed: int
    failed: int
    pages: list[PageStatusResponse]


# ─── Page / Bubble ─────────────────────────────────────────────────────────────

class BubbleResult(BaseModel):
    bubble_id: str
    bbox: list[int] = Field(..., min_length=4, max_length=4, description="[x, y, width, height]")
    original_text: str
    translated_text: str
    confidence: float = Field(ge=0.0, le=1.0)


class PageMetadata(BaseModel):
    series_id: Optional[str] = None
    chapter_id: Optional[str] = None
    page_number: Optional[int] = None


class PageDataResponse(BaseModel):
    page_id: str
    original_image_url: str
    translated_image_url: Optional[str] = None
    processed_data: list[BubbleResult]
    metadata: PageMetadata
    status: ProcessingStatus


# ─── Q&A ───────────────────────────────────────────────────────────────────────

class QARequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    page_id: Optional[str] = None
    series_id: Optional[str] = None


class QAResponse(BaseModel):
    question: str
    answer: str
    source_chunks: list[str] = []
    confidence: Optional[float] = None


# ─── History ───────────────────────────────────────────────────────────────────

class HistoryItem(BaseModel):
    id: str
    type: str  # "page" | "series"
    title: str
    thumbnail_url: Optional[str] = None
    last_accessed: datetime
    status: ProcessingStatus


class HistoryResponse(BaseModel):
    total: int
    items: list[HistoryItem]
