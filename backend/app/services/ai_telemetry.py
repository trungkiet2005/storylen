"""
StoryLens Backend — AI-call telemetry (MLOps, per-model).

Complements ``model_monitor`` (manga-pipeline quality metrics) with generic
*per-call* observability for EVERY model StoryLens talks to: Gemini, the
narration VLM (ollama qwen-vl), and TTS. Captures latency, token counts, and an
estimated USD cost, then:

  1. updates the in-process Prometheus series (``services.metrics``), and
  2. persists a row to the ``ai_call_metrics`` Supabase table (best-effort).

Everything here is best-effort and must never raise into a caller — a telemetry
failure can slow or break a user request, which defeats the purpose.

Usage (context manager — the ergonomic path):

    with ai_telemetry.track("ollama", model, "narrate.describe") as tel:
        data = call_model(...)
        tel.prompt_tokens = data.get("prompt_eval_count", 0)
        tel.completion_tokens = data.get("eval_count", 0)

On an exception inside the block the call is recorded as ``status="error"`` and
the exception re-raised.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from time import perf_counter
from typing import Any, Iterator

from app.database import get_supabase
from app.services import metrics

logger = logging.getLogger(__name__)

# ─── Pricing ──────────────────────────────────────────────────────────────────
# USD per 1M tokens (input, output). Self-hosted models (VLM on our GPU pod) have
# no per-token API cost, so they're 0 — GPU time is a fixed cost, not per-call.
# Keep these approximate + easy to update; they drive the cost KPI only.
_PRICE_PER_1M: dict[str, tuple[float, float]] = {
    "gemini-2.5-flash": (0.30, 2.50),
    "gemini-2.5-flash-lite": (0.10, 0.40),
    "gemini-1.5-flash": (0.075, 0.30),
    "gemini-embedding-001": (0.15, 0.0),
    "text-embedding-004": (0.0, 0.0),
}
# TTS is charged per character by cloud vendors; our engines are free/self-hosted.
_TTS_PRICE_PER_1M_CHARS: dict[str, float] = {"edge": 0.0, "pyttsx3": 0.0, "coqui": 0.0}


def estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Best-effort USD estimate for a token-billed model. 0.0 if unknown/free."""
    price = _PRICE_PER_1M.get(model)
    if not price:
        # Prefix match (e.g. "gemini-2.5-flash-preview-xyz")
        for key, val in _PRICE_PER_1M.items():
            if model.startswith(key):
                price = val
                break
    if not price:
        return 0.0
    inp, out = price
    return round((prompt_tokens / 1_000_000) * inp + (completion_tokens / 1_000_000) * out, 6)


def estimate_tts_cost(engine: str, char_count: int) -> float:
    rate = _TTS_PRICE_PER_1M_CHARS.get(engine, 0.0)
    return round((char_count / 1_000_000) * rate, 6)


def record_ai_call(
    *,
    provider: str,
    model: str,
    operation: str,
    latency_ms: int,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    success: bool = True,
    cost_usd: float | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    """Record one AI call to Prometheus + Supabase. Never raises."""
    status = "ok" if success else "error"
    if cost_usd is None:
        cost_usd = estimate_cost(model, prompt_tokens, completion_tokens)

    metrics.observe_ai_call(
        provider=provider,
        model=model,
        operation=operation,
        status=status,
        latency_ms=latency_ms,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        cost_usd=cost_usd,
    )

    try:
        row = {
            "provider": provider,
            "model": model,
            "operation": operation,
            "latency_ms": int(latency_ms),
            "prompt_tokens": int(prompt_tokens),
            "completion_tokens": int(completion_tokens),
            "cost_usd": float(cost_usd),
            "success": bool(success),
            "meta": meta or {},
            "recorded_at": datetime.now(timezone.utc).isoformat(),
        }
        get_supabase().table("ai_call_metrics").insert(row).execute()
    except Exception as exc:  # persistence is best-effort
        logger.debug("ai_telemetry: failed to persist %s/%s call: %s", provider, model, exc)


@dataclass
class _Telemetry:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    success: bool = True
    cost_usd: float | None = None
    meta: dict[str, Any] | None = None


@contextmanager
def track(provider: str, model: str, operation: str, *, meta: dict | None = None) -> Iterator[_Telemetry]:
    """Time a block and record it. Populate token fields on the yielded object."""
    tel = _Telemetry(meta=meta)
    t0 = perf_counter()
    try:
        yield tel
    except Exception:
        tel.success = False
        raise
    finally:
        record_ai_call(
            provider=provider,
            model=model,
            operation=operation,
            latency_ms=int((perf_counter() - t0) * 1000),
            prompt_tokens=tel.prompt_tokens,
            completion_tokens=tel.completion_tokens,
            success=tel.success,
            cost_usd=tel.cost_usd,
            meta=tel.meta,
        )


# ─── Aggregation for the admin dashboard ──────────────────────────────────────

_MAX_QUERY_ROWS = 5000


def get_ai_call_summary(days: int = 7) -> dict[str, Any]:
    """Aggregate ai_call_metrics by (provider, model, operation) for the last N days."""
    from collections import defaultdict
    from datetime import timedelta
    from statistics import mean

    try:
        supabase = get_supabase()
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        resp = (
            supabase.table("ai_call_metrics")
            .select("*")
            .gte("recorded_at", since)
            .order("recorded_at", desc=True)
            .limit(_MAX_QUERY_ROWS)
            .execute()
        )
        rows: list[dict] = resp.data or []
    except Exception as exc:
        logger.warning("get_ai_call_summary failed: %s", exc)
        return {"models": [], "totals": {}, "error": str(exc)[:200]}

    if not rows:
        return {"models": [], "totals": {"calls": 0, "cost_usd": 0.0, "tokens": 0}}

    groups: dict[tuple, list[dict]] = defaultdict(list)
    for r in rows:
        groups[(r.get("provider", "?"), r.get("model", "?"), r.get("operation", "?"))].append(r)

    models = []
    for (provider, model, operation), grp in groups.items():
        lats = [r["latency_ms"] for r in grp if r.get("latency_ms") is not None]
        ok = sum(1 for r in grp if r.get("success"))
        models.append({
            "provider": provider,
            "model": model,
            "operation": operation,
            "calls": len(grp),
            "success_rate": round(ok / len(grp), 4),
            "avg_latency_ms": round(mean(lats)) if lats else None,
            "prompt_tokens": sum(int(r.get("prompt_tokens") or 0) for r in grp),
            "completion_tokens": sum(int(r.get("completion_tokens") or 0) for r in grp),
            "cost_usd": round(sum(float(r.get("cost_usd") or 0.0) for r in grp), 6),
        })

    models.sort(key=lambda m: m["calls"], reverse=True)
    totals = {
        "calls": sum(m["calls"] for m in models),
        "cost_usd": round(sum(m["cost_usd"] for m in models), 6),
        "tokens": sum(m["prompt_tokens"] + m["completion_tokens"] for m in models),
    }
    return {"models": models, "totals": totals}
