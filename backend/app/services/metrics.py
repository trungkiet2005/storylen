"""
StoryLens Backend — Prometheus metrics registry.

Exposes process-wide counters/histograms/gauges for AI-call observability and a
`render()` helper for the `/metrics` endpoint. Degrades to a no-op when
``prometheus_client`` is not installed, so nothing here can break a deploy that
hasn't opted into metrics.

All series are prefixed ``storylens_`` and labelled by provider/model/operation
so Grafana can slice per-model. Kept intentionally small (RED-style: rate,
errors, duration + tokens/cost).
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

try:  # optional dependency
    from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest

    _ENABLED = True
except Exception:  # pragma: no cover - only when dep missing
    _ENABLED = False
    CONTENT_TYPE_LATEST = "text/plain; version=0.0.4; charset=utf-8"


_DRIFT_LEVEL = {"ok": 0.0, "warning": 1.0, "critical": 2.0}


if _ENABLED:
    AI_CALLS = Counter(
        "storylens_ai_calls_total",
        "Total AI model calls",
        ["provider", "model", "operation", "status"],
    )
    AI_LATENCY = Histogram(
        "storylens_ai_call_latency_seconds",
        "AI model call latency (seconds)",
        ["provider", "model", "operation"],
        buckets=(0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30, 60, 120),
    )
    AI_TOKENS = Counter(
        "storylens_ai_tokens_total",
        "Tokens processed by AI models",
        ["provider", "model", "kind"],  # kind = prompt | completion
    )
    AI_COST = Counter(
        "storylens_ai_cost_usd_total",
        "Estimated AI spend in USD",
        ["provider", "model"],
    )
    DRIFT = Gauge(
        "storylens_model_drift_status",
        "Model drift status per metric (0=ok, 1=warning, 2=critical)",
        ["metric"],
    )


def enabled() -> bool:
    return _ENABLED


def observe_ai_call(
    *,
    provider: str,
    model: str,
    operation: str,
    status: str,
    latency_ms: int,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    cost_usd: float = 0.0,
) -> None:
    """Record one AI call into the Prometheus series. Never raises."""
    if not _ENABLED:
        return
    try:
        AI_CALLS.labels(provider, model, operation, status).inc()
        AI_LATENCY.labels(provider, model, operation).observe(max(0.0, latency_ms / 1000.0))
        if prompt_tokens:
            AI_TOKENS.labels(provider, model, "prompt").inc(prompt_tokens)
        if completion_tokens:
            AI_TOKENS.labels(provider, model, "completion").inc(completion_tokens)
        if cost_usd:
            AI_COST.labels(provider, model).inc(cost_usd)
    except Exception as exc:  # pragma: no cover - metrics must never break callers
        logger.debug("metrics.observe_ai_call failed: %s", exc)


def set_drift(metric: str, level: str) -> None:
    """Publish a drift level for one metric as a gauge (0/1/2)."""
    if not _ENABLED:
        return
    try:
        DRIFT.labels(metric).set(_DRIFT_LEVEL.get(level, 0.0))
    except Exception as exc:  # pragma: no cover
        logger.debug("metrics.set_drift failed: %s", exc)


def render() -> tuple[bytes, str]:
    """Return (payload, content_type) for the /metrics endpoint."""
    if not _ENABLED:
        return (b"# prometheus_client not installed\n", CONTENT_TYPE_LATEST)
    return (generate_latest(), CONTENT_TYPE_LATEST)
