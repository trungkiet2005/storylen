"""Centralised Sentry + OpenTelemetry wiring.

Both are no-ops by default — they activate only when the corresponding env vars
are set, so local development stays quiet. Call `init_observability(app)` once
from `main.py`, BEFORE any route handlers run (i.e. before middleware that you
want traced).
"""
from __future__ import annotations

import logging

from fastapi import FastAPI

logger = logging.getLogger(__name__)


def init_observability(app: FastAPI) -> None:
    from app.config import get_settings

    settings = get_settings()
    _init_sentry(settings)
    _init_otel(app, settings)


def _init_sentry(settings) -> None:
    dsn = (settings.SENTRY_DSN or "").strip()
    if not dsn:
        logger.info("Sentry: DSN not set → disabled")
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:
        logger.warning("Sentry: sentry-sdk not installed — skipping init")
        return

    sentry_sdk.init(
        dsn=dsn,
        environment=settings.SENTRY_ENVIRONMENT or "development",
        release=settings.APP_VERSION,
        traces_sample_rate=float(settings.SENTRY_TRACES_SAMPLE_RATE),
        send_default_pii=False,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            StarletteIntegration(transaction_style="endpoint"),
        ],
        # Don't double-capture 404s or rate-limit responses as errors.
        before_send=_sentry_before_send,
    )
    logger.info("Sentry: enabled (env=%s, traces=%.2f)",
                settings.SENTRY_ENVIRONMENT, settings.SENTRY_TRACES_SAMPLE_RATE)


def _sentry_before_send(event, hint):
    exc_info = hint.get("exc_info")
    if not exc_info:
        return event
    exc = exc_info[1]
    # Drop expected HTTP errors — they're not actionable bugs.
    try:
        from fastapi import HTTPException
        if isinstance(exc, HTTPException) and 400 <= exc.status_code < 500:
            return None
    except Exception:
        pass
    return event


def _init_otel(app: FastAPI, settings) -> None:
    endpoint = (settings.OTEL_EXPORTER_OTLP_ENDPOINT or "").strip()
    if not endpoint:
        logger.info("OpenTelemetry: OTLP endpoint not set → disabled")
        return
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
    except ImportError:
        logger.warning("OpenTelemetry: deps missing — skipping init")
        return

    resource = Resource.create({
        "service.name": settings.OTEL_SERVICE_NAME or "storylens-backend",
        "service.version": settings.APP_VERSION,
        "deployment.environment": settings.SENTRY_ENVIRONMENT or "development",
    })
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=endpoint)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)
    HTTPXClientInstrumentor().instrument()
    logger.info("OpenTelemetry: exporting traces to %s", endpoint)
