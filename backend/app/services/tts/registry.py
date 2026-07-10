"""TTS engine registry — the single entry point callers use.

Keeps one instance of each provider and routes ``synthesize`` / ``list_voices``
to the right one. Engine selection precedence for a request:
    explicit engine arg → configured default → first available engine.
"""
from __future__ import annotations

import logging

from app.config import get_settings
from app.services.tts.base import TTSError, TTSNotAvailable, TTSResult, TTSVoice
from app.services.tts.coqui_provider import CoquiTTSProvider
from app.services.tts.edge_provider import EdgeTTSProvider
from app.services.tts.pyttsx_provider import Pyttsx3Provider

logger = logging.getLogger(__name__)

# Registration order also defines fallback preference (best-quality first).
_PROVIDERS = {
    "edge": EdgeTTSProvider(),
    "coqui": CoquiTTSProvider(),
    "pyttsx3": Pyttsx3Provider(),
}


def _provider(engine: str):
    prov = _PROVIDERS.get(engine)
    if prov is None:
        raise TTSError(f"Unknown TTS engine '{engine}'. Known: {', '.join(_PROVIDERS)}.")
    return prov


def available_engines() -> list[str]:
    """Engines that can actually run on this host, in preference order."""
    return [name for name, prov in _PROVIDERS.items() if prov.available()]


def default_engine() -> str:
    """Configured default if it's available, else the first available engine.

    Falls back to the configured value even when nothing reports available so
    the API still returns a sensible name (the eventual synth call surfaces the
    real TTSNotAvailable error)."""
    configured = get_settings().TTS_DEFAULT_ENGINE
    if configured in _PROVIDERS and _PROVIDERS[configured].available():
        return configured
    avail = available_engines()
    return avail[0] if avail else configured


def resolve_engine(engine: str | None) -> str:
    if engine:
        if engine not in _PROVIDERS:
            raise TTSError(f"Unknown TTS engine '{engine}'. Known: {', '.join(_PROVIDERS)}.")
        return engine
    return default_engine()


def list_voices(engine: str | None = None) -> list[TTSVoice]:
    return _provider(resolve_engine(engine)).list_voices()


def describe_engines() -> list[dict]:
    """Full snapshot for the voice-picker UI: every engine, its availability,
    and its voices."""
    settings = get_settings()
    out: list[dict] = []
    for name, prov in _PROVIDERS.items():
        avail = prov.available()
        out.append(
            {
                "engine": name,
                "available": avail,
                "is_default": name == settings.TTS_DEFAULT_ENGINE,
                "voices": [v.as_dict() for v in (prov.list_voices() if avail else [])],
            }
        )
    return out


def synthesize(
    text: str,
    engine: str | None = None,
    voice: str | None = None,
    rate: str | None = None,
) -> TTSResult:
    """Render ``text`` to audio using the chosen (or default) engine."""
    resolved = resolve_engine(engine)
    prov = _provider(resolved)
    if not prov.available():
        raise TTSNotAvailable(f"TTS engine '{resolved}' is not available on this host.")

    # Telemetry: TTS is billed per character by cloud vendors, so we track the
    # char count (as "completion tokens") + latency per engine.
    from app.services import ai_telemetry

    char_count = len(text or "")
    with ai_telemetry.track("tts", resolved, "tts.synthesize", meta={"voice": voice or ""}) as tel:
        result = prov.synthesize(text, voice=voice, rate=rate)
        tel.completion_tokens = char_count
        tel.cost_usd = ai_telemetry.estimate_tts_cost(resolved, char_count)
        return result
