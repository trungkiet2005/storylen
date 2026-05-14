-- ============================================================
-- StoryLens — Credits & Subscription Migration
-- Safe to re-run (idempotent).
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. Subscription Plans (static lookup table) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id              TEXT        PRIMARY KEY,           -- 'free', 'basic', 'pro', 'premium'
    name            TEXT        NOT NULL,
    price_vnd       INTEGER     NOT NULL DEFAULT 0,
    monthly_credits INTEGER     NOT NULL,              -- total credits granted per month
    daily_credits   INTEGER     NOT NULL DEFAULT 0,   -- free daily top-up (free plan only)
    max_batch_size  INTEGER     NOT NULL DEFAULT 5,   -- max images per upload batch
    priority_weight INTEGER     NOT NULL DEFAULT 1,   -- processing priority (higher = faster)
    bonus_credits   INTEGER     NOT NULL DEFAULT 0,   -- first-subscription bonus
    sort_order      INTEGER     NOT NULL DEFAULT 0
);

INSERT INTO public.subscription_plans
    (id, name, price_vnd, monthly_credits, daily_credits, max_batch_size, priority_weight, bonus_credits, sort_order)
VALUES
    ('free',    'FREE',    0,       150,  5,  5,   1, 0,   0),
    ('basic',   'BASIC',   49000,   300,  0,  20,  2, 50,  1),
    ('pro',     'PRO',     99000,   1000, 0,  50,  3, 100, 2),
    ('premium', 'PREMIUM', 249000,  3000, 0,  100, 4, 300, 3)
ON CONFLICT (id) DO UPDATE SET
    name            = EXCLUDED.name,
    price_vnd       = EXCLUDED.price_vnd,
    monthly_credits = EXCLUDED.monthly_credits,
    daily_credits   = EXCLUDED.daily_credits,
    max_batch_size  = EXCLUDED.max_batch_size,
    priority_weight = EXCLUDED.priority_weight,
    bonus_credits   = EXCLUDED.bonus_credits,
    sort_order      = EXCLUDED.sort_order;

-- ─── 2. Credit columns on profiles ───────────────────────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS plan_tier               TEXT        NOT NULL DEFAULT 'free'
        CHECK (plan_tier IN ('free', 'basic', 'pro', 'premium')),
    ADD COLUMN IF NOT EXISTS credits_balance         INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS daily_credits_reset_at  DATE        NOT NULL DEFAULT CURRENT_DATE;

-- Seed existing users with 5 free daily credits
UPDATE public.profiles
SET credits_balance = 5
WHERE credits_balance = 0 AND plan_tier = 'free';

-- ─── 3. User Subscriptions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    user_id             UUID        PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    plan_id             TEXT        NOT NULL REFERENCES public.subscription_plans(id),
    status              TEXT        NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled', 'expired')),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,                   -- NULL for free plan
    bonus_credits_given BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.touch_user_subscriptions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_subscriptions_set_updated_at ON public.user_subscriptions;
CREATE TRIGGER user_subscriptions_set_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.touch_user_subscriptions_updated_at();

-- Seed existing users with free plan subscription
INSERT INTO public.user_subscriptions (user_id, plan_id, status)
SELECT user_id, 'free', 'active'
FROM public.profiles
WHERE user_id NOT IN (SELECT user_id FROM public.user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- ─── 4. Credit Transactions (append-only ledger) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID        NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    amount       INTEGER     NOT NULL,     -- positive = credit added, negative = deducted
    type         TEXT        NOT NULL,     -- 'daily_reset','upload','qa','bonus','admin_grant','purchase','subscription'
    reference_id UUID,                     -- page_id for upload, qa_id for qa
    note         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_txn_user    ON public.credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_txn_type    ON public.credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_txn_created ON public.credit_transactions(created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- ─── 5. RLS for new tables ────────────────────────────────────────────────────
ALTER TABLE public.user_subscriptions  ENABLE ROW LEVEL SECURITY;

-- subscription_plans is a public read-only lookup
ALTER TABLE public.subscription_plans  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_public_read" ON public.subscription_plans;
CREATE POLICY "plans_public_read"
    ON public.subscription_plans FOR SELECT
    USING (true);

-- ─── 6. Trigger: auto-create free subscription for new registrations ──────────
CREATE OR REPLACE FUNCTION public.init_user_credits()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Create free subscription record
    INSERT INTO public.user_subscriptions (user_id, plan_id, status)
    VALUES (NEW.user_id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;

    -- Seed 5 daily credits if starting from 0
    IF NEW.credits_balance = 0 THEN
        UPDATE public.profiles
        SET credits_balance = 5
        WHERE user_id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS init_user_credits_on_profile ON public.profiles;
CREATE TRIGGER init_user_credits_on_profile
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.init_user_credits();

-- ─── 7. Indexes on profiles for credit queries ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_plan_tier ON public.profiles(plan_tier);
