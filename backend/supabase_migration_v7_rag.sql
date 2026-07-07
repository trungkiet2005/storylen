-- ============================================================
-- StoryLens — Migration v7: RAG embeddings (Gemini, 768-dim)
-- Run this in: Supabase Dashboard → SQL Editor (AFTER base migration).
-- ============================================================
--
-- WHY: the `embeddings` table was sized vector(384) for all-MiniLM but was
-- NEVER populated (the pipeline delegates to ai_module, which returns no
-- embeddings). We now embed translated text with Gemini `gemini-embedding-001`
-- at 768 dimensions, from the backend. Because the table is empty, re-sizing
-- the column loses no data.
--
-- This migration is idempotent and safe to re-run.

CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Re-dimension the embedding column to 768 (Gemini) ────────────────────────
-- Fully idempotent: only re-dimension when the column is NOT already vector(768).
-- If it needs changing AND the table holds real vectors, abort instead of
-- silently dropping them. Re-running on an already-migrated DB is a no-op, so
-- this is safe under apply_migrations (the destructive ALTER lives inside the
-- guard, not as an independent statement).
DO $$
DECLARE
    cur_type text;
BEGIN
    SELECT format_type(a.atttypid, a.atttypmod) INTO cur_type
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'embeddings'
      AND a.attname = 'embedding'
      AND a.attnum > 0 AND NOT a.attisdropped;

    IF cur_type IS DISTINCT FROM 'vector(768)' THEN
        IF EXISTS (SELECT 1 FROM public.embeddings LIMIT 1) THEN
            RAISE EXCEPTION
                'embeddings.embedding is % (need vector(768)) but table is not empty — re-embed & TRUNCATE first',
                COALESCE(cur_type, 'missing');
        END IF;
        ALTER TABLE public.embeddings DROP COLUMN IF EXISTS embedding;
        ALTER TABLE public.embeddings ADD COLUMN embedding vector(768) NOT NULL;
    END IF;
END $$;

-- One embedding per bubble so re-translating a page UPSERTs (on_conflict=bubble_id)
-- instead of appending duplicate vectors that pollute retrieval.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'embeddings_bubble_id_key'
    ) THEN
        ALTER TABLE public.embeddings
            ADD CONSTRAINT embeddings_bubble_id_key UNIQUE (bubble_id);
    END IF;
END $$;

-- ANN index for cosine search. HNSW works on an empty table and needs no tuning.
-- If your pgvector is older than 0.5.0, drop this and use the ivfflat line below.
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw
    ON public.embeddings USING hnsw (embedding vector_cosine_ops);
-- CREATE INDEX IF NOT EXISTS idx_embeddings_ivf
--     ON public.embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── Rewrite match_embeddings ─────────────────────────────────────────────────
-- Adds: min_similarity threshold, filter_user_id (owner scoping → closes IDOR),
-- and returns bubble_id so the API can build rich citations.
-- Drop BOTH the old 4-arg version and any prior 6-arg version so re-runs are clean.
DROP FUNCTION IF EXISTS match_embeddings(vector, integer, uuid, uuid);
DROP FUNCTION IF EXISTS match_embeddings(vector, integer, double precision, uuid, uuid, uuid);

CREATE FUNCTION match_embeddings(
    query_embedding   vector(768),
    match_count       INT              DEFAULT 5,
    min_similarity    DOUBLE PRECISION DEFAULT 0.0,
    filter_user_id    UUID             DEFAULT NULL,
    filter_page_id    UUID             DEFAULT NULL,
    filter_series_id  UUID             DEFAULT NULL
)
RETURNS TABLE (
    id         UUID,
    page_id    UUID,
    bubble_id  UUID,
    content    TEXT,
    similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.page_id,
        e.bubble_id,
        e.content,
        (1 - (e.embedding <=> query_embedding))::double precision AS similarity
    FROM public.embeddings e
    WHERE
        (1 - (e.embedding <=> query_embedding)) >= min_similarity
        AND (filter_page_id IS NULL OR e.page_id = filter_page_id)
        AND (filter_user_id IS NULL OR e.page_id IN (
            SELECT mp.page_id FROM public.manga_pages mp
            WHERE mp.user_id = filter_user_id
        ))
        AND (filter_series_id IS NULL OR e.page_id IN (
            SELECT mp.page_id FROM public.manga_pages mp
            JOIN public.manga_chapters mc ON mp.chapter_id = mc.chapter_id
            WHERE mc.series_id = filter_series_id
        ))
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
