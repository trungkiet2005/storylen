-- ============================================================
-- StoryLens — Manga Series Feature Migration
-- Run AFTER supabase_migration.sql in: Supabase Dashboard → SQL Editor
-- Idempotent: safe to re-run.
-- ============================================================

-- ─── Extend manga_series ─────────────────────────────────────────────────────
ALTER TABLE public.manga_series
    ADD COLUMN IF NOT EXISTS cover_image_url   TEXT,
    ADD COLUMN IF NOT EXISTS status            TEXT NOT NULL DEFAULT 'ongoing'
        CHECK (status IN ('ongoing', 'completed', 'paused')),
    ADD COLUMN IF NOT EXISTS tags              TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS source_language   TEXT,
    ADD COLUMN IF NOT EXISTS target_language   TEXT;

CREATE INDEX IF NOT EXISTS idx_manga_series_user_updated
    ON public.manga_series(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_manga_series_tags
    ON public.manga_series USING GIN (tags);

-- Auto-bump updated_at on every UPDATE
CREATE OR REPLACE FUNCTION public.touch_series_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS manga_series_set_updated_at ON public.manga_series;
CREATE TRIGGER manga_series_set_updated_at
    BEFORE UPDATE ON public.manga_series
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_series_updated_at();

-- ─── Extend manga_chapters ───────────────────────────────────────────────────
ALTER TABLE public.manga_chapters
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- One chapter_number per series (no duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS uq_chapter_number_per_series
    ON public.manga_chapters(series_id, chapter_number);

CREATE INDEX IF NOT EXISTS idx_manga_chapters_series_number
    ON public.manga_chapters(series_id, chapter_number);

DROP TRIGGER IF EXISTS manga_chapters_set_updated_at ON public.manga_chapters;
CREATE TRIGGER manga_chapters_set_updated_at
    BEFORE UPDATE ON public.manga_chapters
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_series_updated_at();

-- ─── manga_pages ordering index ──────────────────────────────────────────────
-- page_number in manga_pages = order within chapter (when chapter_id IS NOT NULL).
-- When chapter_id IS NULL → page is an orphan (only belongs to its batch upload).
CREATE INDEX IF NOT EXISTS idx_manga_pages_chapter_order
    ON public.manga_pages(chapter_id, page_number)
    WHERE chapter_id IS NOT NULL;

-- ─── Series covers bucket ────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('series-covers', 'series-covers', TRUE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "series_covers_public_read" ON storage.objects;
CREATE POLICY "series_covers_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'series-covers');

-- ─── Row-Level Security ──────────────────────────────────────────────────────
-- Backend uses service_role key (bypasses RLS); these policies govern
-- direct Supabase client / anon-key access (parity with manga_pages).
ALTER TABLE public.manga_series   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manga_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manga_series_owner"   ON public.manga_series;
DROP POLICY IF EXISTS "manga_chapters_owner" ON public.manga_chapters;

CREATE POLICY "manga_series_owner"
    ON public.manga_series FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "manga_chapters_owner"
    ON public.manga_chapters FOR ALL
    USING  (series_id IN (SELECT series_id FROM public.manga_series WHERE user_id = auth.uid()))
    WITH CHECK (series_id IN (SELECT series_id FROM public.manga_series WHERE user_id = auth.uid()));
