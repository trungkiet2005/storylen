"""Auth helpers for JWT + password hashing."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
from typing import Any

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select

from control_plane.config import get_settings
from control_plane.storage.db import get_session_factory
from control_plane.storage.models import User

log = logging.getLogger("storylens.auth")
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(password, password_hash)


def create_access_token(payload: dict[str, Any], expires: timedelta | None = None) -> str:
    settings = get_settings()
    exp = datetime.now(timezone.utc) + (expires or timedelta(days=7))
    to_encode = {**payload, "exp": exp}
    return jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")


async def authenticate_user(username: str, password: str) -> User | None:
    async with get_session_factory()() as session:
        result = await session.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = payload.get("sub")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    async with get_session_factory()() as session:
        user = await session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> User | None:
    if not credentials:
        return None
    token = credentials.credentials
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id: return None
        async with get_session_factory()() as session:
            return await session.get(User, user_id)
    except Exception:
        return None

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

async def require_translator(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("admin", "translator"):
        raise HTTPException(status_code=403, detail="Translator/Admin only")
    return user


async def ensure_admin_user() -> None:
    settings = get_settings()
    if not settings.admin_username or not settings.admin_password:
        log.warning("Admin seed skipped: ADMIN_USERNAME or ADMIN_PASSWORD missing")
        return

    async with get_session_factory()() as session:
        result = await session.execute(select(User).where(User.username == settings.admin_username))
        existing = result.scalar_one_or_none()
        if existing:
            return
        user = User(
            username=settings.admin_username,
            password_hash=hash_password(settings.admin_password),
            role="admin",
            translator_status="approved",
        )
        session.add(user)
        await session.commit()
        log.info("Seeded admin user '%s'", settings.admin_username)
