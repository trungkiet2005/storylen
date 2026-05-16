"""
StoryLens Backend — Stripe Payments Router

Mounted under /credits (the existing prefix) to keep client routes coherent:
  POST /credits/checkout        → create Stripe Checkout Session
  POST /credits/billing-portal  → open Stripe customer portal
  POST /credits/webhook         → handle Stripe events (no auth, signature-verified)

If STRIPE_SECRET_KEY is empty, these endpoints return 503 with a clear message
so the rest of the app keeps working.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_user

router = APIRouter(prefix="/credits", tags=["payments"])
logger = logging.getLogger(__name__)


class CheckoutRequest(BaseModel):
    plan_id: str


class CheckoutResponse(BaseModel):
    checkout_url: str


def _require_stripe(settings: Settings):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Thanh toán chưa được cấu hình. Vui lòng liên hệ admin.",
        )
    try:
        import stripe  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe SDK chưa được cài đặt trên server.",
        ) from exc
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def _price_for_plan(settings: Settings, plan_id: str) -> str:
    mapping = {
        "basic": settings.STRIPE_PRICE_BASIC,
        "pro": settings.STRIPE_PRICE_PRO,
        "premium": settings.STRIPE_PRICE_PREMIUM,
    }
    price = mapping.get(plan_id)
    if not price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gói không hợp lệ hoặc chưa được cấu hình Stripe price ID.",
        )
    return price


def _get_or_create_customer(stripe, user: AuthUser, sb) -> str:
    """Look up existing stripe_customer_id on the profile, or create one."""
    try:
        profile = sb.table("profiles").select("stripe_customer_id").eq("user_id", user.id).limit(1).execute()
        existing = (profile.data or [{}])[0].get("stripe_customer_id")
        if existing:
            return existing
    except Exception:
        pass

    customer = stripe.Customer.create(
        email=user.email,
        metadata={"user_id": user.id, "username": user.username},
    )
    try:
        sb.table("profiles").update({"stripe_customer_id": customer.id}).eq("user_id", user.id).execute()
    except Exception as exc:
        logger.warning("persist stripe_customer_id failed: %s", exc)
    return customer.id


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    body: CheckoutRequest,
    user: AuthUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    stripe = _require_stripe(settings)
    price_id = _price_for_plan(settings, body.plan_id)
    sb = get_supabase()
    customer_id = _get_or_create_customer(stripe, user, sb)

    base = settings.FRONTEND_BASE_URL.rstrip("/")
    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{base}/plans?status=success",
            cancel_url=f"{base}/plans?status=cancelled",
            metadata={"user_id": user.id, "plan_id": body.plan_id},
            subscription_data={"metadata": {"user_id": user.id, "plan_id": body.plan_id}},
        )
    except Exception as exc:
        logger.warning("stripe checkout create failed: %s", exc)
        raise HTTPException(status_code=502, detail="Không tạo được phiên thanh toán.") from exc

    return CheckoutResponse(checkout_url=session.url)


@router.post("/billing-portal", response_model=CheckoutResponse)
def billing_portal(
    user: AuthUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    stripe = _require_stripe(settings)
    sb = get_supabase()
    customer_id = _get_or_create_customer(stripe, user, sb)
    base = settings.FRONTEND_BASE_URL.rstrip("/")
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{base}/profile",
        )
    except Exception as exc:
        logger.warning("billing portal failed: %s", exc)
        raise HTTPException(status_code=502, detail="Không mở được cổng thanh toán.") from exc
    return CheckoutResponse(checkout_url=session.url)


@router.post("/webhook")
async def stripe_webhook(request: Request, settings: Settings = Depends(get_settings)):
    """Stripe sends events here. Verify signature with STRIPE_WEBHOOK_SECRET."""
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe chưa cấu hình.")
    try:
        import stripe  # type: ignore
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Stripe SDK chưa cài.") from exc

    stripe.api_key = settings.STRIPE_SECRET_KEY
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as exc:
        logger.warning("Stripe webhook signature verification failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid signature") from exc

    sb = get_supabase()
    event_type = event["type"]
    data: dict[str, Any] = event["data"]["object"]

    if event_type in ("checkout.session.completed", "customer.subscription.created", "customer.subscription.updated"):
        user_id = (data.get("metadata") or {}).get("user_id")
        plan_id = (data.get("metadata") or {}).get("plan_id")
        if not user_id or not plan_id:
            # Try subscription items fallback for subscription.* events.
            sub_metadata = (data.get("metadata") or {})
            user_id = user_id or sub_metadata.get("user_id")
            plan_id = plan_id or sub_metadata.get("plan_id")
        if user_id and plan_id:
            try:
                # Grant credits according to subscription_plans row.
                plan_row = sb.table("subscription_plans").select("monthly_credits,bonus_credits").eq("id", plan_id).limit(1).execute()
                grant = 0
                if plan_row.data:
                    grant = int(plan_row.data[0].get("monthly_credits") or 0) + int(plan_row.data[0].get("bonus_credits") or 0)
                sb.rpc("apply_plan_upgrade", {
                    "p_user_id": user_id, "p_plan_id": plan_id, "p_credits": grant,
                }).execute()
            except Exception as exc:
                logger.info("apply_plan_upgrade RPC failed, falling back to direct update: %s", exc)
                try:
                    sb.table("profiles").update({"plan_tier": plan_id}).eq("user_id", user_id).execute()
                except Exception as exc2:
                    logger.warning("plan update failed: %s", exc2)
            # Emit notification.
            try:
                from app.routers.notifications import emit_notification
                emit_notification(
                    user_id,
                    type="billing",
                    title="Nâng cấp gói thành công",
                    body=f"Bạn đã được nâng cấp lên gói {plan_id}.",
                    url="/profile",
                )
            except Exception:
                pass

    elif event_type == "customer.subscription.deleted":
        user_id = (data.get("metadata") or {}).get("user_id")
        if user_id:
            try:
                sb.table("profiles").update({"plan_tier": "free"}).eq("user_id", user_id).execute()
            except Exception as exc:
                logger.warning("downgrade failed: %s", exc)

    return {"received": True}
