-- ─── StoryLens: MLOps Model Monitoring Schema ──────────────────────────────
-- Run AFTER supabase_migration_v7_rag.sql
--
-- Creates:
--   model_metrics       — per-page AI quality metrics logged by ai_pipeline
--   (app_settings reused for A/B config — no new table needed)

-- ─── model_metrics ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_metrics (
    id               BIGSERIAL PRIMARY KEY,
    page_id          UUID        NOT NULL REFERENCES manga_pages(page_id) ON DELETE CASCADE,
    bubble_count     INT         NOT NULL DEFAULT 0,
    avg_ocr_confidence FLOAT    NOT NULL DEFAULT 0.0,
    translated_count INT         NOT NULL DEFAULT 0,
    translation_success SMALLINT NOT NULL DEFAULT 1,  -- 1=success, 0=failure
    latency_ms       INT         NOT NULL DEFAULT 0,
    translator       TEXT        NOT NULL DEFAULT 'gemini',
    recorded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for time-series queries (dashboard chart)
CREATE INDEX IF NOT EXISTS idx_model_metrics_recorded_at
    ON model_metrics (recorded_at DESC);

-- Index for per-page lookups
CREATE INDEX IF NOT EXISTS idx_model_metrics_page_id
    ON model_metrics (page_id);

-- ─── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE model_metrics ENABLE ROW LEVEL SECURITY;

-- Only service role (backend) can write metrics
CREATE POLICY "service_role_full_access_model_metrics"
    ON model_metrics
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Admins can read (admin portal uses service_role key so this is also covered)
CREATE POLICY "anon_no_access_model_metrics"
    ON model_metrics
    FOR SELECT
    TO anon
    USING (false);

-- ─── A/B config in app_settings ─────────────────────────────────────────────
-- Insert default A/B config row if it doesn't already exist
INSERT INTO app_settings (key, value, description)
VALUES (
    'ab_test_variant',
    'off',
    'A/B test variant for AI model selection. Values: off | experiment_50'
)
ON CONFLICT (key) DO NOTHING;

-- ─── Drift thresholds (optional — stored for reference / future use) ─────────
INSERT INTO app_settings (key, value, description)
VALUES (
    'drift_threshold_ocr_confidence',
    '0.55',
    'Alert when avg OCR confidence drops below this value (0-1 scale)'
),
(
    'drift_threshold_detection_rate',
    '0.50',
    'Alert when bubble detection rate drops below this fraction'
),
(
    'drift_threshold_success_rate',
    '0.80',
    'Alert when translation success rate drops below this fraction'
)
ON CONFLICT (key) DO NOTHING;
