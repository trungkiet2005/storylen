"""Tests for the idempotency cache.

The cache is in-memory, so we reset the module's internal store between tests.
"""
import time

from app.services import idempotency


def _reset_store():
    """Clear the module-level dict so each test starts with a clean slate."""
    idempotency._store.clear()


def setup_function(_):
    _reset_store()


# ─── normalise_key ────────────────────────────────────────────────────────────

def test_normalise_key_returns_none_for_empty_input():
    assert idempotency.normalise_key("user-1", None, "upload") is None
    assert idempotency.normalise_key("user-1", "", "upload") is None
    assert idempotency.normalise_key("user-1", "   ", "upload") is None


def test_normalise_key_namespaces_by_user_and_endpoint():
    """Same raw key but different users / endpoints must NOT collide."""
    k1 = idempotency.normalise_key("user-A", "abc", "upload")
    k2 = idempotency.normalise_key("user-B", "abc", "upload")
    k3 = idempotency.normalise_key("user-A", "abc", "scrape")
    assert k1 != k2
    assert k1 != k3
    assert k2 != k3


def test_normalise_key_caps_length():
    huge = "x" * 1000
    out = idempotency.normalise_key("u", huge, "upload")
    assert out is not None
    # Trimmed to <= 200 chars of the raw key, plus a short prefix.
    assert len(out) < 300


# ─── get / put round-trip ─────────────────────────────────────────────────────

def test_put_then_get_returns_value():
    key = idempotency.normalise_key("user-1", "req-001", "upload")
    payload = {"batch_id": "abc", "page_ids": ["p1", "p2"]}
    idempotency.put(key, payload)
    assert idempotency.get(key) == payload


def test_get_returns_none_for_unknown_key():
    assert idempotency.get("never-stored") is None


def test_get_returns_none_for_falsy_key():
    """Belt-and-braces: callers may pass None when client omitted the header."""
    assert idempotency.get(None) is None
    assert idempotency.get("") is None


def test_put_is_noop_for_falsy_key():
    """Don't store under a None key — that would create a fake hit later."""
    idempotency.put(None, {"batch_id": "x"})
    idempotency.put("", {"batch_id": "y"})
    assert idempotency.get(None) is None


# ─── TTL expiry ───────────────────────────────────────────────────────────────

def test_entries_expire_after_ttl(monkeypatch):
    key = idempotency.normalise_key("user-1", "req-ttl", "upload")
    idempotency.put(key, "value")
    assert idempotency.get(key) == "value"

    # Fast-forward past TTL by mocking time.time.
    real_time = time.time()
    monkeypatch.setattr(idempotency.time, "time", lambda: real_time + idempotency._TTL_SECONDS + 1)
    assert idempotency.get(key) is None
