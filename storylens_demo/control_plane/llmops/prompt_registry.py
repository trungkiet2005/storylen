"""Prompt registry — loads versioned YAML prompts from disk."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml

_PROMPTS_DIR = Path(__file__).parent.parent / "llm" / "prompts"


@lru_cache(maxsize=32)
def load_prompt(name: str) -> dict:
    """Load prompt YAML by name (without .yaml extension)."""
    path = _PROMPTS_DIR / f"{name}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Prompt not found: {path}")
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def get_system_prompt(name: str) -> str:
    return load_prompt(name)["system"].strip()


def get_version(name: str) -> str:
    return load_prompt(name).get("version", "unknown")
