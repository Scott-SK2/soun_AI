"""
/vision — image analysis + SVG diagram generation
Replaces: document-analysis-service.ts (vision) + visual-generation-service.ts
"""
from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from core.models import ImageAnalysisResponse, DiagramRequest, DiagramResponse

router = APIRouter()

ALLOWED = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


@router.post("/analyze", response_model=ImageAnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    language: str = Form(default="fr"),
    user_id: str = Form(default="default"),
    course_id: str = Form(default="default_course"),
    add_to_session: bool = Form(default=False),
):
    """
    Analyse an image/slide using Claude Vision.
    Optionally add extracted content to the user's session.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED:
        raise HTTPException(400, f"Unsupported image format: {ext}")

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        from llm_engine.image_analyzer import analyze_image as _analyze, image_to_chunks
        analysis = _analyze(tmp_path, language=language)

        chunks_added = 0
        if add_to_session:
            from core.session_store import session_store
            chunks = image_to_chunks(tmp_path, source_name=file.filename, language=language)
            if chunks:
                rt = session_store.get_or_create(user_id, course_id)
                rt.docs.add_chunks(chunks)
                rt.docs.build()
                chunks_added = len(chunks)

        return ImageAnalysisResponse(
            raw_text=analysis.raw_text,
            concepts=analysis.concepts,
            diagrams_described=analysis.diagrams_described,
            summary=analysis.summary,
            chunks_added=chunks_added,
        )
    finally:
        os.unlink(tmp_path)


@router.post("/diagram", response_model=DiagramResponse)
def generate_diagram(req: DiagramRequest):
    """Generate an SVG diagram for a concept."""
    from llm_engine.diagram_generator import generate_diagram as _gen
    result = _gen(req.concept, req.diagram_type, req.language)
    return DiagramResponse(
        svg=result.svg,
        title=result.title,
        description=result.description,
        diagram_type=result.diagram_type,
    )
