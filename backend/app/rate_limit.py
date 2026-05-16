"""
Per-route rate limiting via slowapi.

Key strategy:
  - Use the access-token cookie (hashed) when the caller is authenticated, so
    one user behind NAT cannot get blocked by another and one user cannot
    bypass limits by churning IPs.
  - Fall back to client IP (honouring X-Forwarded-For when behind a proxy).

Storage backend:
  - When ``REDIS_URL`` is set we use Redis so limits are enforced across
    replicas. Without it we fall back to in-memory (single-replica only).
"""
from __future__ import annotations

import hashlib
import logging
import os

from slowapi import Limiter
from starlette.requests import Request

from app.config import get_settings

logger = logging.getLogger(__name__)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    client = request.client
    return client.host if client else "anonymous"


def rate_key(request: Request) -> str:
    settings = get_settings()
    token = request.cookies.get(settings.AUTH_ACCESS_COOKIE_NAME)
    if token:
        return "u:" + hashlib.sha256(token.encode("utf-8")).hexdigest()[:24]
    return "ip:" + _client_ip(request)


def _build_limiter() -> Limiter:
    redis_url = os.getenv("REDIS_URL", "").strip()
    if redis_url:
        try:
            logger.info("rate_limit: using Redis storage at %s", redis_url.split("@")[-1])
            return Limiter(key_func=rate_key, headers_enabled=False, storage_uri=redis_url)
        except Exception as exc:
            logger.warning("rate_limit: Redis storage failed (%s), falling back to in-memory", exc)
    return Limiter(key_func=rate_key, headers_enabled=False)


limiter = _build_limiter()
