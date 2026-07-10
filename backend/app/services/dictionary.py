"""
StoryLens Backend - Bubble Dictionary Service.

Given a bubble's raw OCR text (Japanese/Chinese) and its current VN translation,
ask Gemini to return:
- word-by-word breakdown (surface + reading + meaning + POS)
- romanization (rōmaji for JA, pinyin for ZH)
- 2-3 alternative VN translations with different tones
- optional cultural / translator note

Result is JSON-shaped so the frontend can render a structured popup.
A small in-process LRU cache keeps repeated lookups cheap.
"""
from __future__ import annotations

import json
import logging
import re
import threading
from collections import OrderedDict
from typing import Any

from app.config import get_settings
from app.services.rag import _is_retryable_gemini_key_error, _pool

logger = logging.getLogger(__name__)
settings = get_settings()

_CACHE_LOCK = threading.Lock()
_CACHE: "OrderedDict[str, dict[str, Any]]" = OrderedDict()
_CACHE_MAX = 1024

_PROMPT = """Bạn là một giáo viên tiếng Nhật/Trung kiêm dịch giả manga sang tiếng Việt.
Phân tích đoạn lời thoại sau theo định dạng JSON duy nhất (không markdown, không giải thích thêm).

Đoạn lời thoại gốc:
{original}

Bản dịch tiếng Việt hiện có:
{translation}

Trả về JSON đúng schema:
{{
  "language": "ja" | "zh" | "unknown",
  "romaji": "<rōmaji nếu là tiếng Nhật, pinyin nếu là tiếng Trung, hoặc null>",
  "tokens": [
    {{"surface": "<từ gốc>", "reading": "<hiragana/pinyin>", "meaning": "<nghĩa tiếng Việt ngắn gọn>", "pos": "<noun|verb|adj|particle|...>"}}
  ],
  "alternatives": ["<bản dịch VN khác, tone trang trọng>", "<bản dịch khác, tone thân mật>"],
  "note": "<lưu ý văn hóa / sắc thái nếu có, nếu không thì null>"
}}

Lưu ý:
- Chia tokens theo morpheme có nghĩa (không tách từng ký tự).
- alternatives tối đa 3 cái, khác nhau rõ rệt về sắc thái (lịch sự/suồng sã/văn học).
- Nếu đoạn quá ngắn (1-2 ký tự), vẫn cố trả về với tokens rỗng và alternatives.
- KHÔNG bọc JSON trong ```json``` block. Chỉ trả thuần JSON.
"""


def _cache_key(bubble_id: str, original_text: str, translation: str) -> str:
    return f"{bubble_id}|{hash(original_text)}|{hash(translation)}"


def _cache_get(key: str) -> dict[str, Any] | None:
    with _CACHE_LOCK:
        if key in _CACHE:
            # LRU bump
            _CACHE.move_to_end(key)
            return dict(_CACHE[key])
    return None


def _cache_put(key: str, value: dict[str, Any]) -> None:
    with _CACHE_LOCK:
        _CACHE[key] = value
        _CACHE.move_to_end(key)
        while len(_CACHE) > _CACHE_MAX:
            _CACHE.popitem(last=False)


def _detect_language(text: str) -> str:
    """Cheap language guess so we can return *something* even without Gemini."""
    # Hiragana / Katakana → Japanese
    if re.search(r"[぀-ゟ゠-ヿ]", text):
        return "ja"
    # CJK ideographs only → could be either, but default to Chinese (Japanese usually has kana)
    if re.search(r"[一-鿿]", text):
        return "zh"
    return "unknown"


def _extract_json(raw: str) -> dict[str, Any] | None:
    """Pull a JSON object out of Gemini's response — tolerate stray prose / code fences."""
    if not raw:
        return None
    # Strip code fences if present
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fence:
        candidate = fence.group(1)
    else:
        # Greedy match for outermost JSON object
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        candidate = match.group(0) if match else raw
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as exc:
        logger.warning("Dictionary JSON parse failed: %s — raw=%s", exc, raw[:300])
        return None


def _fallback_payload(original_text: str, translation: str) -> dict[str, Any]:
    """Return a useful response shape even when Gemini is unavailable."""
    return {
        "language": _detect_language(original_text),
        "romaji": None,
        "tokens": [],
        "alternatives": [translation] if translation else [],
        "note": "Hiện chưa gọi được Gemini để phân tích chi tiết. Bản dịch hiện tại đang hiển thị bên trên.",
    }


def lookup_bubble_dictionary(
    bubble_id: str,
    original_text: str,
    translation: str,
) -> tuple[dict[str, Any], bool]:
    """
    Return (payload, cached).
    Payload keys: language, romaji, tokens, alternatives, note.
    """
    original_text = (original_text or "").strip()
    if not original_text:
        return _fallback_payload(original_text, translation), False

    key = _cache_key(bubble_id, original_text, translation)
    cached = _cache_get(key)
    if cached is not None:
        return cached, True

    if not _pool.available:
        payload = _fallback_payload(original_text, translation)
        return payload, False

    prompt = _PROMPT.format(original=original_text, translation=translation or "(chưa có bản dịch)")

    from app.services import ai_telemetry

    with ai_telemetry.track("gemini", settings.GEMINI_MODEL, "dictionary.lookup") as tel:
        last_error: Exception | None = None
        for _ in range(_pool.client_count() or 1):
            client = _pool.next_client()
            if client is None:
                break
            try:
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                )
                um = getattr(response, "usage_metadata", None)
                if um is not None:
                    tel.prompt_tokens = int(getattr(um, "prompt_token_count", 0) or 0)
                    tel.completion_tokens = int(getattr(um, "candidates_token_count", 0) or 0)
                parsed = _extract_json(response.text or "")
                if not parsed:
                    last_error = ValueError("Empty or unparseable Gemini response")
                    continue

                payload = {
                    "language": str(parsed.get("language") or _detect_language(original_text)),
                    "romaji": parsed.get("romaji") or None,
                    "tokens": parsed.get("tokens") or [],
                    "alternatives": [str(a) for a in (parsed.get("alternatives") or []) if a][:3],
                    "note": parsed.get("note") or None,
                }
                _cache_put(key, payload)
                return payload, False
            except Exception as exc:
                last_error = exc
                if _is_retryable_gemini_key_error(exc):
                    logger.warning("Dictionary lookup: Gemini key failed, rotating. Error: %s", exc)
                    continue
                logger.error("Dictionary lookup failed: %s", exc)
                break

        logger.warning("Dictionary lookup exhausted: %s", last_error)
        tel.success = False
        return _fallback_payload(original_text, translation), False
