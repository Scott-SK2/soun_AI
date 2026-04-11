"""
/quiz — quiz generation and evaluation
Replaces: quiz-generation-service.ts
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from core.models import (
    QuizGenerateRequest, QuizResponse,
    QuizEvaluateRequest, QuizEvaluateResponse,
    QuizQuestion,
)

router = APIRouter()


@router.post("/generate", response_model=QuizResponse)
def generate(req: QuizGenerateRequest):
    """Generate a multiple-choice quiz from topic + context."""
    from llm_engine.quiz_generator import generate_quiz
    result = generate_quiz(
        topic=req.topic,
        context=req.context,
        n_questions=req.n_questions,
        difficulty=req.difficulty,
        language=req.language,
    )
    if not result.questions:
        raise HTTPException(500, "Quiz generation failed. Check ANTHROPIC_API_KEY.")
    return QuizResponse(questions=[
        QuizQuestion(**q.__dict__) for q in result.questions
    ])


@router.post("/evaluate", response_model=QuizEvaluateResponse)
def evaluate(req: QuizEvaluateRequest):
    """Evaluate a completed quiz and return score + feedback."""
    from llm_engine.quiz_generator import evaluate_quiz_answers, QuizQuestion as _QQ
    questions = [_QQ(**q.model_dump()) for q in req.questions]
    result = evaluate_quiz_answers(questions, req.student_answers, language=req.language)
    return QuizEvaluateResponse(
        score=result.score or 0.0,
        feedback=result.feedback or "",
        questions=[QuizQuestion(**q.__dict__) for q in result.questions],
    )


@router.post("/adaptive-followup", response_model=QuizResponse)
def adaptive_followup(
    topic: str,
    student_answer: str,
    was_correct: bool,
    language: str = "fr",
):
    """Generate an adaptive follow-up question."""
    from llm_engine.quiz_generator import generate_adaptive_followup
    result = generate_adaptive_followup(topic, student_answer, was_correct, language)
    return QuizResponse(questions=[QuizQuestion(**q.__dict__) for q in result.questions])
