"""Auth routes for login/registration and admin approval."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
import httpx
import httpx

from control_plane.auth import authenticate_user, create_access_token, hash_password, require_admin, get_current_user
from control_plane.storage.db import get_session_factory
from control_plane.storage.models import User, MangaProject
from control_plane.config import update_kaggle_worker_url

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class RegisterBody(BaseModel):
    username: str
    password: str


class LoginBody(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    username: str
    role: str
    translator_status: str


class UserOut(BaseModel):
    id: str
    username: str
    role: str
    translator_status: str


@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: RegisterBody):
    username = body.username.strip()
    if len(username) < 3 or len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Username or password too short")

    async with get_session_factory()() as session:
        existing = await session.execute(select(User).where(User.username == username))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Username already exists")
        user = User(
            username=username,
            password_hash=hash_password(body.password),
            role="user",
            translator_status="pending",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return UserOut(
            id=user.id,
            username=user.username,
            role=user.role,
            translator_status=user.translator_status,
        )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginBody):
    user = await authenticate_user(body.username.strip(), body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id, "role": user.role})
    return AuthResponse(
        token=token,
        username=user.username,
        role=user.role,
        translator_status=user.translator_status,
    )


@router.get("/me", response_model=UserOut)
async def me(current: User = Depends(get_current_user)):
    return UserOut(
        id=current.id,
        username=current.username,
        role=current.role,
        translator_status=current.translator_status,
    )
@router.get("/me/keys")
async def get_my_keys(current: User = Depends(get_current_user)):
    return current.api_keys or {}

class KeysBody(BaseModel):
    gemini_api_key: str | None = None
    kaggle_username: str | None = None
    kaggle_key: str | None = None

@router.put("/me/keys")
async def update_my_keys(body: KeysBody, current: User = Depends(get_current_user)):
    async with get_session_factory()() as session:
        user = await session.get(User, current.id)
        if not user:
            raise HTTPException(status_code=404)
        user.api_keys = body.model_dump()
        await session.commit()
        return user.api_keys


@router.get("/users", response_model=list[UserOut])
async def list_users(status: str | None = None, _: User = Depends(require_admin)):
    async with get_session_factory()() as session:
        query = select(User)
        if status:
            query = query.where(User.translator_status == status)
        result = await session.execute(query.order_by(User.created_at.desc()))
        return [
            UserOut(
                id=u.id,
                username=u.username,
                role=u.role,
                translator_status=u.translator_status,
            )
            for u in result.scalars()
        ]


class ApproveBody(BaseModel):
    kaggle_worker_url: str | None = None

@router.post("/users/{user_id}/approve", response_model=UserOut)
async def approve_user(user_id: str, body: ApproveBody | None = None, _: User = Depends(require_admin)):
    async with get_session_factory()() as session:
        user = await session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.translator_status = "approved"
        if user.role == "user":
            user.role = "translator"
            
        if body and body.kaggle_worker_url:
            current_keys = user.api_keys or {}
            current_keys["kaggle_worker_url"] = body.kaggle_worker_url
            user.api_keys = current_keys
            
        await session.commit()
        await session.refresh(user)
        return UserOut(
            id=user.id,
            username=user.username,
            role=user.role,
            translator_status=user.translator_status,
        )


@router.post("/users/{user_id}/reject", response_model=UserOut)
async def reject_user(user_id: str, _: User = Depends(require_admin)):
    async with get_session_factory()() as session:
        user = await session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.translator_status = "rejected"
        await session.commit()
        await session.refresh(user)
        return UserOut(
            id=user.id,
            username=user.username,
            role=user.role,
            translator_status=user.translator_status,
        )


class UserStatsOut(UserOut):
    manga_count: int
    api_keys: dict = {}


@router.get("/users/stats/all", response_model=list[UserStatsOut])
async def get_all_users_with_stats(_: User = Depends(require_admin)):
    async with get_session_factory()() as session:
        query = select(User).order_by(User.created_at.desc())
        result = await session.execute(query)
        users = result.scalars().all()

        stats = []
        for user in users:
            manga_query = select(MangaProject).where(MangaProject.created_by == user.id)
            manga_result = await session.execute(manga_query)
            manga_count = len(manga_result.scalars().all())
            stats.append(UserStatsOut(
                id=user.id,
                username=user.username,
                role=user.role,
                translator_status=user.translator_status,
                manga_count=manga_count,
                api_keys=user.api_keys or {},
            ))
        return stats


class KeyTestResult(BaseModel):
    key: str
    url: str
    ok: bool
    status: int | None = None
    detail: str = ""


class KeyTestBody(BaseModel):
    kaggle_worker_url: str | None = None
    gemini_api_key: str | None = None


@router.post("/users/{user_id}/test-keys", response_model=list[KeyTestResult])
async def test_user_keys(user_id: str, body: KeyTestBody | None = None, _: User = Depends(require_admin)):
    async with get_session_factory()() as session:
        user = await session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        db_keys = user.api_keys or {}

    # Ưu tiên giá trị từ form, fallback về DB
    keys = {
        "kaggle_worker_url": (body.kaggle_worker_url if body and body.kaggle_worker_url else db_keys.get("kaggle_worker_url", "")),
        "gemini_api_key":    (body.gemini_api_key    if body and body.gemini_api_key    else db_keys.get("gemini_api_key", "")),
    }

    results = []

    kaggle_url = (keys.get("kaggle_worker_url") or "").strip()
    if kaggle_url:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(kaggle_url.rstrip("/") + "/health")
            results.append(KeyTestResult(
                key="kaggle_worker_url",
                url=kaggle_url,
                ok=r.status_code < 400,
                status=r.status_code,
                detail="OK" if r.status_code < 400 else r.text[:120],
            ))
        except Exception as e:
            results.append(KeyTestResult(
                key="kaggle_worker_url",
                url=kaggle_url,
                ok=False,
                detail=str(e)[:120],
            ))
    else:
        results.append(KeyTestResult(
            key="kaggle_worker_url",
            url="",
            ok=False,
            detail="Chưa cấu hình",
        ))

    gemini_key = keys.get("gemini_api_key", "").strip()
    if gemini_key:
        results.append(KeyTestResult(
            key="gemini_api_key",
            url="(secret)",
            ok=True,
            detail=f"Đã cấu hình — {gemini_key[:8]}••••",
        ))
    else:
        results.append(KeyTestResult(
            key="gemini_api_key",
            url="",
            ok=False,
            detail="Chưa cấu hình",
        ))

    return results


class AdminUpdateKeysBody(BaseModel):
    gemini_api_key: str | None = None
    kaggle_username: str | None = None
    kaggle_key: str | None = None
    kaggle_worker_url: str | None = None


@router.put("/users/{user_id}/keys")
async def admin_update_user_keys(user_id: str, body: AdminUpdateKeysBody, _: User = Depends(require_admin)):
    async with get_session_factory()() as session:
        user = await session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        current = user.api_keys or {}
        for field_name, val in body.model_dump().items():
            if val is not None:
                current[field_name] = val
        user.api_keys = current
        await session.commit()

    # Nếu có URL ngrok mới → cập nhật secrets/keys.json + reload settings ngay
    if body.kaggle_worker_url is not None:
        update_kaggle_worker_url(body.kaggle_worker_url)

    return {"ok": True, "api_keys": current}
