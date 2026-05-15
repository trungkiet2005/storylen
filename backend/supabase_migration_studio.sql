-- ─── Studio editor — bubble review workflow ─────────────────────────────────
-- Adds a per-bubble QC status so translators can approve/reject AI output.
-- Idempotent; safe to re-run.

ALTER TABLE public.bubble_data
    ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending';

-- Constrain to known values. Drop existing constraint first to allow re-running
-- with different states later.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'bubble_data_review_status_check'
    ) THEN
        ALTER TABLE public.bubble_data DROP CONSTRAINT bubble_data_review_status_check;
    END IF;
END $$;

ALTER TABLE public.bubble_data
    ADD CONSTRAINT bubble_data_review_status_check
    CHECK (review_status IN ('pending', 'approved', 'rejected'));

-- Optional reviewer audit trail. Nullable so legacy / AI-pending rows are fine.
ALTER TABLE public.bubble_data
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bubble_data_review_status
    ON public.bubble_data(page_id, review_status);
