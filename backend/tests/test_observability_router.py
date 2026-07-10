"""Integration tests: /metrics, /health/deep VLM+TTS probes, admin ai-calls,
drift→alert wiring. Everything external is monkeypatched."""
from __future__ import annotations

import app.database as database
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers.auth import AuthUser, get_current_admin
from app.services import ai_telemetry, alerting
from app.services import model_monitor as mm_service
from tests.conftest import FakeSupabase

ADMIN = AuthUser(id="admin1", username="admin", email="a@a.com", role="admin")


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


# ─── /metrics ────────────────────────────────────────────────────────────────

def test_metrics_endpoint_serves_exposition(client):
    from app.config import get_settings
    monkey = get_settings()
    orig = monkey.METRICS_ENABLED
    monkey.METRICS_ENABLED = True
    try:
        resp = client.get("/metrics")
        assert resp.status_code == 200
        assert "text/plain" in resp.headers["content-type"]
    finally:
        monkey.METRICS_ENABLED = orig


def test_metrics_endpoint_404_when_disabled(client):
    from app.config import get_settings
    monkey = get_settings()
    orig = monkey.METRICS_ENABLED
    monkey.METRICS_ENABLED = False
    try:
        assert client.get("/metrics").status_code == 404
    finally:
        monkey.METRICS_ENABLED = orig


# ─── /health/deep VLM + TTS probes ───────────────────────────────────────────

def test_health_deep_includes_vlm_and_tts(client, monkeypatch):
    monkeypatch.setattr(database, "get_supabase", lambda: FakeSupabase({"manga_pages": [{"page_id": "p"}]}))
    from app.services import vlm_client
    from app.services.tts import registry as tts_registry
    monkeypatch.setattr(
        vlm_client, "health_check",
        lambda: {"reachable": True, "model": "qwen2.5vl:7b", "model_available": True},
    )
    monkeypatch.setattr(tts_registry, "available_engines", lambda: ["edge", "pyttsx3"])

    resp = client.get("/health/deep")
    body = resp.json()
    assert "vlm" in body["checks"]
    assert body["checks"]["vlm"]["status"] == "ok"
    assert "tts" in body["checks"]
    assert body["checks"]["tts"]["engines"] == ["edge", "pyttsx3"]


def test_health_deep_vlm_down_is_degraded_not_unhealthy(client, monkeypatch):
    monkeypatch.setattr(database, "get_supabase", lambda: FakeSupabase({"manga_pages": [{"page_id": "p"}]}))
    from app.services import vlm_client
    from app.services.tts import registry as tts_registry
    monkeypatch.setattr(
        vlm_client, "health_check",
        lambda: {"reachable": False, "model": "qwen2.5vl:7b", "model_available": False, "error": "conn refused"},
    )
    monkeypatch.setattr(tts_registry, "available_engines", lambda: [])

    resp = client.get("/health/deep")
    # A down VLM/TTS is optional → overall degraded (200), never unhealthy (503).
    assert resp.status_code == 200
    assert resp.json()["checks"]["vlm"]["status"] == "degraded"


# ─── admin /model-monitor/ai-calls ───────────────────────────────────────────

def test_ai_calls_endpoint(client, monkeypatch):
    app.dependency_overrides[get_current_admin] = lambda: ADMIN
    monkeypatch.setattr(
        ai_telemetry, "get_ai_call_summary",
        lambda days=7: {
            "models": [{
                "provider": "ollama", "model": "qwen2.5vl:7b", "operation": "vlm.describe",
                "calls": 3, "success_rate": 1.0, "avg_latency_ms": 9000,
                "prompt_tokens": 3000, "completion_tokens": 600, "cost_usd": 0.0,
            }],
            "totals": {"calls": 3, "cost_usd": 0.0, "tokens": 3600},
        },
    )
    try:
        resp = client.get("/v1/admin/model-monitor/ai-calls?days=7")
        assert resp.status_code == 200
        body = resp.json()
        assert body["totals"]["calls"] == 3
        assert body["models"][0]["model"] == "qwen2.5vl:7b"
    finally:
        app.dependency_overrides.clear()


# ─── drift → alert wiring ────────────────────────────────────────────────────

def test_drift_endpoint_fires_alert_on_critical(client, monkeypatch):
    app.dependency_overrides[get_current_admin] = lambda: ADMIN
    monkeypatch.setattr(database, "get_supabase", lambda: FakeSupabase({"model_metrics": []}))
    monkeypatch.setattr(
        mm_service, "_compute_drift_status",
        lambda rows: {"status": "critical", "details": [
            {"metric": "avg_ocr_confidence", "recent": 0.4, "baseline": 0.7, "status": "critical"},
        ]},
    )
    sent = []
    monkeypatch.setattr(alerting, "send_alert", lambda *a, **k: sent.append((a, k)) or True)
    try:
        resp = client.get("/v1/admin/model-monitor/drift")
        assert resp.status_code == 200
        assert resp.json()["drift_status"] == "critical"
        assert len(sent) == 1
        assert sent[0][1].get("severity") == "critical"
    finally:
        app.dependency_overrides.clear()


def test_drift_endpoint_no_alert_when_ok(client, monkeypatch):
    app.dependency_overrides[get_current_admin] = lambda: ADMIN
    monkeypatch.setattr(database, "get_supabase", lambda: FakeSupabase({"model_metrics": []}))
    monkeypatch.setattr(mm_service, "_compute_drift_status", lambda rows: {"status": "ok", "details": []})
    sent = []
    monkeypatch.setattr(alerting, "send_alert", lambda *a, **k: sent.append(1))
    try:
        resp = client.get("/v1/admin/model-monitor/drift")
        assert resp.status_code == 200
        assert sent == []
    finally:
        app.dependency_overrides.clear()
