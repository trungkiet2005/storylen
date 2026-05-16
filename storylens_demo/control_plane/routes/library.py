"""Library + reader routes."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select, update

from control_plane.storage.db import get_session_factory
from control_plane.storage.models import Chapter, MangaProject, Page, TextBox

router = APIRouter(prefix="/api/v1", tags=["library"])


@router.get("/library")
async def library():
    async with get_session_factory()() as session:
        result = await session.execute(
            select(MangaProject).where(MangaProject.published == True)
            .order_by(MangaProject.updated_at.desc())
        )
        return [_manga_dict(m) for m in result.scalars()]


@router.get("/library/{manga_id}/chapters/{chapter_id}")
async def read_chapter(manga_id: str, chapter_id: str):
    async with get_session_factory()() as session:
        chapter = await session.get(Chapter, chapter_id)
        if not chapter or chapter.manga_id != manga_id:
            raise HTTPException(404, "Chapter not found")

        pages_result = await session.execute(
            select(Page).where(Page.chapter_id == chapter_id).order_by(Page.page_index)
        )
        pages_data = []
        for page in pages_result.scalars():
            boxes_result = await session.execute(
                select(TextBox).where(TextBox.page_id == page.id).order_by(TextBox.box_index)
            )
            pages_data.append({
                "page_id": page.id,
                "page_index": page.page_index,
                "input_url": page.input_artifact_path,
                "output_url": page.output_artifact_path,
                "boxes": [_box_dict(b) for b in boxes_result.scalars()],
            })

        return {"chapter_id": chapter_id, "pages": pages_data}


@router.post("/chapters/{chapter_id}/publish")
async def publish_chapter(chapter_id: str):
    async with get_session_factory()() as session:
        chapter = await session.get(Chapter, chapter_id)
        if not chapter:
            raise HTTPException(404, "Chapter not found")
        await session.execute(
            update(Chapter).where(Chapter.id == chapter_id).values(published=True)
        )
        # Also publish the manga
        await session.execute(
            update(MangaProject).where(MangaProject.id == chapter.manga_id).values(published=True)
        )
        await session.commit()
        return {"status": "published", "chapter_id": chapter_id}


def _manga_dict(m: MangaProject) -> dict:
    return {"id": m.id, "title": m.title, "cover_url": m.cover_url}


def _box_dict(b: TextBox) -> dict:
    return {
        "id": b.id, "xyxy": b.xyxy,
        "translated_text": b.translated_text, "speaker": b.speaker,
        "review_status": b.review_status,
    }
