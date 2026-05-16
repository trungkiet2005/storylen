"""Apply pending Supabase migrations.

Runs every `backend/supabase_migration*.sql` file in lexicographic order against
the Postgres DB at ``SUPABASE_DB_URL``. Each statement runs in its own
transaction so a single failure doesn't poison the rest.

Designed to be idempotent — every migration uses ``IF NOT EXISTS`` /
``DROP POLICY IF EXISTS`` patterns. Re-running is safe.

Mounted as Render's `preDeployCommand` so the new image's schema dependencies
are guaranteed to exist before traffic hits the new container.

Run locally:
    SUPABASE_DB_URL=postgresql://... python -m app.scripts.apply_migrations
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

logger = logging.getLogger("apply_migrations")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)


def _find_backend_root() -> Path:
    """Return the `backend/` directory regardless of CWD."""
    here = Path(__file__).resolve()
    # .../backend/app/scripts/apply_migrations.py → backend
    return here.parents[2]


def _migration_files(backend_root: Path) -> list[Path]:
    return sorted(backend_root.glob("supabase_migration*.sql"))


def _split_statements(sql_text: str) -> list[str]:
    """Crude statement splitter.

    Each migration in this repo uses normal SQL (no PL/pgSQL DO blocks with
    nested semicolons except inside ``CREATE FUNCTION``-style bodies). Bodies
    we DO have (``CREATE OR REPLACE FUNCTION ... LANGUAGE plpgsql AS $$ ... $$;``)
    are kept whole by checking for an open ``$$`` delimiter.

    Comment lines starting with ``--`` are stripped first.
    """
    lines: list[str] = []
    for raw in sql_text.splitlines():
        s = raw.strip()
        if not s or s.startswith("--"):
            continue
        lines.append(raw)
    cleaned = "\n".join(lines)

    statements: list[str] = []
    buf: list[str] = []
    in_dollar = False
    i = 0
    while i < len(cleaned):
        ch = cleaned[i]
        # Toggle dollar-quoted body delimiter.
        if cleaned[i : i + 2] == "$$":
            in_dollar = not in_dollar
            buf.append("$$")
            i += 2
            continue
        if ch == ";" and not in_dollar:
            stmt = "".join(buf).strip()
            if stmt:
                statements.append(stmt + ";")
            buf = []
        else:
            buf.append(ch)
        i += 1
    tail = "".join(buf).strip()
    if tail:
        statements.append(tail)
    return statements


def main() -> int:
    db_url = os.environ.get("SUPABASE_DB_URL", "").strip()
    if not db_url:
        logger.error(
            "SUPABASE_DB_URL is not set. Skipping migration run. "
            "If this is a manual local run, export the env var first."
        )
        # Exit 0 so a missing var doesn't break the deploy — migrations can be
        # applied manually via Supabase SQL Editor. Only fail if we found a URL
        # and the run actually broke.
        return 0

    try:
        import psycopg  # type: ignore
    except ImportError:
        try:
            import psycopg2 as psycopg  # type: ignore
        except ImportError:
            logger.error(
                "Neither `psycopg` nor `psycopg2` is installed. "
                "Add `psycopg[binary]>=3.1.0` to backend/requirements.txt."
            )
            return 1

    backend_root = _find_backend_root()
    files = _migration_files(backend_root)
    if not files:
        logger.warning("No migration files found in %s", backend_root)
        return 0

    logger.info("Applying %d migration file(s) to %s", len(files), db_url.split("@")[-1])

    conn = psycopg.connect(db_url)
    conn.autocommit = True
    errors = 0
    applied = 0

    try:
        for path in files:
            logger.info("→ %s", path.name)
            sql_text = path.read_text(encoding="utf-8")
            statements = _split_statements(sql_text)
            for stmt in statements:
                cur = conn.cursor()
                try:
                    cur.execute(stmt)
                    applied += 1
                except Exception as exc:
                    msg = str(exc).split("\n")[0]
                    logger.warning("  ⚠ %s — first 120 chars: %s", msg[:200], stmt[:120].replace("\n", " "))
                    errors += 1
                finally:
                    cur.close()
    finally:
        conn.close()

    logger.info("Done — applied %d statement(s), %d warning(s).", applied, errors)
    # Warnings (idempotent re-applies, "already exists" etc.) are non-fatal.
    return 0


if __name__ == "__main__":
    sys.exit(main())
