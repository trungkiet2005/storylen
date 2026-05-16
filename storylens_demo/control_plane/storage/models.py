"""ORM models — SQLite-first, Postgres-compatible schema."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from control_plane.storage.db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Manga project
# ---------------------------------------------------------------------------
class MangaProject(Base):
    __tablename__ = "manga_projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    source_language: Mapped[str] = mapped_column(String(10), default="ja")
    target_language: Mapped[str] = mapped_column(String(10), default="vi")
    cover_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    publish_status: Mapped[str] = mapped_column(String(50), default="draft") # draft|pending_review|approved|rejected
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


    chapters: Mapped[list["Chapter"]] = relationship(back_populates="manga", cascade="all, delete-orphan")
    glossary_terms: Mapped[list["GlossaryTerm"]] = relationship(back_populates="manga", cascade="all, delete-orphan")
    style_cards: Mapped[list["StyleCard"]] = relationship(back_populates="manga", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Chapter
# ---------------------------------------------------------------------------
class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    manga_id: Mapped[str] = mapped_column(ForeignKey("manga_projects.id", ondelete="CASCADE"))
    chapter_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    manga: Mapped["MangaProject"] = relationship(back_populates="chapters")
    pages: Mapped[list["Page"]] = relationship(back_populates="chapter", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Page
# ---------------------------------------------------------------------------
class Page(Base):
    __tablename__ = "pages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    manga_id: Mapped[str] = mapped_column(ForeignKey("manga_projects.id", ondelete="CASCADE"))
    chapter_id: Mapped[str] = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"))
    page_index: Mapped[int] = mapped_column(Integer, nullable=False)
    input_artifact_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_artifact_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    debug_artifact_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    chapter: Mapped["Chapter"] = relationship(back_populates="pages")
    text_boxes: Mapped[list["TextBox"]] = relationship(back_populates="page", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Text box
# ---------------------------------------------------------------------------
class TextBox(Base):
    __tablename__ = "text_boxes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    page_id: Mapped[str] = mapped_column(ForeignKey("pages.id", ondelete="CASCADE"))
    box_index: Mapped[int] = mapped_column(Integer, default=0)
    xyxy: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string "[x1,y1,x2,y2]"
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    translated_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    speaker: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tone: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ocr_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    translation_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_status: Mapped[str] = mapped_column(String(50), default="pending")  # pending|approved|rejected
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    page: Mapped["Page"] = relationship(back_populates="text_boxes")


# ---------------------------------------------------------------------------
# Glossary
# ---------------------------------------------------------------------------
class GlossaryTerm(Base):
    __tablename__ = "glossary_terms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    manga_id: Mapped[str] = mapped_column(ForeignKey("manga_projects.id", ondelete="CASCADE"))
    source: Mapped[str] = mapped_column(Text, nullable=False)
    target: Mapped[str] = mapped_column(Text, nullable=False)
    term_type: Mapped[str] = mapped_column(String(50), default="general")  # character|place|object|general
    status: Mapped[str] = mapped_column(String(50), default="candidate")  # candidate|approved|rejected
    created_by: Mapped[str] = mapped_column(String(100), default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    manga: Mapped["MangaProject"] = relationship(back_populates="glossary_terms")


# ---------------------------------------------------------------------------
# Style card
# ---------------------------------------------------------------------------
class StyleCard(Base):
    __tablename__ = "style_cards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    manga_id: Mapped[str] = mapped_column(ForeignKey("manga_projects.id", ondelete="CASCADE"))
    version: Mapped[int] = mapped_column(Integer, default=1)
    content: Mapped[dict] = mapped_column(JSON, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    manga: Mapped["MangaProject"] = relationship(back_populates="style_cards")


# ---------------------------------------------------------------------------
# Job
# ---------------------------------------------------------------------------
class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    manga_id: Mapped[str] = mapped_column(String(36), nullable=False)
    chapter_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    page_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="queued")
    # queued|running|rendered|done|failed|cancelled
    progress: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
    cancel_requested: Mapped[bool] = mapped_column(Boolean, default=False)


# ---------------------------------------------------------------------------
# LLM run log
# ---------------------------------------------------------------------------
class LLMRun(Base):
    __tablename__ = "llm_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    job_id: Mapped[str] = mapped_column(String(36), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), default="gemini")
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    stage: Mapped[str] = mapped_column(String(50), nullable=False)  # translate|critic|embed|summary
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    cost_estimate: Mapped[float] = mapped_column(Float, default=0.0)
    trace_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Translation memory
# ---------------------------------------------------------------------------
class TranslationMemory(Base):
    __tablename__ = "translation_memories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    manga_id: Mapped[str] = mapped_column(String(36), nullable=False)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    target_text: Mapped[str] = mapped_column(Text, nullable=False)
    speaker: Mapped[str | None] = mapped_column(String(100), nullable=True)
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    embedding_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# User / Auth
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="user")  # admin|user|translator
    translator_status: Mapped[str] = mapped_column(String(50), default="none")  # none|pending|approved|rejected
    api_keys: Mapped[dict | None] = mapped_column(JSON, nullable=True) # stores {gemini: ..., kaggle: ...}
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

