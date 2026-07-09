"""Shared types + abstract base for TTS providers."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


class TTSError(RuntimeError):
    """A TTS provider failed to synthesize audio."""


class TTSNotAvailable(TTSError):
    """The requested engine is not installed / not configured on this host."""


@dataclass(frozen=True)
class TTSVoice:
    """One selectable voice, engine-scoped."""
    id: str            # engine-specific id, e.g. "vi-VN-HoaiMyNeural"
    label: str         # human-friendly name shown in the picker
    locale: str        # BCP-47-ish, e.g. "vi-VN"
    gender: str = "Unknown"  # "Female" | "Male" | "Unknown"

    def as_dict(self) -> dict[str, str]:
        return {"id": self.id, "label": self.label, "locale": self.locale, "gender": self.gender}


@dataclass(frozen=True)
class TTSResult:
    """Rendered audio + how it was produced."""
    audio: bytes
    mime: str          # "audio/mpeg" | "audio/wav"
    ext: str           # "mp3" | "wav"
    engine: str
    voice: str

    @property
    def content_type(self) -> str:  # ergonomic alias
        return self.mime


class TTSProvider(ABC):
    """A concrete speech backend. Providers must degrade gracefully: ``available``
    reflects whether the engine can actually run here, and ``synthesize`` raises
    :class:`TTSNotAvailable` rather than crashing at import time when deps are
    missing."""

    #: stable engine key used in the API (``edge`` | ``pyttsx3`` | ``coqui``)
    engine: str = ""

    @abstractmethod
    def available(self) -> bool:
        """True when this provider can synthesize on the current host."""

    @abstractmethod
    def list_voices(self) -> list[TTSVoice]:
        """Voices offered by this engine (may be empty if unavailable)."""

    @abstractmethod
    def synthesize(self, text: str, voice: str | None = None, rate: str | None = None) -> TTSResult:
        """Render ``text`` to audio. Raises :class:`TTSError` on failure."""

    def default_voice(self) -> str | None:
        voices = self.list_voices()
        return voices[0].id if voices else None
