"""
StoryLens Backend — Narration service ("Listen mode").

Turns a translated manga page into spoken audio:

    page image + Vietnamese dialogue  ──▶  VLM storytelling script  ──▶  TTS mp3

The VLM (vision LLM, qwen3-vl on the GPU pod) sees the page art and weaves the
already-translated dialogue into a short Vietnamese narration; a pluggable TTS
engine voices it. If the VLM is unreachable we degrade gracefully to reading the
dialogue itself, so Listen mode keeps working when the pod is down.

Auth / credit / rate-limiting live in the router — this module is pure
orchestration so it can be unit-tested without FastAPI.
"""
from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

from app.config import get_settings
from app.services import vlm_client
from app.services.tts import registry as tts_registry
from app.storage import supabase_storage

logger = logging.getLogger(__name__)
settings = get_settings()

_IMAGE_TIMEOUT = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=5.0)


class NarrationError(RuntimeError):
    """A page could not be narrated."""


@dataclass
class NarrationResult:
    page_id: str
    script: str
    audio_url: str | None
    mime: str
    engine: str
    voice: str
    source: str                      # "vlm" | "dialogue_fallback"
    dialogue_lines: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "page_id": self.page_id,
            "script": self.script,
            "audio_url": self.audio_url,
            "mime": self.mime,
            "engine": self.engine,
            "voice": self.voice,
            "source": self.source,
            "dialogue_lines": self.dialogue_lines,
        }


# ─── Reading-order + context extraction ───────────────────────────────────────

def _reading_order(bubbles: list[dict]) -> list[dict]:
    """Order bubbles for narration: top-to-bottom, then left-to-right.

    A coarse row-band on Y keeps bubbles that sit side by side in the same
    visual row together before falling back to X, which reads more naturally
    than a raw (y, x) sort when panels aren't perfectly aligned."""
    if not bubbles:
        return []
    heights = [int(b.get("height") or 0) for b in bubbles if (b.get("height") or 0) > 0]
    band = max(40, (sorted(heights)[len(heights) // 2] if heights else 80))
    return sorted(
        bubbles,
        key=lambda b: (int(b.get("y") or 0) // band, int(b.get("x") or 0)),
    )


def _latest_translation(bubble: dict) -> str:
    translations = bubble.get("translation_history") or []
    if not translations:
        return ""
    try:
        newest = sorted(translations, key=lambda t: t.get("translated_at") or "", reverse=True)[0]
    except Exception:
        newest = translations[-1]
    return str(newest.get("translated_text_vi") or "").strip()


def fetch_page_context(supabase: Any, page_id: str) -> dict[str, Any]:
    """Return page row + ordered Vietnamese dialogue lines + a signed image URL.

    Raises NarrationError(404-ish) if the page is missing."""
    page_res = (
        supabase.table("manga_pages")
        .select("page_id, user_id, original_image_url, translated_image_url, status, chapter_id, page_number")
        .eq("page_id", page_id)
        .maybe_single()
        .execute()
    )
    if not page_res.data:
        raise NarrationError(f"Page {page_id} not found.")
    page = page_res.data

    bubbles_res = (
        supabase.table("bubble_data")
        .select("bubble_id, x, y, width, height, translation_history(translated_text_vi, translated_at)")
        .eq("page_id", page_id)
        .execute()
    )
    ordered = _reading_order(bubbles_res.data or [])
    dialogue = [t for t in (_latest_translation(b) for b in ordered) if t]

    image_url = (
        supabase_storage.signed_original_image_url(page.get("original_image_url"))
        or supabase_storage.signed_translated_image_url(page_id)
        or page.get("original_image_url")
    )
    return {"page": page, "dialogue": dialogue, "image_url": image_url}


def _download_image(url: str | None) -> bytes:
    if not url:
        raise NarrationError("No image URL available for this page.")
    try:
        with httpx.Client(timeout=_IMAGE_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(url)
        resp.raise_for_status()
        return resp.content
    except Exception as exc:
        raise NarrationError(f"Failed to download page image: {exc}") from exc


# ─── Script generation (VLM) ──────────────────────────────────────────────────

def build_narration_prompt(dialogue_lines: list[str]) -> str:
    """Vietnamese storytelling prompt fed to the VLM alongside the page image."""
    if dialogue_lines:
        numbered = "\n".join(f"{i}. “{line}”" for i, line in enumerate(dialogue_lines, 1))
        dialogue_block = (
            "Lời thoại trong trang (đã dịch sang tiếng Việt), theo thứ tự đọc:\n"
            f"{numbered}\n\n"
        )
    else:
        dialogue_block = "Trang này không có lời thoại rõ ràng.\n\n"

    return (
        "Bạn là một người kể chuyện manga cuốn hút. "
        "Đây là một trang truyện tranh.\n\n"
        f"{dialogue_block}"
        "Hãy viết một đoạn tường thuật NGẮN bằng tiếng Việt (2-4 câu) mô tả "
        "những gì đang diễn ra trong trang, lồng ghép lời thoại một cách tự nhiên, "
        "giọng kể sinh động. Chỉ trả về đoạn văn thoại kể, "
        "KHÔNG giải thích, KHÔNG đánh số, KHÔNG tiêu đề."
    )


def _dialogue_fallback_script(dialogue_lines: list[str]) -> str:
    if not dialogue_lines:
        return "Trang này không có lời thoại để đọc."
    return " ".join(dialogue_lines)


def generate_script(
    image_bytes: bytes,
    dialogue_lines: list[str],
    *,
    model: str | None = None,
    allow_fallback: bool = True,
) -> tuple[str, str]:
    """Return (script, source). ``source`` is "vlm" or "dialogue_fallback"."""
    prompt = build_narration_prompt(dialogue_lines)
    try:
        script = vlm_client.describe_image(image_bytes, prompt, model=model)
        script = script.strip()
        if script:
            return script, "vlm"
        raise vlm_client.VLMError("empty script")
    except vlm_client.VLMError as exc:
        if allow_fallback and dialogue_lines:
            logger.warning("VLM narration failed, using dialogue fallback: %s", exc)
            return _dialogue_fallback_script(dialogue_lines), "dialogue_fallback"
        raise NarrationError(f"VLM could not generate a narration: {exc}") from exc


# ─── Top-level per-page orchestration ─────────────────────────────────────────

@dataclass
class PageAssets:
    """Everything a single page produced, before storage upload. Reused by both
    the audio endpoint and the recap-video renderer."""
    page_id: str
    image_bytes: bytes
    script: str
    source: str
    dialogue_lines: list[str]
    tts_result: Any  # tts.base.TTSResult


def render_page_assets(
    supabase: Any,
    page_id: str,
    *,
    engine: str | None = None,
    voice: str | None = None,
    rate: str | None = None,
) -> PageAssets:
    """Fetch context → VLM script → TTS audio (in memory, no upload)."""
    if not settings.NARRATION_ENABLED:
        raise NarrationError("Narration is disabled on this deployment.")

    ctx = fetch_page_context(supabase, page_id)
    dialogue = ctx["dialogue"]
    image_bytes = _download_image(ctx["image_url"])

    script, source = generate_script(image_bytes, dialogue)

    resolved_engine = tts_registry.resolve_engine(engine)
    voice = voice or settings.TTS_DEFAULT_VOICE
    rate = rate or settings.TTS_DEFAULT_RATE
    tts_result = tts_registry.synthesize(script, engine=resolved_engine, voice=voice, rate=rate)

    return PageAssets(
        page_id=page_id,
        image_bytes=image_bytes,
        script=script,
        source=source,
        dialogue_lines=dialogue,
        tts_result=tts_result,
    )


def narrate_page(
    supabase: Any,
    page_id: str,
    *,
    engine: str | None = None,
    voice: str | None = None,
    rate: str | None = None,
    upload: bool = True,
) -> NarrationResult:
    """Full pipeline for one page. Does NOT check auth/credits (router does)."""
    assets = render_page_assets(supabase, page_id, engine=engine, voice=voice, rate=rate)
    tts_result = assets.tts_result

    audio_url = None
    if upload:
        audio_url = supabase_storage.upload_narration_audio(
            tts_result.audio,
            page_id,
            ext=tts_result.ext,
            mime=tts_result.mime,
            variant=f"narration-{tts_result.engine}",
        )

    return NarrationResult(
        page_id=page_id,
        script=assets.script,
        audio_url=audio_url,
        mime=tts_result.mime,
        engine=tts_result.engine,
        voice=tts_result.voice,
        source=assets.source,
        dialogue_lines=assets.dialogue_lines,
    )


# ─── Chapter batch job (background) ───────────────────────────────────────────

@dataclass
class ChapterJob:
    job_id: str
    chapter_id: str
    total: int
    done: int = 0
    status: str = "running"          # running | completed | failed
    error: str | None = None
    segments: list[dict] = field(default_factory=list)
    created_at: float = field(default_factory=time.monotonic)


_JOBS: dict[str, ChapterJob] = {}
_JOBS_LOCK = threading.Lock()
_JOBS_TTL_SEC = 60 * 60


def _prune_jobs() -> None:
    now = time.monotonic()
    with _JOBS_LOCK:
        stale = [jid for jid, j in _JOBS.items() if now - j.created_at > _JOBS_TTL_SEC]
        for jid in stale:
            _JOBS.pop(jid, None)


def get_job(job_id: str) -> ChapterJob | None:
    with _JOBS_LOCK:
        return _JOBS.get(job_id)


def list_chapter_pages(supabase: Any, chapter_id: str, user_id: str) -> list[dict]:
    """Owned, readable pages of a chapter ordered by page_number."""
    res = (
        supabase.table("manga_pages")
        .select("page_id, user_id, page_number, status")
        .eq("chapter_id", chapter_id)
        .order("page_number")
        .execute()
    )
    rows = [r for r in (res.data or []) if r.get("user_id") == user_id]
    return rows


def start_chapter_job(
    supabase: Any,
    chapter_id: str,
    page_ids: list[str],
    *,
    engine: str | None,
    voice: str | None,
    rate: str | None,
    job_id: str,
) -> ChapterJob:
    """Register + launch a background narration job over the given pages."""
    _prune_jobs()
    job = ChapterJob(job_id=job_id, chapter_id=chapter_id, total=len(page_ids))
    with _JOBS_LOCK:
        _JOBS[job_id] = job

    def _run() -> None:
        for pid in page_ids:
            try:
                result = narrate_page(supabase, pid, engine=engine, voice=voice, rate=rate)
                with _JOBS_LOCK:
                    job.segments.append(result.as_dict())
                    job.done += 1
            except Exception as exc:  # noqa: BLE001 — one bad page shouldn't kill the job
                logger.warning("Chapter narration: page %s failed: %s", pid, exc)
                with _JOBS_LOCK:
                    job.segments.append({"page_id": pid, "error": str(exc)[:300], "audio_url": None})
                    job.done += 1
        with _JOBS_LOCK:
            job.status = "completed"

    threading.Thread(target=_run, name=f"narrate-{job_id[:8]}", daemon=True).start()
    return job
