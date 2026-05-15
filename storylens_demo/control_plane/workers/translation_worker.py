"""Translation worker — full RAG + Gemini pipeline for one page."""
from __future__ import annotations

import logging
import time

from control_plane.llm.gemini_provider import BoxInput, BoxTranslation, get_provider
from control_plane.llmops.prompt_registry import get_system_prompt, get_version
from control_plane.llmops.tracing import trace_stage
from control_plane.rag import critic_agent
from control_plane.rag.orchestrator import build_context
from control_plane.storage import vector_store as vs
from control_plane.ws.event_bus import publish

log = logging.getLogger(__name__)


async def run_translation_pipeline(
    job_id: str,
    manga_id: str,
    chapter_id: str,
    page_id: str,
    page_index: int,
    boxes: list[dict],
    style_card: dict | None = None,
    api_keys: dict | None = None,
) -> list[dict]:
    """
    boxes: list of {"box_id", "raw_text", "xyxy"}
    Returns list of translated box dicts.
    """
    trace_id = f"{job_id[:8]}-trans"

    # --- RAG context ---
    await publish(job_id, "rag.started", "running", 30, {})
    with trace_stage(job_id, "rag", trace_id) as t:
        context = build_context(manga_id, chapter_id, page_id, boxes, style_card)
    await publish(job_id, "rag.done", "running", 40, {"latency_ms": t.latency_ms})

    # --- Gemini translation ---
    await publish(job_id, "grok.started", "running", 42, {})
    box_inputs = [
        BoxInput(
            box_id=b["box_id"],
            raw_text=b.get("raw_text", ""),
            reading_order=i,
            max_chars_hint=next(
                (c["max_chars_hint"] for c in context.get("layout_constraints", [])
                 if c["box_id"] == b["box_id"]), None
            ),
        )
        for i, b in enumerate(boxes)
        if b.get("raw_text", "").strip()
    ]

    if not box_inputs:
        await publish(job_id, "grok.translation_done", "running", 65, {"items": []})
        return []

    prompt = get_system_prompt("translation_v1")
    prompt_version = get_version("translation_v1")

    with trace_stage(job_id, "gemini_translate", trace_id) as t:
        trans_response = get_provider().translate_batch(
            boxes=box_inputs,
            context=context,
            prompt_template=prompt,
            page_index=page_index,
            api_key=api_keys.get("gemini_api_key") if api_keys else None,
        )

    await publish(job_id, "grok.translation_done", "running", 65, {
        "items": [{"box_id": i.box_id, "translated_text": i.translated_text, "speaker": i.speaker}
                  for i in trans_response.items],
        "token_usage": {"input": trans_response.input_tokens, "output": trans_response.output_tokens},
        "prompt_version": prompt_version,
        "latency_ms": t.latency_ms,
    })

    # --- Critic pass ---
    await publish(job_id, "grok.critic_started", "running", 70, {})
    with trace_stage(job_id, "gemini_critic", trace_id) as ct:
        critique = critic_agent.critique(
            trans_response.items, context, 
            api_key=api_keys.get("gemini_api_key") if api_keys else None
        )

    # Apply revisions
    revision_map = {issue.box_id: issue.new_text for issue in critique.issues}
    final_items: list[BoxTranslation] = []
    for item in trans_response.items:
        if item.box_id in revision_map:
            item.translated_text = revision_map[item.box_id]
        final_items.append(item)

    await publish(job_id, "grok.critic_done", "running", 75, {
        "passed": critique.passed,
        "revisions": len(critique.issues),
        "latency_ms": ct.latency_ms,
    })

    # --- Memory write ---
    await publish(job_id, "memory.write_started", "running", 80, {})
    _write_memory(
        manga_id, trans_response.memory_updates, final_items,
        api_key=api_keys.get("gemini_api_key") if api_keys else None
    )
    await publish(job_id, "memory.write_done", "running", 85, {})

    return [
        {
            "box_id": item.box_id,
            "translated_text": item.translated_text,
            "speaker": item.speaker,
            "tone": item.tone,
            "confidence": item.confidence,
        }
        for item in final_items
    ]


def _write_memory(manga_id: str, memory_updates: list, translations: list[BoxTranslation], api_key: str | None = None) -> None:
    """Write high-confidence memory updates to ChromaDB."""
    for update in memory_updates:
        if update.confidence < 0.6:
            continue
        try:
            embeddings = get_provider().embed([update.content], api_key=api_key)
            if update.type == "glossary":
                vs.upsert(vs.GLOSSARY_MEMORY, ids=[f"{manga_id}:{update.content[:40]}"],
                          documents=[update.content], embeddings=embeddings,
                          metadatas=[{"manga_id": manga_id}])
            elif update.type == "story_event":
                vs.upsert(vs.STORY_MEMORY, ids=[f"{manga_id}:{update.content[:40]}"],
                          documents=[update.content], embeddings=embeddings,
                          metadatas=[{"manga_id": manga_id}])
        except Exception as exc:
            log.warning("Memory write failed: %s", exc)
