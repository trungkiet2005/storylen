"""
Admin · Model Monitor router.

    GET /admin/model-monitor/summary      — KPI summary + time-series for chart
    GET /admin/model-monitor/drift        — Model drift status & alerts
    GET /admin/model-monitor/ab-results   — A/B test comparison table
    POST /admin/model-monitor/ab-config   — Set A/B variant (off / experiment_50)
    GET /admin/model-monitor/raw          — Raw paginated metric rows
"""
from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.routers.auth import AuthUser, get_current_admin
from app.services.model_monitor import (
    get_ab_results,
    get_metrics_summary,
)

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)


# ─── Response models ──────────────────────────────────────────────────────────

class MetricsSummaryResponse(BaseModel):
    total_pages: int
    avg_ocr_confidence: float | None
    avg_latency_ms: float | None
    translation_success_rate: float | None
    avg_bubble_count: float | None
    bubble_detection_rate: float | None
    drift_status: str
    drift_details: list | None = None
    time_series: list[dict]


class DriftResponse(BaseModel):
    drift_status: str
    drift_details: list | None = None
    window_size: int


class ABResultsResponse(BaseModel):
    variants: list[dict]
    recommendation: str


class SetABVariantRequest(BaseModel):
    variant: Literal["off", "experiment_50"]


class RawMetricsResponse(BaseModel):
    rows: list[dict]
    total: int


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/model-monitor/summary", response_model=MetricsSummaryResponse)
def model_monitor_summary(
    days: int = Query(default=7, ge=1, le=90, description="Number of days to look back"),
    _admin: AuthUser = Depends(get_current_admin),
) -> MetricsSummaryResponse:
    """
    Return KPI summary and daily time-series for the Admin Dashboard chart.
    Covers: avg OCR confidence, avg latency, translation success rate,
    bubble detection rate, and drift status.
    """
    summary = get_metrics_summary(days=days)
    return MetricsSummaryResponse(**summary)


@router.get("/model-monitor/drift", response_model=DriftResponse)
def model_monitor_drift(
    _admin: AuthUser = Depends(get_current_admin),
) -> DriftResponse:
    """
    Run drift detection comparing the most recent 50 pages vs the 50 pages before.
    Status: ok | warning | critical | insufficient_data
    """
    from app.services.model_monitor import DRIFT_WINDOW, _compute_drift_status
    from app.database import get_supabase

    supabase = get_supabase()
    rows_resp = (
        supabase.table("model_metrics")
        .select("avg_ocr_confidence, bubble_count, translation_success, recorded_at")
        .order("recorded_at", desc=False)
        .execute()
    )
    rows = rows_resp.data or []
    drift = _compute_drift_status(rows)
    return DriftResponse(
        drift_status=drift["status"],
        drift_details=drift.get("details"),
        window_size=DRIFT_WINDOW,
    )


@router.get("/model-monitor/ab-results", response_model=ABResultsResponse)
def model_monitor_ab_results(
    _admin: AuthUser = Depends(get_current_admin),
) -> ABResultsResponse:
    """
    Compare metrics per translator variant from stored model_metrics.
    Returns ranked list with best performer recommendation.
    """
    result = get_ab_results()
    return ABResultsResponse(**result)


@router.post("/model-monitor/ab-config")
def model_monitor_set_ab(
    body: SetABVariantRequest,
    admin: AuthUser = Depends(get_current_admin),
) -> dict:
    """
    Set the A/B test variant in app_settings.
      - off           → disable A/B, all traffic gets control config
      - experiment_50 → 50% of users get experimental model config
    """
    from app.database import get_supabase
    supabase = get_supabase()
    supabase.table("app_settings").upsert(
        {"key": "ab_test_variant", "value": body.variant},
        on_conflict="key",
    ).execute()
    logger.info("Admin %s set ab_test_variant=%s", admin.get("sub", "?"), body.variant)
    return {"ok": True, "ab_test_variant": body.variant}


@router.get("/model-monitor/raw", response_model=RawMetricsResponse)
def model_monitor_raw(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    _admin: AuthUser = Depends(get_current_admin),
) -> RawMetricsResponse:
    """Return raw paginated model_metrics rows for CSV export / deep inspection."""
    from app.database import get_supabase
    supabase = get_supabase()
    offset = (page - 1) * page_size
    resp = (
        supabase.table("model_metrics")
        .select("*", count="exact")
        .order("recorded_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return RawMetricsResponse(rows=resp.data or [], total=resp.count or 0)
