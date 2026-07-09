"""Pluggable text-to-speech providers for StoryLens narration.

Public surface is the registry: ``available_engines``, ``list_voices``,
``synthesize``. Individual providers (edge / pyttsx3 / coqui) are wired up in
``registry.py`` and should not be imported directly by callers.
"""
from app.services.tts.base import TTSError, TTSNotAvailable, TTSResult, TTSVoice
from app.services.tts.registry import (
    available_engines,
    default_engine,
    describe_engines,
    list_voices,
    synthesize,
)

__all__ = [
    "TTSError",
    "TTSNotAvailable",
    "TTSResult",
    "TTSVoice",
    "available_engines",
    "default_engine",
    "describe_engines",
    "list_voices",
    "synthesize",
]
