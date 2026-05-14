"""
StoryLens Backend — Credits & Plans Router
GET  /credits         → current balance, plan info, recent transactions
GET  /plans           → all available subscription plans
POST /credits/upgrade → upgrade to a paid plan (placeholder until real payment)
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_user
from app.services.credit_service import get_balance, upgrade_plan

router = APIRouter(prefix="/credits", tags=["credits"])
logger = logging.getLogger(__name__)


# ─── Response models ──────────────────────────────────────────────────────────

class PlanInfo(BaseModel):
    id: str
    name: str
    price_vnd: int
    monthly_credits: int
    daily_credits: int
    max_batch_size: int
    priority_weight: int
    bonus_credits: int
    sort_order: int


class CreditTransaction(BaseModel):
    id: str
    amount: int
    type: str
    reference_id: str | None = None
    note: str | None = None
    created_at: str


class CreditsResponse(BaseModel):
    plan_tier: str
    credits_balance: int
    daily_credits_reset_at: str
    plan: PlanInfo | None = None
    recent_transactions: list[CreditTransaction] = []


class UpgradeRequest(BaseModel):
    plan_id: str


class UpgradeResponse(BaseModel):
    plan_tier: str
    credits_balance: int
    monthly_credits_granted: int
    bonus_credits_granted: int
    message: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=CreditsResponse)
def get_credits(user: AuthUser = Depends(get_current_user)):
    """Get current credit balance, plan details, and last 10 transactions."""
    supabase = get_supabase()

    profile = get_balance(user.id, supabase)
    plan_tier = profile.get("plan_tier", "free")

    # Fetch plan details
    plan_result = (
        supabase.table("subscription_plans")
        .select("*")
        .eq("id", plan_tier)
        .limit(1)
        .execute()
    )
    plan = PlanInfo(**plan_result.data[0]) if plan_result.data else None

    # Fetch last 10 transactions
    txn_result = (
        supabase.table("credit_transactions")
        .select("id, amount, type, reference_id, note, created_at")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    transactions = [CreditTransaction(**row) for row in (txn_result.data or [])]

    return CreditsResponse(
        plan_tier=plan_tier,
        credits_balance=profile.get("credits_balance", 0),
        daily_credits_reset_at=str(profile.get("daily_credits_reset_at", "")),
        plan=plan,
        recent_transactions=transactions,
    )


@router.get("/plans", response_model=list[PlanInfo])
def list_plans():
    """Return all available subscription plans sorted by tier."""
    supabase = get_supabase()
    result = (
        supabase.table("subscription_plans")
        .select("*")
        .order("sort_order")
        .execute()
    )
    return [PlanInfo(**row) for row in (result.data or [])]


@router.post("/upgrade", response_model=UpgradeResponse)
def upgrade_subscription(
    body: UpgradeRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Upgrade user to a new plan and grant monthly + bonus credits.
    (Placeholder: no real payment processing yet — admin grants manually.)
    """
    supabase = get_supabase()
    result = upgrade_plan(user.id, body.plan_id, supabase)
    return UpgradeResponse(
        **result,
        message=(
            f"Đã nâng cấp lên gói {body.plan_id.upper()}. "
            f"Nhận được {result['monthly_credits_granted']} credits tháng"
            + (f" + {result['bonus_credits_granted']} credits bonus!" if result["bonus_credits_granted"] else "!")
        ),
    )
