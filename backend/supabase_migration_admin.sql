-- ============================================================
-- StoryLens — Admin Module Migration
-- Run AFTER supabase_migration.sql in the Supabase SQL Editor.
-- Idempotent: safe to re-run.
-- ============================================================

-- ─── 1. admin_audit_log ──────────────────────────────────────
-- Records every privileged action performed by an admin so we
-- can investigate "who did what, to whom, when".
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id      UUID        REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    actor_email   TEXT,
    action        TEXT        NOT NULL,        -- e.g. "user.update_role", "user.delete", "settings.update"
    target_type   TEXT,                        -- "user" | "page" | "qa" | "setting" | ...
    target_id     TEXT,                        -- free-form id of the affected resource
    summary       TEXT,                        -- short human summary in Vietnamese
    metadata      JSONB       NOT NULL DEFAULT '{}'::JSONB,
    ip_address    TEXT,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor      ON public.admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action     ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target     ON public.admin_audit_log(target_type, target_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS, anon/users cannot read this table directly.

-- ─── 2. app_settings (singleton key/value store) ─────────────
-- Holds runtime-mutable feature flags & limits. The service role
-- updates this table from the admin UI; the application reads it
-- on demand (no caching beyond a short TTL recommended).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
    key          TEXT        PRIMARY KEY,
    value        JSONB       NOT NULL,
    description  TEXT,
    updated_by   UUID        REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.touch_app_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_settings_set_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_set_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_app_settings_updated_at();

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Seed default settings (insert only — never overwrite a value an admin already changed).
INSERT INTO public.app_settings (key, value, description) VALUES
    ('registration_enabled',  'true'::JSONB,           'Cho phép người dùng mới đăng ký tài khoản.'),
    ('maintenance_mode',      'false'::JSONB,          'Khi bật, toàn bộ API trừ /auth/me sẽ trả về 503.'),
    ('max_upload_size_mb',    '20'::JSONB,             'Kích thước tối đa cho mỗi file upload (MB).'),
    ('default_target_lang',   '"VIN"'::JSONB,          'Ngôn ngữ dịch mặc định khi user chưa chọn.'),
    ('qa_daily_limit',        '0'::JSONB,              'Số câu hỏi Q&A tối đa mỗi user / ngày. 0 = không giới hạn.'),
    ('upload_daily_limit',    '0'::JSONB,              'Số trang upload tối đa mỗi user / ngày. 0 = không giới hạn.')
ON CONFLICT (key) DO NOTHING;

-- ─── 3. Helpful indexes for analytics ────────────────────────
-- These speed up the time-series queries used by /admin/analytics.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_manga_pages_uploaded_at  ON public.manga_pages(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_history_asked_at      ON public.qa_history(asked_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at      ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at    ON public.profiles(last_seen_at DESC);

-- ─── 4. Analytics RPC: daily activity time series ────────────
-- Returns one row per day for the last `days` days, counting
-- new users, uploaded pages and Q&A questions.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_daily_activity(days INT DEFAULT 30)
RETURNS TABLE (
    day            DATE,
    new_users      BIGINT,
    pages_uploaded BIGINT,
    qa_asked       BIGINT
)
LANGUAGE sql
STABLE
AS $$
    WITH series AS (
        SELECT generate_series(
            (CURRENT_DATE - (days - 1) * INTERVAL '1 day')::DATE,
            CURRENT_DATE,
            INTERVAL '1 day'
        )::DATE AS day
    )
    SELECT
        s.day,
        COALESCE(u.cnt, 0)  AS new_users,
        COALESCE(p.cnt, 0)  AS pages_uploaded,
        COALESCE(q.cnt, 0)  AS qa_asked
    FROM series s
    LEFT JOIN (
        SELECT created_at::DATE AS day, COUNT(*) AS cnt
        FROM public.profiles
        WHERE created_at >= CURRENT_DATE - (days - 1) * INTERVAL '1 day'
        GROUP BY 1
    ) u ON u.day = s.day
    LEFT JOIN (
        SELECT uploaded_at::DATE AS day, COUNT(*) AS cnt
        FROM public.manga_pages
        WHERE uploaded_at >= CURRENT_DATE - (days - 1) * INTERVAL '1 day'
        GROUP BY 1
    ) p ON p.day = s.day
    LEFT JOIN (
        SELECT asked_at::DATE AS day, COUNT(*) AS cnt
        FROM public.qa_history
        WHERE asked_at >= CURRENT_DATE - (days - 1) * INTERVAL '1 day'
        GROUP BY 1
    ) q ON q.day = s.day
    ORDER BY s.day;
$$;

-- ─── 5. Analytics RPC: top users by activity ─────────────────
-- Returns the most active users joined with their profile info.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_top_users(metric TEXT DEFAULT 'pages', max_rows INT DEFAULT 10)
RETURNS TABLE (
    user_id     UUID,
    username    TEXT,
    pages_count BIGINT,
    qa_count    BIGINT
)
LANGUAGE sql
STABLE
AS $$
    WITH page_stats AS (
        SELECT user_id, COUNT(*) AS cnt
        FROM public.manga_pages
        WHERE user_id IS NOT NULL
        GROUP BY user_id
    ),
    qa_stats AS (
        SELECT user_id, COUNT(*) AS cnt
        FROM public.qa_history
        WHERE user_id IS NOT NULL
        GROUP BY user_id
    )
    SELECT
        pr.user_id,
        pr.username,
        COALESCE(ps.cnt, 0) AS pages_count,
        COALESCE(qs.cnt, 0) AS qa_count
    FROM public.profiles pr
    LEFT JOIN page_stats ps ON ps.user_id = pr.user_id
    LEFT JOIN qa_stats   qs ON qs.user_id = pr.user_id
    WHERE COALESCE(ps.cnt, 0) + COALESCE(qs.cnt, 0) > 0
    ORDER BY CASE
        WHEN metric = 'qa'    THEN COALESCE(qs.cnt, 0)
        WHEN metric = 'total' THEN COALESCE(ps.cnt, 0) + COALESCE(qs.cnt, 0)
        ELSE                       COALESCE(ps.cnt, 0)
    END DESC
    LIMIT max_rows;
$$;

-- ─── 6. Analytics RPC: breakdown of pages by status ──────────
CREATE OR REPLACE FUNCTION public.admin_status_breakdown()
RETURNS TABLE (status TEXT, cnt BIGINT)
LANGUAGE sql
STABLE
AS $$
    SELECT status, COUNT(*)::BIGINT
    FROM public.manga_pages
    GROUP BY status
    ORDER BY COUNT(*) DESC;
$$;

-- ─── 7. Analytics RPC: target_lang breakdown ─────────────────
CREATE OR REPLACE FUNCTION public.admin_target_lang_breakdown()
RETURNS TABLE (target_lang TEXT, cnt BIGINT)
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(preferred_target_lang, 'VIN') AS target_lang, COUNT(*)::BIGINT
    FROM public.profiles
    GROUP BY 1
    ORDER BY 2 DESC;
$$;
