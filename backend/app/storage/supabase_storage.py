"""
StoryLens Backend - Supabase Storage Service
Handles image uploads (originals + thumbnails) to Supabase Storage buckets.

Fixes:
- Correct MIME type mapping (jpg → image/jpeg, not image/jpg)
- Validate public URL response from Supabase
- Graceful thumbnail failure (don't block original upload)
- Better error logging with meaningful messages
"""
from __future__ import annotations

import io
import logging
from pathlib import Path

from PIL import Image

from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)
settings = get_settings()

# Correct MIME type mapping
_EXT_TO_MIME: dict[str, str] = {
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".webp": "image/webp",
    ".gif":  "image/gif",
    ".bmp":  "image/bmp",
}


def _make_thumbnail(image_bytes: bytes, max_size: tuple[int, int] = (400, 600)) -> bytes:
    """Resize image to thumbnail, preserving aspect ratio."""
    img = Image.open(io.BytesIO(image_bytes))
    # Convert RGBA/P to RGB to ensure WebP compatibility
    if img.mode in ("RGBA", "P", "LA"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    img.thumbnail(max_size, Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=75, method=4)
    return buf.getvalue()


def _get_public_url(bucket: str, path: str) -> str:
    """Return the public URL for a file in a Supabase Storage bucket."""
    supabase = get_supabase()
    response = supabase.storage.from_(bucket).get_public_url(path)
    # response is a string URL from supabase-py v2
    if isinstance(response, str) and response.startswith("http"):
        return response
    # Fallback: construct URL manually
    url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"
    logger.warning("get_public_url returned unexpected response type, using fallback URL: %s", url)
    return url


def upload_original(image_bytes: bytes, original_filename: str, page_id: str) -> str:
    """
    Upload original manga page to Supabase Storage.
    Returns the public URL of the uploaded file.
    """
    ext = Path(original_filename).suffix.lower()
    if not ext or ext not in _EXT_TO_MIME:
        ext = ".jpg"

    mime_type = _EXT_TO_MIME[ext]
    storage_path = f"{page_id}/original{ext}"

    supabase = get_supabase()
    try:
        supabase.storage.from_(settings.SUPABASE_BUCKET_ORIGINALS).upload(
            path=storage_path,
            file=image_bytes,
            file_options={"content-type": mime_type, "upsert": "true"},
        )
        logger.info("Uploaded original image to %s/%s", settings.SUPABASE_BUCKET_ORIGINALS, storage_path)
    except Exception as exc:
        # Re-raise with more context
        raise RuntimeError(
            f"Failed to upload original to bucket '{settings.SUPABASE_BUCKET_ORIGINALS}': {exc}"
        ) from exc

    return _get_public_url(settings.SUPABASE_BUCKET_ORIGINALS, storage_path)


def upload_thumbnail(image_bytes: bytes, page_id: str) -> str | None:
    """
    Generate and upload a thumbnail for a manga page.
    Returns the public URL of the thumbnail, or None if thumbnail generation fails.
    This should NOT block the main upload — failure is logged and swallowed.
    """
    try:
        thumb_bytes = _make_thumbnail(image_bytes)
    except Exception as exc:
        logger.warning("Thumbnail generation failed for page %s: %s", page_id, exc)
        return None

    storage_path = f"{page_id}/thumbnail.webp"

    try:
        supabase = get_supabase()
        supabase.storage.from_(settings.SUPABASE_BUCKET_THUMBNAILS).upload(
            path=storage_path,
            file=thumb_bytes,
            file_options={"content-type": "image/webp", "upsert": "true"},
        )
        logger.info("Uploaded thumbnail to %s/%s", settings.SUPABASE_BUCKET_THUMBNAILS, storage_path)
        return _get_public_url(settings.SUPABASE_BUCKET_THUMBNAILS, storage_path)
    except Exception as exc:
        logger.warning("Thumbnail upload failed for page %s: %s", page_id, exc)
        return None
