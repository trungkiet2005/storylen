"""Unit tests for the chapter scraper.

These cover the two real-world bugs we hit recently:
  - mangaread.org puts whitespace INSIDE the `src` attribute value.
  - srcset / data-srcset parsing must not IndexError on missing attrs.

We avoid network calls by feeding fixture HTML directly through the parser
helpers. Hitting the real site in CI would be flaky.
"""
from bs4 import BeautifulSoup

from app.services.scraper import (
    _imgs_to_urls,
    _extract_image_urls,
    _extract_title,
    validate_scrape_url,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

MANGAREAD_FIXTURE = """
<html>
<head><title>Read Manga Astral Pet Store - Chapter 41</title></head>
<body>
  <div class="reading-content">
    <div class="page-break">
      <img id="image-0" src="\t\t\t\n\t\t\thttps://www.mangaread.org/wp-content/uploads/WP-manga/data/abc/2.jpeg" class="wp-manga-chapter-img">
    </div>
    <div class="page-break">
      <img id="image-1" src="\t\t\t\n\t\t\thttps://www.mangaread.org/wp-content/uploads/WP-manga/data/abc/3.jpeg" class="wp-manga-chapter-img">
    </div>
  </div>
</body>
</html>
"""


LAZYLOAD_FIXTURE = """
<html>
<body>
  <div class="reading-content">
    <img src="https://cdn.example.com/placeholder.gif"
         data-src="https://cdn.example.com/page-001.jpg" />
    <img data-lazy-src="https://cdn.example.com/page-002.png" />
    <img data-original="https://cdn.example.com/page-003.webp" />
  </div>
</body>
</html>
"""


SRCSET_FIXTURE = """
<html>
<body>
  <div class="reading-content">
    <img srcset="https://cdn.example.com/a-small.jpg 1x, https://cdn.example.com/a-large.jpg 2x" />
    <img data-srcset="https://cdn.example.com/b-1.jpg 480w, https://cdn.example.com/b-2.jpg 960w" />
  </div>
</body>
</html>
"""


# ─── _imgs_to_urls ────────────────────────────────────────────────────────────

class TestImgsToUrls:
    def test_strips_whitespace_inside_src_value(self):
        """Regression: mangaread.org embeds tabs+newlines inside the src attribute,
        so .strip() alone wasn't enough. We must squash ALL whitespace per RFC 3986."""
        soup = BeautifulSoup(MANGAREAD_FIXTURE, "html.parser")
        imgs = soup.find("div", class_="reading-content").find_all("img")
        urls = _imgs_to_urls(imgs)
        assert urls == [
            "https://www.mangaread.org/wp-content/uploads/WP-manga/data/abc/2.jpeg",
            "https://www.mangaread.org/wp-content/uploads/WP-manga/data/abc/3.jpeg",
        ]

    def test_lazyload_attribute_priority(self):
        """data-src / data-lazy-src / data-original should beat src placeholders."""
        soup = BeautifulSoup(LAZYLOAD_FIXTURE, "html.parser")
        urls = _imgs_to_urls(soup.find_all("img"))
        assert urls == [
            "https://cdn.example.com/page-001.jpg",
            "https://cdn.example.com/page-002.png",
            "https://cdn.example.com/page-003.webp",
        ]

    def test_srcset_takes_first_candidate(self):
        """Regression: previous impl crashed with IndexError on missing data-srcset;
        also it called .split() on whitespace which broke for `url 1x, url 2x` form."""
        soup = BeautifulSoup(SRCSET_FIXTURE, "html.parser")
        urls = _imgs_to_urls(soup.find_all("img"))
        assert urls == [
            "https://cdn.example.com/a-small.jpg",
            "https://cdn.example.com/b-1.jpg",
        ]

    def test_skips_data_uris_and_relative_urls(self):
        html = """
        <img src="data:image/png;base64,iVBOR" />
        <img src="/relative/path.jpg" />
        <img src="https://cdn.example.com/keep.jpg" />
        """
        soup = BeautifulSoup(html, "html.parser")
        urls = _imgs_to_urls(soup.find_all("img"))
        assert urls == ["https://cdn.example.com/keep.jpg"]

    def test_strict_mode_rejects_non_image_extensions(self):
        html = """
        <img src="https://cdn.example.com/script.js" />
        <img src="https://cdn.example.com/real.jpg" />
        """
        soup = BeautifulSoup(html, "html.parser")
        assert _imgs_to_urls(soup.find_all("img"), strict=True) == [
            "https://cdn.example.com/real.jpg",
        ]

    def test_deduplicates_preserving_order(self):
        html = """
        <img src="https://cdn.example.com/a.jpg" />
        <img src="https://cdn.example.com/b.jpg" />
        <img src="https://cdn.example.com/a.jpg" />
        """
        soup = BeautifulSoup(html, "html.parser")
        assert _imgs_to_urls(soup.find_all("img")) == [
            "https://cdn.example.com/a.jpg",
            "https://cdn.example.com/b.jpg",
        ]


# ─── _extract_image_urls (full Madara flow) ───────────────────────────────────

def test_extract_image_urls_madara_strategy_wins():
    urls = _extract_image_urls(MANGAREAD_FIXTURE)
    assert len(urls) == 2
    assert all("mangaread.org" in u for u in urls)


def test_extract_image_urls_returns_empty_when_no_images():
    html = "<html><body><p>no images here</p></body></html>"
    assert _extract_image_urls(html) == []


# ─── _extract_title ───────────────────────────────────────────────────────────

def test_extract_title_strips_known_suffixes():
    title = _extract_title(MANGAREAD_FIXTURE, "https://www.mangaread.org/manga/x/chapter-41/")
    assert "Astral Pet Store" in title
    assert "MangaRead" not in title  # suffix should have been stripped


def test_extract_title_falls_back_to_url_path():
    html = "<html><head></head><body></body></html>"
    title = _extract_title(html, "https://www.mangaread.org/manga/astral-pet-store/chapter-41/")
    # Falls back to "Astral Pet Store Chapter 41" style.
    assert "Astral" in title or "Chapter" in title


# ─── validate_scrape_url ──────────────────────────────────────────────────────

class TestValidateScrapeUrl:
    def test_accepts_allowlisted_domain(self):
        url = "https://www.mangaread.org/manga/x/chapter-41/"
        assert validate_scrape_url(url) == url

    def test_rejects_non_https(self):
        import pytest
        with pytest.raises(ValueError, match="http"):
            validate_scrape_url("ftp://www.mangaread.org/manga/x/")

    def test_rejects_unknown_domain(self):
        import pytest
        with pytest.raises(ValueError, match="ch.a được h.* tr"):
            validate_scrape_url("https://evil.example.com/manga/x/")

    def test_rejects_malformed_url(self):
        import pytest
        with pytest.raises(ValueError):
            validate_scrape_url("not a url at all")
