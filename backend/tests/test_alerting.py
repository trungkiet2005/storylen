"""Unit tests for the alerting sink."""
from __future__ import annotations

import httpx
import pytest
import respx

from app.services import alerting

HOOK = "https://hooks.example.com/services/XXX"


@pytest.fixture(autouse=True)
def _reset():
    alerting.reset_dedupe()
    yield
    alerting.reset_dedupe()


def _set_hook(monkeypatch, url: str):
    monkeypatch.setattr(alerting.get_settings(), "ALERT_WEBHOOK_URL", url, raising=False)


def test_no_webhook_configured_returns_false(monkeypatch):
    _set_hook(monkeypatch, "")
    assert alerting.send_alert("Title", "msg", severity="warning") is False


@respx.mock
def test_posts_webhook_when_configured(monkeypatch):
    _set_hook(monkeypatch, HOOK)
    route = respx.post(HOOK).mock(return_value=httpx.Response(200))
    ok = alerting.send_alert("Drift", "OCR dropped", severity="critical", meta={"metric": "ocr"})
    assert ok is True
    assert route.called
    sent = route.calls.last.request.content.decode()
    assert "Drift" in sent and "OCR dropped" in sent


@respx.mock
def test_dedupes_within_window(monkeypatch):
    _set_hook(monkeypatch, HOOK)
    route = respx.post(HOOK).mock(return_value=httpx.Response(200))
    assert alerting.send_alert("Drift", "x", dedupe_key="k1") is True
    # Same key again → suppressed, not posted.
    assert alerting.send_alert("Drift", "x again", dedupe_key="k1") is False
    assert route.call_count == 1


@respx.mock
def test_webhook_failure_never_raises(monkeypatch):
    _set_hook(monkeypatch, HOOK)
    respx.post(HOOK).mock(side_effect=httpx.ConnectError("down"))
    assert alerting.send_alert("Drift", "x", dedupe_key="k2") is False
