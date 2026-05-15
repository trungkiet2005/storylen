"""Review route — reviewer edits, approve/reject boxes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import update

from control_plane.storage.db import get_session_factory
from control_plane.storage.models import TextBox
from control_plane.auth import require_admin

router = APIRouter(prefix="/api/v1/jobs", tags=["review"])


class BoxPatch(BaseModel):
    translated_text: str | None = None
    review_status: str | None = None  # pending|approved|rejected
    reviewer_notes: str | None = None


@router.patch("/{job_id}/boxes/{box_id}")
async def patch_box(job_id: str, box_id: str, body: BoxPatch, _=Depends(require_admin)):
    async with get_session_factory()() as session:
        box = await session.get(TextBox, box_id)
        if not box:
            raise HTTPException(404, "Box not found")

        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            await session.execute(
                update(TextBox).where(TextBox.id == box_id).values(**updates)
            )
            await session.commit()
            await session.refresh(box)

        return {
            "id": box.id, "translated_text": box.translated_text,
            "review_status": box.review_status, "reviewer_notes": box.reviewer_notes,
        }
