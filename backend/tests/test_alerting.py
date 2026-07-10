"""Unit tests for the alerting sink.

These tests deliberately avoid respx: they monkeypatch ``httpx.Client`` in the
alerting module directly, so they never touch the network and don't depend on
respx's transport interception (which was environment-sensitive in CI). The
webhook URL is injected by patching the ``get_settings`` the module resolves,
rather than mutating the cached pydantic Settings singleton in place.
"""
from __future__ import annotations

from types import SimpleNamespace

import httpx
import pytest

from app.services import alerting

HOOK = "https://hooks.example.com/services/XXX"


@pytest.fixture(autouse=True)
def _reset():
    alerting.reset_dedupe()
    yield
    alerting.reset_dedupe()


def _set_hook(monkeypatch, url: str):
    monkeypatch.setattr(
        alerting, "get_settings", lambda: SimpleNamespace(ALERT_WEBHOOK_URL=url)
    )


class _FakeClient:
    """Stand-in for httpx.Client that records posts instead of hitting the net."""

    calls: list[dict] = []
    status: int = 200

    def __init__(self, *a, **k):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def post(self, url, json=None, **k):
        _FakeClient.calls.append({"url": url, "json": json})
        return httpx.Response(_FakeClient.status, request=httpx.Request("POST", url))


@pytest.fixture
def fake_httpx(monkeypatch):
    _FakeClient.calls = []
    _FakeClient.status = 200
    monkeypatch.setattr(alerting.httpx, "Client", _FakeClient)
    return _FakeClient


def test_no_webhook_configured_returns_false(monkeypatch):
    _set_hook(monkeypatch, "")
    assert alerting.send_alert("Title", "msg", severity="warning") is False


def test_posts_webhook_when_configured(monkeypatch, fake_httpx):
    _set_hook(monkeypatch, HOOK)
    ok = alerting.send_alert("Drift", "OCR dropped", severity="critical", meta={"metric": "ocr"})
    assert ok is True
    assert len(fake_httpx.calls) == 1
    assert fake_httpx.calls[0]["url"] == HOOK
    text = fake_httpx.calls[0]["json"]["text"]
    assert "Drift" in text and "OCR dropped" in text


def test_dedupes_within_window(monkeypatch, fake_httpx):
    _set_hook(monkeypatch, HOOK)
    assert alerting.send_alert("Drift", "x", dedupe_key="k1") is True
    # Same key again → suppressed, not posted.
    assert alerting.send_alert("Drift", "x again", dedupe_key="k1") is False
    assert len(fake_httpx.calls) == 1


def test_webhook_failure_never_raises(monkeypatch, fake_httpx):
    _set_hook(monkeypatch, HOOK)

    def boom(*a, **k):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(_FakeClient, "post", boom)
    assert alerting.send_alert("Drift", "x", dedupe_key="k2") is False
