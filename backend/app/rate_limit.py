"""
Per-route rate limiting via slowapi.

Key strategy:
  - Use the access-token cookie (hashed) when the caller is authenticated, so
    one user behind NAT cannot get blocked by another and one user cannot
    bypass limits by churning IPs.
  - Fall back to client IP (honouring X-Forwarded-For when behind a proxy).
"""
from __future__ import annotations

import hashlib

from slowapi import Limiter
from starlette.requests import Request

from app.config import get_settings


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


limiter = Limiter(key_func=rate_key, headers_enabled=False)
