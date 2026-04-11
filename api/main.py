"""
soun_AI — FastAPI microservice
Exposes soun_AI capabilities as HTTP endpoints.
Called by the Soun (Node.js) backend instead of OpenAI.

Start:
    cd api && uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Any

# Make soun_ai package importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "soun_ai" / "soun_ai"))

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from routers import documents, quiz, flashcards, study_guide, vision, voice, tutoring
from core.session_store import session_store


# ── Lifespan ───────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    yield
    # Cleanup OCR readers on shutdown
    from utils.ocr_singleton import release_all
    release_all()


# ── App ────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="soun_AI API",
    description="Intelligent tutoring microservice — replaces OpenAI in the Soun project",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────

app.include_router(documents.router,   prefix="/documents",  tags=["Documents"])
app.include_router(quiz.router,        prefix="/quiz",       tags=["Quiz"])
app.include_router(flashcards.router,  prefix="/flashcards", tags=["Flashcards"])
app.include_router(study_guide.router, prefix="/study",      tags=["Study Guide"])
app.include_router(vision.router,      prefix="/vision",     tags=["Vision"])
app.include_router(voice.router,       prefix="/voice",      tags=["Voice & NLP"])
app.include_router(tutoring.router,    prefix="/tutor",      tags=["Tutoring"])


# ── Health ─────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "active_sessions": len(session_store.sessions),
    }
