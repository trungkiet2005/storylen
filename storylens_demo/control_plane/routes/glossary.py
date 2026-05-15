"""Glossary routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update

from control_plane.storage.db import get_session_factory
from control_plane.storage.models import GlossaryTerm, MangaProject
from control_plane.auth import require_admin

router = APIRouter(prefix="/api/v1/manga", tags=["glossary"])


class GlossaryCreate(BaseModel):
    source: str
    target: str
    term_type: str = "general"
    status: str = "candidate"


class GlossaryPatch(BaseModel):
    target: str | None = None
    status: str | None = None


@router.post("/{manga_id}/glossary", status_code=201)
async def add_term(manga_id: str, body: GlossaryCreate, _=Depends(require_admin)):
    async with get_session_factory()() as session:
        manga = await session.get(MangaProject, manga_id)
        if not manga:
            raise HTTPException(404, "Manga not found")
        term = GlossaryTerm(id=str(uuid.uuid4()), manga_id=manga_id, **body.model_dump())
        session.add(term)
        await session.commit()
        await session.refresh(term)
        return _term_dict(term)


@router.get("/{manga_id}/glossary")
async def list_terms(manga_id: str):
    async with get_session_factory()() as session:
        result = await session.execute(
            select(GlossaryTerm).where(GlossaryTerm.manga_id == manga_id)
            .order_by(GlossaryTerm.source)
        )
        return [_term_dict(t) for t in result.scalars()]


@router.patch("/{manga_id}/glossary/{term_id}")
async def patch_term(manga_id: str, term_id: str, body: GlossaryPatch, _=Depends(require_admin)):
    async with get_session_factory()() as session:
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            await session.execute(
                update(GlossaryTerm).where(GlossaryTerm.id == term_id).values(**updates)
            )
            await session.commit()
        term = await session.get(GlossaryTerm, term_id)
        return _term_dict(term)


def _term_dict(t: GlossaryTerm) -> dict:
    return {
        "id": t.id, "manga_id": t.manga_id, "source": t.source,
        "target": t.target, "term_type": t.term_type, "status": t.status,
    }
