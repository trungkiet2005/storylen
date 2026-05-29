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
from urllib.parse import unquote, urlparse

from PIL import Image

from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)
settings = get_settings()
SIGNED_URL_EXPIRES_SECONDS = 6 * 60 * 60

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


def _get_signed_url(bucket: str, path: str) -> str | None:
    """Return a temporary signed URL for private or public Supabase Storage."""
    try:
        response = get_supabase().storage.from_(bucket).create_signed_url(
            path,
            SIGNED_URL_EXPIRES_SECONDS,
        )
    except Exception as exc:
        logger.warning("Failed to create signed URL for %s/%s: %s", bucket, path, exc)
        return None

    if isinstance(response, str) and response.startswith("http"):
        return response
    if isinstance(response, dict):
        signed = (
            response.get("signedURL")
            or response.get("signedUrl")
            or response.get("signed_url")
        )
        if isinstance(signed, str) and signed.startswith("http"):
            return signed
    logger.warning("create_signed_url returned unexpected response for %s/%s", bucket, path)
    return None


def _storage_path_from_public_url(bucket: str, url: str | None) -> str | None:
    if not url:
        return None
    path = urlparse(url).path
    marker = f"/storage/v1/object/public/{bucket}/"
    index = path.find(marker)
    if index == -1:
        return None
    return unquote(path[index + len(marker):])


def signed_url_from_public_url(bucket: str, public_url: str | None) -> str | None:
    """Create a signed URL from a stored public URL.

    Returns None when signing fails (or the input URL can't be parsed back to a
    storage path). The originals/thumbnails buckets are private, so an unsigned
    "public" URL would 400 in the browser — better to return None and let the
    frontend render a placeholder + retry.
    """
    storage_path = _storage_path_from_public_url(bucket, public_url)
    if not storage_path:
        return None
    return _get_signed_url(bucket, storage_path)


def signed_translated_image_url(page_id: str, fallback_url: str | None = None) -> str | None:
    # fallback_url is kept for callers that may want a deterministic public URL
    # for non-private bucket setups; currently the bucket is private so callers
    # should treat None as "render placeholder".
    storage_path = f"{page_id}/translated.png"
    return _get_signed_url(settings.SUPABASE_BUCKET_ORIGINALS, storage_path) or fallback_url


def signed_original_image_url(public_url: str | None) -> str | None:
    return signed_url_from_public_url(settings.SUPABASE_BUCKET_ORIGINALS, public_url)


def signed_thumbnail_image_url(public_url: str | None) -> str | None:
    return signed_url_from_public_url(settings.SUPABASE_BUCKET_THUMBNAILS, public_url)


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


def upload_translated_image(image_bytes: bytes, page_id: str) -> str | None:
    """
    Upload ai_module's rendered translation image.
    Reuses the originals bucket so deployments do not need an extra storage bucket.
    """
    storage_path = f"{page_id}/translated.png"

    try:
        supabase = get_supabase()
        supabase.storage.from_(settings.SUPABASE_BUCKET_ORIGINALS).upload(
            path=storage_path,
            file=image_bytes,
            file_options={"content-type": "image/png", "upsert": "true"},
        )
        logger.info(
            "Uploaded translated image to %s/%s",
            settings.SUPABASE_BUCKET_ORIGINALS,
            storage_path,
        )
        return _get_public_url(settings.SUPABASE_BUCKET_ORIGINALS, storage_path)
    except Exception as exc:
        logger.warning("Translated image upload failed for page %s: %s", page_id, exc)
        return None


def translated_image_public_url(page_id: str) -> str:
    """Return the deterministic public URL for a rendered translated image."""
    return _get_public_url(
        settings.SUPABASE_BUCKET_ORIGINALS,
        f"{page_id}/translated.png",
    )


def _make_avatar(image_bytes: bytes, size: int = 512) -> tuple[bytes, str]:
    """Normalize an avatar image: square-cropped, max `size`px, WebP."""
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode in ("RGBA", "P", "LA"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Square center-crop, then resize.
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img.thumbnail((size, size), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=82, method=4)
    return buf.getvalue(), "image/webp"


def upload_avatar(image_bytes: bytes, user_id: str) -> str:
    """
    Normalize and upload an avatar image. Returns a public URL with a
    cache-busting query so the frontend reloads it after a re-upload.
    """
    try:
        normalized, content_type = _make_avatar(image_bytes)
    except Exception as exc:
        raise RuntimeError(f"Invalid image for avatar: {exc}") from exc

    storage_path = f"{user_id}/avatar.webp"
    bucket = settings.SUPABASE_BUCKET_AVATARS

    try:
        get_supabase().storage.from_(bucket).upload(
            path=storage_path,
            file=normalized,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        logger.info("Uploaded avatar to %s/%s", bucket, storage_path)
    except Exception as exc:
        raise RuntimeError(f"Failed to upload avatar: {exc}") from exc

    public_url = _get_public_url(bucket, storage_path)
    import time
    return f"{public_url}?v={int(time.time())}"


def delete_avatar(user_id: str) -> None:
    """Remove the avatar object for a user. Idempotent."""
    storage_path = f"{user_id}/avatar.webp"
    try:
        get_supabase().storage.from_(settings.SUPABASE_BUCKET_AVATARS).remove([storage_path])
    except Exception as exc:
        logger.warning("Failed to delete avatar for %s: %s", user_id, exc)
