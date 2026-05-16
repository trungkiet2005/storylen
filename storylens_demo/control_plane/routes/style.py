"""Style card routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from control_plane.storage.db import get_session_factory
from control_plane.storage.models import MangaProject, StyleCard
from control_plane.auth import require_admin

router = APIRouter(prefix="/api/v1/manga", tags=["style"])


@router.get("/{manga_id}/style")
async def get_style(manga_id: str):
    async with get_session_factory()() as session:
        result = await session.execute(
            select(StyleCard)
            .where(StyleCard.manga_id == manga_id, StyleCard.active == True)
            .order_by(StyleCard.version.desc())
            .limit(1)
        )
        card = result.scalar_one_or_none()
        if not card:
            return {"manga_id": manga_id, "style": _default_style()}
        return {"manga_id": manga_id, "version": card.version, "style": card.content}


@router.put("/{manga_id}/style", status_code=200)
async def update_style(manga_id: str, style: dict, _=Depends(require_admin)):
    async with get_session_factory()() as session:
        manga = await session.get(MangaProject, manga_id)
        if not manga:
            raise HTTPException(404, "Manga not found")

        result = await session.execute(
            select(StyleCard)
            .where(StyleCard.manga_id == manga_id, StyleCard.active == True)
            .order_by(StyleCard.version.desc())
            .limit(1)
        )
        old = result.scalar_one_or_none()
        version = (old.version + 1) if old else 1

        card = StyleCard(id=str(uuid.uuid4()), manga_id=manga_id, version=version, content=style)
        session.add(card)
        await session.commit()
        return {"manga_id": manga_id, "version": version, "style": style}


def _default_style() -> dict:
    return {
        "register": "tự nhiên, gọn",
        "honorific_policy": "giữ tự nhiên",
        "name_policy": "giữ tên gốc",
        "sentence_length": "ngắn, fit bubble",
        "sound_effect_policy": "giữ SFX gốc",
    }
