"""Unit tests for AI-call telemetry + Prometheus metrics."""
from __future__ import annotations

import pytest

from app.services import ai_telemetry, metrics
from tests.conftest import FakeSupabase

try:
    from prometheus_client import REGISTRY
    _HAS_PROM = True
except Exception:
    _HAS_PROM = False


# ─── Cost estimation ─────────────────────────────────────────────────────────

def test_estimate_cost_gemini_flash():
    # 1M input + 1M output at (0.30, 2.50) → 2.80
    assert ai_telemetry.estimate_cost("gemini-2.5-flash", 1_000_000, 1_000_000) == pytest.approx(2.80)


def test_estimate_cost_prefix_match():
    # A preview suffix should still match the base price.
    cost = ai_telemetry.estimate_cost("gemini-2.5-flash-preview-0827", 1_000_000, 0)
    assert cost == pytest.approx(0.30)


def test_estimate_cost_self_hosted_is_zero():
    assert ai_telemetry.estimate_cost("qwen2.5vl:7b", 5000, 5000) == 0.0
    assert ai_telemetry.estimate_cost("totally-unknown-model", 5000, 5000) == 0.0


def test_estimate_tts_cost_free_engines():
    assert ai_telemetry.estimate_tts_cost("edge", 10_000) == 0.0
    assert ai_telemetry.estimate_tts_cost("pyttsx3", 10_000) == 0.0


# ─── record_ai_call → Prometheus ─────────────────────────────────────────────

@pytest.mark.skipif(not _HAS_PROM, reason="prometheus_client not installed")
def test_record_ai_call_increments_counter(monkeypatch):
    # Persistence is irrelevant here — stub the DB so record_ai_call is pure.
    monkeypatch.setattr(ai_telemetry, "get_supabase", lambda: FakeSupabase({}))
    labels = {"provider": "ollama", "model": "unit-test-model-a", "operation": "vlm.describe", "status": "ok"}

    before = REGISTRY.get_sample_value("storylens_ai_calls_total", labels) or 0.0
    ai_telemetry.record_ai_call(
        provider="ollama", model="unit-test-model-a", operation="vlm.describe",
        latency_ms=1234, prompt_tokens=100, completion_tokens=50, success=True,
    )
    after = REGISTRY.get_sample_value("storylens_ai_calls_total", labels) or 0.0
    assert after - before == 1.0

    tok = REGISTRY.get_sample_value(
        "storylens_ai_tokens_total",
        {"provider": "ollama", "model": "unit-test-model-a", "kind": "prompt"},
    )
    assert tok == 100.0


def test_record_ai_call_never_raises_on_db_failure(monkeypatch):
    class Boom:
        def table(self, *_a, **_k):
            raise RuntimeError("db down")

    monkeypatch.setattr(ai_telemetry, "get_supabase", lambda: Boom())
    # Should swallow the DB error entirely.
    ai_telemetry.record_ai_call(
        provider="tts", model="edge", operation="tts.synthesize", latency_ms=10, success=True,
    )


# ─── track() context manager ─────────────────────────────────────────────────

def test_track_records_success(monkeypatch):
    recorded = {}
    monkeypatch.setattr(ai_telemetry, "record_ai_call", lambda **kw: recorded.update(kw))
    with ai_telemetry.track("ollama", "m", "op") as tel:
        tel.prompt_tokens = 7
        tel.completion_tokens = 3
    assert recorded["success"] is True
    assert recorded["prompt_tokens"] == 7
    assert recorded["completion_tokens"] == 3
    assert recorded["latency_ms"] >= 0


def test_track_records_error_and_reraises(monkeypatch):
    recorded = {}
    monkeypatch.setattr(ai_telemetry, "record_ai_call", lambda **kw: recorded.update(kw))
    with pytest.raises(ValueError):
        with ai_telemetry.track("ollama", "m", "op"):
            raise ValueError("boom")
    assert recorded["success"] is False


# ─── get_ai_call_summary aggregation ─────────────────────────────────────────

def _rows():
    return {
        "ai_call_metrics": [
            {"provider": "ollama", "model": "qwen2.5vl:7b", "operation": "vlm.describe",
             "latency_ms": 10000, "prompt_tokens": 1000, "completion_tokens": 200, "cost_usd": 0.0, "success": True},
            {"provider": "ollama", "model": "qwen2.5vl:7b", "operation": "vlm.describe",
             "latency_ms": 8000, "prompt_tokens": 900, "completion_tokens": 250, "cost_usd": 0.0, "success": False},
            {"provider": "gemini", "model": "gemini-2.5-flash", "operation": "qa.answer",
             "latency_ms": 1200, "prompt_tokens": 500, "completion_tokens": 120, "cost_usd": 0.00045, "success": True},
        ]
    }


def test_get_ai_call_summary_groups_and_totals(monkeypatch):
    monkeypatch.setattr(ai_telemetry, "get_supabase", lambda: FakeSupabase(_rows()))
    out = ai_telemetry.get_ai_call_summary(days=7)
    models = {m["model"]: m for m in out["models"]}

    vlm = models["qwen2.5vl:7b"]
    assert vlm["calls"] == 2
    assert vlm["success_rate"] == 0.5
    assert vlm["avg_latency_ms"] == 9000
    assert vlm["prompt_tokens"] == 1900

    assert out["totals"]["calls"] == 3
    assert out["totals"]["tokens"] == 1000 + 200 + 900 + 250 + 500 + 120
    assert out["totals"]["cost_usd"] == pytest.approx(0.00045)


def test_get_ai_call_summary_empty(monkeypatch):
    monkeypatch.setattr(ai_telemetry, "get_supabase", lambda: FakeSupabase({"ai_call_metrics": []}))
    out = ai_telemetry.get_ai_call_summary()
    assert out["models"] == []
    assert out["totals"]["calls"] == 0


# ─── metrics.render / set_drift ──────────────────────────────────────────────

def test_metrics_render_returns_exposition():
    payload, content_type = metrics.render()
    assert isinstance(payload, bytes)
    assert "text/plain" in content_type


@pytest.mark.skipif(not _HAS_PROM, reason="prometheus_client not installed")
def test_set_drift_publishes_gauge():
    metrics.set_drift("unit_test_metric", "critical")
    val = REGISTRY.get_sample_value("storylens_model_drift_status", {"metric": "unit_test_metric"})
    assert val == 2.0
