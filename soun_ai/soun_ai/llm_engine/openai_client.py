"""
Thin wrapper around the OpenAI SDK.
All LLM calls in soun_AI go through this module so the model / key
can be changed in one place (config.py).

Usage:
    from llm_engine.openai_client import ask, ask_json, ask_vision

    text   = ask("Explain photosynthesis in simple terms.")
    parsed = ask_json("Return a JSON list of 3 quiz questions about ...")
    result = ask_vision(image_path="slide.png", prompt="What concepts are on this slide?")
"""
from __future__ import annotations

import base64
import json
import re
from pathlib import Path
from typing import Any

from openai import OpenAI

from config import OPENAI_API_KEY, LLM_MODEL, LLM_MAX_TOKENS, LLM_TEMPERATURE
from utils.logger import get_logger

log = get_logger(__name__)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        if not OPENAI_API_KEY:
            raise EnvironmentError(
                "OPENAI_API_KEY is not set. "
                "Add it to your .env or environment variables."
            )
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


# ── Core helpers ───────────────────────────────────────────────────────────

def ask(
    prompt: str,
    system: str = "You are a helpful educational assistant.",
    temperature: float = LLM_TEMPERATURE,
    max_tokens: int = LLM_MAX_TOKENS,
    model: str = LLM_MODEL,
) -> str:
    """Send a single user prompt and return the text response."""
    client = _get_client()
    log.debug("LLM ask | model=%s | prompt[:80]=%s", model, prompt[:80])
    response = client.chat.completions.create(
        model=model,
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
    model: str = LLM_MODEL,
) -> Any:
    """
    Ask for a JSON response.
    Returns the parsed Python object (dict or list).
    Raises ValueError if the response is not valid JSON.
    """
    json_system = system if "JSON" in system else system + " Always respond with valid JSON only."
    client = _get_client()
    log.debug("LLM ask_json | model=%s | prompt[:80]=%s", model, prompt[:80])
    response = client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": json_system},
            {"role": "user",   "content": prompt},
        ],
    )
    raw = response.choices[0].message.content or ""

    # Extract JSON block if wrapped in markdown fences
    m = re.search(r"```(?:json)?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*```", raw)
    json_str = m.group(1) if m else raw.strip()

    try:
        return json.loads(json_str)
    except json.JSONDecodeError as exc:
        log.error("LLM returned non-JSON: %s", raw[:200])
        raise ValueError(f"LLM response is not valid JSON: {exc}") from exc


def ask_vision(
    image_path: str,
    prompt: str,
    system: str = "You are an expert at analysing educational documents and images.",
    temperature: float = LLM_TEMPERATURE,
    max_tokens: int = LLM_MAX_TOKENS,
    model: str = LLM_MODEL,
) -> str:
    """
    Send an image + text prompt using GPT-4o vision.
    Supported formats: JPEG, PNG, GIF, WEBP.
    """
    client = _get_client()
    path = Path(image_path)
    suffix = path.suffix.lower().lstrip(".")
    media_map = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png", "gif": "image/gif", "webp": "image/webp",
    }
    media_type = media_map.get(suffix, "image/png")

    with open(image_path, "rb") as f:
        b64 = base64.standard_b64encode(f.read()).decode("utf-8")

    log.debug("LLM vision ask | image=%s | prompt[:60]=%s", path.name, prompt[:60])
    response = client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{media_type};base64,{b64}"},
                    },
                    {"type": "text", "text": prompt},
                ],
            },
        ],
    )
    return response.choices[0].message.content or ""
