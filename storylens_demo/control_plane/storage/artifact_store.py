"""Local file artifact storage — serves originals, outputs, debug overlays."""
from __future__ import annotations

import hashlib
import re
import shutil
from pathlib import Path

from control_plane.config import get_settings

_MAX_FILENAME_LENGTH = 80
_INVALID_FILENAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def _base() -> Path:
    p = get_settings().artifact_dir
    p.mkdir(parents=True, exist_ok=True)
    return p


def artifact_path(manga_id: str, chapter_id: str, page_id: str, filename: str) -> Path:
    p = _base() / manga_id / chapter_id / page_id
    p.mkdir(parents=True, exist_ok=True)
    return p / _safe_filename(filename)


def save_bytes(manga_id: str, chapter_id: str, page_id: str,
               filename: str, data: bytes) -> Path:
    path = artifact_path(manga_id, chapter_id, page_id, filename)
    path.write_bytes(data)
    return path


def artifact_url(path: Path) -> str:
    """Convert absolute path to API URL."""
    base = _base()
    try:
        rel = path.relative_to(base)
    except ValueError:
        rel = path
    return f"/api/v1/artifacts/{rel.as_posix()}"


def copy_to_artifact(src: Path, manga_id: str, chapter_id: str,
                     page_id: str, filename: str) -> Path:
    dst = artifact_path(manga_id, chapter_id, page_id, filename)
    shutil.copy2(src, dst)
    return dst


def _safe_filename(filename: str) -> str:
    name = Path(filename or "artifact.bin").name
    name = _INVALID_FILENAME_CHARS.sub("_", name).strip(" .") or "artifact.bin"
    if len(name) <= _MAX_FILENAME_LENGTH:
        return name

    suffix = Path(name).suffix[:12]
    stem = Path(name).stem
    digest = hashlib.sha1(name.encode("utf-8", errors="ignore")).hexdigest()[:12]
    keep = max(16, _MAX_FILENAME_LENGTH - len(suffix) - len(digest) - 1)
    return f"{stem[:keep]}_{digest}{suffix}"
