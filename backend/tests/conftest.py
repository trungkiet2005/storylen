"""Shared pytest fixtures for the narration test suite.

Sets safe dummy env vars *before* app import so `get_settings()` succeeds even
without a local .env (CI already exports these, this just makes local runs and
partial checkouts robust), and provides a lightweight fake Supabase client so we
never touch a real database.
"""
from __future__ import annotations

import os
from types import SimpleNamespace

import pytest

# ─── Env must exist before any `app.*` import triggers get_settings() ─────────
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-key")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("GEMINI_API_KEY", "test-key")


# ─── Fake Supabase ────────────────────────────────────────────────────────────

class _FakeQuery:
    """Chainable no-op query that ignores filters and returns preset rows.

    Filters (eq/in_/order/limit) are accepted but not applied — tests seed
    exactly the rows a given table should yield, which keeps the fake tiny while
    still exercising the calling code's shape."""

    def __init__(self, rows):
        self._rows = list(rows)
        self._single = False

    def select(self, *a, **k):
        return self

    def eq(self, *a, **k):
        return self

    def in_(self, *a, **k):
        return self

    def order(self, *a, **k):
        return self

    def limit(self, *a, **k):
        return self

    def maybe_single(self):
        self._single = True
        return self

    def execute(self):
        if self._single:
            return SimpleNamespace(data=(self._rows[0] if self._rows else None))
        return SimpleNamespace(data=self._rows)


class FakeSupabase:
    """Minimal Supabase double. Construct with a {table_name: [rows]} mapping."""

    def __init__(self, tables: dict[str, list[dict]] | None = None):
        self._tables = tables or {}

    def table(self, name: str) -> _FakeQuery:
        return _FakeQuery(self._tables.get(name, []))


@pytest.fixture
def fake_supabase():
    def _make(tables=None):
        return FakeSupabase(tables)

    return _make
