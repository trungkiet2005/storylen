"""
StoryLens Backend - Supabase Storage Service
Handles image uploads (originals + thumbnails) to Supabase Storage buckets.
"""
from __future__ import annotations

import io
import uuid
from pathlib import Path

from PIL import Image

from app.config import get_settings
from app.database import get_supabase

settings = get_settings()


def _make_thumbnail(image_bytes: bytes, max_size: tuple[int, int] = (400, 600)) -> bytes:
    """Resize image to thumbnail, preserving aspect ratio."""
    img = Image.open(io.BytesIO(image_bytes))
    img.thumbnail(max_size, Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=75)
    return buf.getvalue()


def upload_original(image_bytes: bytes, original_filename: str, page_id: str) -> str:
    """
    Upload original manga page to Supabase Storage.
    Returns the public URL of the uploaded file.
    """
    ext = Path(original_filename).suffix.lower() or ".jpg"
    storage_path = f"{page_id}/original{ext}"

    supabase = get_supabase()
    supabase.storage.from_(settings.SUPABASE_BUCKET_ORIGINALS).upload(
        path=storage_path,
        file=image_bytes,
        file_options={"content-type": f"image/{ext.lstrip('.')}"},
    )

    return _get_public_url(settings.SUPABASE_BUCKET_ORIGINALS, storage_path)


def upload_thumbnail(image_bytes: bytes, page_id: str) -> str:
    """
    Generate and upload a thumbnail for a manga page.
    Returns the public URL of the thumbnail.
    """
    thumb_bytes = _make_thumbnail(image_bytes)
    storage_path = f"{page_id}/thumbnail.webp"

    supabase = get_supabase()
    supabase.storage.from_(settings.SUPABASE_BUCKET_THUMBNAILS).upload(
        path=storage_path,
        file=thumb_bytes,
        file_options={"content-type": "image/webp"},
    )

    return _get_public_url(settings.SUPABASE_BUCKET_THUMBNAILS, storage_path)


def _get_public_url(bucket: str, path: str) -> str:
    """Return the public URL for a file in a Supabase Storage bucket."""
    supabase = get_supabase()
    response = supabase.storage.from_(bucket).get_public_url(path)
    return response
