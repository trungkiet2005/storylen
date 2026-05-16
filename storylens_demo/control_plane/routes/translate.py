"""Translate route — upload image, create + enqueue job."""
from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select

from control_plane.config import get_settings
from control_plane.storage.db import get_session_factory
from control_plane.workers.runner import enqueue
from control_plane.auth import require_admin, require_translator
from control_plane.storage.models import Chapter, Job, MangaProject, Page, User

router = APIRouter(prefix="/api/v1/manga", tags=["translate"])

_SUPPORTED = {".jpg", ".jpeg", ".png", ".webp"}


@router.post("/{manga_id}/translate/pages", status_code=202)
async def translate_page(
    manga_id: str,
    chapter_id: str = Form(...),
    page_index: int = Form(0),
    image: UploadFile = File(...),
    current_user: User = Depends(require_translator),
):
    settings = get_settings()
    filename = Path(image.filename or "upload.png").name
    ext = Path(filename).suffix.lower()
    if ext not in _SUPPORTED:
        raise HTTPException(415, f"Unsupported format: {ext}")

    data = await image.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {settings.max_upload_mb}MB limit")
    if not data:
        raise HTTPException(400, "Empty file")

    async with get_session_factory()() as session:
        manga = await session.get(MangaProject, manga_id)
        if not manga:
            raise HTTPException(404, "Manga not found")
        chapter = await _resolve_chapter(session, manga_id, chapter_id)
        if not chapter:
            raise HTTPException(404, "Chapter not found")

        resolved_chapter_id = chapter.id
        page_id = str(uuid.uuid4())
        job_id = str(uuid.uuid4())

        page = Page(
            id=page_id, manga_id=manga_id, chapter_id=resolved_chapter_id,
            page_index=page_index, status="queued",
        )
        job = Job(
            id=job_id, manga_id=manga_id, chapter_id=resolved_chapter_id,
            page_id=page_id, status="queued", progress=0,
        )
        session.add(page)
        session.add(job)
        await session.commit()

    enqueue(job_id, {
        "manga_id": manga_id,
        "chapter_id": resolved_chapter_id,
        "page_id": page_id,
        "page_index": page_index,
        "image_bytes": data,
        "filename": filename,
        "api_keys": current_user.api_keys or {},
    })

    return {
        "job_id": job_id,
        "status": "queued",
        "manga_id": manga_id,
        "chapter_id": resolved_chapter_id,
        "page_id": page_id,
    }


async def _resolve_chapter(session, manga_id: str, chapter_ref: str) -> Chapter | None:
    """Accept either a real chapter UUID or a chapter number like "1"."""
    chapter_ref = chapter_ref.strip()
    chapter = await session.get(Chapter, chapter_ref)
    if chapter:
        return chapter if chapter.manga_id == manga_id else None

    if not chapter_ref.isdigit():
        return None

    chapter_number = int(chapter_ref)
    result = await session.execute(
        select(Chapter).where(
            Chapter.manga_id == manga_id,
            Chapter.chapter_number == chapter_number,
        )
    )
    chapter = result.scalar_one_or_none()
    if chapter:
        return chapter

    chapter = Chapter(
        id=str(uuid.uuid4()),
        manga_id=manga_id,
        chapter_number=chapter_number,
        title=f"Chapter {chapter_number}",
    )
    session.add(chapter)
    await session.flush()
    return chapter
