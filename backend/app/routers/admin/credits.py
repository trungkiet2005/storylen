"""
Admin — Credit Management
GET  /admin/credits/stats         → total credits issued/consumed today
GET  /admin/credits/transactions  → paginated transaction log
POST /admin/credits/grant         → manually grant/revoke credits for a user
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_admin
from app.services.credit_service import grant, upgrade_plan

router = APIRouter(prefix="/credits", tags=["admin-credits"])
logger = logging.getLogger(__name__)


# ─── Response models ──────────────────────────────────────────────────────────

class CreditStats(BaseModel):
    total_credits_granted_today: int
    total_credits_consumed_today: int
    total_users_with_paid_plans: int
    plan_distribution: dict[str, int]


class AdminTransaction(BaseModel):
    id: str
    user_id: str
    username: str | None
    amount: int
    type: str
    reference_id: str | None
    note: str | None
    created_at: str


class TransactionListResponse(BaseModel):
    total: int
    items: list[AdminTransaction]


class GrantRequest(BaseModel):
    user_id: str
    amount: int
    note: str | None = None


class GrantResponse(BaseModel):
    user_id: str
    amount_granted: int
    new_balance: int
    message: str


class PlanUpgradeRequest(BaseModel):
    user_id: str
    plan_id: str  # 'free', 'basic', 'pro', 'premium'
    note: str | None = None


class PlanUpgradeResponse(BaseModel):
    user_id: str
    plan_tier: str
    credits_balance: int
    monthly_credits_granted: int
    bonus_credits_granted: int
    message: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=CreditStats)
def credit_stats(admin: AuthUser = Depends(get_current_admin)):
    """Dashboard counters for credit system health."""
    supabase = get_supabase()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Credits granted today (daily_reset + subscription + bonus + admin_grant + purchase)
    granted_result = (
        supabase.table("credit_transactions")
        .select("amount")
        .gt("amount", 0)
        .gte("created_at", f"{today}T00:00:00Z")
        .execute()
    )
    total_granted = sum(row["amount"] for row in (granted_result.data or []))

    # Credits consumed today (negative amounts)
    consumed_result = (
        supabase.table("credit_transactions")
        .select("amount")
        .lt("amount", 0)
        .gte("created_at", f"{today}T00:00:00Z")
        .execute()
    )
    total_consumed = abs(sum(row["amount"] for row in (consumed_result.data or [])))

    # Plan distribution
    dist_result = (
        supabase.table("profiles")
        .select("plan_tier")
        .execute()
    )
    distribution: dict[str, int] = {}
    for row in (dist_result.data or []):
        tier = row.get("plan_tier", "free")
        distribution[tier] = distribution.get(tier, 0) + 1

    paid_users = sum(v for k, v in distribution.items() if k != "free")

    return CreditStats(
        total_credits_granted_today=total_granted,
        total_credits_consumed_today=total_consumed,
        total_users_with_paid_plans=paid_users,
        plan_distribution=distribution,
    )


@router.get("/transactions", response_model=TransactionListResponse)
def list_transactions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_id: str | None = Query(None),
    tx_type: str | None = Query(None, alias="type"),
    admin: AuthUser = Depends(get_current_admin),
):
    """Paginated credit transaction log with optional filters."""
    supabase = get_supabase()

    query = (
        supabase.table("credit_transactions")
        .select(
            "id, user_id, amount, type, reference_id, note, created_at, "
            "profiles!inner(username)",
            count="exact",
        )
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if user_id:
        query = query.eq("user_id", user_id)
    if tx_type:
        query = query.eq("type", tx_type)

    result = query.execute()
    total = result.count or 0

    items = []
    for row in (result.data or []):
        profile = row.get("profiles") or {}
        items.append(AdminTransaction(
            id=row["id"],
            user_id=row["user_id"],
            username=profile.get("username") if isinstance(profile, dict) else None,
            amount=row["amount"],
            type=row["type"],
            reference_id=row.get("reference_id"),
            note=row.get("note"),
            created_at=row["created_at"],
        ))

    return TransactionListResponse(total=total, items=items)


@router.post("/grant", response_model=GrantResponse)
def grant_credits(
    body: GrantRequest,
    admin: AuthUser = Depends(get_current_admin),
):
    """
    Manually grant (positive amount) or revoke (negative amount) credits.
    Use negative values to correct mistakes, not as punishment.
    """
    if body.amount == 0:
        raise HTTPException(status_code=400, detail="Amount cannot be zero.")

    supabase = get_supabase()

    # Verify user exists
    user_result = (
        supabase.table("profiles")
        .select("user_id, username, credits_balance")
        .eq("user_id", body.user_id)
        .limit(1)
        .execute()
    )
    if not user_result.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    note = body.note or f"Admin grant by {admin.username}"
    tx_type = "admin_grant" if body.amount > 0 else "admin_revoke"

    try:
        new_balance = grant(body.user_id, body.amount, tx_type, supabase, note=note)
    except HTTPException:
        raise

    action = "cộng" if body.amount > 0 else "trừ"
    return GrantResponse(
        user_id=body.user_id,
        amount_granted=body.amount,
        new_balance=new_balance,
        message=f"Đã {action} {abs(body.amount)} credits. Số dư mới: {new_balance}.",
    )


@router.post("/upgrade-plan", response_model=PlanUpgradeResponse)
def admin_upgrade_plan(
    body: PlanUpgradeRequest,
    admin: AuthUser = Depends(get_current_admin),
):
    """
    Upgrade (or downgrade) a user's subscription plan.
    Grants the plan's monthly credits and signup bonus if applicable.
    Use this to manually activate paid plans after offline payment confirmation.
    """
    supabase = get_supabase()

    # Verify user exists
    user_result = (
        supabase.table("profiles")
        .select("user_id, username")
        .eq("user_id", body.user_id)
        .limit(1)
        .execute()
    )
    if not user_result.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    username = user_result.data[0].get("username", body.user_id)

    result = upgrade_plan(body.user_id, body.plan_id, supabase)

    if body.note:
        supabase.table("credit_transactions").insert({
            "user_id": body.user_id,
            "amount": 0,
            "type": "admin_grant",
            "note": f"[Admin {admin.username}] {body.note}",
        }).execute()

    logger.info(
        "Admin %s upgraded user %s (%s) to plan %s",
        admin.username, username, body.user_id, body.plan_id,
    )

    bonus = result["bonus_credits_granted"]
    return PlanUpgradeResponse(
        user_id=body.user_id,
        plan_tier=result["plan_tier"],
        credits_balance=result["credits_balance"],
        monthly_credits_granted=result["monthly_credits_granted"],
        bonus_credits_granted=bonus,
        message=(
            f"Đã nâng cấp {username} lên gói {body.plan_id.upper()}. "
            f"Đã cộng {result['monthly_credits_granted']} credits tháng"
            + (f" + {bonus} bonus." if bonus else ".")
        ),
    )
