-- v8: Chapter recap cache
-- Caches an auto-generated Vietnamese summary of a chapter, shown to readers
-- when they open the NEXT chapter ("Trước đó trong truyện...").
--
-- NULL  = recap not yet attempted for this chapter.
-- ''    = attempted, but there was nothing to summarize (e.g. no translated
--         text yet) — permanent, do not retry automatically.
-- other = cached Vietnamese recap text.
ALTER TABLE manga_chapters ADD COLUMN IF NOT EXISTS recap_vi text;
