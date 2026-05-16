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
