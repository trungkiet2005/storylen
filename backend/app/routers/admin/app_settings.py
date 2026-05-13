"""
Admin · Runtime application settings (feature flags & limits).

    GET   /settings           list all settings rows
    PUT   /settings/{key}     upsert one setting
    DELETE /settings/{key}    remove (revert to default)
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel

from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_admin

from .deps import audit, to_iso

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)


class SettingItem(BaseModel):
    key: str
    value: Any
    description: str | None = None
    updated_by: str | None = None
    updated_at: str | None = None


class SettingsListResponse(BaseModel):
    items: list[SettingItem]


class SettingUpsertRequest(BaseModel):
    value: Any
    description: str | None = None


@router.get("/settings", response_model=SettingsListResponse)
def list_settings(_admin: AuthUser = Depends(get_current_admin)) -> SettingsListResponse:
    try:
        res = get_supabase().table("app_settings").select("*").order("key").execute()
        rows = res.data or []
    except Exception as exc:
        logger.warning("list settings failed: %s", exc)
        rows = []

    return SettingsListResponse(
        items=[
            SettingItem(
                key=r["key"],
                value=r.get("value"),
                description=r.get("description"),
                updated_by=r.get("updated_by"),
                updated_at=to_iso(r.get("updated_at")),
            )
            for r in rows
        ]
    )


@router.put("/settings/{key}", response_model=SettingItem)
def upsert_setting(
    key: str,
    payload: SettingUpsertRequest,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> SettingItem:
    if not key or len(key) > 64:
        raise HTTPException(status_code=400, detail="Khoá không hợp lệ.")

    record = {
        "key": key,
        "value": payload.value,
        "description": payload.description,
        "updated_by": admin_user.id,
    }
    try:
        res = (
            get_supabase()
            .table("app_settings")
            .upsert(record, on_conflict="key")
            .execute()
        )
        row = (res.data or [{}])[0]
    except Exception as exc:
        logger.error("upsert setting %s failed: %s", key, exc)
        raise HTTPException(status_code=503, detail="Không thể lưu cấu hình.") from exc

    audit(
        admin_user,
        "settings.update",
        request=request,
        target_type="setting",
        target_id=key,
        summary=f"Cập nhật cấu hình {key}",
        metadata={"value": payload.value},
    )

    return SettingItem(
        key=row.get("key", key),
        value=row.get("value", payload.value),
        description=row.get("description", payload.description),
        updated_by=row.get("updated_by"),
        updated_at=to_iso(row.get("updated_at")),
    )


@router.delete("/settings/{key}", status_code=204, response_class=Response)
def delete_setting(
    key: str,
    request: Request,
    admin_user: AuthUser = Depends(get_current_admin),
) -> Response:
    try:
        get_supabase().table("app_settings").delete().eq("key", key).execute()
    except Exception as exc:
        logger.error("delete setting %s failed: %s", key, exc)
        raise HTTPException(status_code=503, detail="Không thể xoá cấu hình.") from exc
    audit(
        admin_user,
        "settings.delete",
        request=request,
        target_type="setting",
        target_id=key,
        summary=f"Xoá cấu hình {key}",
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
