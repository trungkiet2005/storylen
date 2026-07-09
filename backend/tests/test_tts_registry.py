"""Unit tests for the pluggable TTS layer (registry + provider contract)."""
from __future__ import annotations

import pytest

from app.services.tts import registry
from app.services.tts.base import TTSError, TTSNotAvailable, TTSProvider, TTSResult, TTSVoice
from app.services.tts.edge_provider import EdgeTTSProvider


class _FakeProvider(TTSProvider):
    engine = "fake"

    def __init__(self, available=True, voices=None):
        self._available = available
        self._voices = voices if voices is not None else [TTSVoice("v1", "Voice One", "vi-VN", "Female")]
        self.calls: list[tuple] = []

    def available(self) -> bool:
        return self._available

    def list_voices(self):
        return list(self._voices) if self._available else []

    def synthesize(self, text, voice=None, rate=None):
        self.calls.append((text, voice, rate))
        if not self._available:
            raise TTSNotAvailable("fake down")
        return TTSResult(audio=b"RIFFfake", mime="audio/wav", ext="wav", engine=self.engine, voice=voice or "v1")


@pytest.fixture
def isolated_registry(monkeypatch):
    """Swap the provider table for a controllable one, restored after the test."""
    fake = _FakeProvider()
    monkeypatch.setattr(registry, "_PROVIDERS", {"fake": fake, "edge": EdgeTTSProvider()})
    return fake


# ─── resolve_engine / default_engine ─────────────────────────────────────────

def test_resolve_engine_explicit_known(isolated_registry):
    assert registry.resolve_engine("fake") == "fake"


def test_resolve_engine_unknown_raises(isolated_registry):
    with pytest.raises(TTSError, match="Unknown TTS engine"):
        registry.resolve_engine("nope")


def test_resolve_engine_none_falls_back_to_available(monkeypatch, isolated_registry):
    # Configured default is "edge" (from settings); edge may be unavailable in
    # this isolated table, so resolve should still yield an available engine.
    monkeypatch.setattr(registry, "_PROVIDERS", {"fake": _FakeProvider(available=True)})
    assert registry.resolve_engine(None) == "fake"


def test_available_engines_filters_unavailable(monkeypatch):
    up = _FakeProvider(available=True)
    down = _FakeProvider(available=False)
    monkeypatch.setattr(registry, "_PROVIDERS", {"up": up, "down": down})
    assert registry.available_engines() == ["up"]


# ─── list_voices / describe_engines ──────────────────────────────────────────

def test_list_voices_returns_provider_voices(isolated_registry):
    voices = registry.list_voices("fake")
    assert [v.id for v in voices] == ["v1"]


def test_describe_engines_shape(monkeypatch):
    up = _FakeProvider(available=True)
    monkeypatch.setattr(registry, "_PROVIDERS", {"fake": up})
    desc = registry.describe_engines()
    assert len(desc) == 1
    entry = desc[0]
    assert entry["engine"] == "fake"
    assert entry["available"] is True
    assert entry["voices"][0]["id"] == "v1"


def test_describe_engines_hides_voices_when_unavailable(monkeypatch):
    down = _FakeProvider(available=False)
    monkeypatch.setattr(registry, "_PROVIDERS", {"fake": down})
    entry = registry.describe_engines()[0]
    assert entry["available"] is False
    assert entry["voices"] == []


# ─── synthesize routing ──────────────────────────────────────────────────────

def test_synthesize_routes_to_provider(isolated_registry):
    result = registry.synthesize("hello", engine="fake", voice="v1", rate="+0%")
    assert result.audio == b"RIFFfake"
    assert isolated_registry.calls == [("hello", "v1", "+0%")]


def test_synthesize_unavailable_engine_raises(monkeypatch):
    down = _FakeProvider(available=False)
    monkeypatch.setattr(registry, "_PROVIDERS", {"fake": down})
    with pytest.raises(TTSNotAvailable):
        registry.synthesize("hi", engine="fake")


def test_synthesize_unknown_engine_raises(isolated_registry):
    with pytest.raises(TTSError, match="Unknown TTS engine"):
        registry.synthesize("hi", engine="ghost")


# ─── edge provider contract (no network) ─────────────────────────────────────

def test_edge_rejects_empty_text():
    with pytest.raises(TTSError):
        EdgeTTSProvider().synthesize("   ")


def test_edge_rejects_unknown_voice(monkeypatch):
    prov = EdgeTTSProvider()
    monkeypatch.setattr(prov, "available", lambda: True)
    with pytest.raises(TTSError, match="Unknown edge voice"):
        prov.synthesize("xin chào", voice="not-a-voice")


def test_edge_voice_ids_are_wellformed():
    ids = [v.id for v in EdgeTTSProvider().list_voices()] if EdgeTTSProvider().available() else ["vi-VN-HoaiMyNeural"]
    assert all("Neural" in vid for vid in ids)
