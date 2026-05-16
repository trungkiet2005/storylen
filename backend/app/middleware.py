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
