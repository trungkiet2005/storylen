"""Manga project CRUD routes."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from control_plane.storage.db import get_session_factory
from control_plane.storage.models import Chapter, MangaProject, User
from control_plane.auth import require_admin, require_translator, get_optional_user

router = APIRouter(prefix="/api/v1/manga", tags=["manga"])


class MangaCreate(BaseModel):
    title: str
    source_language: str = "ja"
    target_language: str = "vi"


class ChapterCreate(BaseModel):
    chapter_number: int
    title: str | None = None


@router.post("", status_code=201)
async def create_manga(body: MangaCreate, current_user: User = Depends(require_translator)):
    async with get_session_factory()() as session:
        manga = MangaProject(
            id=str(uuid.uuid4()),
            title=body.title,
            source_language=body.source_language,
            target_language=body.target_language,
            created_by=current_user.id,
            publish_status="draft"
        )
        session.add(manga)
        await session.commit()
        await session.refresh(manga)
        return _manga_dict(manga)

@router.get("")
async def list_manga(user: User | None = Depends(get_optional_user), status: str | None = None):
    async with get_session_factory()() as session:
        query = select(MangaProject)
        
        # Admin can see everything
        if user and user.role == "admin":
            if status: query = query.where(MangaProject.publish_status == status)
        # Translators see approved + their own drafts
        elif user and user.role == "translator":
            query = query.where((MangaProject.publish_status == "approved") | (MangaProject.created_by == user.id))
            if status: query = query.where(MangaProject.publish_status == status)
        # Guests see only approved
        else:
            query = query.where(MangaProject.publish_status == "approved")
            
        result = await session.execute(query.order_by(MangaProject.created_at.desc()))
        return [_manga_dict(m) for m in result.scalars()]


@router.get("/{manga_id}")
async def get_manga(manga_id: str):
    async with get_session_factory()() as session:
        manga = await session.get(MangaProject, manga_id)
        if not manga:
            raise HTTPException(404, "Manga not found")
        return _manga_dict(manga)


@router.post("/{manga_id}/publish-request")
async def request_publish(manga_id: str, current_user: User = Depends(require_translator)):
    async with get_session_factory()() as session:
        manga = await session.get(MangaProject, manga_id)
        if not manga: raise HTTPException(404, "Manga not found")
        if manga.created_by != current_user.id and current_user.role != "admin":
            raise HTTPException(403, "Not your project")
        manga.publish_status = "pending_review"
        await session.commit()
        return _manga_dict(manga)

@router.post("/{manga_id}/approve", dependencies=[Depends(require_admin)])
async def approve_manga(manga_id: str):
    async with get_session_factory()() as session:
        manga = await session.get(MangaProject, manga_id)
        if not manga: raise HTTPException(404, "Manga not found")
        manga.publish_status = "approved"
        manga.published = True
        await session.commit()
        return _manga_dict(manga)

@router.post("/{manga_id}/reject", dependencies=[Depends(require_admin)])
async def reject_manga(manga_id: str):
    async with get_session_factory()() as session:
        manga = await session.get(MangaProject, manga_id)
        if not manga: raise HTTPException(404, "Manga not found")
        manga.publish_status = "rejected"
        await session.commit()
        return _manga_dict(manga)

@router.delete("/{manga_id}", status_code=204)
async def delete_manga(manga_id: str, current_user: User = Depends(require_translator)):
    async with get_session_factory()() as session:
        manga = await session.get(MangaProject, manga_id)
        if not manga:
            raise HTTPException(404, "Manga not found")
        if manga.created_by != current_user.id and current_user.role != "admin":
            raise HTTPException(403, "Cannot delete someone else's project")
        await session.delete(manga)
        await session.commit()


@router.post("/{manga_id}/chapters", status_code=201)
async def create_chapter(manga_id: str, body: ChapterCreate, _=Depends(require_translator)):
    async with get_session_factory()() as session:
        manga = await session.get(MangaProject, manga_id)
        if not manga:
            raise HTTPException(404, "Manga not found")
        chapter = Chapter(
            id=str(uuid.uuid4()),
            manga_id=manga_id,
            chapter_number=body.chapter_number,
            title=body.title,
        )
        session.add(chapter)
        await session.commit()
        await session.refresh(chapter)
        return _chapter_dict(chapter)


@router.get("/{manga_id}/chapters")
async def list_chapters(manga_id: str):
    async with get_session_factory()() as session:
        result = await session.execute(
            select(Chapter).where(Chapter.manga_id == manga_id).order_by(Chapter.chapter_number)
        )
        return [_chapter_dict(c) for c in result.scalars()]


def _manga_dict(m: MangaProject) -> dict:
    return {
        "id": m.id, "title": m.title,
        "source_language": m.source_language, "target_language": m.target_language,
        "cover_url": m.cover_url, "published": m.published,
        "publish_status": getattr(m, "publish_status", "draft"),
        "created_by": getattr(m, "created_by", None),
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _chapter_dict(c: Chapter) -> dict:
    return {
        "id": c.id, "manga_id": c.manga_id,
        "chapter_number": c.chapter_number, "title": c.title,
        "summary": c.summary, "published": c.published,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }
