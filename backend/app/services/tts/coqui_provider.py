"""coqui / XTTS provider — high-quality neural TTS served on the GPU pod.

This provider is a thin HTTP client: the heavy XTTS model runs on the pod behind
a small HTTP server (contract below), reached via ``COQUI_TTS_URL``. When that
env var is empty the provider reports itself unavailable and the registry hides
it from the picker — so deployments without a GPU pod simply don't offer it.

Expected server contract (POST ``{COQUI_TTS_URL}/api/tts``):
    request  JSON: {"text": str, "speaker": str, "language": "vi"}
    response    : audio/wav bytes (200) or JSON error
"""
from __future__ import annotations

import logging

import httpx

from app.config import get_settings
from app.services.tts.base import TTSError, TTSNotAvailable, TTSProvider, TTSResult, TTSVoice

logger = logging.getLogger(__name__)

# Speakers exposed by our XTTS server preset. Kept small + stable for the picker.
_SPEAKERS: list[TTSVoice] = [
    TTSVoice("vi_female", "XTTS nữ (VN)", "vi-VN", "Female"),
    TTSVoice("vi_male", "XTTS nam (VN)", "vi-VN", "Male"),
]
_SPEAKER_IDS = {v.id for v in _SPEAKERS}


class CoquiTTSProvider(TTSProvider):
    engine = "coqui"

    def _base_url(self) -> str:
        return (get_settings().COQUI_TTS_URL or "").strip().rstrip("/")

    def available(self) -> bool:
        return bool(self._base_url())

    def list_voices(self) -> list[TTSVoice]:
        return list(_SPEAKERS) if self.available() else []

    def synthesize(self, text: str, voice: str | None = None, rate: str | None = None) -> TTSResult:
        text = (text or "").strip()
        if not text:
            raise TTSError("Cannot synthesize empty text.")
        base = self._base_url()
        if not base:
            raise TTSNotAvailable("Coqui/XTTS is not configured (set COQUI_TTS_URL).")

        speaker = voice or get_settings().COQUI_TTS_SPEAKER or _SPEAKERS[0].id
        if speaker not in _SPEAKER_IDS:
            speaker = _SPEAKERS[0].id

        payload = {"text": text, "speaker": speaker, "language": "vi"}
        try:
            with httpx.Client(timeout=httpx.Timeout(connect=10.0, read=180.0, write=30.0, pool=5.0)) as client:
                resp = client.post(f"{base}/api/tts", json=payload)
            resp.raise_for_status()
            audio = resp.content
        except Exception as exc:
            raise TTSError(f"Coqui/XTTS synthesis failed: {exc}") from exc

        if not audio:
            raise TTSError("Coqui/XTTS produced no audio.")
        return TTSResult(audio=audio, mime="audio/wav", ext="wav", engine=self.engine, voice=speaker)
