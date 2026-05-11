-- ============================================================
-- StoryLens — Supabase Database Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable pgvector extension for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ────────────────────────────────────────────────────────────────────
-- Supabase already provides auth.users; we create a public profile table
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Manga Series ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.manga_series (
    series_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    title       TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Manga Chapters ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.manga_chapters (
    chapter_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_id       UUID REFERENCES public.manga_series(series_id) ON DELETE CASCADE,
    chapter_number  INT NOT NULL,
    title           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Manga Pages ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.manga_pages (
    page_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id          UUID REFERENCES public.manga_chapters(chapter_id) ON DELETE SET NULL,
    batch_id            UUID,                              -- groups pages from same upload
    page_number         INT,
    original_image_url  TEXT NOT NULL,
    thumbnail_url       TEXT,
    status              TEXT NOT NULL DEFAULT 'pending',   -- see ProcessingStatus enum
    progress            INT NOT NULL DEFAULT 0,            -- 0-100 percentage
    error               TEXT,
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_manga_pages_batch ON public.manga_pages(batch_id);
CREATE INDEX IF NOT EXISTS idx_manga_pages_status ON public.manga_pages(status);

-- ─── Page Metadata ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.page_metadata (
    page_id                   UUID PRIMARY KEY REFERENCES public.manga_pages(page_id) ON DELETE CASCADE,
    ocr_model_version         TEXT,
    translation_model_version TEXT,
    ocr_confidence_avg        FLOAT,
    translation_bleu_score    FLOAT
);

-- ─── Bubble Data ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bubble_data (
    bubble_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id         UUID NOT NULL REFERENCES public.manga_pages(page_id) ON DELETE CASCADE,
    x               INT NOT NULL,
    y               INT NOT NULL,
    width           INT NOT NULL,
    height          INT NOT NULL,
    original_text_jp TEXT,
    ocr_confidence  FLOAT
);

CREATE INDEX IF NOT EXISTS idx_bubble_data_page ON public.bubble_data(page_id);

-- ─── Translation History ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.translation_history (
    translation_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bubble_id        UUID NOT NULL REFERENCES public.bubble_data(bubble_id) ON DELETE CASCADE,
    translated_text_vi TEXT,
    translated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    llm_model_used   TEXT
);

CREATE INDEX IF NOT EXISTS idx_translation_bubble ON public.translation_history(bubble_id);

-- ─── Q&A History ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.qa_history (
    qa_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id       UUID REFERENCES public.manga_pages(page_id) ON DELETE SET NULL,
    user_question TEXT NOT NULL,
    ai_answer     TEXT,
    asked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qa_history_page ON public.qa_history(page_id);

-- ─── Embeddings (pgvector) ────────────────────────────────────────────────────
-- Stores vector embeddings for RAG.
-- all-MiniLM-L6-v2 produces 384-dimensional vectors.
CREATE TABLE IF NOT EXISTS public.embeddings (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id     UUID REFERENCES public.manga_pages(page_id) ON DELETE CASCADE,
    bubble_id   UUID REFERENCES public.bubble_data(bubble_id) ON DELETE CASCADE,
    content     TEXT NOT NULL,      -- the translated text chunk
    embedding   vector(384) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_embeddings_page ON public.embeddings(page_id);

-- IVFFlat index for fast ANN search (build after inserting data)
-- CREATE INDEX ON public.embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── RAG: match_embeddings RPC ────────────────────────────────────────────────
-- Called from the RAG service via supabase.rpc("match_embeddings", {...})
CREATE OR REPLACE FUNCTION match_embeddings(
    query_embedding   vector(384),
    match_count       INT DEFAULT 5,
    filter_page_id    UUID DEFAULT NULL,
    filter_series_id  UUID DEFAULT NULL
)
RETURNS TABLE (
    id       UUID,
    page_id  UUID,
    content  TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.page_id,
        e.content,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM public.embeddings e
    WHERE
        (filter_page_id   IS NULL OR e.page_id = filter_page_id)
        AND (filter_series_id IS NULL OR e.page_id IN (
            SELECT mp.page_id FROM public.manga_pages mp
            JOIN public.manga_chapters mc ON mp.chapter_id = mc.chapter_id
            WHERE mc.series_id = filter_series_id
        ))
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ─── Row-Level Security (RLS) ─────────────────────────────────────────────────
-- For MVP: service-role key bypasses RLS.
-- Enable RLS on sensitive tables and add policies when adding user auth.
ALTER TABLE public.manga_pages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bubble_data    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_history     ENABLE ROW LEVEL SECURITY;

-- Allow service-role full access (backend uses service_role key)
-- Public read access for pages (anyone can read processed pages for MVP):
CREATE POLICY "Allow service role full access on manga_pages"
    ON public.manga_pages FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role full access on bubble_data"
    ON public.bubble_data FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role full access on embeddings"
    ON public.embeddings FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role full access on qa_history"
    ON public.qa_history FOR ALL
    USING (true)
    WITH CHECK (true);
