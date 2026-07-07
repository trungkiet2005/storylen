"""Unit tests for the RAG Q&A service.

These verify the Python-side contract of `answer_question` without any network:
- the owner filter + similarity threshold are forwarded to the SQL RPC,
- vector hits are enriched into rich, clickable citations,
- honest fallback when there are no hits / embedding is unavailable,
- the page-scoped fallback refuses pages the user does not own (IDOR closed).

The actual threshold/owner *filtering* lives in SQL (match_embeddings) and is an
integration concern; here we assert the parameters the backend passes in.
"""
import os
from types import SimpleNamespace

# App config requires these; use throwaway values (setdefault won't override CI/real env).
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")

from app.services import embedding, rag  # noqa: E402


# ─── Fake Supabase (chainable, filter-agnostic) ───────────────────────────────

class _FakeQuery:
    def __init__(self, data):
        self._data = data

    def select(self, *a, **k):
        return self

    def eq(self, *a, **k):
        return self

    def in_(self, *a, **k):
        return self

    def limit(self, *a, **k):
        return self

    def range(self, *a, **k):
        return self

    def execute(self):
        return SimpleNamespace(data=self._data)


class FakeSupabase:
    def __init__(self, *, table_data=None, rpc_data=None, rpc_error=False):
        self.table_data = table_data or {}
        self.rpc_data = rpc_data if rpc_data is not None else []
        self.rpc_error = rpc_error
        self.rpc_calls = []

    def table(self, name):
        return _FakeQuery(self.table_data.get(name, []))

    def rpc(self, name, params):
        self.rpc_calls.append((name, params))
        if self.rpc_error:
            raise RuntimeError("simulated pgvector/RPC failure")
        return _FakeQuery(self.rpc_data)


def _raise(_):
    raise RuntimeError("embedding unavailable")


# ─── embedding._normalize (Matryoshka truncate + L2) ──────────────────────────

def test_normalize_truncates_and_l2_normalizes():
    out = embedding._normalize([3.0, 4.0, 99.0], 2)  # truncate to [3,4] → /5
    assert len(out) == 2
    assert abs(out[0] - 0.6) < 1e-9
    assert abs(out[1] - 0.8) < 1e-9
    assert abs(sum(x * x for x in out) - 1.0) < 1e-9  # unit norm


def test_normalize_zero_vector_stays_zero():
    assert embedding._normalize([0.0, 0.0], 2) == [0.0, 0.0]


# ─── answer_question ──────────────────────────────────────────────────────────

def test_forwards_owner_and_threshold_to_rpc(monkeypatch):
    fake = FakeSupabase(rpc_data=[])  # no hits
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    monkeypatch.setattr(rag, "embed_query", lambda q: [0.1, 0.2, 0.3])
    monkeypatch.setattr(rag, "_generate_answer", lambda q, c: "SHOULD-NOT-RUN")

    resp = rag.answer_question("Nhân vật chính là ai?", user_id="user-123")

    assert fake.rpc_calls, "match_embeddings must be called"
    name, params = fake.rpc_calls[0]
    assert name == "match_embeddings"
    assert params["filter_user_id"] == "user-123"
    assert params["min_similarity"] == rag.settings.RAG_MIN_SIMILARITY
    assert params["match_count"] == rag.settings.RAG_TOP_K
    assert params["query_embedding"] == [0.1, 0.2, 0.3]
    # no hits + no page → honest no-context answer, no citations
    assert resp.answer == rag._NO_CONTEXT_ANSWER
    assert resp.sources == []


def test_enriches_vector_hits_into_citations(monkeypatch):
    chunks = [
        {"id": "e1", "page_id": "p1", "bubble_id": "b1", "content": "Xin chào", "similarity": 0.91},
        {"id": "e2", "page_id": "p1", "bubble_id": "b2", "content": "Tạm biệt", "similarity": 0.72},
    ]
    fake = FakeSupabase(
        rpc_data=chunks,
        table_data={
            "bubble_data": [
                {"bubble_id": "b1", "original_text_jp": "こんにちは"},
                {"bubble_id": "b2", "original_text_jp": "さようなら"},
            ],
            "manga_pages": [{"page_id": "p1", "page_number": 3}],
        },
    )
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    monkeypatch.setattr(rag, "embed_query", lambda q: [0.1])
    captured = {}

    def _fake_gen(q, c):
        captured["ctx"] = c
        return "ANSWER"

    monkeypatch.setattr(rag, "_generate_answer", _fake_gen)

    resp = rag.answer_question("hỏi", user_id="u1", series_id="s1")

    assert resp.answer == "ANSWER"
    assert len(resp.sources) == 2
    s0 = resp.sources[0]
    assert s0.page_id == "p1"
    assert s0.bubble_id == "b1"
    assert s0.original == "こんにちは"
    assert s0.translated == "Xin chào"
    assert s0.page_number == 3
    assert s0.reader_url == "/reader?page=p1"
    assert abs((s0.similarity or 0) - 0.91) < 1e-9
    # series scope forwarded to the RPC
    _, params = fake.rpc_calls[0]
    assert params["filter_series_id"] == "s1"
    # the answer context was built from the translated chunks
    assert "Xin chào" in captured["ctx"]
    # backward-compat source_chunks still populated
    assert resp.source_chunks and "p1" in resp.source_chunks[0]


def test_embed_failure_without_page_returns_honest_error(monkeypatch):
    fake = FakeSupabase()
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    monkeypatch.setattr(rag, "embed_query", _raise)
    monkeypatch.setattr(rag, "_generate_answer", lambda q, c: "SHOULD-NOT-RUN")

    resp = rag.answer_question("hỏi", user_id="u1")

    assert "embedding" in resp.answer.lower()
    assert resp.sources == []
    assert fake.rpc_calls == []  # vector search never reached


def test_embed_failure_with_owned_page_falls_back_extractively(monkeypatch):
    fake = FakeSupabase(
        table_data={
            "manga_pages": [{"page_id": "p1", "page_number": 5}],  # owned
            "bubble_data": [
                {
                    "bubble_id": "b1", "x": 0, "y": 0, "original_text_jp": "こんにちは",
                    "translation_history": [
                        {"translated_text_vi": "Xin chào", "translated_at": "2026-01-01"}
                    ],
                },
            ],
        },
    )
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    monkeypatch.setattr(rag, "embed_query", _raise)
    monkeypatch.setattr(rag, "_generate_answer", lambda q, c: "FALLBACK-ANSWER")

    resp = rag.answer_question("hỏi", user_id="u1", page_id="p1")

    assert resp.answer == "FALLBACK-ANSWER"
    assert len(resp.sources) == 1
    assert resp.sources[0].translated == "Xin chào"
    assert resp.sources[0].similarity is None  # extractive, not a vector match
    assert resp.sources[0].page_number == 5


def test_page_fallback_denied_for_non_owner(monkeypatch):
    """IDOR: a page not owned by the caller must leak nothing."""
    fake = FakeSupabase(
        table_data={
            "manga_pages": [],  # ownership check fails
            "bubble_data": [
                {
                    "bubble_id": "b1", "x": 0, "y": 0, "original_text_jp": "秘密",
                    "translation_history": [
                        {"translated_text_vi": "BÍ MẬT của người khác", "translated_at": "2026-01-01"}
                    ],
                },
            ],
        },
    )
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    monkeypatch.setattr(rag, "embed_query", _raise)
    monkeypatch.setattr(rag, "_generate_answer", lambda q, c: "SHOULD-NOT-APPEAR " + c)

    resp = rag.answer_question("hỏi", user_id="attacker", page_id="p-victim")

    assert "BÍ MẬT" not in resp.answer
    assert "SHOULD-NOT-APPEAR" not in resp.answer
    assert resp.sources == []


def test_rpc_error_is_distinguished_from_empty(monkeypatch):
    """A broken RPC (mis-deploy) must NOT masquerade as an empty library."""
    fake = FakeSupabase(rpc_error=True)
    monkeypatch.setattr(rag, "get_supabase", lambda: fake)
    monkeypatch.setattr(rag, "embed_query", lambda q: [0.1])
    monkeypatch.setattr(rag, "_generate_answer", lambda q, c: "SHOULD-NOT-RUN")

    resp = rag.answer_question("hỏi", user_id="u1")

    assert fake.rpc_calls, "RPC must have been attempted"
    assert resp.answer != rag._NO_CONTEXT_ANSWER  # distinct from 'nothing found'
    assert "sự cố" in resp.answer.lower()
    assert resp.sources == []
