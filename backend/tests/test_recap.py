"""Unit tests for chapter-recap generation/caching in `services/rag`.

Mirrors the FakeSupabase style used in `test_rag.py`: filter-agnostic fakes
where the test seeds exactly the rows relevant to that test.
"""
import os
from types import SimpleNamespace

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")

from app.services import rag  # noqa: E402


class _FakeQuery:
    def __init__(self, data, on_update=None):
        self._data = data
        self._on_update = on_update
        self._single = False

    def select(self, *a, **k):
        return self

    def eq(self, *a, **k):
        return self

    def in_(self, *a, **k):
        return self

    def order(self, *a, **k):
        return self

    def maybe_single(self):
        self._single = True
        return self

    def update(self, values):
        if self._on_update:
            self._on_update(values)
        return self

    def execute(self):
        if self._single:
            return SimpleNamespace(data=self._data[0] if self._data else None)
        return SimpleNamespace(data=self._data)


class FakeSupabase:
    def __init__(self, *, chapters=None, pages=None, bubbles=None):
        self.chapters = chapters or []
        self.pages = pages or []
        self.bubbles = bubbles or []
        self.updates: list[tuple[str, dict]] = []

    def table(self, name):
        if name == "manga_chapters":
            return _FakeQuery(
                self.chapters,
                on_update=lambda v: self.updates.append(("manga_chapters", v)),
            )
        if name == "manga_pages":
            return _FakeQuery(self.pages)
        if name == "bubble_data":
            return _FakeQuery(self.bubbles)
        return _FakeQuery([])


def test_cache_hit_returns_cached_text_without_generating(monkeypatch):
    fake = FakeSupabase(chapters=[{"chapter_id": "c1", "recap_vi": "Đã có sẵn"}])
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    monkeypatch.setattr(
        rag, "_generate_recap_text", lambda ctx: (_ for _ in ()).throw(AssertionError("must not regenerate"))
    )

    assert rag.get_or_generate_chapter_recap("c1") == "Đã có sẵn"
    assert fake.updates == []


def test_cache_hit_empty_string_means_nothing_to_show(monkeypatch):
    fake = FakeSupabase(chapters=[{"chapter_id": "c1", "recap_vi": ""}])
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)

    assert rag.get_or_generate_chapter_recap("c1") is None
    assert fake.updates == []


def test_incomplete_chapter_returns_none_and_does_not_cache(monkeypatch):
    fake = FakeSupabase(
        chapters=[{"chapter_id": "c1", "recap_vi": None}],
        pages=[
            {"page_id": "p1", "status": "completed"},
            {"page_id": "p2", "status": "translating"},
        ],
    )
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)

    assert rag.get_or_generate_chapter_recap("c1") is None
    assert fake.updates == []


def test_generates_and_caches_when_all_pages_completed(monkeypatch):
    fake = FakeSupabase(
        chapters=[{"chapter_id": "c1", "recap_vi": None}],
        pages=[{"page_id": "p1", "status": "completed"}],
        bubbles=[
            {
                "page_id": "p1", "x": 0, "y": 0,
                "translation_history": [{"translated_text_vi": "Xin chào", "translated_at": "2026-01-01"}],
            },
        ],
    )
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    captured = {}

    def _fake_generate(context):
        captured["context"] = context
        return "Chương trước: nhân vật chào nhau."

    monkeypatch.setattr(rag, "_generate_recap_text", _fake_generate)

    result = rag.get_or_generate_chapter_recap("c1")

    assert result == "Chương trước: nhân vật chào nhau."
    assert "Xin chào" in captured["context"]
    assert fake.updates == [("manga_chapters", {"recap_vi": "Chương trước: nhân vật chào nhau."})]


def test_no_translated_content_caches_empty_and_returns_none(monkeypatch):
    fake = FakeSupabase(
        chapters=[{"chapter_id": "c1", "recap_vi": None}],
        pages=[{"page_id": "p1", "status": "completed"}],
        bubbles=[],  # nothing translated
    )
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    monkeypatch.setattr(
        rag, "_generate_recap_text", lambda ctx: (_ for _ in ()).throw(AssertionError("must not call Gemini"))
    )

    assert rag.get_or_generate_chapter_recap("c1") is None
    assert fake.updates == [("manga_chapters", {"recap_vi": ""})]


def test_generation_failure_does_not_cache(monkeypatch):
    fake = FakeSupabase(
        chapters=[{"chapter_id": "c1", "recap_vi": None}],
        pages=[{"page_id": "p1", "status": "completed"}],
        bubbles=[
            {
                "page_id": "p1", "x": 0, "y": 0,
                "translation_history": [{"translated_text_vi": "Xin chào", "translated_at": "2026-01-01"}],
            },
        ],
    )
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    monkeypatch.setattr(rag, "_generate_recap_text", lambda ctx: None)  # Gemini failed

    assert rag.get_or_generate_chapter_recap("c1") is None
    assert fake.updates == []  # transient failure — must be retryable, so no cache write
