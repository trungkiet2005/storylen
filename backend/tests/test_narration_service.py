"""Unit + integration tests for the narration service orchestration."""
from __future__ import annotations

import time

import pytest

from app.services import narration
from app.services import vlm_client
from app.services.tts.base import TTSResult
from tests.conftest import FakeSupabase

PNG = b"\x89PNG\r\n\x1a\nfake"


def _tts_result():
    return TTSResult(audio=b"ID3audio", mime="audio/mpeg", ext="mp3", engine="edge", voice="vi-VN-HoaiMyNeural")


def _page_tables():
    return {
        "manga_pages": [
            {
                "page_id": "p1",
                "user_id": "u1",
                "original_image_url": "https://sb/originals/p1/original.png",
                "translated_image_url": None,
                "status": "translated",
                "chapter_id": "c1",
                "page_number": 1,
            }
        ],
        "bubble_data": [
            {"bubble_id": "b2", "x": 300, "y": 20, "width": 80, "height": 40,
             "translation_history": [{"translated_text_vi": "Thứ hai", "translated_at": "2026-01-02"}]},
            {"bubble_id": "b1", "x": 20, "y": 18, "width": 80, "height": 40,
             "translation_history": [
                 {"translated_text_vi": "cũ", "translated_at": "2026-01-01"},
                 {"translated_text_vi": "Thứ nhất", "translated_at": "2026-01-03"},
             ]},
            {"bubble_id": "b3", "x": 40, "y": 200, "width": 80, "height": 40,
             "translation_history": [{"translated_text_vi": "Thứ ba", "translated_at": "2026-01-02"}]},
        ],
    }


# ─── reading order + translation picking ─────────────────────────────────────

def test_reading_order_top_to_bottom_left_to_right():
    bubbles = _page_tables()["bubble_data"]
    ordered = narration._reading_order(bubbles)
    ids = [b["bubble_id"] for b in ordered]
    # Row 1 (y≈18-20): b1 (x=20) before b2 (x=300); then row 2: b3.
    assert ids == ["b1", "b2", "b3"]


def test_reading_order_empty():
    assert narration._reading_order([]) == []


def test_latest_translation_picks_newest_by_date():
    bubble = _page_tables()["bubble_data"][1]  # b1 has old + newest
    assert narration._latest_translation(bubble) == "Thứ nhất"


def test_latest_translation_empty_when_no_history():
    assert narration._latest_translation({"translation_history": []}) == ""


# ─── prompt building ─────────────────────────────────────────────────────────

def test_build_prompt_includes_numbered_dialogue():
    prompt = narration.build_narration_prompt(["Xin chào", "Tạm biệt"])
    assert "1. “Xin chào”" in prompt
    assert "2. “Tạm biệt”" in prompt
    assert "tiếng Việt" in prompt


def test_build_prompt_handles_no_dialogue():
    prompt = narration.build_narration_prompt([])
    assert "không có lời thoại" in prompt.lower()


# ─── generate_script (VLM + fallback) ────────────────────────────────────────

def test_generate_script_uses_vlm(monkeypatch):
    monkeypatch.setattr(narration.vlm_client, "describe_image", lambda *a, **k: "Người hùng xuất hiện.")
    script, source = narration.generate_script(PNG, ["thoại"])
    assert source == "vlm"
    assert script == "Người hùng xuất hiện."


def test_generate_script_falls_back_to_dialogue_on_vlm_error(monkeypatch):
    def boom(*a, **k):
        raise vlm_client.VLMError("pod down")

    monkeypatch.setattr(narration.vlm_client, "describe_image", boom)
    script, source = narration.generate_script(PNG, ["Alpha", "Beta"])
    assert source == "dialogue_fallback"
    assert script == "Alpha Beta"


def test_generate_script_raises_when_no_fallback_available(monkeypatch):
    def boom(*a, **k):
        raise vlm_client.VLMError("pod down")

    monkeypatch.setattr(narration.vlm_client, "describe_image", boom)
    with pytest.raises(narration.NarrationError):
        narration.generate_script(PNG, [], allow_fallback=True)  # no dialogue → can't fall back


# ─── fetch_page_context ──────────────────────────────────────────────────────

def test_fetch_page_context_orders_dialogue_and_resolves_image(monkeypatch):
    monkeypatch.setattr(narration.supabase_storage, "signed_original_image_url", lambda u: "https://signed/img.png")
    monkeypatch.setattr(narration.supabase_storage, "signed_translated_image_url", lambda pid, **k: None)
    ctx = narration.fetch_page_context(FakeSupabase(_page_tables()), "p1")
    assert ctx["dialogue"] == ["Thứ nhất", "Thứ hai", "Thứ ba"]
    assert ctx["image_url"] == "https://signed/img.png"


def test_fetch_page_context_missing_page_raises():
    with pytest.raises(narration.NarrationError, match="not found"):
        narration.fetch_page_context(FakeSupabase({"manga_pages": []}), "ghost")


# ─── narrate_page (full orchestration, boundaries mocked) ────────────────────

@pytest.fixture
def stub_pipeline(monkeypatch):
    monkeypatch.setattr(narration.supabase_storage, "signed_original_image_url", lambda u: "https://img")
    monkeypatch.setattr(narration.supabase_storage, "signed_translated_image_url", lambda pid, **k: None)
    monkeypatch.setattr(narration, "_download_image", lambda url: PNG)
    monkeypatch.setattr(narration.vlm_client, "describe_image", lambda *a, **k: "Một trận chiến nảy lửa.")
    monkeypatch.setattr(narration.tts_registry, "synthesize", lambda *a, **k: _tts_result())
    uploaded = {}

    def fake_upload(audio, page_id, **k):
        uploaded["audio"] = audio
        uploaded["page_id"] = page_id
        return "https://audio/p1.mp3"

    monkeypatch.setattr(narration.supabase_storage, "upload_narration_audio", fake_upload)
    return uploaded


def test_narrate_page_end_to_end(stub_pipeline):
    result = narration.narrate_page(FakeSupabase(_page_tables()), "p1", engine="edge", voice="vi-VN-HoaiMyNeural")
    assert result.page_id == "p1"
    assert result.audio_url == "https://audio/p1.mp3"
    assert result.source == "vlm"
    assert result.script == "Một trận chiến nảy lửa."
    assert result.dialogue_lines == ["Thứ nhất", "Thứ hai", "Thứ ba"]
    assert stub_pipeline["audio"] == b"ID3audio"


def test_narrate_page_as_dict_is_json_safe(stub_pipeline):
    d = narration.narrate_page(FakeSupabase(_page_tables()), "p1").as_dict()
    assert set(d) == {"page_id", "script", "audio_url", "mime", "engine", "voice", "source", "dialogue_lines"}


def test_narrate_page_disabled(monkeypatch):
    monkeypatch.setattr(narration.settings, "NARRATION_ENABLED", False)
    with pytest.raises(narration.NarrationError, match="disabled"):
        narration.narrate_page(FakeSupabase(_page_tables()), "p1")


# ─── chapter job (background thread) ─────────────────────────────────────────

def test_chapter_job_completes_and_collects_segments(monkeypatch):
    def fake_narrate(supabase, page_id, **k):
        return narration.NarrationResult(
            page_id=page_id, script="s", audio_url=f"https://a/{page_id}.mp3",
            mime="audio/mpeg", engine="edge", voice="v", source="vlm", dialogue_lines=[],
        )

    monkeypatch.setattr(narration, "narrate_page", fake_narrate)
    job = narration.start_chapter_job(
        FakeSupabase(_page_tables()), "c1", ["p1", "p2"],
        engine="edge", voice=None, rate=None, job_id="job-123",
    )
    # Wait for the daemon thread to finish (fast — narrate is stubbed).
    for _ in range(50):
        if narration.get_job("job-123").status == "completed":
            break
        time.sleep(0.02)
    done = narration.get_job("job-123")
    assert done.status == "completed"
    assert done.done == 2
    assert {s["page_id"] for s in done.segments} == {"p1", "p2"}


def test_chapter_job_survives_a_failing_page(monkeypatch):
    def flaky(supabase, page_id, **k):
        if page_id == "bad":
            raise narration.NarrationError("boom")
        return narration.NarrationResult(
            page_id=page_id, script="s", audio_url="u", mime="audio/mpeg",
            engine="edge", voice="v", source="vlm", dialogue_lines=[],
        )

    monkeypatch.setattr(narration, "narrate_page", flaky)
    narration.start_chapter_job(
        FakeSupabase(_page_tables()), "c1", ["ok", "bad"],
        engine=None, voice=None, rate=None, job_id="job-x",
    )
    for _ in range(50):
        if narration.get_job("job-x").status == "completed":
            break
        time.sleep(0.02)
    job = narration.get_job("job-x")
    assert job.done == 2
    errored = [s for s in job.segments if s.get("error")]
    assert len(errored) == 1 and errored[0]["page_id"] == "bad"
