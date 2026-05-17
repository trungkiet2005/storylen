"""Cloudflare Turnstile token verification.

Called from endpoints that bots love (register, forgot-password). Skipped
when ``TURNSTILE_SECRET_KEY`` is unset so local development + free-tier
deploys aren't blocked behind a captcha they never configured.

Usage:
    from app.services.captcha import verify_turnstile
    await verify_turnstile(request)   # raises HTTPException(403) on bad token
"""
from __future__ import annotations

import logging
import os
from typing import Any

import httpx
from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def is_enabled() -> bool:
    return bool(os.getenv("TURNSTILE_SECRET_KEY", "").strip())


async def verify_turnstile(request: Request) -> None:
    """Validate the ``cf-turnstile-token`` header against Cloudflare.

    No-op when Turnstile isn't configured for the deployment (free tier /
    local dev). When configured, a missing or invalid token raises
    ``HTTPException(403)``.
    """
    secret = os.getenv("TURNSTILE_SECRET_KEY", "").strip()
    if not secret:
        return  # captcha disabled for this deployment

    token = request.headers.get("cf-turnstile-token", "").strip()
    if not token:
        # Block here so the rest of the handler doesn't get to do work for a
        # request that didn't even attempt to solve the challenge.
        raise HTTPException(status_code=403, detail="Captcha bắt buộc. Vui lòng thử lại.")

    remote_ip = (request.headers.get("x-forwarded-for", "") or "").split(",", 1)[0].strip()
    payload: dict[str, str] = {"secret": secret, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(VERIFY_URL, data=payload)
            data: dict[str, Any] = res.json()
    except httpx.HTTPError as exc:
        # Don't punish users for our flakey upstream — fail open with a log.
        logger.warning("Turnstile verify failed (network): %s", exc)
        return

    if not data.get("success"):
        codes = data.get("error-codes") or []
        logger.info("Turnstile token rejected: %s", codes)
        raise HTTPException(
            status_code=403,
            detail="Captcha không hợp lệ. Vui lòng làm mới và thử lại.",
        )
