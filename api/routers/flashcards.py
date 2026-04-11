"""
/flashcards — flashcard generation and evaluation
Replaces: flashcard-service.ts
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException

from core.models import (
    FlashcardGenerateRequest, FlashcardOut,
    FlashcardEvalRequest, FlashcardEvalResponse,
)

router = APIRouter()


@router.post("/generate", response_model=List[FlashcardOut])
def generate(req: FlashcardGenerateRequest):
    """Generate flashcards from a concept index or raw text."""
    if req.concepts:
        from llm_engine.flashcard_generator import generate_flashcards
        cards = generate_flashcards(req.concepts, n_cards=req.n_cards, language=req.language)
    elif req.text:
        from llm_engine.flashcard_generator import generate_flashcards_from_text
        cards = generate_flashcards_from_text(req.text, n_cards=req.n_cards, language=req.language)
    else:
        raise HTTPException(400, "Provide either 'concepts' or 'text'.")

    if not cards:
        raise HTTPException(500, "Flashcard generation failed.")
    return [FlashcardOut(**c.__dict__) for c in cards]


@router.post("/evaluate", response_model=FlashcardEvalResponse)
def evaluate(req: FlashcardEvalRequest):
    """Evaluate a student's answer to a flashcard."""
    from llm_engine.flashcard_generator import evaluate_flashcard_answer, Flashcard
    card = Flashcard(**req.card.model_dump())
    result = evaluate_flashcard_answer(card, req.student_answer, language=req.language)
    return FlashcardEvalResponse(
        verdict=result.verdict,
        score=result.score,
        feedback=result.feedback,
        model_answer=result.model_answer,
    )
