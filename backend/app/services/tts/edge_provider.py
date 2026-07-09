"""edge-tts provider — Microsoft Edge online neural voices.

No API key required. Runs as a local Python dependency that streams audio from
Microsoft's public endpoint, so it needs outbound network at synth time but
gives natural Vietnamese voices out of the box.
"""
from __future__ import annotations

import asyncio
import logging
import re

from app.services.tts.base import TTSError, TTSNotAvailable, TTSProvider, TTSResult, TTSVoice

logger = logging.getLogger(__name__)

# Curated, stable subset shown in the voice picker. edge-tts exposes hundreds of
# voices; these are the ones that matter for a Vietnamese manga reader plus a few
# English options. Keeping a hardcoded list means the picker works even offline.
_VOICES: list[TTSVoice] = [
    TTSVoice("vi-VN-HoaiMyNeural", "Hoài My (nữ, VN)", "vi-VN", "Female"),
    TTSVoice("vi-VN-NamMinhNeural", "Nam Minh (nam, VN)", "vi-VN", "Male"),
    TTSVoice("en-US-AriaNeural", "Aria (nữ, US)", "en-US", "Female"),
    TTSVoice("en-US-GuyNeural", "Guy (nam, US)", "en-US", "Male"),
    TTSVoice("ja-JP-NanamiNeural", "Nanami (nữ, JP)", "ja-JP", "Female"),
]
_VOICE_IDS = {v.id for v in _VOICES}

_RATE_RE = re.compile(r"^[+-]\d{1,3}%$")


def _run_async(coro):
    """Run an async coroutine from sync code, whether or not a loop is running."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    # A loop is already running (rare in this sync codebase) — use a private loop
    # on a worker thread to avoid "cannot be called from a running event loop".
    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(lambda: asyncio.run(coro)).result()


class EdgeTTSProvider(TTSProvider):
    engine = "edge"

    def available(self) -> bool:
        try:
            import edge_tts  # noqa: F401
        except Exception:
            return False
        return True

    def list_voices(self) -> list[TTSVoice]:
        return list(_VOICES) if self.available() else []

    def synthesize(self, text: str, voice: str | None = None, rate: str | None = None) -> TTSResult:
        text = (text or "").strip()
        if not text:
            raise TTSError("Cannot synthesize empty text.")
        if not self.available():
            raise TTSNotAvailable("edge-tts is not installed (pip install edge-tts).")

        voice = voice or _VOICES[0].id
        if voice not in _VOICE_IDS:
            raise TTSError(f"Unknown edge voice '{voice}'.")

        rate = (rate or "+0%").strip()
        if not _RATE_RE.match(rate):
            rate = "+0%"

        try:
            audio = _run_async(self._stream(text, voice, rate))
        except TTSError:
            raise
        except Exception as exc:  # network / protocol errors from edge-tts
            raise TTSError(f"edge-tts synthesis failed: {exc}") from exc

        if not audio:
            raise TTSError("edge-tts produced no audio.")
        return TTSResult(audio=audio, mime="audio/mpeg", ext="mp3", engine=self.engine, voice=voice)

    async def _stream(self, text: str, voice: str, rate: str) -> bytes:
        import edge_tts

        communicate = edge_tts.Communicate(text, voice, rate=rate)
        chunks = bytearray()
        async for chunk in communicate.stream():
            if chunk.get("type") == "audio" and chunk.get("data"):
                chunks.extend(chunk["data"])
        return bytes(chunks)
