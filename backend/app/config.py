"""
StoryLens Backend — Configuration
Centralizes all settings. Heavy AI settings (ST model, YOLO path)
live in ai_service/ — Render only needs Supabase + Gemini + HF Space URL.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ─── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "StoryLens API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "https://storylens.vercel.app"]

    # ─── Supabase ─────────────────────────────────────────────────────────────
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str          # server-side only, never expose to frontend
    SUPABASE_ANON_KEY: str                  # for public-facing operations

    # ─── Supabase Storage ─────────────────────────────────────────────────────
    SUPABASE_BUCKET_ORIGINALS: str = "manga-originals"
    SUPABASE_BUCKET_THUMBNAILS: str = "manga-thumbnails"

    # ─── HuggingFace Space (AI Worker) ────────────────────────────────────────
    # Update HF_SPACE_URL after creating your Space at huggingface.co/spaces
    HF_SPACE_URL: str = "https://your-username-storylens-ai-worker.hf.space"
    HF_SPACE_TOKEN: str = ""   # HF read token if the Space is set to private

    # ─── Gemini (Google AI) ───────────────────────────────────────────────────
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # ─── Upload constraints ───────────────────────────────────────────────────
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: list[str] = ["jpg", "jpeg", "png", "webp"]

    # ─── RAG ──────────────────────────────────────────────────────────────────
    RAG_TOP_K: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()
