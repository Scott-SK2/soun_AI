"""
/documents — document ingestion & concept extraction
Replaces: document-analysis-service.ts (analyzeDocument, extractAndAnalyze)
"""
from __future__ import annotations

import os
import tempfile
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse

from core.models import IngestResponse, ConceptOut
from core.session_store import session_store

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".pptx", ".ppt", ".png", ".jpg", ".jpeg", ".webp"}


@router.post("/ingest", response_model=IngestResponse)
async def ingest_document(
    file: UploadFile = File(...),
    user_id: str = Form(default="default"),
    course_id: str = Form(default="default_course"),
    use_vision: bool = Form(default=False),
):
    """
    Upload and ingest a document (PDF, PPTX, image).
    Extracts chunks + builds concept index.
    Stores them in the user's tutoring session.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}. Allowed: {ALLOWED_EXTENSIONS}")

    # Save upload to temp file
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        chunks = []

        # Vision path for images (higher fidelity)
        if use_vision and ext in {".png", ".jpg", ".jpeg", ".webp"}:
            from llm_engine.image_analyzer import image_to_chunks
            chunks = image_to_chunks(tmp_path, source_name=file.filename)
        else:
            from document_intelligence.ingestion import ingest_file
            chunks = ingest_file(tmp_path)

        if not chunks:
            raise HTTPException(422, "No content could be extracted from this file.")

        # Build concept index
        from document_intelligence.concept_builder import build_concept_index
        concept_index = build_concept_index(chunks)

        # Load into session
        runtime = session_store.get_or_create(user_id, course_id)
        runtime.load_course_chunks(chunks)
        runtime.concepts = concept_index
        # Rebuild validator + tutor with new concepts
        from tutoring_engine.semantic_validation import SemanticValidator
        from tutoring_engine.adaptive_tutor import AdaptiveTutorEngine
        runtime.validator = SemanticValidator(
            semantic_engine=runtime.semantic_engine,
            concept_index=concept_index,
            pass_threshold=runtime.validator.pass_threshold,
            fail_threshold=runtime.validator.fail_threshold,
            point_threshold=runtime.validator.point_threshold,
            min_points_to_pass=runtime.validator.min_points_to_pass,
        )
        runtime.tutor = AdaptiveTutorEngine(concept_index)

        return IngestResponse(
            chunks_loaded=len(chunks),
            concepts_found=len(concept_index),
            concepts=[ConceptOut(**{k: v for k, v in c.items() if k in ConceptOut.model_fields})
                      for c in concept_index[:20]],
        )
    finally:
        os.unlink(tmp_path)


@router.get("/concepts")
def get_concepts(user_id: str = "default", course_id: str = "default_course"):
    """Return the concept index for a session."""
    runtime = session_store.get(user_id, course_id)
    if not runtime:
        return {"concepts": []}
    return {"concepts": runtime.concepts}


@router.post("/summarize")
async def summarize_document(
    file: UploadFile = File(...),
    language: str = Form(default="fr"),
):
    """Summarise a document into study notes."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        from document_intelligence.ingestion import ingest_file
        chunks = ingest_file(tmp_path)
        text = " ".join(c.text for c in chunks[:10])  # first ~8000 chars

        from llm_engine.study_guide_generator import generate_document_summary
        summary = generate_document_summary(text, source_name=file.filename, language=language)
        return {"summary": summary}
    finally:
        os.unlink(tmp_path)
