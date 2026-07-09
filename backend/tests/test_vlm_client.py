"""Unit tests for the VLM client — retries, circuit breaker, error mapping.

The ollama endpoint is mocked with respx so no pod/network is touched.
"""
from __future__ import annotations

import httpx
import pytest
import respx

from app.services import vlm_client

VLM_URL = "http://vlm.test"
GEN = f"{VLM_URL}/api/generate"
PNG = b"\x89PNG\r\n\x1a\nfakeimage"


@pytest.fixture(autouse=True)
def _isolate(monkeypatch):
    # Pin the resolved URL (skip the app_settings/DB lookup) and reset the breaker.
    monkeypatch.setattr(vlm_client, "get_active_vlm_url", lambda: VLM_URL)
    monkeypatch.setattr(vlm_client.time, "sleep", lambda *_a, **_k: None)
    vlm_client._cb_failures = 0
    vlm_client._cb_open_until = None
    yield
    vlm_client._cb_failures = 0
    vlm_client._cb_open_until = None


@respx.mock
def test_describe_image_success():
    respx.post(GEN).mock(return_value=httpx.Response(200, json={"response": "  A hero stands.  "}))
    out = vlm_client.describe_image(PNG, "describe")
    assert out == "A hero stands."


@respx.mock
def test_describe_image_sends_base64_image_and_model():
    route = respx.post(GEN).mock(return_value=httpx.Response(200, json={"response": "ok"}))
    vlm_client.describe_image(PNG, "prompt", model="qwen3-vl:8b")
    body = route.calls.last.request.content
    import json

    payload = json.loads(body)
    assert payload["model"] == "qwen3-vl:8b"
    assert payload["images"] and isinstance(payload["images"][0], str)
    assert payload["stream"] is False


@respx.mock
def test_retries_then_succeeds():
    route = respx.post(GEN).mock(
        side_effect=[
            httpx.Response(503),
            httpx.Response(200, json={"response": "recovered"}),
        ]
    )
    out = vlm_client.describe_image(PNG, "p")
    assert out == "recovered"
    assert route.call_count == 2


@respx.mock
def test_empty_response_raises():
    respx.post(GEN).mock(return_value=httpx.Response(200, json={"response": "   "}))
    with pytest.raises(vlm_client.VLMError):
        vlm_client.describe_image(PNG, "p")


@respx.mock
def test_all_retries_fail_raises_and_counts_failure():
    respx.post(GEN).mock(return_value=httpx.Response(503))
    with pytest.raises(vlm_client.VLMError, match="after 3 attempts"):
        vlm_client.describe_image(PNG, "p")
    assert vlm_client._cb_failures == 1


@respx.mock
def test_non_retryable_status_raises_immediately():
    route = respx.post(GEN).mock(return_value=httpx.Response(400, json={"error": "bad"}))
    with pytest.raises(vlm_client.VLMError, match="HTTP 400"):
        vlm_client.describe_image(PNG, "p")
    assert route.call_count == 1  # no retry on 400


@respx.mock
def test_circuit_breaker_opens_after_threshold():
    respx.post(GEN).mock(return_value=httpx.Response(503))
    # Each call records one failure after exhausting retries; threshold is 4.
    for _ in range(vlm_client._CB_THRESHOLD):
        with pytest.raises(vlm_client.VLMError):
            vlm_client.describe_image(PNG, "p")
    # Breaker now open → fast-fail without hitting the network.
    with pytest.raises(vlm_client.VLMError, match="circuit breaker is open"):
        vlm_client.describe_image(PNG, "p")


@respx.mock
def test_health_check_reports_model_availability():
    # Advertise whatever model the settings currently default to, so this test
    # tracks the configured VLM_MODEL rather than a hardcoded name.
    model = vlm_client.settings.VLM_MODEL
    respx.get(f"{VLM_URL}/api/tags").mock(
        return_value=httpx.Response(200, json={"models": [{"name": model}]})
    )
    health = vlm_client.health_check()
    assert health["reachable"] is True
    assert health["model_available"] is True


@respx.mock
def test_health_check_never_raises_on_error():
    respx.get(f"{VLM_URL}/api/tags").mock(side_effect=httpx.ConnectError("down"))
    health = vlm_client.health_check()
    assert health["reachable"] is False
    assert "error" in health
