-- StoryLens — v2 feature migration
-- Run via: `psql $SUPABASE_DB_URL -f supabase_migration_v2_features.sql`
-- Or paste into Supabase SQL Editor. Idempotent (uses IF NOT EXISTS).
--
-- Adds:
--   1. notifications              — in-app notification bell
--   2. share_links                — public share URLs for translated pages
--   3. profiles.stripe_customer_id — Stripe customer linkage
--   4. RPC apply_plan_upgrade()   — granted by Stripe webhook
--   5. (Optional) full-text index on bubble_data.translated_text

-- ─── 1. notifications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL DEFAULT 'info',
    title      TEXT NOT NULL,
    body       TEXT,
    url        TEXT,
    read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id) WHERE read = FALSE;

-- ─── 2. share_links ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS share_links (
    share_id    TEXT PRIMARY KEY,
    page_id     UUID NOT NULL REFERENCES manga_pages(page_id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_links_page ON share_links (page_id);

-- ─── 3. profiles.stripe_customer_id ──────────────────────────────────────────
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_profiles_stripe_customer
    ON profiles (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ─── 4. apply_plan_upgrade(user, plan, credits) RPC ──────────────────────────
-- Idempotent helper used by the Stripe webhook. Sets plan_tier and tops up
-- credits_balance. Credit pool reset behaviour intentionally simple — daily
-- reset still runs as before via existing cron / on-demand check.
CREATE OR REPLACE FUNCTION apply_plan_upgrade(
    p_user_id UUID,
    p_plan_id TEXT,
    p_credits INTEGER
) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE profiles
       SET plan_tier = p_plan_id,
           credits_balance = COALESCE(credits_balance, 0) + COALESCE(p_credits, 0),
           updated_at = now()
     WHERE user_id = p_user_id;

    INSERT INTO credit_transactions (id, user_id, amount, type, note, created_at)
    VALUES (gen_random_uuid(), p_user_id, COALESCE(p_credits, 0), 'plan_upgrade',
            'Plan upgrade to ' || p_plan_id, now())
    ON CONFLICT DO NOTHING;
END;
$$;

-- ─── 5. Full-text-ish index on bubble_data.translated_text (optional) ────────
-- ILIKE '%foo%' cannot use a btree index. Use a trigram index so it can.
-- Denormalised column populated by the AI pipeline so the search router can
-- ILIKE without joining translation_history on every query.
ALTER TABLE bubble_data
    ADD COLUMN IF NOT EXISTS translated_text TEXT;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_bubble_translated_trgm
    ON bubble_data USING gin (translated_text gin_trgm_ops);

-- ─── Notes ───────────────────────────────────────────────────────────────────
-- After running this, populate the following env vars on the backend:
--   STRIPE_SECRET_KEY=
--   STRIPE_WEBHOOK_SECRET=
--   STRIPE_PRICE_BASIC=  (Stripe price IDs for each plan tier)
--   STRIPE_PRICE_PRO=
--   STRIPE_PRICE_PREMIUM=
--   PASSWORD_RESET_REDIRECT_URL=https://your-frontend/reset-password
--   FRONTEND_BASE_URL=https://your-frontend
