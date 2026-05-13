-- ============================================================
-- StoryLens — Patch: apply missing columns & admin tables
-- Safe to re-run (idempotent).
-- ============================================================

-- ─── 1. Profiles: production columns ─────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS full_name             TEXT,
    ADD COLUMN IF NOT EXISTS display_name          TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url            TEXT,
    ADD COLUMN IF NOT EXISTS bio                   TEXT,
    ADD COLUMN IF NOT EXISTS locale                TEXT NOT NULL DEFAULT 'vi',
    ADD COLUMN IF NOT EXISTS timezone              TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    ADD COLUMN IF NOT EXISTS date_of_birth         DATE,
    ADD COLUMN IF NOT EXISTS gender                TEXT
        CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    ADD COLUMN IF NOT EXISTS country               TEXT,
    ADD COLUMN IF NOT EXISTS phone                 TEXT,
    ADD COLUMN IF NOT EXISTS preferred_target_lang TEXT NOT NULL DEFAULT 'VIN',
    ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS last_seen_at          TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.touch_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_profile_updated_at();

-- ─── 2. admin_audit_log ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id      UUID        REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    actor_email   TEXT,
    action        TEXT        NOT NULL,
    target_type   TEXT,
    target_id     TEXT,
    summary       TEXT,
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

-- ─── 3. app_settings ─────────────────────────────────────────
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

INSERT INTO public.app_settings (key, value, description) VALUES
    ('registration_enabled',  'true'::JSONB,  'Cho phép người dùng mới đăng ký tài khoản.'),
    ('maintenance_mode',      'false'::JSONB, 'Khi bật, toàn bộ API trừ /auth/me sẽ trả về 503.'),
    ('max_upload_size_mb',    '20'::JSONB,    'Kích thước tối đa cho mỗi file upload (MB).'),
    ('default_target_lang',   '"VIN"'::JSONB, 'Ngôn ngữ dịch mặc định khi user chưa chọn.'),
    ('qa_daily_limit',        '0'::JSONB,     'Số câu hỏi Q&A tối đa mỗi user / ngày. 0 = không giới hạn.'),
    ('upload_daily_limit',    '0'::JSONB,     'Số trang upload tối đa mỗi user / ngày. 0 = không giới hạn.')
ON CONFLICT (key) DO NOTHING;

-- ─── 4. Indexes for analytics ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_manga_pages_uploaded_at ON public.manga_pages(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_history_asked_at     ON public.qa_history(asked_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at     ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at   ON public.profiles(last_seen_at DESC);

-- ─── 5. Analytics RPCs ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_daily_activity(days INT DEFAULT 30)
RETURNS TABLE (day DATE, new_users BIGINT, pages_uploaded BIGINT, qa_asked BIGINT)
LANGUAGE sql STABLE AS $$
    WITH series AS (
        SELECT generate_series(
            (CURRENT_DATE - (days - 1) * INTERVAL '1 day')::DATE,
            CURRENT_DATE, INTERVAL '1 day'
        )::DATE AS day
    )
    SELECT s.day,
           COALESCE(u.cnt, 0) AS new_users,
           COALESCE(p.cnt, 0) AS pages_uploaded,
           COALESCE(q.cnt, 0) AS qa_asked
    FROM series s
    LEFT JOIN (SELECT created_at::DATE AS day, COUNT(*) AS cnt FROM public.profiles
               WHERE created_at >= CURRENT_DATE - (days-1)*INTERVAL '1 day' GROUP BY 1) u ON u.day = s.day
    LEFT JOIN (SELECT uploaded_at::DATE AS day, COUNT(*) AS cnt FROM public.manga_pages
               WHERE uploaded_at >= CURRENT_DATE - (days-1)*INTERVAL '1 day' GROUP BY 1) p ON p.day = s.day
    LEFT JOIN (SELECT asked_at::DATE AS day, COUNT(*) AS cnt FROM public.qa_history
               WHERE asked_at >= CURRENT_DATE - (days-1)*INTERVAL '1 day' GROUP BY 1) q ON q.day = s.day
    ORDER BY s.day;
$$;

CREATE OR REPLACE FUNCTION public.admin_top_users(metric TEXT DEFAULT 'pages', max_rows INT DEFAULT 10)
RETURNS TABLE (user_id UUID, username TEXT, pages_count BIGINT, qa_count BIGINT)
LANGUAGE sql STABLE AS $$
    WITH page_stats AS (SELECT user_id, COUNT(*) AS cnt FROM public.manga_pages WHERE user_id IS NOT NULL GROUP BY user_id),
         qa_stats   AS (SELECT user_id, COUNT(*) AS cnt FROM public.qa_history   WHERE user_id IS NOT NULL GROUP BY user_id)
    SELECT pr.user_id, pr.username,
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

CREATE OR REPLACE FUNCTION public.admin_status_breakdown()
RETURNS TABLE (status TEXT, cnt BIGINT)
LANGUAGE sql STABLE AS $$
    SELECT status, COUNT(*)::BIGINT FROM public.manga_pages GROUP BY status ORDER BY COUNT(*) DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_target_lang_breakdown()
RETURNS TABLE (target_lang TEXT, cnt BIGINT)
LANGUAGE sql STABLE AS $$
    SELECT COALESCE(preferred_target_lang, 'VIN') AS target_lang, COUNT(*)::BIGINT
    FROM public.profiles GROUP BY 1 ORDER BY 2 DESC;
$$;
