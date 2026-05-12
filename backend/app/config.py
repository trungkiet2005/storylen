"""
StoryLens Backend — Configuration
Centralizes all settings. Heavy AI settings (ST model, YOLO path)
live in ai_service/ — Render only needs Supabase + Gemini + HF Space URL.
"""
from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        # Allow extra fields in .env without error
        extra="ignore",
    )

    # ─── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "StoryLens API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    # Accepts JSON list string from .env OR Python list
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "https://storylens.vercel.app"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            stripped = v.strip()
            if stripped.startswith("["):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return [str(o).strip() for o in parsed]
                except json.JSONDecodeError:
                    pass
            # Comma-separated fallback
            return [o.strip() for o in stripped.split(",") if o.strip()]
        return v

    # ─── Supabase ─────────────────────────────────────────────────────────────
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str  # server-side only, never expose to frontend
    SUPABASE_ANON_KEY: str          # for public-facing operations

    # ─── Supabase Storage ─────────────────────────────────────────────────────
    SUPABASE_BUCKET_ORIGINALS: str = "manga-originals"
    SUPABASE_BUCKET_THUMBNAILS: str = "manga-thumbnails"

    # ─── HuggingFace Space (AI Worker) ────────────────────────────────────────
    # For LOCAL development: use http://localhost:8001
    # For production: set to your HF Space URL
    HF_SPACE_URL: str = "http://localhost:8001"
    HF_SPACE_TOKEN: str = ""  # HF read token if the Space is set to private

    # ai_module image translation worker
    AI_MODULE_URL: str = "http://localhost:8001"
    AI_MODULE_TOKEN: str = ""
    AI_MODULE_TRANSLATOR: str = "gemini"
    AI_MODULE_TARGET_LANG: str = "VIN"
    AI_MODULE_DETECTOR: str = "default"
    AI_MODULE_OCR: str = "48px"
    AI_MODULE_INPAINTER: str = "lama_large"
    AI_MODULE_RENDERER: str = "default"

    @field_validator(
        "HF_SPACE_TOKEN",
        "HF_SPACE_URL",
        "AI_MODULE_URL",
        "AI_MODULE_TOKEN",
        "AI_MODULE_TRANSLATOR",
        "AI_MODULE_TARGET_LANG",
        "AI_MODULE_DETECTOR",
        "AI_MODULE_OCR",
        "AI_MODULE_INPAINTER",
        "AI_MODULE_RENDERER",
        mode="before",
    )
    @classmethod
    def strip_whitespace_str(cls, v: Any) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    # ─── Gemini (Google AI) ───────────────────────────────────────────────────
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"

    @field_validator("GEMINI_API_KEY", mode="before")
    @classmethod
    def strip_gemini_key(cls, v: Any) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    # ─── Upload constraints ───────────────────────────────────────────────────
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: list[str] = ["jpg", "jpeg", "png", "webp"]

    @field_validator("ALLOWED_EXTENSIONS", mode="before")
    @classmethod
    def parse_extensions(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            stripped = v.strip()
            if stripped.startswith("["):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return [str(e).strip().lower() for e in parsed]
                except json.JSONDecodeError:
                    pass
            return [e.strip().lower() for e in stripped.split(",") if e.strip()]
        return v

    # ─── RAG ──────────────────────────────────────────────────────────────────
    RAG_TOP_K: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()
