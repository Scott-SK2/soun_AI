"""
/tutor — core tutoring flow
Replaces: the AI tutoring logic that used OpenAI chat completions
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from core.models import (
    AskRequest, AskResponse,
    GradeRequest, GradeResponse,
    CorrectRequest, AskResponse as CorrectResponse,
    ProgressResponse,
)
from core.session_store import session_store

router = APIRouter()


def _require_session(user_id: str, course_id: str):
    rt = session_store.get(user_id, course_id)
    if rt is None:
        raise HTTPException(404, "Session not found. Please ingest a document first.")
    return rt


@router.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    """
    Answer a student question using course material.
    Returns explanation + adaptive check question.
    """
    rt = _require_session(req.user_id, req.course_id)
    turn = rt.answer_question(req.question)
    return AskResponse(
        message=turn.message,
        next_check=turn.next_check,
        target_concept=getattr(turn, "target_concept", None),
    )


@router.post("/grade", response_model=GradeResponse)
def grade(req: GradeRequest):
    """
    Grade a student's answer to a check question.
    Records progress automatically.
    """
    rt = _require_session(req.user_id, req.course_id)
    result = rt.grade(req.check_question, req.student_answer)

    evidence = getattr(result, "evidence", {}) or {}
    return GradeResponse(
        verdict=result.verdict,
        reason=result.reason,
        similarity=float(getattr(result, "similarity", 0.0) or 0.0),
        concept_id=getattr(result, "concept_id", None),
        concept_title=getattr(result, "concept_title", None),
        covered_points=evidence.get("covered_points", []),
        missing_points=evidence.get("missing_points", []),
        coverage_ratio=float(evidence.get("coverage_ratio", 0.0)),
    )


@router.post("/correct", response_model=CorrectResponse)
def correct(req: CorrectRequest):
    """
    Get correction feedback after a failed answer.
    Returns explanation of what was missing + a new check.
    """
    rt = _require_session(req.user_id, req.course_id)

    # Rebuild a ValidationResult-like object from the grade payload
    from tutoring_engine.semantic_validation import ValidationResult
    grade = ValidationResult(
        verdict=req.grade.verdict,
        reason=req.grade.reason,
        concept_id=req.grade.concept_id,
        concept_title=req.grade.concept_title,
        similarity=req.grade.similarity,
        evidence={
            "covered_points": req.grade.covered_points,
            "missing_points": req.grade.missing_points,
            "coverage_ratio": req.grade.coverage_ratio,
        },
    )
    turn = rt.correct(req.check_question, req.student_answer, grade)
    return CorrectResponse(
        message=turn.message,
        next_check=turn.next_check,
        target_concept=getattr(turn, "target_concept", None),
    )


@router.post("/confused")
def confused(user_id: str, course_id: str, student_message: str, original_question: str):
    """Handle 'I don't understand' — ask what they already know."""
    rt = _require_session(user_id, course_id)
    turn = rt.on_app_explained_and_student_confused(student_message, original_question)
    return {"message": turn.message, "next_check": turn.next_check}


@router.post("/what-they-know")
def what_they_know(user_id: str, course_id: str, student_knowledge: str):
    """Called after student says what they know — returns tailored explanation."""
    rt = _require_session(user_id, course_id)
    turn = rt.on_student_provides_what_they_know(student_knowledge)
    return {"message": turn.message, "next_check": turn.next_check}


@router.get("/progress", response_model=ProgressResponse)
def progress(user_id: str = "default", course_id: str = "default_course"):
    """Return student progress for a course."""
    rt = _require_session(user_id, course_id)
    return ProgressResponse(
        course_percent=rt.progress.get_course_percent(course_id),
        course_status=rt.progress.get_course_status(course_id),
        report=rt.get_progress_report(),
    )


@router.post("/session/start")
def start_session(user_id: str = "default", course_id: str = "default_course"):
    """Start a study session (for time tracking)."""
    rt = session_store.get_or_create(user_id, course_id)
    rt.start_study_session()
    return {"status": "session started"}


@router.post("/session/end")
def end_session(user_id: str = "default", course_id: str = "default_course"):
    """End a study session."""
    rt = _require_session(user_id, course_id)
    rt.end_study_session()
    return {"status": "session ended"}
