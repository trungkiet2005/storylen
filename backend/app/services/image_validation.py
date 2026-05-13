"""
Reject uploads whose bytes do not actually decode as a supported image.
Pillow's verify() catches MIME spoofing (e.g. HTML/script renamed to .jpg).
"""
from __future__ import annotations

import io

from PIL import Image, UnidentifiedImageError

_ALLOWED_PIL_FORMATS = {"JPEG", "PNG", "WEBP"}


def verify_image_bytes(image_bytes: bytes) -> str:
    """
    Returns the Pillow-detected format (e.g. "JPEG") on success.
    Raises ValueError if the payload is not a supported real image.
    """
    if not image_bytes:
        raise ValueError("empty payload")
    try:
        with Image.open(io.BytesIO(image_bytes)) as probe:
            probe.verify()
        # verify() consumes the file pointer — reopen for format inspection.
        with Image.open(io.BytesIO(image_bytes)) as probe:
            fmt = (probe.format or "").upper()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError(f"not a valid image: {exc}") from exc

    if fmt not in _ALLOWED_PIL_FORMATS:
        raise ValueError(f"unsupported image format: {fmt or 'unknown'}")
    return fmt
