"""
StoryLens Backend — Model Monitor Service (MLOps)

Tracks per-page AI quality metrics (OCR confidence, bubble detection,
translation latency) and persists them to `model_metrics` table in Supabase.

Provides:
  - log_pipeline_metrics()   → called by ai_pipeline after each page
  - get_metrics_summary()    → aggregate stats for admin dashboard
  - check_model_drift()      → compare recent window vs baseline; alert if degraded
  - get_ab_config()          → return active A/B model variant for a request
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from statistics import mean
from typing import Any

from app.database import get_supabase

logger = logging.getLogger(__name__)

# Hard cap on rows pulled into memory for a single aggregation. PostgREST
# defaults to a 1000-row window; we set an explicit, larger ceiling and always
# order DESC + reverse so we aggregate the *most recent* rows (never silently
# fall back to the oldest 1000 as the table grows).
_MAX_QUERY_ROWS = 5000

# ─── Drift thresholds ─────────────────────────────────────────────────────────
# If rolling average of metric drops below threshold → drift alert fires.
DRIFT_THRESHOLDS: dict[str, float] = {
    "avg_ocr_confidence": 0.55,   # Below 55% → OCR quality degraded
    "bubble_detection_rate": 0.5,  # Below 50% → YOLO missing too many bubbles
    "translation_success_rate": 0.80,  # Below 80% → Gemini failing too often
}

# Rolling window size (number of pages) for drift calculation
DRIFT_WINDOW = 50


def log_pipeline_metrics(
    page_id: str,
    bubbles: list[dict[str, Any]],
    latency_ms: int,
    translator_name: str,
    success: bool,
) -> None:
    """
    Persist quality metrics for one processed page to `model_metrics` table.
    Called best-effort from ai_pipeline — must never raise.

    Metrics captured:
      - bubble_count:          Total bubbles detected by YOLO
      - avg_ocr_confidence:    Mean OCR confidence across all bubbles [0-1]
      - translated_count:      Number of bubbles with non-empty translation
      - translation_success:   1 if all translations succeeded, 0 otherwise
      - latency_ms:            Total pipeline wall-clock time in milliseconds
      - translator:            Translator model name (e.g. "gemini", "youdao")
    """
    try:
        supabase = get_supabase()

        bubble_count = len(bubbles)
        confidences = [
            float(b.get("confidence") or 0.0)
            for b in bubbles
            if b.get("confidence") is not None
        ]
        avg_confidence = mean(confidences) if confidences else 0.0
        translated_count = sum(
            1 for b in bubbles if str(b.get("translated_text") or "").strip()
        )

        row = {
            "page_id": page_id,
            "bubble_count": bubble_count,
            "avg_ocr_confidence": round(avg_confidence, 4),
            "translated_count": translated_count,
            "translation_success": 1 if success else 0,
            "latency_ms": latency_ms,
            "translator": translator_name,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
        }

        supabase.table("model_metrics").insert(row).execute()
        logger.debug(
            "model_monitor: logged metrics for page %s (bubbles=%d, conf=%.2f, latency=%dms)",
            page_id, bubble_count, avg_confidence, latency_ms,
        )

    except Exception as exc:
        # Never fail the pipeline due to monitoring errors.
        logger.warning("model_monitor: failed to log metrics for page %s: %s", page_id, exc)


def get_metrics_summary(days: int = 7) -> dict[str, Any]:
    """
    Return aggregated model metrics for the last `days` days.
    Used by the Admin Dashboard to show charts and KPIs.
    """
    try:
        supabase = get_supabase()
        from datetime import timedelta
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        rows_resp = (
            supabase.table("model_metrics")
            .select("*")
            .gte("recorded_at", since)
            .order("recorded_at", desc=True)
            .limit(_MAX_QUERY_ROWS)
            .execute()
        )
        # Fetched newest-first (so the cap keeps recent data); reverse to the
        # ascending order the time-series / drift logic expects.
        rows: list[dict] = list(reversed(rows_resp.data or []))
        if len(rows) >= _MAX_QUERY_ROWS:
            logger.warning(
                "get_metrics_summary: row cap %d reached for days=%d; "
                "aggregates cover the most-recent %d pages only.",
                _MAX_QUERY_ROWS, days, _MAX_QUERY_ROWS,
            )

        if not rows:
            return {
                "total_pages": 0,
                "avg_ocr_confidence": None,
                "avg_latency_ms": None,
                "translation_success_rate": None,
                "avg_bubble_count": None,
                "bubble_detection_rate": None,
                "drift_status": "no_data",
                "time_series": [],
            }

        total = len(rows)
        avg_conf = mean(r["avg_ocr_confidence"] for r in rows if r.get("avg_ocr_confidence") is not None)
        avg_lat = mean(r["latency_ms"] for r in rows if r.get("latency_ms") is not None)
        success_rate = sum(r.get("translation_success", 0) for r in rows) / total
        avg_bubbles = mean(r.get("bubble_count", 0) for r in rows)

        # Detection rate: pages with at least 1 bubble / total pages
        detection_rate = sum(1 for r in rows if r.get("bubble_count", 0) > 0) / total

        # Build daily time-series for chart
        from collections import defaultdict
        daily: dict[str, list] = defaultdict(list)
        for r in rows:
            day = r["recorded_at"][:10]  # YYYY-MM-DD
            daily[day].append(r)

        time_series = [
            {
                "date": day,
                "avg_ocr_confidence": round(mean(d["avg_ocr_confidence"] for d in day_rows if d.get("avg_ocr_confidence") is not None), 3),
                "avg_latency_ms": round(mean(d["latency_ms"] for d in day_rows if d.get("latency_ms") is not None)),
                "success_rate": round(sum(d.get("translation_success", 0) for d in day_rows) / len(day_rows), 3),
                "page_count": len(day_rows),
            }
            for day, day_rows in sorted(daily.items())
        ]

        drift = _compute_drift_status(rows)

        return {
            "total_pages": total,
            "avg_ocr_confidence": round(avg_conf, 4),
            "avg_latency_ms": round(avg_lat),
            "translation_success_rate": round(success_rate, 4),
            "avg_bubble_count": round(avg_bubbles, 2),
            "bubble_detection_rate": round(detection_rate, 4),
            "drift_status": drift["status"],
            "drift_details": drift.get("details"),
            "time_series": time_series,
        }

    except Exception as exc:
        logger.error("model_monitor: get_metrics_summary failed: %s", exc)
        return {"error": str(exc)}


def _compute_drift_status(rows: list[dict]) -> dict[str, Any]:
    """
    Compare metrics of the most-recent DRIFT_WINDOW pages against the older baseline.
    Returns drift status: 'ok' | 'warning' | 'critical' | 'insufficient_data'
    """
    if len(rows) < DRIFT_WINDOW * 2:
        return {"status": "insufficient_data"}

    recent = rows[-DRIFT_WINDOW:]
    baseline = rows[-(DRIFT_WINDOW * 2):-DRIFT_WINDOW]

    def safe_mean(lst: list[dict], key: str) -> float | None:
        vals = [r[key] for r in lst if r.get(key) is not None]
        return mean(vals) if vals else None

    checks: list[dict] = []
    worst = "ok"

    # Check 1: OCR confidence
    recent_conf = safe_mean(recent, "avg_ocr_confidence")
    baseline_conf = safe_mean(baseline, "avg_ocr_confidence")
    if recent_conf is not None and baseline_conf is not None:
        drop = baseline_conf - recent_conf
        level = "ok"
        if recent_conf < DRIFT_THRESHOLDS["avg_ocr_confidence"]:
            level = "critical"
        elif drop > 0.05:  # more than 5% absolute drop
            level = "warning"
        checks.append({"metric": "avg_ocr_confidence", "recent": round(recent_conf, 4), "baseline": round(baseline_conf, 4), "status": level})
        if level == "critical" or (level == "warning" and worst == "ok"):
            worst = level

    # Check 2: Bubble detection rate
    recent_det = sum(1 for r in recent if r.get("bubble_count", 0) > 0) / len(recent)
    baseline_det = sum(1 for r in baseline if r.get("bubble_count", 0) > 0) / len(baseline)
    level = "ok"
    if recent_det < DRIFT_THRESHOLDS["bubble_detection_rate"]:
        level = "critical"
    elif baseline_det - recent_det > 0.1:
        level = "warning"
    checks.append({"metric": "bubble_detection_rate", "recent": round(recent_det, 4), "baseline": round(baseline_det, 4), "status": level})
    if level == "critical" or (level == "warning" and worst == "ok"):
        worst = level

    # Check 3: Translation success rate
    recent_succ = sum(r.get("translation_success", 0) for r in recent) / len(recent)
    baseline_succ = sum(r.get("translation_success", 0) for r in baseline) / len(baseline)
    level = "ok"
    if recent_succ < DRIFT_THRESHOLDS["translation_success_rate"]:
        level = "critical"
    elif baseline_succ - recent_succ > 0.1:
        level = "warning"
    checks.append({"metric": "translation_success_rate", "recent": round(recent_succ, 4), "baseline": round(baseline_succ, 4), "status": level})
    if level == "critical" or (level == "warning" and worst == "ok"):
        worst = level

    return {"status": worst, "details": checks}


def get_ab_config(user_id: str | None = None) -> dict[str, str]:
    """
    Return the active A/B model configuration.

    The admin can set `ab_test_variant` in `app_settings` to one of:
      - "control"     → default production config
      - "experiment"  → alternative model config for testing

    For now: 50/50 hash split by user_id suffix.
    Returns a dict of model overrides to merge into ai_config.
    """
    try:
        supabase = get_supabase()
        resp = (
            supabase.table("app_settings")
            .select("value")
            .eq("key", "ab_test_variant")
            .limit(1)
            .execute()
        )
        variant_setting = (resp.data or [{}])[0].get("value", "off")

        if variant_setting == "off" or not user_id:
            return {"variant": "control"}

        # Hash user_id to deterministically assign variant. Python's builtin
        # hash() is salted per-process (PYTHONHASHSEED), so a user would flip
        # between control/experiment across restarts and workers — use a stable
        # digest instead so bucketing is consistent everywhere.
        digest = hashlib.md5(user_id.encode("utf-8")).hexdigest()
        user_bucket = int(digest, 16) % 100
        if variant_setting == "experiment_50" and user_bucket < 50:
            # Experiment: use alternative OCR model
            return {
                "variant": "experiment",
                "ocr": "manga_ocr_v2",       # hypothetical next-gen OCR
                "detector": "yolov8x",        # larger YOLO model
            }
        return {"variant": "control"}

    except Exception as exc:
        logger.warning("get_ab_config failed: %s — returning control", exc)
        return {"variant": "control"}


def get_ab_results() -> dict[str, Any]:
    """Compare metrics between A/B variants from model_metrics table."""
    try:
        supabase = get_supabase()
        rows_resp = (
            supabase.table("model_metrics")
            .select("translator, avg_ocr_confidence, latency_ms, translation_success, bubble_count")
            .order("recorded_at", desc=True)
            .limit(_MAX_QUERY_ROWS)
            .execute()
        )
        rows = rows_resp.data or []
        if not rows:
            return {"variants": [], "recommendation": "No data yet."}

        from collections import defaultdict
        by_translator: dict[str, list[dict]] = defaultdict(list)
        for r in rows:
            by_translator[r.get("translator", "unknown")].append(r)

        variants = []
        for name, variant_rows in by_translator.items():
            confs = [r["avg_ocr_confidence"] for r in variant_rows if r.get("avg_ocr_confidence") is not None]
            lats = [r["latency_ms"] for r in variant_rows if r.get("latency_ms") is not None]
            succ = [r.get("translation_success", 0) for r in variant_rows]
            variants.append({
                "translator": name,
                "sample_count": len(variant_rows),
                "avg_ocr_confidence": round(mean(confs), 4) if confs else None,
                "avg_latency_ms": round(mean(lats)) if lats else None,
                "success_rate": round(mean(succ), 4) if succ else None,
            })

        # Sort by success_rate desc
        variants.sort(key=lambda x: x.get("success_rate") or 0, reverse=True)
        winner = variants[0]["translator"] if variants else "unknown"
        return {
            "variants": variants,
            "recommendation": f"Best performer: '{winner}' by success rate.",
        }

    except Exception as exc:
        logger.error("get_ab_results failed: %s", exc)
        return {"error": str(exc)}
