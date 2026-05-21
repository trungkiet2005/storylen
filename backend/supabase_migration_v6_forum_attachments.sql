-- StoryLens v6 — Forum attachments (images + videos)
-- Adds:
--   1) attachments JSONB column on forum_threads + forum_replies
--      Format: [{ "type": "image"|"video", "url": str, "mime": str,
--                 "size": int, "width": int|null, "height": int|null,
--                 "thumbnail_url": str|null }, ...]
--      Max 10 entries enforced at app layer (backend validator).
--   2) Public storage bucket `forum-attachments` for user-uploaded media.
--      Public read so <img>/<video> tags work without signed URLs.
--      Writes go through the backend service role only.
--
-- Apply after v5_forum.

-- ─── 1. JSONB columns ────────────────────────────────────────────────────────
ALTER TABLE public.forum_threads
    ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.forum_replies
    ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- App layer enforces structure + max 10. DB just validates it's a JSON array.
ALTER TABLE public.forum_threads
    DROP CONSTRAINT IF EXISTS forum_threads_attachments_is_array;
ALTER TABLE public.forum_threads
    ADD CONSTRAINT forum_threads_attachments_is_array
    CHECK (jsonb_typeof(attachments) = 'array' AND jsonb_array_length(attachments) <= 10);

ALTER TABLE public.forum_replies
    DROP CONSTRAINT IF EXISTS forum_replies_attachments_is_array;
ALTER TABLE public.forum_replies
    ADD CONSTRAINT forum_replies_attachments_is_array
    CHECK (jsonb_typeof(attachments) = 'array' AND jsonb_array_length(attachments) <= 10);

-- ─── 2. Storage bucket: forum-attachments ────────────────────────────────────
-- Public read so the frontend can render media with plain <img>/<video> tags.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'forum-attachments',
    'forum-attachments',
    true,
    52428800,  -- 50 MB ceiling; per-type limits are enforced in the backend.
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: anonymous read for the bucket, service role-only writes.
-- (Backend uploads with SUPABASE_SERVICE_ROLE_KEY, so no per-user policy needed.)
DROP POLICY IF EXISTS "forum_attachments_public_read" ON storage.objects;
CREATE POLICY "forum_attachments_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'forum-attachments');

DROP POLICY IF EXISTS "forum_attachments_service_role_all" ON storage.objects;
CREATE POLICY "forum_attachments_service_role_all"
    ON storage.objects FOR ALL TO service_role
    USING (bucket_id = 'forum-attachments')
    WITH CHECK (bucket_id = 'forum-attachments');
