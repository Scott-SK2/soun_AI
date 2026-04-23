#!/usr/bin/env python3
"""
Startup script for Render deployment with Phi-3 Mini on persistent disk.
Downloads the model on first deploy if not already present, then starts uvicorn.
"""
import os
import sys
from pathlib import Path

MODEL_PATH = Path(os.environ.get("LOCAL_MODEL_PATH", "/data/models/Phi-3-mini-4k-instruct-q4.gguf"))

if os.environ.get("LLM_BACKEND", "openai").lower() == "local":
    if not MODEL_PATH.exists():
        print(f"[start] Model not found at {MODEL_PATH}. Downloading Phi-3 Mini (~2.4 GB)...")
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        try:
            from huggingface_hub import hf_hub_download
            hf_hub_download(
                repo_id="microsoft/Phi-3-mini-4k-instruct-gguf",
                filename=MODEL_PATH.name,
                local_dir=str(MODEL_PATH.parent),
            )
            print(f"[start] Model downloaded successfully to {MODEL_PATH}")
        except Exception as e:
            print(f"[start] ERROR downloading model: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"[start] Model found at {MODEL_PATH}. Skipping download.")
else:
    print("[start] LLM_BACKEND=openai — skipping model download.")

port = os.environ.get("PORT", "8000")
print(f"[start] Starting uvicorn on port {port}...")
os.execvp(
    sys.executable,
    [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", port],
)
