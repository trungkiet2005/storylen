"""
StoryLens Backend - Pydantic Models
Request/Response schemas for all API endpoints.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal, Optional

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
    CANCELLED = "cancelled"


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
    original_image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


class BatchStatusResponse(BaseModel):
    batch_id: str
    total: int
    completed: int
    failed: int
    pages: list[PageStatusResponse]


# ─── Page / Bubble ─────────────────────────────────────────────────────────────

ReviewStatus = Literal["pending", "approved", "rejected"]


class BubbleResult(BaseModel):
    bubble_id: str
    bbox: list[int] = Field(..., min_length=4, max_length=4, description="[x, y, width, height]")
    original_text: str
    translated_text: str
    confidence: float = Field(ge=0.0, le=1.0)
    review_status: ReviewStatus = "pending"
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class TranslationEditRequest(BaseModel):
    translated_text: str = Field(..., min_length=1, max_length=5000)


class BubbleReviewRequest(BaseModel):
    review_status: ReviewStatus
    translated_text: Optional[str] = Field(default=None, max_length=5000)


class TranslationHistoryItem(BaseModel):
    translation_id: str
    bubble_id: str
    translated_text: str
    translated_at: datetime
    llm_model_used: Optional[str] = None
    user_id: Optional[str] = None
    username: Optional[str] = None


class TranslationHistoryResponse(BaseModel):
    bubble_id: str
    total: int
    items: list[TranslationHistoryItem]


# ─── Bubble dictionary popup (S2) ──────────────────────────────────────────────

class DictionaryToken(BaseModel):
    """One word / morpheme in the bubble's original text."""
    surface: str = Field(..., description="As-written form, e.g. '行きたい'")
    reading: Optional[str] = Field(default=None, description="Hiragana / pinyin")
    meaning: Optional[str] = Field(default=None, description="Vietnamese gloss")
    pos: Optional[str] = Field(default=None, description="Part of speech, e.g. 'verb'")


class BubbleDictionaryResponse(BaseModel):
    bubble_id: str
    original_text: str
    language: str = Field(..., description="Detected source language: 'ja', 'zh', or 'unknown'")
    romaji: Optional[str] = Field(default=None, description="Romanization (rōmaji / pinyin)")
    tokens: list[DictionaryToken] = Field(default_factory=list)
    alternatives: list[str] = Field(default_factory=list, description="Alternative VN translations")
    note: Optional[str] = Field(default=None, description="Translator note / cultural hint")
    cached: bool = False


class PageMetadata(BaseModel):
    batch_id: Optional[str] = None
    series_id: Optional[str] = None
    chapter_id: Optional[str] = None
    page_number: Optional[int] = None


class PageDataResponse(BaseModel):
    page_id: str
    original_image_url: Optional[str] = None
    translated_image_url: Optional[str] = None
    processed_data: list[BubbleResult]
    metadata: PageMetadata
    status: ProcessingStatus


# ─── Q&A ───────────────────────────────────────────────────────────────────────

class QARequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    page_id: Optional[str] = None
    series_id: Optional[str] = None


class QASource(BaseModel):
    """A citation backing a Q&A answer — the bubble/page the context came from."""
    page_id: str
    bubble_id: Optional[str] = None
    original: Optional[str] = None      # OCR'd source text (JP/CN)
    translated: str                     # the Vietnamese chunk used as context
    similarity: Optional[float] = None  # cosine score (None for DB fallback)
    page_number: Optional[int] = None
    bbox: Optional[list[float]] = None  # [x, y, width, height] in image pixels
    reader_url: str                     # e.g. /reader?page=<page_id>


class QAResponse(BaseModel):
    question: str
    answer: str
    source_chunks: list[str] = []       # kept for backward compatibility
    sources: list[QASource] = []        # rich, clickable citations
    confidence: Optional[float] = None


class QAMessage(BaseModel):
    role: str                            # "user" | "assistant"
    content: str


class QAStreamRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    page_id: Optional[str] = None
    series_id: Optional[str] = None
    history: list[QAMessage] = Field(default_factory=list)


class ChapterRecapResponse(BaseModel):
    """Cached, auto-generated Vietnamese summary of the PREVIOUS chapter,
    shown when a reader opens the next one. `recap` is None when there is
    nothing to show (not yet generated, previous chapter incomplete, or
    generation failed)."""
    recap: Optional[str] = None


# ─── History ───────────────────────────────────────────────────────────────────

class HistoryItem(BaseModel):
    id: str
    type: str  # "page" | "series"
    title: str
    thumbnail_url: Optional[str] = None
    last_accessed: datetime
    status: ProcessingStatus
    series_id: Optional[str] = None
    series_title: Optional[str] = None
    chapter_id: Optional[str] = None
    chapter_title: Optional[str] = None
    chapter_number: Optional[int] = None


class HistoryResponse(BaseModel):
    total: int
    items: list[HistoryItem]


# ─── Manga Series / Chapters ───────────────────────────────────────────────────

SeriesStatus = str  # 'ongoing' | 'completed' | 'paused' — validated at API boundary


class SeriesCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    status: str = Field(default="ongoing")
    tags: list[str] = Field(default_factory=list, max_length=20)
    source_language: Optional[str] = Field(default=None, max_length=16)
    target_language: Optional[str] = Field(default=None, max_length=16)


class SeriesUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    status: Optional[str] = None
    tags: Optional[list[str]] = Field(default=None, max_length=20)
    source_language: Optional[str] = Field(default=None, max_length=16)
    target_language: Optional[str] = Field(default=None, max_length=16)
    cover_image_url: Optional[str] = None


class SeriesListItem(BaseModel):
    series_id: str
    title: str
    description: Optional[str] = None
    status: str
    tags: list[str] = []
    cover_image_url: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    chapter_count: int = 0
    page_count: int = 0


class SeriesListResponse(BaseModel):
    total: int
    items: list[SeriesListItem]


class ChapterCreate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    chapter_number: Optional[int] = Field(default=None, ge=1)


class ChapterUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    chapter_number: Optional[int] = Field(default=None, ge=1)


class ChapterPage(BaseModel):
    page_id: str
    page_number: Optional[int] = None
    thumbnail_url: Optional[str] = None
    translated_image_url: Optional[str] = None
    original_image_url: Optional[str] = None
    status: ProcessingStatus


class ChapterResponse(BaseModel):
    chapter_id: str
    series_id: str
    chapter_number: int
    title: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    page_count: int = 0
    pages: list[ChapterPage] = []


class SeriesResponse(BaseModel):
    series_id: str
    user_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: str
    tags: list[str] = []
    cover_image_url: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    chapters: list[ChapterResponse] = []
    chapter_count: int = 0
    page_count: int = 0


class ReorderItem(BaseModel):
    id: str
    order: int


class ReorderRequest(BaseModel):
    items: list[ReorderItem]


class AddPagesRequest(BaseModel):
    page_ids: list[str] = Field(..., min_length=1, max_length=200)
