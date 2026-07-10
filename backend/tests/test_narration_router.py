"""Integration tests for the narration router via FastAPI TestClient.

Auth is injected through dependency_overrides; Supabase, credits, and the
narration service are monkeypatched so no DB / VLM / TTS is touched.
"""
from __future__ import annotations

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.routers import narration as narration_router
from app.routers.auth import AuthUser, get_current_user
from app.services import narration as narration_service
from tests.conftest import FakeSupabase

USER = AuthUser(id="u1", username="minh", email="minh@example.com")


@pytest.fixture
def client(monkeypatch):
    app.dependency_overrides[get_current_user] = lambda: USER
    # Default: caller owns the page and has credits.
    monkeypatch.setattr(
        narration_router, "get_supabase",
        lambda: FakeSupabase({"manga_pages": [{"page_id": "p1", "user_id": "u1", "chapter_id": "c1"}]}),
    )
    monkeypatch.setattr(narration_router, "check_has_credits", lambda *a, **k: {"credits_balance": 5})
    deducts: list = []
    monkeypatch.setattr(narration_router, "deduct", lambda *a, **k: deducts.append((a, k)))
    monkeypatch.setattr(narration_router, "_deducts", deducts, raising=False)
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _canned(page_id="p1", source="vlm"):
    return narration_service.NarrationResult(
        page_id=page_id, script="Một cảnh hành động.", audio_url="https://audio/p1.mp3",
        mime="audio/mpeg", engine="edge", voice="vi-VN-HoaiMyNeural", source=source, dialogue_lines=["A"],
    )


# ─── /voices ─────────────────────────────────────────────────────────────────

def test_voices_lists_engines(client):
    resp = client.get("/v1/narrate/voices")
    assert resp.status_code == 200
    body = resp.json()
    assert "default_engine" in body
    engines = {e["engine"] for e in body["engines"]}
    assert {"edge", "pyttsx3", "coqui"} <= engines


def test_voices_includes_credit_and_page_limit(client):
    resp = client.get("/v1/narrate/voices")
    assert resp.status_code == 200
    body = resp.json()
    assert body["credit_cost_per_page"] == narration_router.get_settings().NARRATION_CREDIT_COST
    assert body["max_chapter_pages"] == narration_router.get_settings().NARRATION_MAX_CHAPTER_PAGES


def test_voices_requires_auth():
    # No dependency override → real get_current_user rejects (401/403).
    with TestClient(app) as c:
        resp = c.get("/v1/narrate/voices")
    assert resp.status_code in (401, 403)


# ─── /page ───────────────────────────────────────────────────────────────────

def test_narrate_page_success(client, monkeypatch):
    monkeypatch.setattr(narration_service, "narrate_page", lambda *a, **k: _canned())
    resp = client.post("/v1/narrate/page/p1", json={"engine": "edge"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["audio_url"] == "https://audio/p1.mp3"
    assert body["source"] == "vlm"
    assert body["engine"] == "edge"
    # credit was deducted
    assert client.app  # sanity
    assert narration_router._deducts, "deduct should have been called"


def test_narrate_page_forbidden_when_not_owner(client, monkeypatch):
    monkeypatch.setattr(
        narration_router, "get_supabase",
        lambda: FakeSupabase({"manga_pages": [{"page_id": "p1", "user_id": "someone-else"}]}),
    )
    resp = client.post("/v1/narrate/page/p1", json={})
    assert resp.status_code == 403


def test_narrate_page_not_found(client, monkeypatch):
    monkeypatch.setattr(narration_router, "get_supabase", lambda: FakeSupabase({"manga_pages": []}))
    resp = client.post("/v1/narrate/page/ghost", json={})
    assert resp.status_code == 404


def test_narrate_page_insufficient_credits(client, monkeypatch):
    def no_credits(*a, **k):
        raise HTTPException(status_code=402, detail="hết credit")

    monkeypatch.setattr(narration_router, "check_has_credits", no_credits)
    called = {"n": False}
    monkeypatch.setattr(narration_service, "narrate_page", lambda *a, **k: called.__setitem__("n", True) or _canned())
    resp = client.post("/v1/narrate/page/p1", json={})
    assert resp.status_code == 402
    assert called["n"] is False  # must gate BEFORE generating


def test_narrate_page_service_error_maps_to_502(client, monkeypatch):
    def boom(*a, **k):
        raise narration_service.NarrationError("vlm dead")

    monkeypatch.setattr(narration_service, "narrate_page", boom)
    resp = client.post("/v1/narrate/page/p1", json={})
    assert resp.status_code == 502


def test_narrate_page_disabled_returns_503(client, monkeypatch):
    monkeypatch.setattr(narration_router.get_settings(), "NARRATION_ENABLED", False, raising=False)
    # get_settings() is cached; patch the attribute on the cached instance.
    resp = client.post("/v1/narrate/page/p1", json={})
    assert resp.status_code == 503
    # restore for other tests
    narration_router.get_settings().NARRATION_ENABLED = True


# ─── /chapter + status ───────────────────────────────────────────────────────

def test_narrate_chapter_starts_job(client, monkeypatch):
    monkeypatch.setattr(
        narration_service, "list_chapter_pages",
        lambda supabase, cid, uid: [{"page_id": "p1"}, {"page_id": "p2"}],
    )
    started = {}

    def fake_start(supabase, chapter_id, page_ids, **k):
        started["ids"] = page_ids
        return narration_service.ChapterJob(job_id=k["job_id"], chapter_id=chapter_id, total=len(page_ids))

    monkeypatch.setattr(narration_service, "start_chapter_job", fake_start)
    resp = client.post("/v1/narrate/chapter/c1", json={"engine": "edge"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert body["status"] == "running"
    assert started["ids"] == ["p1", "p2"]


def test_narrate_chapter_empty_returns_404(client, monkeypatch):
    monkeypatch.setattr(narration_service, "list_chapter_pages", lambda *a, **k: [])
    resp = client.post("/v1/narrate/chapter/c1", json={})
    assert resp.status_code == 404


def test_chapter_status_found(client, monkeypatch):
    job = narration_service.ChapterJob(job_id="j1", chapter_id="c1", total=2, done=1, status="running")
    job.segments = [{"page_id": "p1", "audio_url": "u"}]
    monkeypatch.setattr(narration_service, "get_job", lambda jid: job if jid == "j1" else None)
    resp = client.get("/v1/narrate/chapter/status/j1")
    assert resp.status_code == 200
    assert resp.json()["done"] == 1


def test_chapter_status_missing_returns_404(client, monkeypatch):
    monkeypatch.setattr(narration_service, "get_job", lambda jid: None)
    resp = client.get("/v1/narrate/chapter/status/nope")
    assert resp.status_code == 404


# ─── /recap ──────────────────────────────────────────────────────────────────

def test_recap_chapter_success(client, monkeypatch):
    monkeypatch.setattr(
        narration_service, "list_chapter_pages",
        lambda supabase, cid, uid: [{"page_id": "p1"}, {"page_id": "p2"}],
    )
    from app.services import recap_video

    monkeypatch.setattr(recap_video, "ffmpeg_available", lambda: True)
    monkeypatch.setattr(narration_router.recap_video, "ffmpeg_available", lambda: True, raising=False)
    monkeypatch.setattr(
        recap_video, "build_chapter_recap",
        lambda *a, **k: "https://storage/manga-audio/c1-recap.mp4",
    )
    resp = client.post("/v1/narrate/recap/c1", json={"engine": "edge"})
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"chapter_id": "c1", "video_url": "https://storage/manga-audio/c1-recap.mp4"}


def test_recap_chapter_no_ffmpeg_returns_503(client, monkeypatch):
    monkeypatch.setattr(
        narration_service, "list_chapter_pages",
        lambda supabase, cid, uid: [{"page_id": "p1"}],
    )
    from app.services import recap_video

    monkeypatch.setattr(recap_video, "ffmpeg_available", lambda: False)
    resp = client.post("/v1/narrate/recap/c1", json={})
    assert resp.status_code == 503


def test_recap_chapter_empty_returns_404(client, monkeypatch):
    from app.services import recap_video

    # ffmpeg is checked first now; force it available so we reach the empty-pages path.
    monkeypatch.setattr(recap_video, "ffmpeg_available", lambda: True)
    monkeypatch.setattr(narration_service, "list_chapter_pages", lambda *a, **k: [])
    resp = client.post("/v1/narrate/recap/c1", json={})
    assert resp.status_code == 404


def test_recap_chapter_too_many_pages_returns_400(client, monkeypatch):
    monkeypatch.setattr(
        narration_service, "list_chapter_pages",
        lambda supabase, cid, uid: [{"page_id": f"p{i}"} for i in range(100)],
    )
    from app.services import recap_video

    monkeypatch.setattr(recap_video, "ffmpeg_available", lambda: True)
    resp = client.post("/v1/narrate/recap/c1", json={})
    assert resp.status_code == 400


def test_recap_chapter_render_error_maps_to_502(client, monkeypatch):
    monkeypatch.setattr(
        narration_service, "list_chapter_pages",
        lambda supabase, cid, uid: [{"page_id": "p1"}],
    )
    from app.services import recap_video

    monkeypatch.setattr(recap_video, "ffmpeg_available", lambda: True)

    def boom(*a, **k):
        raise recap_video.RecapError("ffmpeg exploded")

    monkeypatch.setattr(recap_video, "build_chapter_recap", boom)
    resp = client.post("/v1/narrate/recap/c1", json={})
    assert resp.status_code == 502
