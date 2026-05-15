"""
Manga chapter scraper for supported sites (Madara-theme WordPress).
Fetches chapter pages and downloads images for the translation pipeline.

SSRF mitigation: only allowlisted domains are accepted.
"""
from __future__ import annotations

import logging
import re
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

# ─── Domain allowlist (SSRF mitigation) ──────────────────────────────────────

SUPPORTED_DOMAINS: set[str] = {
    "www.mangaread.org",
    "mangaread.org",
    "mangakakalot.com",
    "www.mangakakalot.com",
    "chapmanganato.to",
    "readmanganato.com",
    "www.mangahere.cc",
    "mangahere.cc",
}

# ─── HTTP headers that mimic a real browser ──────────────────────────────────

_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

_BASE_HEADERS = {
    "User-Agent": _BROWSER_UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Mode": "navigate",
}

_IMAGE_EXTENSIONS = frozenset((".jpg", ".jpeg", ".png", ".webp"))


# ─── URL validation ───────────────────────────────────────────────────────────

def validate_scrape_url(url: str) -> str:
    """Validate URL domain is allowlisted. Returns the URL unchanged."""
    try:
        parsed = urlparse(url.strip())
    except Exception:
        raise ValueError("URL không hợp lệ.")

    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL phải bắt đầu bằng http:// hoặc https://.")

    if not parsed.netloc:
        raise ValueError("URL không có domain.")

    if parsed.netloc not in SUPPORTED_DOMAINS:
        readable = ", ".join(sorted(SUPPORTED_DOMAINS))
        raise ValueError(
            f"Domain '{parsed.netloc}' chưa được hỗ trợ. "
            f"Các domain hỗ trợ: {readable}"
        )

    return url.strip()


# ─── Chapter page fetching ────────────────────────────────────────────────────

async def fetch_chapter_image_urls(url: str) -> tuple[str, list[str]]:
    """
    Fetch a manga chapter page and return (chapter_title, [image_url, ...]).
    Raises ValueError with a user-facing message on failure.
    """
    parsed = urlparse(url)
    referer = f"{parsed.scheme}://{parsed.netloc}/"

    headers = {**_BASE_HEADERS, "Referer": referer}

    try:
        async with httpx.AsyncClient(
            timeout=30,
            follow_redirects=True,
            headers=headers,
        ) as client:
            response = await client.get(url)
    except httpx.TimeoutException:
        raise ValueError("Hết thời gian tải trang. Vui lòng thử lại.")
    except httpx.RequestError as exc:
        raise ValueError(f"Không thể kết nối đến trang web: {exc}")

    if response.status_code == 403:
        raise ValueError(
            "Trang web từ chối truy cập (403). "
            "Có thể cần chờ một lúc hoặc URL đã thay đổi."
        )
    if response.status_code == 404:
        raise ValueError("Không tìm thấy chapter (404). Kiểm tra lại URL.")
    if not response.is_success:
        raise ValueError(f"Lỗi tải trang: HTTP {response.status_code}.")

    html = response.text
    chapter_title = _extract_title(html, url)
    image_urls = _extract_image_urls(html)

    if not image_urls:
        raise ValueError(
            "Không tìm thấy ảnh nào trong chapter. "
            "URL có thể sai hoặc trang web đã thay đổi cấu trúc."
        )

    logger.info("Scraped %d images from %s", len(image_urls), url)
    return chapter_title, image_urls


# ─── HTML parsing ─────────────────────────────────────────────────────────────

def _extract_title(html: str, url: str) -> str:
    """Extract chapter title from HTML <title> tag or URL path."""
    m = re.search(r"<title>([^<]{1,200})</title>", html, re.IGNORECASE)
    if m:
        title = m.group(1).strip()
        for suffix in (
            " - MangaRead",
            " | MangaRead",
            " - Read Manga Online",
            " - MangaHere",
            " | MangaKakalot",
        ):
            title = title.replace(suffix, "")
        return title.strip() or _title_from_url(url)
    return _title_from_url(url)


def _title_from_url(url: str) -> str:
    parts = [p for p in urlparse(url).path.strip("/").split("/") if p]
    return " ".join(p.replace("-", " ").title() for p in parts[-2:]) or "Chapter"


def _extract_image_urls(html: str) -> list[str]:
    """
    Try multiple strategies to extract manga page image URLs.
    Supports Madara theme and common alternatives.
    """
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        logger.error("beautifulsoup4 not installed; falling back to regex parser")
        return _regex_extract(html)

    soup = BeautifulSoup(html, "html.parser")

    # Strategy 1: Madara theme — div.reading-content img
    container = soup.find("div", class_="reading-content")
    if container:
        urls = _imgs_to_urls(container.find_all("img"))
        if urls:
            return urls

    # Strategy 2: .wp-manga-chapter-img class (Madara alternative)
    imgs = soup.find_all("img", class_="wp-manga-chapter-img")
    if imgs:
        urls = _imgs_to_urls(imgs)
        if urls:
            return urls

    # Strategy 3: MangaKakalot — div#vung_doc or .panel-read-story
    for selector in (
        {"id": "vung_doc"},
        {"class": "panel-read-story"},
        {"class": "container-chapter-reader"},
    ):
        wrapper = soup.find("div", selector)
        if wrapper:
            urls = _imgs_to_urls(wrapper.find_all("img"))
            if urls:
                return urls

    # Strategy 4: JSON in <script> — some sites preload images as JSON
    urls = _json_extract(html)
    if urls:
        return urls

    # Last resort: all images that look like manga pages
    return _imgs_to_urls(soup.find_all("img"), strict=False)


def _imgs_to_urls(imgs, strict: bool = True) -> list[str]:
    """Extract unique image URLs from img tags, prioritising lazy-load attributes."""
    seen: set[str] = set()
    result: list[str] = []

    for img in imgs:
        # Lazy-load priority order
        raw = (
            img.get("data-src")
            or img.get("data-lazy-src")
            or img.get("data-original")
            or img.get("data-srcset", "").split()[0]
            or img.get("src")
            or ""
        ).strip()

        if not raw or raw.startswith("data:"):
            continue
        if not raw.startswith(("http://", "https://")):
            continue

        # Strict mode: only known image extensions
        path = raw.split("?")[0].lower()
        if strict and not any(path.endswith(ext) for ext in _IMAGE_EXTENSIONS):
            continue

        if raw not in seen:
            seen.add(raw)
            result.append(raw)

    return result


def _json_extract(html: str) -> list[str]:
    """Look for image arrays inside inline <script> blocks."""
    patterns = [
        r'"images"\s*:\s*\[([^\]]{10,})\]',
        r'chapter_preloaded_images\s*=\s*\[([^\]]{10,})\]',
        r'"chapter_img_list"\s*:\s*\[([^\]]{10,})\]',
    ]
    for pat in patterns:
        m = re.search(pat, html)
        if m:
            raw = m.group(1)
            found = re.findall(
                r'"(https?://[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"', raw
            )
            if found:
                cleaned = [_unescape(u) for u in found]
                return list(dict.fromkeys(cleaned))  # deduplicate, preserve order
    return []


def _regex_extract(html: str) -> list[str]:
    """Pure-regex fallback when bs4 is unavailable."""
    seen: set[str] = set()
    result: list[str] = []
    for url in re.findall(
        r'(?:data-src|data-lazy-src|src)=["\']'
        r'(https?://[^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)["\']',
        html,
        re.IGNORECASE,
    ):
        if url not in seen:
            seen.add(url)
            result.append(url)
    return result


def _unescape(url: str) -> str:
    return (
        url.replace("\\u0026", "&")
        .replace("\\u002F", "/")
        .replace("\\/", "/")
    )


# ─── Image downloader ─────────────────────────────────────────────────────────

async def download_image(url: str, referer: str = "") -> tuple[bytes, str]:
    """
    Download a single image.
    Returns (image_bytes, content_type).
    Raises ValueError with a user-facing message on failure.
    """
    headers = {
        **_BASE_HEADERS,
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
    }
    if referer:
        headers["Referer"] = referer

    try:
        async with httpx.AsyncClient(
            timeout=60,
            follow_redirects=True,
            headers=headers,
        ) as client:
            r = await client.get(url)
    except httpx.TimeoutException:
        raise ValueError(f"Hết thời gian tải ảnh: {url}")
    except httpx.RequestError as exc:
        raise ValueError(f"Không thể tải ảnh: {exc}")

    if not r.is_success:
        raise ValueError(f"Lỗi tải ảnh (HTTP {r.status_code}): {url}")

    content_type = r.headers.get("content-type", "").split(";")[0].strip().lower()

    # Infer from URL extension if header is missing or generic
    if content_type not in ("image/jpeg", "image/png", "image/webp"):
        path = url.split("?")[0].lower()
        if path.endswith(".png"):
            content_type = "image/png"
        elif path.endswith(".webp"):
            content_type = "image/webp"
        else:
            content_type = "image/jpeg"

    return r.content, content_type
