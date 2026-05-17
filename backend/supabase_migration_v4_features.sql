-- StoryLens v4 feature additions
-- Adds:
--   1) translation_feedback         — user thumbs-up/down on per-page translations
--   2) profiles.last_checkin_at     — daily check-in for earn-credits (Tier B #12)
--
-- Apply after v3.

-- ─── 1. Translation feedback (Tier B #10) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.translation_feedback (
    feedback_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL,
    page_id       UUID NOT NULL REFERENCES public.manga_pages(page_id) ON DELETE CASCADE,
    vote          TEXT NOT NULL CHECK (vote IN ('up', 'down')),
    comment       TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- One vote per user per page; re-voting upserts.
    UNIQUE (user_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_translation_feedback_page ON public.translation_feedback(page_id);
CREATE INDEX IF NOT EXISTS idx_translation_feedback_user ON public.translation_feedback(user_id);

ALTER TABLE public.translation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role full access on translation_feedback"
    ON public.translation_feedback;
CREATE POLICY "Allow service role full access on translation_feedback"
    ON public.translation_feedback FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "translation_feedback_owner" ON public.translation_feedback;
CREATE POLICY "translation_feedback_owner"
    ON public.translation_feedback FOR ALL
    USING  (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ─── 2. Profile: daily check-in marker (Tier B #12) ──────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS last_checkin_at TIMESTAMPTZ;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS checkin_streak INT NOT NULL DEFAULT 0;

-- ─── 3. Chapter comments (Tier C) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chapter_comments (
    comment_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id    UUID NOT NULL REFERENCES public.manga_chapters(chapter_id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    body          TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chapter_comments_chapter
    ON public.chapter_comments(chapter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapter_comments_user
    ON public.chapter_comments(user_id);

ALTER TABLE public.chapter_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role full access on chapter_comments"
    ON public.chapter_comments;
CREATE POLICY "Allow service role full access on chapter_comments"
    ON public.chapter_comments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "chapter_comments_read_public" ON public.chapter_comments;
CREATE POLICY "chapter_comments_read_public"
    ON public.chapter_comments FOR SELECT
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "chapter_comments_owner_write" ON public.chapter_comments;
CREATE POLICY "chapter_comments_owner_write"
    ON public.chapter_comments FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "chapter_comments_owner_delete" ON public.chapter_comments;
CREATE POLICY "chapter_comments_owner_delete"
    ON public.chapter_comments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
