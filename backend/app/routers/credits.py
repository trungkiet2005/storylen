"""
StoryLens Backend — Credits & Plans Router
GET  /credits         → current balance, plan info, recent transactions
GET  /plans           → all available subscription plans
POST /credits/upgrade → upgrade to a paid plan (placeholder until real payment)
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.database import get_supabase
from app.routers.auth import AuthUser, get_current_user
from app.services.credit_service import get_balance

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
    _user: AuthUser = Depends(get_current_user),
):
    """
    Self-service upgrade is disabled until payment gateway is integrated.
    Plan upgrades are handled manually by admins via /admin/credits/upgrade-plan.
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "Tính năng thanh toán chưa được tích hợp. "
            "Vui lòng liên hệ admin để được nâng cấp gói thủ công."
        ),
    )


# ─── Daily check-in (Tier B #12) ──────────────────────────────────────────────

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

_VN_TZ_CHECKIN = ZoneInfo("Asia/Ho_Chi_Minh")

CHECKIN_BASE_REWARD = 2          # base credits per check-in
CHECKIN_STREAK_BONUS_CAP = 5      # max bonus from streak
# Streak bonus = min(streak // 3, CAP); so day 3 = +1, day 6 = +2, ... day 15 = +5


class CheckinStatusResponse(BaseModel):
    eligible: bool
    next_eligible_at: str | None = None
    streak: int = 0
    last_checkin_at: str | None = None


class CheckinResponse(BaseModel):
    credits_balance: int
    credits_awarded: int
    streak: int
    next_eligible_at: str
    message: str


def _today_vn_date() -> str:
    return datetime.now(_VN_TZ_CHECKIN).date().isoformat()


def _vn_midnight_iso_tomorrow() -> str:
    now_vn = datetime.now(_VN_TZ_CHECKIN)
    tomorrow = (now_vn + timedelta(days=1)).date()
    midnight_vn = datetime.combine(tomorrow, datetime.min.time(), tzinfo=_VN_TZ_CHECKIN)
    return midnight_vn.astimezone(timezone.utc).isoformat()


def _read_checkin_profile(supabase, user_id: str) -> dict:
    """Read check-in fields with graceful fallback when v4 migration not yet applied."""
    try:
        res = (
            supabase.table("profiles")
            .select("last_checkin_at, checkin_streak, credits_balance")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        if "checkin" in str(exc).lower():
            # v4 migration missing — fall back to credits_balance only
            res = (
                supabase.table("profiles")
                .select("credits_balance")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            row = (res.data or [{}])[0]
            return {
                "credits_balance": row.get("credits_balance", 0),
                "last_checkin_at": None,
                "checkin_streak": 0,
                "_migration_missing": True,
            }
        raise
    return (res.data or [{}])[0]


@router.get("/checkin", response_model=CheckinStatusResponse)
def get_checkin_status(user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase()
    profile = _read_checkin_profile(supabase, user.id)

    last = profile.get("last_checkin_at")
    if not last:
        return CheckinStatusResponse(eligible=True, streak=0)

    try:
        last_dt = datetime.fromisoformat(str(last).replace("Z", "+00:00"))
        last_vn_date = last_dt.astimezone(_VN_TZ_CHECKIN).date().isoformat()
    except Exception:
        return CheckinStatusResponse(eligible=True, streak=int(profile.get("checkin_streak") or 0))

    today_vn = _today_vn_date()
    eligible = last_vn_date < today_vn
    return CheckinStatusResponse(
        eligible=eligible,
        next_eligible_at=None if eligible else _vn_midnight_iso_tomorrow(),
        streak=int(profile.get("checkin_streak") or 0),
        last_checkin_at=str(last) if last else None,
    )


@router.post("/checkin", response_model=CheckinResponse)
def daily_checkin(user: AuthUser = Depends(get_current_user)):
    """Award daily check-in credits. Idempotent per VN day.

    Reward = CHECKIN_BASE_REWARD (2) + streak_bonus (capped at 5).
    Streak resets if user skips a day.
    """
    supabase = get_supabase()
    profile = _read_checkin_profile(supabase, user.id)

    if profile.get("_migration_missing"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Tính năng điểm danh hằng ngày chưa sẵn sàng (DB migration v4 chưa chạy).",
        )

    last = profile.get("last_checkin_at")
    today_vn = _today_vn_date()

    last_vn_date: str | None = None
    if last:
        try:
            last_dt = datetime.fromisoformat(str(last).replace("Z", "+00:00"))
            last_vn_date = last_dt.astimezone(_VN_TZ_CHECKIN).date().isoformat()
        except Exception:
            last_vn_date = None

    if last_vn_date == today_vn:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hôm nay bạn đã điểm danh rồi. Hẹn lại ngày mai!",
        )

    # Streak: increment if consecutive, reset to 1 otherwise.
    prev_streak = int(profile.get("checkin_streak") or 0)
    if last_vn_date:
        try:
            last_date = datetime.fromisoformat(last_vn_date).date()
            today_date = datetime.fromisoformat(today_vn).date()
            if (today_date - last_date).days == 1:
                streak = prev_streak + 1
            else:
                streak = 1
        except Exception:
            streak = 1
    else:
        streak = 1

    streak_bonus = min(streak // 3, CHECKIN_STREAK_BONUS_CAP)
    reward = CHECKIN_BASE_REWARD + streak_bonus
    new_balance = int(profile.get("credits_balance") or 0) + reward

    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        supabase.table("profiles").update({
            "credits_balance": new_balance,
            "last_checkin_at": now_iso,
            "checkin_streak": streak,
        }).eq("user_id", user.id).execute()

        supabase.table("credit_transactions").insert({
            "user_id": user.id,
            "amount": reward,
            "type": "daily_checkin",
            "note": f"Điểm danh ngày {today_vn} · streak {streak}",
        }).execute()
    except Exception as exc:
        logger.error("Daily check-in failed for %s: %s", user.id, exc)
        raise HTTPException(status_code=500, detail="Không lưu được điểm danh.") from exc

    msg = f"+{reward} credit · chuỗi {streak} ngày"
    if streak_bonus > 0:
        msg += f" (gồm bonus chuỗi +{streak_bonus})"

    return CheckinResponse(
        credits_balance=new_balance,
        credits_awarded=reward,
        streak=streak,
        next_eligible_at=_vn_midnight_iso_tomorrow(),
        message=msg,
    )
