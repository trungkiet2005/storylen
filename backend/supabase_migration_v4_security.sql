-- StoryLens — v4 security + performance migration
--
-- Closes two production gaps:
--   1. RLS on tables that were left open by earlier migrations
--   2. Search performance — adds a trigram index on manga_chapters.title
--      so /v1/search ILIKE no longer table-scans at scale
--
-- Idempotent (uses IF NOT EXISTS / DROP IF EXISTS).
-- Safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. profiles — was exposed to anon role; only the owner should read their row
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;

-- Service role (backend with SUPABASE_SERVICE_ROLE_KEY) — full access.
CREATE POLICY "profiles_service_role_all"
    ON public.profiles
    AS PERMISSIVE
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users — read + update only their own row.
CREATE POLICY "profiles_self_select"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "profiles_self_update"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Anon role is intentionally denied — public lookups go through the backend
-- (which uses the service role) and never expose PII like email / phone.


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. notifications — was created in v2 without RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_self_read" ON public.notifications;
DROP POLICY IF EXISTS "notifications_self_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_self_delete" ON public.notifications;
DROP POLICY IF EXISTS "notifications_service_role_all" ON public.notifications;

CREATE POLICY "notifications_service_role_all"
    ON public.notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "notifications_self_read"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "notifications_self_update"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_self_delete"
    ON public.notifications
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. share_links — public-by-share_id, never enumerable
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "share_links_owner_all" ON public.share_links;
DROP POLICY IF EXISTS "share_links_service_role_all" ON public.share_links;

CREATE POLICY "share_links_service_role_all"
    ON public.share_links
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Owner can manage their share links. Anonymous users never query this table
-- directly — they hit `GET /v1/share/{share_id}` which uses the service role.
CREATE POLICY "share_links_owner_all"
    ON public.share_links
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Search performance — chapter title trigram index
-- ─────────────────────────────────────────────────────────────────────────────
-- pg_trgm was already enabled in v2_features.sql. Add a gin index so
-- `ILIKE '%foo%'` on chapter titles uses the index instead of scanning every row.

CREATE INDEX IF NOT EXISTS idx_manga_chapters_title_trgm
    ON public.manga_chapters USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_manga_series_title_trgm
    ON public.manga_series USING gin (title gin_trgm_ops);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Verification helper — run this manually to confirm RLS is correctly on
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT schemaname, tablename, rowsecurity
--   FROM pg_tables
--  WHERE schemaname = 'public'
--    AND tablename IN ('profiles', 'notifications', 'share_links')
--  ORDER BY tablename;
-- Expected: rowsecurity = TRUE for all three rows.
