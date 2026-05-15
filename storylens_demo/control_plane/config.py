"""
StoryLens Demo — Config

Priority for Gemini API key:
  1. secrets/keys.json  (local dev — gitignored)
  2. env var GEMINI_API_KEY  (CI/CD, Docker, prod)
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

_ROOT_DIR = Path(__file__).parent.parent
_SECRETS_FILE = _ROOT_DIR / "secrets" / "keys.json"
_ENV_FILE = _ROOT_DIR / ".env"

if _ENV_FILE.exists():
    load_dotenv(_ENV_FILE, override=False)


def _load_keys() -> dict:
    if _SECRETS_FILE.exists():
        try:
            return json.loads(_SECRETS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def _get_key(keys: dict, field_name: str, env_var: str, default: str = "") -> str:
    """Keys file takes priority, falls back to env var."""
    value = keys.get(field_name, "").strip()
    if value and not value.startswith("YOUR_"):
        return value
    return os.getenv(env_var, default).strip()


def _csv(value: str) -> list[str]:
    if value.strip() == "*":
        return ["*"]
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    # Keys
    gemini_api_key: str
    kaggle_worker_api_key: str
    jwt_secret: str
    admin_username: str
    admin_password: str

    # Models
    gemini_translation_model: str
    gemini_critic_model: str
    gemini_embedding_model: str

    # Database
    db_url: str

    # Storage
    artifact_dir: Path
    vector_db_dir: Path
    max_upload_mb: int

    # Network
    app_env: str
    app_port: int
    cors_origins: list[str]

    # External workers
    kaggle_worker_url: str

    @classmethod
    def load(cls) -> "Settings":
        keys = _load_keys()
        return cls(
            gemini_api_key=_get_key(keys, "gemini_api_key", "GEMINI_API_KEY"),
            kaggle_worker_api_key=_get_key(keys, "kaggle_worker_api_key", "KAGGLE_WORKER_API_KEY"),
            jwt_secret=_get_key(keys, "jwt_secret", "JWT_SECRET", "dev-secret-change-me"),
            admin_username=_get_key(keys, "admin_username", "ADMIN_USERNAME"),
            admin_password=_get_key(keys, "admin_password", "ADMIN_PASSWORD"),
            gemini_translation_model=os.getenv("GEMINI_TRANSLATION_MODEL", "gemini-2.0-flash"),
            gemini_critic_model=os.getenv("GEMINI_CRITIC_MODEL", "gemini-2.0-flash"),
            gemini_embedding_model=os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004"),
            db_url=os.getenv("DB_URL", "sqlite+aiosqlite:///./storylens.db"),
            artifact_dir=Path(os.getenv("ARTIFACT_DIR", "./artifacts")).resolve(),
            vector_db_dir=Path(os.getenv("VECTOR_DB_DIR", "./chromadb")).resolve(),
            max_upload_mb=int(os.getenv("MAX_UPLOAD_MB", "30")),
            app_env=os.getenv("APP_ENV", "development"),
            app_port=int(os.getenv("APP_PORT", "8000")),
            cors_origins=_csv(os.getenv("CORS_ORIGINS", "*")),
            kaggle_worker_url=_get_key(keys, "kaggle_worker_url", "KAGGLE_WORKER_URL"),
        )

    @property
    def is_dev(self) -> bool:
        return self.app_env == "development"

    def key_status(self) -> dict:
        """For health endpoint — shows which keys are configured (not values)."""
        return {
            "gemini_api_key": bool(self.gemini_api_key),
            "kaggle_worker_url": bool(self.kaggle_worker_url),
            "kaggle_worker_api_key": bool(self.kaggle_worker_api_key),
            "jwt_secret_set": self.jwt_secret != "dev-secret-change-me",
        }


# Singleton
_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings.load()
    return _settings


def update_kaggle_worker_url(url: str) -> None:
    """Ghi URL mới vào secrets/keys.json và reload settings ngay lập tức."""
    global _settings
    secrets = {}
    if _SECRETS_FILE.exists():
        try:
            secrets = json.loads(_SECRETS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    secrets["kaggle_worker_url"] = url
    _SECRETS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _SECRETS_FILE.write_text(json.dumps(secrets, indent=2, ensure_ascii=False), encoding="utf-8")
    _settings = Settings.load()  # reload singleton
