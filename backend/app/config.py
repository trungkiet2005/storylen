"""
StoryLens Backend — Configuration
Centralizes all settings. Heavy AI runs on the HF Space worker;
Render only needs Supabase + Gemini + HF Space URL.
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
    # Hardcoded baseline of trusted origins (prod + local dev). An env var can
    # extend this for preview deploys, but the defaults cover normal operation
    # so nothing breaks if ALLOWED_ORIGINS is unset.
    ALLOWED_ORIGINS: list[str] | str = [
        # Local development
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        # Production frontends
        "https://storylen.vercel.app",
        "https://storylens.vercel.app",
    ]

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v: Any) -> bool:
        if isinstance(v, str):
            value = v.strip().lower()
            if value in {"release", "prod", "production", "false", "0", "no", "off"}:
                return False
            if value in {"debug", "dev", "development", "true", "1", "yes", "on"}:
                return True
        return v

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
    SUPABASE_BUCKET_AVATARS: str = "avatars"
    MAX_AVATAR_SIZE_MB: int = 5

    # Auth cookies. For cross-domain production deployments (for example
    # Vercel frontend + Render API), set SameSite=None and Secure=true.
    AUTH_COOKIE_SECURE: bool | None = True
    AUTH_COOKIE_SAMESITE: str = "none"
    AUTH_COOKIE_DOMAIN: str = ""
    AUTH_ACCESS_COOKIE_NAME: str = "sl_access_token"
    AUTH_REFRESH_COOKIE_NAME: str = "sl_refresh_token"
    AUTH_REFRESH_COOKIE_MAX_AGE_SECONDS: int = 60 * 60 * 24 * 30

    @field_validator("AUTH_COOKIE_SAMESITE", mode="before")
    @classmethod
    def normalize_cookie_samesite(cls, v: Any) -> str:
        value = str(v or "lax").strip().lower()
        if value not in {"lax", "strict", "none"}:
            return "lax"
        return value

    # ─── HuggingFace Space (AI Worker) ────────────────────────────────────────
    # For LOCAL development: use http://localhost:7860
    # For production: set to your HF Space URL
    HF_SPACE_URL: str = "http://localhost:7860"
    HF_SPACE_TOKEN: str = ""  # HF read token if the Space is set to private

    # ai_module image translation worker
    AI_MODULE_URL: str = "http://localhost:8001"
    AI_MODULE_TOKEN: str = ""
    AI_MODULE_TRANSLATOR: str = "gemini"
    AI_MODULE_TARGET_LANG: str = "VIN"
    AI_MODULE_DETECTOR: str = "manga_yolo"
    AI_MODULE_OCR: str = "mocr"
    AI_MODULE_INPAINTER: str = "lama_large"
    AI_MODULE_RENDERER: str = "manga2eng_pillow"

    AI_MODULE_DETECTOR_BOX_THRESHOLD: float = 0.3
    AI_MODULE_DETECTOR_TEXT_THRESHOLD: float = 0.3
    AI_MODULE_DETECTOR_UNCLIP_RATIO: float = 2.6
    AI_MODULE_DETECTION_SIZE: int = 1536

    AI_MODULE_INPAINTING_SIZE: int = 1280
    AI_MODULE_INPAINTING_PRECISION: str = "bf16"

    AI_MODULE_FONT_SIZE_OFFSET: int = 0
    AI_MODULE_FONT_SIZE_MINIMUM: int = 10
    AI_MODULE_DISABLE_FONT_BORDER: bool = False

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

    # ─── Narration / Listen mode (VLM + TTS) ──────────────────────────────────
    # The VLM (vision LLM) runs on a GPU pod behind an ollama-compatible endpoint.
    # The pod's public tunnel URL changes each session, so — exactly like the
    # ai_module — the default here can be overridden at runtime via app_settings
    # (see services/narration_source.py). Local dev / CI point at localhost.
    VLM_BASE_URL: str = "http://localhost:11434"
    # Default to qwen2.5-vl: it answers directly (~10s/page) and reliably. qwen3-vl
    # is a *thinking* model whose reasoning tokens (and this ollama build ignores
    # think=false / "/no_think") can balloon on ambiguous art and starve the answer
    # budget — it remains selectable for users who want it, with a larger budget.
    VLM_MODEL: str = "qwen2.5vl:7b"
    VLM_TOKEN: str = ""                       # Bearer token if the tunnel is protected
    VLM_TIMEOUT_SECONDS: int = 180
    VLM_MAX_TOKENS: int = 512                 # ample for a 2–4 sentence narration
    VLM_TEMPERATURE: float = 0.6

    # Narration behaviour
    NARRATION_ENABLED: bool = True
    NARRATION_BUCKET: str = "manga-audio"     # Supabase Storage bucket for rendered mp3/mp4
    NARRATION_CREDIT_COST: int = 1            # credits per narrated page
    NARRATION_MAX_CHAPTER_PAGES: int = 60     # guard against runaway chapter jobs

    # Text-to-speech. TTS_DEFAULT_ENGINE ∈ {"edge", "pyttsx3", "coqui"}.
    # edge-tts is the default (Microsoft neural voices, no API key). pyttsx3 is a
    # fully-offline SAPI fallback. coqui/XTTS runs on the GPU pod (optional).
    TTS_DEFAULT_ENGINE: str = "edge"
    TTS_DEFAULT_VOICE: str = "vi-VN-HoaiMyNeural"
    TTS_DEFAULT_RATE: str = "+0%"             # edge-tts prosody rate, e.g. "-10%".."+25%"
    COQUI_TTS_URL: str = ""                   # e.g. https://<tunnel>.trycloudflare.com (empty → disabled)
    COQUI_TTS_SPEAKER: str = "vi_female"

    @field_validator(
        "VLM_BASE_URL",
        "VLM_MODEL",
        "VLM_TOKEN",
        "TTS_DEFAULT_ENGINE",
        "TTS_DEFAULT_VOICE",
        "TTS_DEFAULT_RATE",
        "COQUI_TTS_URL",
        "COQUI_TTS_SPEAKER",
        "NARRATION_BUCKET",
        mode="before",
    )
    @classmethod
    def strip_narration_str(cls, v: Any) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("TTS_DEFAULT_ENGINE", mode="before")
    @classmethod
    def normalize_tts_engine(cls, v: Any) -> str:
        value = str(v or "edge").strip().lower()
        if value not in {"edge", "pyttsx3", "coqui"}:
            return "edge"
        return value

    # ─── Observability ────────────────────────────────────────────────────────
    SENTRY_DSN: str = ""                # Empty → Sentry disabled.
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    SENTRY_ENVIRONMENT: str = "development"
    OTEL_EXPORTER_OTLP_ENDPOINT: str = ""  # Empty → OTel exporter disabled.
    OTEL_SERVICE_NAME: str = "storylens-backend"

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
    MAX_FILE_SIZE_MB: int = 20
    # Cap for the whole HTTP request body (covers multi-file uploads).
    MAX_REQUEST_SIZE_MB: int = 200
    ALLOWED_EXTENSIONS: list[str] | str = ["jpg", "jpeg", "png", "webp"]

    # ─── Pipeline concurrency ─────────────────────────────────────────────────
    # Max background translation threads running simultaneously.
    # Prevents self-DDoS when many files are uploaded at once.
    MAX_PIPELINE_CONCURRENCY: int = 10

    # ─── Rate limits (slowapi syntax: "<count>/<period>") ─────────────────────
    RATE_LIMIT_LOGIN: str = "10/minute"
    RATE_LIMIT_REGISTER: str = "5/minute"
    RATE_LIMIT_UPLOAD: str = "30/minute"
    RATE_LIMIT_QA: str = "30/minute"
    RATE_LIMIT_FORUM_THREAD: str = "5/minute"
    RATE_LIMIT_FORUM_REPLY: str = "20/minute"
    RATE_LIMIT_FORUM_VOTE: str = "60/minute"
    RATE_LIMIT_FORUM_UPLOAD: str = "30/minute"
    RATE_LIMIT_NARRATE: str = "20/minute"

    # ─── Forum attachments ────────────────────────────────────────────────────
    FORUM_BUCKET: str = "forum-attachments"
    FORUM_MAX_ATTACHMENTS: int = 10
    FORUM_MAX_IMAGE_MB: int = 10
    FORUM_MAX_VIDEO_MB: int = 50
    FORUM_ALLOWED_IMAGE_MIMES: list[str] | str = [
        "image/jpeg", "image/png", "image/webp", "image/gif",
    ]
    FORUM_ALLOWED_VIDEO_MIMES: list[str] | str = [
        "video/mp4", "video/webm",
    ]

    @field_validator("FORUM_ALLOWED_IMAGE_MIMES", "FORUM_ALLOWED_VIDEO_MIMES", mode="before")
    @classmethod
    def parse_mime_list(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            s = v.strip()
            if s.startswith("["):
                try:
                    return list(json.loads(s))
                except Exception:
                    pass
            return [item.strip() for item in s.split(",") if item.strip()]
        return list(v) if v else []

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
    # Gemini embedding model used for both document + query embeddings.
    # gemini-embedding-001 supports output_dimensionality; keep it in sync with
    # the `vector(EMBED_DIM)` column created by supabase_migration_v7_rag.sql.
    GEMINI_EMBED_MODEL: str = "gemini-embedding-001"
    EMBED_DIM: int = 768
    # Cosine-similarity floor for vector search. Chunks below this are dropped
    # so off-topic bubbles never reach the answer prompt.
    RAG_MIN_SIMILARITY: float = 0.55

    # ─── Account & email flows ────────────────────────────────────────────────
    # URL Supabase Auth redirects to after the user clicks the password-reset
    # email link. Leave empty to use Supabase's project default.
    PASSWORD_RESET_REDIRECT_URL: str = ""
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    # ─── Stripe (optional — payment integration) ──────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_BASIC: str = ""
    STRIPE_PRICE_PRO: str = ""
    STRIPE_PRICE_PREMIUM: str = ""

    # ─── Production sanity check ──────────────────────────────────────────────
    @model_validator(mode="after")
    def _check_production_safety(self) -> "Settings":
        origins = self.ALLOWED_ORIGINS if isinstance(self.ALLOWED_ORIGINS, list) else []
        if not origins:
            raise ValueError("ALLOWED_ORIGINS must not be empty.")
        if "*" in origins:
            raise ValueError(
                "ALLOWED_ORIGINS=* is not allowed (would defeat CORS with credentials)."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
