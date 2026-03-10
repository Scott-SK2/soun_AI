"""
/study — study guide generation
Replaces: study-guide-service.ts
"""
from __future__ import annotations

from fastapi import APIRouter

from core.models import StudyGuideRequest, StudySummaryRequest

router = APIRouter()


@router.post("/guide")
def generate_guide(req: StudyGuideRequest):
    """Generate a full structured study guide from concepts."""
    if req.voice:
        from llm_engine.study_guide_generator import generate_voice_study_guide
        text = generate_voice_study_guide(req.concepts, req.course_name, req.language)
        return {"type": "voice", "text": text}

    from llm_engine.study_guide_generator import generate_study_guide
    guide = generate_study_guide(req.concepts, req.course_name, req.language)
    return {
        "title": guide.title,
        "sections": guide.sections,
        "summary": guide.summary,
        "exam_tips": guide.exam_tips,
    }


@router.post("/summary")
def summarize(req: StudySummaryRequest):
    """Summarise raw document text into study notes."""
    from llm_engine.study_guide_generator import generate_document_summary
    summary = generate_document_summary(req.text, req.source_name, req.language)
    return {"summary": summary}


@router.post("/explain")
def explain(concept: dict, student_level: str = "undergraduate", language: str = "fr"):
    """Generate a pedagogical explanation for a concept."""
    from llm_engine.study_guide_generator import generate_teaching_explanation
    explanation = generate_teaching_explanation(concept, student_level, language)
    return {"explanation": explanation}
