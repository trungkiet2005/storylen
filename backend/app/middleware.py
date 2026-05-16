"""
Cross-cutting HTTP middleware: request ID propagation and body size limiting.
"""
from __future__ import annotations

import contextvars
import logging
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default="-"
)


class RequestIDFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Assign or propagate an X-Request-ID header and expose it via contextvars."""

    header_name = "X-Request-ID"

    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get(self.header_name)
        rid = incoming or uuid.uuid4().hex
        token = request_id_ctx.set(rid)
        try:
            response = await call_next(request)
        finally:
            request_id_ctx.reset(token)
        response.headers[self.header_name] = rid
        return response


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Reject requests whose Content-Length exceeds the configured cap before the
    handler reads any bytes. Prevents OOM on oversized multipart uploads.
    Requests without Content-Length are passed through (Starlette enforces a
    soft cap internally for streamed bodies).
    """

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        if request.method in {"POST", "PUT", "PATCH"}:
            cl = request.headers.get("content-length")
            if cl and cl.isdigit() and int(cl) > self.max_bytes:
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": (
                            f"Yêu cầu vượt quá giới hạn "
                            f"{self.max_bytes // (1024 * 1024)} MB."
                        )
                    },
                )
        return await call_next(request)


class CSRFMiddleware(BaseHTTPMiddleware):
    """Double-submit token CSRF protection on cookie-authenticated mutations.

    Threat model: SameSite=none cookies (required for cross-domain Vercel ↔
    Render setup) only stop *cross-origin* fetch requests in modern browsers.
    A double-submit CSRF token adds a belt to the suspenders.

    Implementation:
      - On any safe request (GET/HEAD/OPTIONS), if no ``csrf_token`` cookie
        is present, set one with a 32-byte random value (cookie is readable
        by JS via ``document.cookie`` because the frontend echoes it in a
        header on writes — that's the whole point of double-submit).
      - On mutating requests (POST/PUT/PATCH/DELETE), require the
        ``X-CSRF-Token`` header to match the ``csrf_token`` cookie.
      - Exempt: Stripe webhook (verified by signature), WebSocket handshake,
        public read endpoints under ``/v1/library`` and ``/v1/share``.
    """

    EXEMPT_PATH_PREFIXES = (
        "/v1/credits/webhook",   # Stripe — verified by signature
        "/v1/library",            # public reads
        "/v1/share",              # public share GET
        "/v1/ws/",                # WebSocket upgrade
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc",
    )

    SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

    def __init__(self, app: ASGIApp, cookie_name: str = "csrf_token") -> None:
        super().__init__(app)
        self.cookie_name = cookie_name

    def _is_exempt(self, path: str) -> bool:
        return any(path.startswith(p) for p in self.EXEMPT_PATH_PREFIXES)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method.upper()

        # Issue a CSRF cookie on first safe request so the frontend has a value
        # to echo back on subsequent mutations.
        existing = request.cookies.get(self.cookie_name)

        if method in self.SAFE_METHODS or self._is_exempt(path):
            response = await call_next(request)
            if not existing:
                token = uuid.uuid4().hex + uuid.uuid4().hex  # 64 hex chars
                response.set_cookie(
                    key=self.cookie_name,
                    value=token,
                    httponly=False,  # JS must read it to echo back
                    secure=True,
                    samesite="none",
                    path="/",
                    max_age=60 * 60 * 24 * 30,  # 30 days
                )
            return response

        # Mutating, non-exempt path → require the header match the cookie.
        header_token = request.headers.get("x-csrf-token", "")
        if not existing or not header_token or header_token != existing:
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token missing or invalid."},
            )
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security-relevant response headers to every reply.

    Mirrors what Next.js sets on the frontend so the API surface is consistent
    when accessed directly (e.g. via /docs, /openapi.json, or curl).
    Cross-origin policy is intentionally permissive because the API is hit by
    a different origin (Vercel) under CORS.
    """

    HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": (
            "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        ),
        # HSTS is only meaningful when served via HTTPS; harmless on localhost
        # since browsers ignore it on http://. Two years + preload-ready.
        "Strict-Transport-Security": (
            "max-age=63072000; includeSubDomains; preload"
        ),
        # API doesn't render HTML, so a tight CSP keeps the auto-generated
        # /docs page safe and blocks accidental HTML injection elsewhere.
        "Content-Security-Policy": (
            "default-src 'none'; "
            "img-src 'self' data: https://fastapi.tiangolo.com; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "script-src 'self' https://cdn.jsdelivr.net; "
            "connect-src 'self'; "
            "font-src 'self' data: https://cdn.jsdelivr.net; "
            "frame-ancestors 'none'; "
            "base-uri 'none'"
        ),
    }

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        for key, value in self.HEADERS.items():
            response.headers.setdefault(key, value)
        return response
