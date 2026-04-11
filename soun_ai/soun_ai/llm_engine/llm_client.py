"""
Unified LLM client — picks the right backend based on LLM_BACKEND env var.

  LLM_BACKEND=openai  (default) → OpenAI GPT-4o  (requires OPENAI_API_KEY)
  LLM_BACKEND=local             → Phi-3 Mini GGUF (free, no key needed)

Usage — drop-in, identical to importing openai_client directly:

    from llm_engine.llm_client import ask, ask_json, ask_vision

    text   = ask("Explain photosynthesis")
    parsed = ask_json("Return JSON with 3 quiz questions about ...")
    result = ask_vision(image_path="slide.png", prompt="List concepts")

Switch backend at runtime without restarting (useful for tests):

    from llm_engine import llm_client
    llm_client._BACKEND = "local"   # or "openai"
"""
from __future__ import annotations

from typing import Any

from config import LLM_BACKEND
from utils.logger import get_logger

log = get_logger(__name__)

# Can be overridden at runtime for testing
_BACKEND: str = LLM_BACKEND.lower().strip()


def _backend_module():
    """Return the active backend module (lazy import so heavy deps load on demand)."""
    backend = _BACKEND
    if backend == "local":
        from llm_engine import local_llm as _mod
    else:
        if backend != "openai":
            log.warning("Unknown LLM_BACKEND=%r — falling back to 'openai'", backend)
        from llm_engine import openai_client as _mod  # type: ignore[assignment]
    return _mod


# ── Public interface ────────────────────────────────────────────────────────

def ask(
    prompt: str,
    system: str = "You are a helpful educational assistant.",
    **kwargs,
) -> str:
    """Send a text prompt, return the text response."""
    return _backend_module().ask(prompt, system=system, **kwargs)


def ask_json(
    prompt: str,
    system: str = "You are a helpful educational assistant. Always respond with valid JSON.",
    **kwargs,
) -> Any:
    """Send a prompt, return a parsed JSON object (dict or list)."""
    return _backend_module().ask_json(prompt, system=system, **kwargs)


def ask_vision(
    image_path: str,
    prompt: str,
    **kwargs,
) -> str:
    """
    Send an image + text prompt.
    Raises NotImplementedError when using the local backend (vision needs OpenAI).
    """
    return _backend_module().ask_vision(image_path=image_path, prompt=prompt, **kwargs)


def current_backend() -> str:
    """Return the name of the active backend ('openai' or 'local')."""
    return _BACKEND
