-- ─── StoryLens: Per-call AI telemetry schema ───────────────────────────────
-- Run AFTER supabase_migration_v8_model_monitor.sql
--
-- Creates:
--   ai_call_metrics — one row per model call (Gemini / VLM / TTS): latency,
--                     token counts, estimated USD cost, success. Powers the
--                     "AI Calls" section of the admin model-monitor dashboard
--                     and the Prometheus /metrics endpoint's persistence.
--
-- Distinct from model_metrics (which is manga-pipeline / per-page quality).

CREATE TABLE IF NOT EXISTS ai_call_metrics (
    id                BIGSERIAL   PRIMARY KEY,
    provider          TEXT        NOT NULL,             -- gemini | ollama | tts
    model             TEXT        NOT NULL,             -- gemini-2.5-flash | qwen2.5vl:7b | edge ...
    operation         TEXT        NOT NULL,             -- qa.answer | vlm.describe | tts.synthesize
    latency_ms        INT         NOT NULL DEFAULT 0,
    prompt_tokens     INT         NOT NULL DEFAULT 0,
    completion_tokens INT         NOT NULL DEFAULT 0,
    cost_usd          NUMERIC(12,6) NOT NULL DEFAULT 0,
    success           BOOLEAN     NOT NULL DEFAULT TRUE,
    meta              JSONB       NOT NULL DEFAULT '{}'::jsonb,
    recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time-series queries (dashboard) + per-model grouping.
CREATE INDEX IF NOT EXISTS idx_ai_call_metrics_recorded_at
    ON ai_call_metrics (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_call_metrics_model
    ON ai_call_metrics (provider, model, operation);

-- ─── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE ai_call_metrics ENABLE ROW LEVEL SECURITY;

-- Only the service role (backend) can write / read telemetry.
CREATE POLICY "service_role_full_access_ai_call_metrics"
    ON ai_call_metrics
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "anon_no_access_ai_call_metrics"
    ON ai_call_metrics
    FOR SELECT
    TO anon
    USING (false);
