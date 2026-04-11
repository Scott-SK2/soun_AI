"""
Local LLM backend using llama-cpp-python (Phi-3 Mini or any GGUF model).
Same interface as openai_client.py — drop-in replacement.

Setup:
    pip install llama-cpp-python
    # Download model:
    from huggingface_hub import hf_hub_download
    hf_hub_download(
        repo_id="microsoft/Phi-3-mini-4k-instruct-gguf",
        filename="Phi-3-mini-4k-instruct-q4.gguf",
        local_dir="./models"
    )

Then in .env:
    LLM_BACKEND=local
    LOCAL_MODEL_PATH=./models/Phi-3-mini-4k-instruct-q4.gguf
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from config import LLM_MAX_TOKENS, LLM_TEMPERATURE
from utils.logger import get_logger

log = get_logger(__name__)

_llm = None


def _get_llm():
    global _llm
    if _llm is not None:
        return _llm

    import os
    from config import LOCAL_MODEL_PATH, LOCAL_N_CTX, LOCAL_N_THREADS

    model_path = Path(LOCAL_MODEL_PATH)
    if not model_path.exists():
        raise FileNotFoundError(
            f"Local model not found at '{model_path}'.\n"
            "Download with:\n"
            "  from huggingface_hub import hf_hub_download\n"
            "  hf_hub_download('microsoft/Phi-3-mini-4k-instruct-gguf',\n"
            "                  'Phi-3-mini-4k-instruct-q4.gguf', local_dir='./models')"
        )

    try:
        from llama_cpp import Llama
    except ImportError:
        raise ImportError(
            "llama-cpp-python is not installed.\n"
            "Install with: pip install llama-cpp-python"
        )

    log.info("Loading local model from %s (n_ctx=%d, threads=%d)...", model_path, LOCAL_N_CTX, LOCAL_N_THREADS)
    _llm = Llama(
        model_path=str(model_path),
        n_ctx=LOCAL_N_CTX,
        n_threads=LOCAL_N_THREADS,
        verbose=False,
    )
    log.info("Local model loaded.")
    return _llm


def _call(prompt: str, max_tokens: int, temperature: float) -> str:
    llm = _get_llm()
    out = llm(prompt, max_tokens=max_tokens, temperature=temperature, top_p=0.9, stop=["User:"])
    return out["choices"][0]["text"].strip()


def _build_prompt(system: str, user: str) -> str:
    """Format prompt for Phi-3 instruction format."""
    return f"<|system|>\n{system}<|end|>\n<|user|>\n{user}<|end|>\n<|assistant|>\n"


# ── Public interface (mirrors openai_client.py) ────────────────────────────

def ask(
    prompt: str,
    system: str = "You are a helpful educational assistant.",
    temperature: float = LLM_TEMPERATURE,
    max_tokens: int = LLM_MAX_TOKENS,
    **kwargs,  # ignore model= etc.
) -> str:
    full_prompt = _build_prompt(system, prompt)
    return _call(full_prompt, max_tokens=max_tokens, temperature=temperature)


def ask_json(
    prompt: str,
    system: str = "You are a helpful educational assistant. Always respond with valid JSON.",
    temperature: float = LLM_TEMPERATURE,
    max_tokens: int = LLM_MAX_TOKENS,
    **kwargs,
) -> Any:
    json_system = system if "JSON" in system else system + " Always respond with valid JSON only."
    raw = ask(prompt, system=json_system, temperature=temperature, max_tokens=max_tokens)

    m = re.search(r"```(?:json)?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*```", raw)
    json_str = m.group(1) if m else raw.strip()

    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        # Try to extract first JSON object
        m2 = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", json_str)
        if m2:
            try:
                return json.loads(m2.group(1))
            except Exception:
                pass
        log.error("Local LLM returned non-JSON: %s", raw[:200])
        raise ValueError(f"Local LLM response is not valid JSON: {raw[:100]}")


def ask_vision(*args, **kwargs) -> str:
    """Vision is not supported by local CPU models. Use OpenAI backend for image analysis."""
    raise NotImplementedError(
        "Vision is not supported by the local Phi-3 Mini model.\n"
        "Set LLM_BACKEND=openai in your .env for image analysis."
    )
