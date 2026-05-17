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
