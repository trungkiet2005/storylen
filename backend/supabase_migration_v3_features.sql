-- StoryLens — v3 features migration
-- Adds:
--   1. manga_chapters.published_at — public-library visibility flag
-- Idempotent (IF NOT EXISTS).

ALTER TABLE manga_chapters
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_manga_chapters_published_at
    ON manga_chapters (published_at DESC)
    WHERE published_at IS NOT NULL;

-- Notes
-- ────────────────────────────────────────────────────────────────────────────
-- The "cancelled" page status is a new ProcessingStatus enum value but the
-- backend stores statuses as TEXT, so no schema change is required for that.
-- Browsers will see "cancelled" alongside "completed", "failed", etc.
