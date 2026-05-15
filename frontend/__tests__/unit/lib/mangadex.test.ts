/**
 * Unit tests for MangaDex API helper functions in src/lib/api.ts
 *
 * These tests verify:
 * - URL construction helpers (mdxCoverUrl, mdxImageProxy, mdxPageUrls)
 * - Data extraction helpers (mdxMangaTitle, mdxCoverFromManga)
 * - Persistence helpers (mdxSaveReading, mdxLoadReading)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mdxCoverUrl,
  mdxImageProxy,
  mdxPageUrls,
  mdxMangaTitle,
  mdxCoverFromManga,
  mdxSaveReading,
  mdxLoadReading,
  type MdxManga,
  type MdxAtHomeServer,
} from "@/lib/api";

// ── Constants ──────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://storylens-api.onrender.com/v1";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const MANGA_FIXTURE: MdxManga = {
  id: "manga-123",
  attributes: {
    title: { vi: "Gia Đình Điệp Viên", en: "SPY×FAMILY", "ja-ro": "Spy Family" },
    description: { en: "A spy, an assassin, and a telepath form a fake family." },
    status: "ongoing",
    lastChapter: "100",
    tags: [
      { attributes: { name: { en: "Action" }, group: "genre" } },
      { attributes: { name: { en: "Comedy" }, group: "genre" } },
      { attributes: { name: { en: "Shounen" }, group: "theme" } },
    ],
  },
  relationships: [
    {
      type: "cover_art",
      attributes: { fileName: "cover.jpg" },
    },
  ],
};

const MANGA_NO_VI: MdxManga = {
  ...MANGA_FIXTURE,
  id: "manga-456",
  attributes: {
    ...MANGA_FIXTURE.attributes,
    title: { en: "English Only", "ja-ro": "Nihongo Only" },
  },
};

const MANGA_NO_COVER: MdxManga = {
  ...MANGA_FIXTURE,
  id: "manga-789",
  relationships: [{ type: "author", attributes: { name: "Author Name" } }],
};

const AT_HOME_WITH_DATASAVER: MdxAtHomeServer = {
  baseUrl: "https://cdn1.mangadex.org",
  chapter: {
    hash: "abc123",
    data: ["page1-hq.jpg", "page2-hq.jpg", "page3-hq.jpg"],
    dataSaver: ["page1-lo.jpg", "page2-lo.jpg", "page3-lo.jpg"],
  },
};

const AT_HOME_NO_DATASAVER: MdxAtHomeServer = {
  baseUrl: "https://cdn2.mangadex.org",
  chapter: {
    hash: "def456",
    data: ["001.jpg", "002.jpg"],
    dataSaver: [],
  },
};

// ── mdxCoverUrl ────────────────────────────────────────────────────────────────

describe("mdxCoverUrl", () => {
  it("constructs a proxied cover URL with .512.jpg suffix", () => {
    const result = mdxCoverUrl("manga-123", "cover.jpg");
    const raw = "https://uploads.mangadex.org/covers/manga-123/cover.jpg.512.jpg";
    const expected = `${BASE}/mdx/cover-proxy?url=${encodeURIComponent(raw)}`;
    expect(result).toBe(expected);
  });

  it("encodes special characters in the raw URL", () => {
    const result = mdxCoverUrl("manga-abc", "cover with spaces.jpg");
    expect(result).toContain(encodeURIComponent("cover with spaces.jpg"));
  });
});

// ── mdxImageProxy ──────────────────────────────────────────────────────────────

describe("mdxImageProxy", () => {
  it("wraps a raw URL in the backend proxy endpoint", () => {
    const raw = "https://cdn1.mangadex.org/data/hash123/page1.jpg";
    const result = mdxImageProxy(raw);
    expect(result).toBe(`${BASE}/mdx/cover-proxy?url=${encodeURIComponent(raw)}`);
  });

  it("encodes query params inside the raw URL", () => {
    const raw = "https://cdn.example.com/img?w=800&h=600";
    const result = mdxImageProxy(raw);
    expect(result).not.toContain("?w=800");           // raw params must be encoded
    expect(result).toContain(encodeURIComponent(raw)); // full URL encoded
  });
});

// ── mdxPageUrls ────────────────────────────────────────────────────────────────

describe("mdxPageUrls", () => {
  it("uses dataSaver files when available", () => {
    const urls = mdxPageUrls(AT_HOME_WITH_DATASAVER);
    expect(urls).toHaveLength(3);
    // Path must contain "data-saver" quality segment
    urls.forEach((url, i) => {
      const decoded = decodeURIComponent(url.split("url=")[1]);
      expect(decoded).toContain("/data-saver/");
      expect(decoded).toContain(AT_HOME_WITH_DATASAVER.chapter.dataSaver[i]);
    });
  });

  it("falls back to full-quality data when dataSaver is empty", () => {
    const urls = mdxPageUrls(AT_HOME_NO_DATASAVER);
    expect(urls).toHaveLength(2);
    urls.forEach((url, i) => {
      const decoded = decodeURIComponent(url.split("url=")[1]);
      expect(decoded).toContain("/data/");
      expect(decoded).toContain(AT_HOME_NO_DATASAVER.chapter.data[i]);
    });
  });

  it("includes baseUrl and hash in each URL", () => {
    const urls = mdxPageUrls(AT_HOME_WITH_DATASAVER);
    urls.forEach((url) => {
      const decoded = decodeURIComponent(url.split("url=")[1]);
      expect(decoded).toContain(AT_HOME_WITH_DATASAVER.baseUrl);
      expect(decoded).toContain(AT_HOME_WITH_DATASAVER.chapter.hash);
    });
  });

  it("proxies every URL through the backend cover-proxy", () => {
    const urls = mdxPageUrls(AT_HOME_WITH_DATASAVER);
    urls.forEach((url) => {
      expect(url).toContain("/mdx/cover-proxy?url=");
    });
  });
});

// ── mdxMangaTitle ──────────────────────────────────────────────────────────────

describe("mdxMangaTitle", () => {
  it("prefers Vietnamese title", () => {
    expect(mdxMangaTitle(MANGA_FIXTURE)).toBe("Gia Đình Điệp Viên");
  });

  it("falls back to English when Vietnamese is missing", () => {
    expect(mdxMangaTitle(MANGA_NO_VI)).toBe("English Only");
  });

  it("falls back to first available title when vi and en are missing", () => {
    const manga: MdxManga = {
      ...MANGA_FIXTURE,
      attributes: { ...MANGA_FIXTURE.attributes, title: { "ja-ro": "Romaji Title" } },
    };
    expect(mdxMangaTitle(manga)).toBe("Romaji Title");
  });

  it("returns 'Unknown' when title object is empty", () => {
    const manga: MdxManga = {
      ...MANGA_FIXTURE,
      attributes: { ...MANGA_FIXTURE.attributes, title: {} },
    };
    expect(mdxMangaTitle(manga)).toBe("Unknown");
  });
});

// ── mdxCoverFromManga ──────────────────────────────────────────────────────────

describe("mdxCoverFromManga", () => {
  it("returns proxied cover URL when cover_art relationship exists", () => {
    const result = mdxCoverFromManga(MANGA_FIXTURE);
    expect(result).not.toBeNull();
    expect(result).toContain("/mdx/cover-proxy?url=");
    expect(result).toContain(encodeURIComponent("manga-123"));
    expect(result).toContain(encodeURIComponent("cover.jpg"));
  });

  it("returns null when no cover_art relationship", () => {
    expect(mdxCoverFromManga(MANGA_NO_COVER)).toBeNull();
  });

  it("returns null when cover_art has no fileName", () => {
    const manga: MdxManga = {
      ...MANGA_FIXTURE,
      relationships: [{ type: "cover_art", attributes: {} }],
    };
    expect(mdxCoverFromManga(manga)).toBeNull();
  });
});

// ── mdxSaveReading / mdxLoadReading ────────────────────────────────────────────

describe("mdxSaveReading + mdxLoadReading", () => {
  const PAYLOAD = {
    mangaId: "manga-123",
    mangaTitle: "SPY×FAMILY",
    chapterId: "chapter-001",
    chapterLabel: "Chương 1",
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("round-trips reading state through localStorage", () => {
    mdxSaveReading(PAYLOAD);
    const loaded = mdxLoadReading();
    expect(loaded).not.toBeNull();
    expect(loaded!.mangaId).toBe(PAYLOAD.mangaId);
    expect(loaded!.mangaTitle).toBe(PAYLOAD.mangaTitle);
    expect(loaded!.chapterId).toBe(PAYLOAD.chapterId);
    expect(loaded!.chapterLabel).toBe(PAYLOAD.chapterLabel);
  });

  it("returns null when nothing is saved", () => {
    expect(mdxLoadReading()).toBeNull();
  });

  it("overwrites previous state on second save", () => {
    mdxSaveReading(PAYLOAD);
    mdxSaveReading({ ...PAYLOAD, chapterId: "chapter-002", chapterLabel: "Chương 2" });
    const loaded = mdxLoadReading();
    expect(loaded!.chapterId).toBe("chapter-002");
  });

  it("returns null on corrupted localStorage data", () => {
    localStorage.setItem("storylens.reading", "{ invalid json }}}");
    expect(mdxLoadReading()).toBeNull();
  });
});
