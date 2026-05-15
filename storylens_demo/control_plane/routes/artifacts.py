"""Artifact file serving."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from control_plane.config import get_settings

router = APIRouter(prefix="/api/v1/artifacts", tags=["artifacts"])


@router.get("/{full_path:path}")
async def serve_artifact(full_path: str):
    base = get_settings().artifact_dir
    path = (base / full_path).resolve()

    # Security: prevent path traversal
    try:
        path.relative_to(base)
    except ValueError:
        raise HTTPException(403, "Access denied")

    if not path.exists() or not path.is_file():
        raise HTTPException(404, "Artifact not found")

    return FileResponse(str(path))
