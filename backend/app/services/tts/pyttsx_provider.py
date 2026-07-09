"""pyttsx3 provider — fully offline system TTS (SAPI5 on Windows, NSSpeech on
macOS, espeak on Linux).

No network needed, but voice quality and Vietnamese coverage depend entirely on
what the host OS ships. Used as the graceful offline fallback.
"""
from __future__ import annotations

import logging
import os
import tempfile
import threading

from app.services.tts.base import TTSError, TTSNotAvailable, TTSProvider, TTSResult, TTSVoice

logger = logging.getLogger(__name__)

# pyttsx3's engine is not thread-safe; serialise access process-wide.
_engine_lock = threading.Lock()


class Pyttsx3Provider(TTSProvider):
    engine = "pyttsx3"

    def _new_engine(self):
        import pyttsx3

        return pyttsx3.init()

    def available(self) -> bool:
        try:
            with _engine_lock:
                eng = self._new_engine()
                eng.stop()
            return True
        except Exception:
            return False

    def list_voices(self) -> list[TTSVoice]:
        try:
            with _engine_lock:
                eng = self._new_engine()
                raw = eng.getProperty("voices") or []
                eng.stop()
        except Exception:
            return []

        voices: list[TTSVoice] = []
        for v in raw:
            langs = getattr(v, "languages", []) or []
            locale = ""
            if langs:
                first = langs[0]
                locale = first.decode(errors="ignore") if isinstance(first, bytes) else str(first)
            gender = str(getattr(v, "gender", "") or "").capitalize() or "Unknown"
            voices.append(
                TTSVoice(
                    id=str(v.id),
                    label=str(getattr(v, "name", v.id)),
                    locale=locale or "system",
                    gender=gender,
                )
            )
        return voices

    def synthesize(self, text: str, voice: str | None = None, rate: str | None = None) -> TTSResult:
        text = (text or "").strip()
        if not text:
            raise TTSError("Cannot synthesize empty text.")
        try:
            import pyttsx3  # noqa: F401
        except Exception as exc:
            raise TTSNotAvailable("pyttsx3 is not installed (pip install pyttsx3).") from exc

        path = None
        try:
            with _engine_lock:
                eng = self._new_engine()
                if voice:
                    eng.setProperty("voice", voice)
                if rate:
                    eng.setProperty("rate", self._rate_to_wpm(rate, eng))
                fd, path = tempfile.mkstemp(suffix=".wav")
                os.close(fd)
                eng.save_to_file(text, path)
                eng.runAndWait()
                eng.stop()
            with open(path, "rb") as fh:
                audio = fh.read()
        except Exception as exc:
            raise TTSError(f"pyttsx3 synthesis failed: {exc}") from exc
        finally:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass

        if not audio:
            raise TTSError("pyttsx3 produced no audio.")
        return TTSResult(audio=audio, mime="audio/wav", ext="wav", engine=self.engine, voice=voice or "system")

    @staticmethod
    def _rate_to_wpm(rate: str, eng) -> int:
        """Map an edge-tts-style "+10%"/"-20%" rate onto pyttsx3 words-per-minute."""
        try:
            base = int(eng.getProperty("rate") or 200)
        except Exception:
            base = 200
        pct = 0
        r = (rate or "").strip().rstrip("%")
        try:
            pct = int(r)
        except ValueError:
            pct = 0
        return max(60, int(base * (1 + pct / 100.0)))
