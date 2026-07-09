"""
StoryLens Backend — Recap video renderer (optional).

Faithful port of manga-reader's "video recap": for each page, show the art for
the duration of its narration audio, then concatenate into a single .mp4.

Requires ``ffmpeg`` on the host. On deployments without it (e.g. Render free
tier) the router hides the feature via :func:`ffmpeg_available`. This is the
stretch half of Listen mode — the in-reader audio player is the core path.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile

from app.services import narration
from app.storage import supabase_storage

logger = logging.getLogger(__name__)


class RecapError(RuntimeError):
    """A recap video could not be produced."""


def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def _run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RecapError(f"ffmpeg failed: {proc.stderr[-500:]}")


def _segment_for_page(assets: narration.PageAssets, workdir: str, index: int) -> str:
    """Render one page's still-image-over-audio segment; return the .mp4 path."""
    img_path = os.path.join(workdir, f"img_{index}.png")
    audio_path = os.path.join(workdir, f"aud_{index}.{assets.tts_result.ext}")
    seg_path = os.path.join(workdir, f"seg_{index}.mp4")

    with open(img_path, "wb") as fh:
        fh.write(assets.image_bytes)
    with open(audio_path, "wb") as fh:
        fh.write(assets.tts_result.audio)

    # Loop the still image for exactly the audio's duration (-shortest), pad to
    # even dimensions so H.264 accepts it.
    _run([
        "ffmpeg", "-y",
        "-loop", "1", "-i", img_path,
        "-i", audio_path,
        "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest", seg_path,
    ])
    return seg_path


def build_chapter_recap(
    supabase,
    chapter_id: str,
    page_ids: list[str],
    *,
    engine: str | None = None,
    voice: str | None = None,
    rate: str | None = None,
) -> str:
    """Render + upload a recap .mp4 for the given pages. Returns a signed URL."""
    if not ffmpeg_available():
        raise RecapError("ffmpeg is not installed on this host.")
    if not page_ids:
        raise RecapError("No pages to render.")

    workdir = tempfile.mkdtemp(prefix="recap_")
    try:
        segments: list[str] = []
        for i, pid in enumerate(page_ids):
            try:
                assets = narration.render_page_assets(
                    supabase, pid, engine=engine, voice=voice, rate=rate
                )
                segments.append(_segment_for_page(assets, workdir, i))
            except Exception as exc:  # noqa: BLE001 — skip a bad page, keep the recap
                logger.warning("Recap: skipping page %s: %s", pid, exc)

        if not segments:
            raise RecapError("No page could be rendered into the recap.")

        concat_list = os.path.join(workdir, "concat.txt")
        with open(concat_list, "w", encoding="utf-8") as fh:
            for seg in segments:
                fh.write(f"file '{seg}'\n")

        out_path = os.path.join(workdir, "recap.mp4")
        _run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", concat_list, "-c", "copy", out_path,
        ])

        with open(out_path, "rb") as fh:
            video_bytes = fh.read()

        url = supabase_storage.upload_recap_video(video_bytes, chapter_id)
        if not url:
            raise RecapError("Recap rendered but upload failed.")
        return url
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
