"""Backfill RAG embeddings for already-translated bubbles.

The translation pipeline only started writing `embeddings` rows from the
"Q&A with citations" change onward. Pages translated before that have
`bubble_data` + `translation_history` but no vector chunks, so Q&A can't find
them. This script embeds their latest Vietnamese translation with the same
Gemini model the live pipeline uses and inserts the missing rows.

Idempotent: bubbles that already have an embedding are skipped.

Run from `backend/`:
    python -m app.scripts.backfill_embeddings              # everything missing
    python -m app.scripts.backfill_embeddings --limit 500  # cap work
    python -m app.scripts.backfill_embeddings --dry-run    # count only, no writes
"""
from __future__ import annotations

import argparse
import logging

from app.database import get_supabase
from app.services.embedding import embed_documents

logger = logging.getLogger("backfill_embeddings")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)

_INSERT_BATCH = 100


def _latest_translation(history: list[dict]) -> str:
    if not history:
        return ""
    try:
        history = sorted(
            history, key=lambda h: h.get("translated_at") or "", reverse=True
        )
    except Exception:
        pass
    return str(history[0].get("translated_text_vi") or "").strip()


def _already_embedded(supabase) -> set[str]:
    """bubble_ids that already have an embedding row (so we don't duplicate)."""
    done: set[str] = set()
    start = 0
    page = 1000
    while True:
        res = (
            supabase.table("embeddings")
            .select("bubble_id")
            .range(start, start + page - 1)
            .execute()
        )
        rows = res.data or []
        for r in rows:
            if isinstance(r, dict) and r.get("bubble_id"):
                done.add(str(r["bubble_id"]))
        if len(rows) < page:
            break
        start += page
    return done


def _collect_targets(supabase, limit: int | None) -> list[tuple[str, str, str]]:
    """Return (bubble_id, page_id, translated_text) for bubbles with a translation."""
    targets: list[tuple[str, str, str]] = []
    start = 0
    page = 1000
    while True:
        res = (
            supabase.table("bubble_data")
            .select("bubble_id, page_id, translation_history(translated_text_vi, translated_at)")
            .range(start, start + page - 1)
            .execute()
        )
        rows = res.data or []
        for r in rows:
            if not isinstance(r, dict):
                continue
            bubble_id = r.get("bubble_id")
            page_id = r.get("page_id")
            translated = _latest_translation(r.get("translation_history") or [])
            if bubble_id and page_id and translated:
                targets.append((str(bubble_id), str(page_id), translated))
        if len(rows) < page:
            break
        start += page
        if limit and len(targets) >= limit:
            break
    return targets[:limit] if limit else targets


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill RAG embeddings.")
    parser.add_argument("--limit", type=int, default=None, help="Max bubbles to embed.")
    parser.add_argument("--dry-run", action="store_true", help="Count only; no writes.")
    args = parser.parse_args()

    supabase = get_supabase()

    logger.info("Scanning existing embeddings…")
    done = _already_embedded(supabase)
    logger.info("Found %d bubbles already embedded.", len(done))

    logger.info("Collecting translated bubbles…")
    all_targets = _collect_targets(supabase, args.limit)
    todo = [t for t in all_targets if t[0] not in done]
    logger.info("%d translated bubbles, %d missing embeddings.", len(all_targets), len(todo))

    if args.dry_run:
        logger.info("Dry-run: would embed %d bubbles. No writes.", len(todo))
        return 0
    if not todo:
        logger.info("Nothing to backfill. Done.")
        return 0

    inserted = 0
    for i in range(0, len(todo), _INSERT_BATCH):
        batch = todo[i : i + _INSERT_BATCH]
        try:
            vectors = embed_documents([text for _, _, text in batch])
        except Exception as exc:
            logger.error("Embedding batch %d failed, stopping: %s", i // _INSERT_BATCH, exc)
            break
        if len(vectors) != len(batch):
            logger.warning(
                "Vector count mismatch (%d vs %d) in batch %d; skipping batch.",
                len(vectors), len(batch), i // _INSERT_BATCH,
            )
            continue
        rows = [
            {
                # id defaults in-DB; upsert on bubble_id so a re-run updates.
                "page_id": page_id,
                "bubble_id": bubble_id,
                "content": text,
                "embedding": vec,
            }
            for (bubble_id, page_id, text), vec in zip(batch, vectors)
        ]
        try:
            supabase.table("embeddings").upsert(rows, on_conflict="bubble_id").execute()
            inserted += len(rows)
            logger.info("Inserted %d / %d embeddings…", inserted, len(todo))
        except Exception as exc:
            logger.error("Insert failed for batch %d: %s", i // _INSERT_BATCH, exc)

    logger.info("Backfill complete: %d embeddings inserted.", inserted)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
