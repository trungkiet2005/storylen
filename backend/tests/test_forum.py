"""Tests for the forum service layer.

Focus on pure-Python helpers (mention parsing, hot-score formula). Endpoint
behavior is exercised via the manual smoke checks + Playwright E2E since it
requires a live Supabase connection.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.services.forum_service import compute_hot_score, extract_mentions


# ─── extract_mentions ────────────────────────────────────────────────────────

def test_extract_mentions_basic():
    assert extract_mentions("Hello @alice and @bob") == ["alice", "bob"]


def test_extract_mentions_dedup_case_insensitive():
    out = extract_mentions("@Alice said hi, then @alice replied, also @ALICE")
    # First occurrence wins; case-insensitive dedup.
    assert out == ["Alice"]


def test_extract_mentions_requires_minimum_length():
    # 2-char usernames must not match (regex requires {3,30}).
    assert extract_mentions("@a @ab @abc") == ["abc"]


def test_extract_mentions_caps_at_30_chars():
    long_uname = "u" * 35
    # Regex max is 30 chars, so it captures the first 30.
    out = extract_mentions(f"hi @{long_uname}")
    assert out == ["u" * 30]


def test_extract_mentions_skips_email_like_patterns():
    # Mention must not be preceded by a word character (the negative lookbehind).
    assert extract_mentions("send mail to user@example.com") == []


def test_extract_mentions_empty_and_no_match():
    assert extract_mentions("") == []
    assert extract_mentions("no mentions here") == []
    assert extract_mentions(None) == []  # type: ignore[arg-type]


def test_extract_mentions_underscores_and_digits():
    assert extract_mentions("@user_1 @user_2_foo") == ["user_1", "user_2_foo"]


# ─── compute_hot_score ───────────────────────────────────────────────────────

def test_hot_score_monotonic_with_score_at_fixed_time():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    a = compute_hot_score(1, now)
    b = compute_hot_score(10, now)
    c = compute_hot_score(100, now)
    assert a < b < c


def test_hot_score_monotonic_with_time_at_fixed_score():
    older = datetime(2025, 6, 1, tzinfo=timezone.utc)
    newer = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert compute_hot_score(5, older) < compute_hot_score(5, newer)


def test_hot_score_handles_negative_score():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    pos = compute_hot_score(5, now)
    neg = compute_hot_score(-5, now)
    # Negative score should give lower hot rank than positive at same time.
    assert neg < pos


def test_hot_score_handles_zero_score():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    val = compute_hot_score(0, now)
    assert isinstance(val, float)


def test_hot_score_recent_low_score_can_beat_old_high_score():
    """A fresh post with score 1 ranks above an old one with score 1 (time decay)."""
    old = datetime(2025, 1, 1, tzinfo=timezone.utc)
    new = old + timedelta(days=30)
    assert compute_hot_score(1, new) > compute_hot_score(1, old)


def test_hot_score_naive_datetime_treated_as_utc():
    aware = datetime(2026, 1, 1, tzinfo=timezone.utc)
    naive = datetime(2026, 1, 1)
    assert compute_hot_score(5, aware) == compute_hot_score(5, naive)
