"""
StoryLens — Credit Service
Manages credit balance, daily resets, and transaction ledger.

Credit model:
- FREE plan: 5 credits/day (reset each day in Asia/Ho_Chi_Minh timezone)
- Paid plans: monthly pool added on subscription start; no daily reset
- 1 credit = 1 image translation OR 1 Q&A question
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

_VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")

# Plan limits — mirrors subscription_plans table (cached in-process to avoid
# DB round-trips on every request).
PLAN_CONFIGS: dict[str, dict[str, Any]] = {
    "free":    {"daily_credits": 5,  "max_batch_size": 5},
    "basic":   {"daily_credits": 0,  "max_batch_size": 20},
    "pro":     {"daily_credits": 0,  "max_batch_size": 50},
    "premium": {"daily_credits": 0,  "max_batch_size": 100},
}


def _today_vn() -> str:
    """Return today's date string in Vietnam timezone (YYYY-MM-DD)."""
    return datetime.now(_VN_TZ).strftime("%Y-%m-%d")


def _get_profile_credits(user_id: str, supabase: Any) -> dict[str, Any]:
    result = (
        supabase.table("profiles")
        .select("plan_tier, credits_balance, daily_credits_reset_at")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hồ sơ người dùng.",
        )
    return result.data[0]


def check_and_reset_daily(user_id: str, supabase: Any) -> dict[str, Any]:
    """
    For FREE plan: if today > last reset date, replenish credits to 5 and
    record a daily_reset transaction. Returns updated profile row.
    """
    profile = _get_profile_credits(user_id, supabase)
    plan_tier = profile.get("plan_tier", "free")

    if plan_tier != "free":
        return profile

    today = _today_vn()
    last_reset = str(profile.get("daily_credits_reset_at", ""))[:10]

    if last_reset >= today:
        return profile

    # New day — reset credits to 5
    daily_limit = PLAN_CONFIGS["free"]["daily_credits"]
    current_balance = profile.get("credits_balance", 0)
    delta = daily_limit - current_balance  # could be 0 if they had extras

    if delta > 0:
        try:
            supabase.table("profiles").update({
                "credits_balance": daily_limit,
                "daily_credits_reset_at": today,
            }).eq("user_id", user_id).execute()

            supabase.table("credit_transactions").insert({
                "user_id": user_id,
                "amount": delta,
                "type": "daily_reset",
                "note": f"Reset hàng ngày — {today}",
            }).execute()

            profile["credits_balance"] = daily_limit
            profile["daily_credits_reset_at"] = today
        except Exception as exc:
            logger.warning("Daily credit reset failed for %s: %s", user_id, exc)
    else:
        # Just update reset date without changing balance
        try:
            supabase.table("profiles").update({
                "daily_credits_reset_at": today,
            }).eq("user_id", user_id).execute()
            profile["daily_credits_reset_at"] = today
        except Exception as exc:
            logger.warning("Daily reset date update failed for %s: %s", user_id, exc)

    return profile


def get_balance(user_id: str, supabase: Any) -> dict[str, Any]:
    """
    Get current credit balance and plan info after performing daily reset check.
    Returns dict with plan_tier, credits_balance, daily_credits_reset_at.
    """
    return check_and_reset_daily(user_id, supabase)


def check_has_credits(user_id: str, amount: int, supabase: Any) -> dict[str, Any]:
    """
    Verify the user has at least `amount` credits. Raises 402 if not.
    Returns updated profile after daily reset check.
    """
    profile = check_and_reset_daily(user_id, supabase)
    balance = profile.get("credits_balance", 0)

    if balance < amount:
        plan = profile.get("plan_tier", "free")
        if plan == "free":
            detail = (
                "Bạn đã dùng hết credit hôm nay. "
                "Credit miễn phí sẽ được nạp lại vào ngày mai (5 credit/ngày). "
                "Nâng cấp gói để có thêm credit."
            )
        else:
            detail = (
                f"Không đủ credit. Số dư hiện tại: {balance}. "
                "Vui lòng nâng cấp gói hoặc mua thêm credit."
            )
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=detail,
        )

    return profile


def check_batch_size(user_id: str, num_files: int, supabase: Any) -> None:
    """
    Verify the number of files doesn't exceed the plan's max_batch_size.
    """
    profile = _get_profile_credits(user_id, supabase)
    plan_tier = profile.get("plan_tier", "free")
    max_batch = PLAN_CONFIGS.get(plan_tier, PLAN_CONFIGS["free"])["max_batch_size"]

    if num_files > max_batch:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Gói {plan_tier.upper()} chỉ cho phép tải tối đa {max_batch} ảnh/lần. "
                f"Bạn đang cố tải {num_files} ảnh. Nâng cấp gói để tải nhiều hơn."
            ),
        )


def deduct(
    user_id: str,
    amount: int,
    tx_type: str,
    supabase: Any,
    reference_id: str | None = None,
    note: str | None = None,
) -> int:
    """
    Deduct `amount` credits from user's balance and log the transaction.
    Returns new balance. Caller should call check_has_credits first.
    """
    try:
        result = (
            supabase.table("profiles")
            .select("credits_balance")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        current = result.data[0]["credits_balance"] if result.data else 0
        new_balance = max(0, current - amount)

        supabase.table("profiles").update({
            "credits_balance": new_balance,
        }).eq("user_id", user_id).execute()

        txn: dict[str, Any] = {
            "user_id": user_id,
            "amount": -amount,
            "type": tx_type,
            "note": note,
        }
        if reference_id:
            txn["reference_id"] = reference_id

        supabase.table("credit_transactions").insert(txn).execute()
        return new_balance
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Credit deduction failed for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi khi trừ credit. Vui lòng thử lại.",
        ) from exc


def grant(
    user_id: str,
    amount: int,
    tx_type: str,
    supabase: Any,
    note: str | None = None,
) -> int:
    """
    Add `amount` credits to user's balance and log the transaction.
    Returns new balance.
    """
    try:
        result = (
            supabase.table("profiles")
            .select("credits_balance")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        current = result.data[0]["credits_balance"] if result.data else 0
        new_balance = current + amount

        supabase.table("profiles").update({
            "credits_balance": new_balance,
        }).eq("user_id", user_id).execute()

        supabase.table("credit_transactions").insert({
            "user_id": user_id,
            "amount": amount,
            "type": tx_type,
            "note": note,
        }).execute()
        return new_balance
    except Exception as exc:
        logger.error("Credit grant failed for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi khi cộng credit.",
        ) from exc


def upgrade_plan(
    user_id: str,
    new_plan: str,
    supabase: Any,
) -> dict[str, Any]:
    """
    Upgrade a user to a new plan. Grants monthly credits and signup bonus
    if this is their first time on this plan.
    Returns updated profile.
    """
    if new_plan not in PLAN_CONFIGS:
        raise HTTPException(status_code=400, detail="Gói không hợp lệ.")

    # Get plan details from DB
    plan_result = (
        supabase.table("subscription_plans")
        .select("monthly_credits, bonus_credits, daily_credits")
        .eq("id", new_plan)
        .limit(1)
        .execute()
    )
    if not plan_result.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói đăng ký.")

    plan_data = plan_result.data[0]
    monthly_credits = plan_data["monthly_credits"]
    bonus_credits = plan_data["bonus_credits"]

    # Check if first time on this plan
    sub_result = (
        supabase.table("user_subscriptions")
        .select("plan_id, bonus_credits_given")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    was_on_plan = False
    bonus_given = False
    if sub_result.data:
        was_on_plan = sub_result.data[0]["plan_id"] == new_plan
        bonus_given = sub_result.data[0]["bonus_credits_given"]

    # Update subscription record
    from datetime import timezone
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("user_subscriptions").upsert({
        "user_id": user_id,
        "plan_id": new_plan,
        "status": "active",
        "started_at": now,
        "bonus_credits_given": bonus_given or (not was_on_plan and bonus_credits > 0),
    }).execute()

    # Update profile plan_tier
    supabase.table("profiles").update({
        "plan_tier": new_plan,
    }).eq("user_id", user_id).execute()

    # Grant monthly credits
    new_balance = grant(user_id, monthly_credits, "subscription", supabase,
                        note=f"Credits tháng — gói {new_plan.upper()}")

    # Grant bonus if first time
    if not was_on_plan and not bonus_given and bonus_credits > 0:
        new_balance = grant(user_id, bonus_credits, "bonus", supabase,
                            note=f"Bonus đăng ký — gói {new_plan.upper()}")
        supabase.table("user_subscriptions").update({
            "bonus_credits_given": True,
        }).eq("user_id", user_id).execute()

    return {
        "plan_tier": new_plan,
        "credits_balance": new_balance,
        "monthly_credits_granted": monthly_credits,
        "bonus_credits_granted": bonus_credits if (not was_on_plan and not bonus_given) else 0,
    }
