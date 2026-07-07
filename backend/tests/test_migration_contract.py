"""Static-integration guard for the RAG SQL ↔ code contract.

The unit tests mock the RPC, so a rename/dim drift between the migration and the
callers would pass unit tests but 500 in production. This test parses the actual
v7 migration SQL and asserts it stays consistent with `config.EMBED_DIM` and the
argument/return names the Python callers (rag.py, search.py) rely on.
"""
import os
import re
from pathlib import Path

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")

from app.config import get_settings  # noqa: E402

_SQL = (Path(__file__).resolve().parents[1] / "supabase_migration_v7_rag.sql").read_text(
    encoding="utf-8"
)

# The named params rag.py / search.py send to supabase.rpc("match_embeddings", ...).
_REQUIRED_RPC_ARGS = {
    "query_embedding",
    "match_count",
    "min_similarity",
    "filter_user_id",
    "filter_page_id",
    "filter_series_id",
}
# Columns _enrich_sources() reads from each returned row.
_REQUIRED_RETURN_COLUMNS = {"id", "page_id", "bubble_id", "content", "similarity"}


def test_embedding_column_dim_matches_config():
    m = re.search(r"embedding\s+vector\((\d+)\)", _SQL)
    assert m, "v7 migration must declare the embedding column as vector(N)"
    assert int(m.group(1)) == get_settings().EMBED_DIM


def test_rpc_query_vector_dim_matches_config():
    m = re.search(r"query_embedding\s+vector\((\d+)\)", _SQL)
    assert m, "match_embeddings must take query_embedding vector(N)"
    assert int(m.group(1)) == get_settings().EMBED_DIM


def test_rpc_declares_every_arg_the_code_sends():
    missing = {arg for arg in _REQUIRED_RPC_ARGS if arg not in _SQL}
    assert not missing, f"match_embeddings SQL is missing args the code passes: {missing}"


def test_rpc_returns_columns_the_enricher_reads():
    # Grab the RETURNS TABLE (...) block and check each needed column name appears.
    block = re.search(r"RETURNS\s+TABLE\s*\((.*?)\)", _SQL, re.S | re.I)
    assert block, "match_embeddings must RETURN TABLE(...)"
    body = block.group(1)
    missing = {c for c in _REQUIRED_RETURN_COLUMNS if not re.search(rf"\b{c}\b", body)}
    assert not missing, f"match_embeddings RETURN columns missing: {missing}"


def test_bubble_id_unique_constraint_present():
    # Upsert on_conflict="bubble_id" (pipeline + backfill) needs this.
    assert "UNIQUE (bubble_id)" in _SQL or "UNIQUE(bubble_id)" in _SQL
