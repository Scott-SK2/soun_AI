"""
Groq backend — free LLM API with Llama-3 models.
No compilation required; drop-in replacement for openai_client.

Set LLM_BACKEND=groq and GROQ_API_KEY in environment.
Free tier: ~14,400 req/day on llama-3.1-8b-instant.
Vision: not supported (falls back gracefully).
"""
from __future__ import annotations

import json
import re
from typing import Any

from groq import Groq

from config import GROQ_API_KEY, LLM_MAX_TOKENS, LLM_TEMPERATURE
from utils.logger import get_logger

log = get_logger(__name__)

GROQ_MODEL = "llama-3.1-8b-instant"   # free, fast; upgrade to llama-3.3-70b-versatile if needed

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        if not GROQ_API_KEY:
            raise EnvironmentError(
                "GROQ_API_KEY is not set. "
                "Get a free key at https://console.groq.com and add it to your environment."
            )
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def ask(
    prompt: str,
    system: str = "You are a helpful educational assistant.",
    temperature: float = LLM_TEMPERATURE,
    max_tokens: int = LLM_MAX_TOKENS,
    **_kwargs,
) -> str:
    client = _get_client()
    log.debug("Groq ask | model=%s | prompt[:80]=%s", GROQ_MODEL, prompt[:80])
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ],
    )
    return response.choices[0].message.content or ""


def ask_json(
    prompt: str,
    system: str = "You are a helpful educational assistant. Always respond with valid JSON.",
    temperature: float = LLM_TEMPERATURE,
    max_tokens: int = LLM_MAX_TOKENS,
    **_kwargs,
) -> Any:
    json_system = system if "JSON" in system else system + " Always respond with valid JSON only."
    client = _get_client()
    log.debug("Groq ask_json | model=%s | prompt[:80]=%s", GROQ_MODEL, prompt[:80])
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": json_system},
            {"role": "user",   "content": prompt},
        ],
    )
    raw = response.choices[0].message.content or ""
    m = re.search(r"```(?:json)?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*```", raw)
    json_str = m.group(1) if m else raw.strip()
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as exc:
        log.error("Groq returned non-JSON: %s", raw[:200])
        raise ValueError(f"Groq response is not valid JSON: {exc}") from exc


def ask_vision(image_path: str, prompt: str, **_kwargs) -> str:
    raise NotImplementedError(
        "Vision is not supported with the Groq backend. "
        "Set LLM_BACKEND=openai for vision features."
    )
