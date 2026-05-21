-- StoryLens v5 — Community Forum
-- Adds:
--   1) forum_threads   — top-level threads (5 categories, pin/lock, denormalized vote/reply counters)
--   2) forum_replies   — nested replies (max 1 level deep, enforced at app layer)
--   3) forum_votes     — up/down votes on threads and replies (composite PK)
--   + denormalization triggers (score, reply_count, last_reply_at, hot_score)
--   + RLS policies following the chapter_comments pattern (v4_features.sql)
--
-- Apply after v4_features + v4_security.

-- ─── Extensions (idempotent — usually already enabled) ───────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── 1. forum_threads ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_threads (
    thread_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    category      TEXT NOT NULL CHECK (category IN
                      ('discussion', 'qna', 'recommend', 'feedback', 'announcement')),
    title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
    body          TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
    is_pinned     BOOLEAN NOT NULL DEFAULT false,
    is_locked     BOOLEAN NOT NULL DEFAULT false,
    score         INTEGER NOT NULL DEFAULT 0,            -- denorm: SUM(forum_votes.value)
    reply_count   INTEGER NOT NULL DEFAULT 0,            -- denorm: COUNT(non-deleted replies)
    hot_score     DOUBLE PRECISION NOT NULL DEFAULT 0,   -- Reddit-style hot ranking
    last_reply_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_forum_threads_category_hot
    ON public.forum_threads (category, is_pinned DESC, hot_score DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_forum_threads_category_new
    ON public.forum_threads (category, is_pinned DESC, created_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_forum_threads_category_top
    ON public.forum_threads (category, is_pinned DESC, score DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_forum_threads_user
    ON public.forum_threads (user_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_title_trgm
    ON public.forum_threads USING gin (title gin_trgm_ops);

ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role full access on forum_threads"
    ON public.forum_threads;
CREATE POLICY "Allow service role full access on forum_threads"
    ON public.forum_threads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "forum_threads_read_public" ON public.forum_threads;
CREATE POLICY "forum_threads_read_public"
    ON public.forum_threads FOR SELECT
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "forum_threads_owner_insert" ON public.forum_threads;
CREATE POLICY "forum_threads_owner_insert"
    ON public.forum_threads FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "forum_threads_owner_update" ON public.forum_threads;
CREATE POLICY "forum_threads_owner_update"
    ON public.forum_threads FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ─── 2. forum_replies (nested 1 level, enforced at app layer) ────────────────
CREATE TABLE IF NOT EXISTS public.forum_replies (
    reply_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id       UUID NOT NULL REFERENCES public.forum_threads(thread_id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES public.forum_replies(reply_id) ON DELETE CASCADE,
    body            TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
    score           INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT forum_replies_no_self_ref CHECK (parent_reply_id IS NULL OR parent_reply_id <> reply_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_thread
    ON public.forum_replies (thread_id, parent_reply_id NULLS FIRST, created_at);
CREATE INDEX IF NOT EXISTS idx_forum_replies_user
    ON public.forum_replies (user_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_parent
    ON public.forum_replies (parent_reply_id)
    WHERE parent_reply_id IS NOT NULL;

ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role full access on forum_replies"
    ON public.forum_replies;
CREATE POLICY "Allow service role full access on forum_replies"
    ON public.forum_replies FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "forum_replies_read_public" ON public.forum_replies;
CREATE POLICY "forum_replies_read_public"
    ON public.forum_replies FOR SELECT
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "forum_replies_owner_insert" ON public.forum_replies;
CREATE POLICY "forum_replies_owner_insert"
    ON public.forum_replies FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "forum_replies_owner_update" ON public.forum_replies;
CREATE POLICY "forum_replies_owner_update"
    ON public.forum_replies FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ─── 3. forum_votes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_votes (
    user_id       UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    target_type   TEXT NOT NULL CHECK (target_type IN ('thread', 'reply')),
    target_id     UUID NOT NULL,
    value         SMALLINT NOT NULL CHECK (value IN (-1, 1)),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_votes_target
    ON public.forum_votes (target_type, target_id);

ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role full access on forum_votes"
    ON public.forum_votes;
CREATE POLICY "Allow service role full access on forum_votes"
    ON public.forum_votes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "forum_votes_owner" ON public.forum_votes;
CREATE POLICY "forum_votes_owner"
    ON public.forum_votes FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ─── 4. Hot score helper + denormalization triggers ──────────────────────────
-- Reddit-style hot ranking. Older posts decay; popular ones rise.
CREATE OR REPLACE FUNCTION public.forum_hot_score(p_score INT, p_created TIMESTAMPTZ)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    s INT := GREATEST(ABS(p_score), 1);
    sign_v INT := CASE WHEN p_score > 0 THEN 1 WHEN p_score < 0 THEN -1 ELSE 0 END;
    age_secs DOUBLE PRECISION := EXTRACT(EPOCH FROM (p_created - TIMESTAMP '2025-01-01'));
BEGIN
    RETURN ROUND( (LOG(s) * sign_v + age_secs / 45000.0)::numeric, 7 );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Recompute thread.score + hot_score whenever a vote changes.
CREATE OR REPLACE FUNCTION public.forum_apply_vote_delta()
RETURNS TRIGGER AS $$
DECLARE
    v_target_type TEXT;
    v_target_id   UUID;
    v_total       INT;
    v_created     TIMESTAMPTZ;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_target_type := OLD.target_type;
        v_target_id := OLD.target_id;
    ELSE
        v_target_type := NEW.target_type;
        v_target_id := NEW.target_id;
    END IF;

    SELECT COALESCE(SUM(value), 0) INTO v_total
    FROM public.forum_votes
    WHERE target_type = v_target_type AND target_id = v_target_id;

    IF v_target_type = 'thread' THEN
        SELECT created_at INTO v_created FROM public.forum_threads WHERE thread_id = v_target_id;
        UPDATE public.forum_threads
        SET score = v_total,
            hot_score = public.forum_hot_score(v_total, COALESCE(v_created, now()))
        WHERE thread_id = v_target_id;
    ELSE
        UPDATE public.forum_replies SET score = v_total WHERE reply_id = v_target_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forum_votes_delta ON public.forum_votes;
CREATE TRIGGER trg_forum_votes_delta
    AFTER INSERT OR UPDATE OR DELETE ON public.forum_votes
    FOR EACH ROW EXECUTE FUNCTION public.forum_apply_vote_delta();

-- Maintain forum_threads.reply_count + last_reply_at.
CREATE OR REPLACE FUNCTION public.forum_apply_reply_delta()
RETURNS TRIGGER AS $$
DECLARE
    v_thread UUID;
    v_count  INT;
    v_last   TIMESTAMPTZ;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_thread := NEW.thread_id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_thread := NEW.thread_id;
    ELSE
        v_thread := OLD.thread_id;
    END IF;

    SELECT COUNT(*), MAX(created_at)
      INTO v_count, v_last
    FROM public.forum_replies
    WHERE thread_id = v_thread AND deleted_at IS NULL;

    UPDATE public.forum_threads
    SET reply_count = COALESCE(v_count, 0),
        last_reply_at = v_last
    WHERE thread_id = v_thread;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forum_replies_delta ON public.forum_replies;
CREATE TRIGGER trg_forum_replies_delta
    AFTER INSERT OR UPDATE OR DELETE ON public.forum_replies
    FOR EACH ROW EXECUTE FUNCTION public.forum_apply_reply_delta();

-- Bump forum_threads.updated_at on row update (for cache busting).
CREATE OR REPLACE FUNCTION public.forum_threads_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forum_threads_touch ON public.forum_threads;
CREATE TRIGGER trg_forum_threads_touch
    BEFORE UPDATE ON public.forum_threads
    FOR EACH ROW EXECUTE FUNCTION public.forum_threads_touch_updated_at();
