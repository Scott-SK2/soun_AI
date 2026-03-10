"""
Flashcard generation — replaces flashcard-service.ts from Soun.

Generates flashcards from concepts/documents and evaluates student answers.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from llm_engine.claude_client import ask_json, ask
from utils.logger import get_logger

log = get_logger(__name__)


@dataclass
class Flashcard:
    front: str          # Question / concept name
    back: str           # Answer / definition
    hint: Optional[str] = None
    difficulty: str = "med"
    source: Optional[str] = None


@dataclass
class FlashcardEvaluation:
    verdict: str        # "PERFECT" | "PARTIAL" | "INCORRECT"
    score: float        # 0-1
    feedback: str
    model_answer: str


# ── Generation ─────────────────────────────────────────────────────────────

def generate_flashcards(
    concept_index: list[dict],
    n_cards: int = 10,
    language: str = "fr",
) -> List[Flashcard]:
    """
    Generate flashcards from a concept index (list of concept dicts).
    """
    n_cards = max(1, min(50, n_cards))
    concepts_text = "\n".join(
        f"- {c.get('title','')}: {c.get('definition','') or ', '.join(c.get('key_points',[]))}"
        for c in concept_index[:30]
    )

    prompt = f"""Create {n_cards} educational flashcards in {language} from these concepts:

{concepts_text}

Return JSON:
{{
  "flashcards": [
    {{
      "front": "Question or concept name",
      "back": "Complete answer or definition",
      "hint": "Short hint (optional)",
      "difficulty": "easy|med|hard",
      "source": "concept title it comes from"
    }}
  ]
}}

Rules:
- Vary difficulty: mix easy recall, medium explanation, hard application.
- Fronts should be clear questions or term names.
- Backs should be complete but concise (2-3 sentences max).
"""
    try:
        data = ask_json(prompt, temperature=0.45)
        cards = []
        for c in data.get("flashcards", []):
            cards.append(Flashcard(
                front=c.get("front", ""),
                back=c.get("back", ""),
                hint=c.get("hint"),
                difficulty=c.get("difficulty", "med"),
                source=c.get("source"),
            ))
        log.info("Generated %d flashcards", len(cards))
        return cards
    except Exception as exc:
        log.error("Flashcard generation failed: %s", exc)
        return []


def generate_flashcards_from_text(
    text: str,
    n_cards: int = 8,
    language: str = "fr",
) -> List[Flashcard]:
    """Generate flashcards directly from raw document text."""
    prompt = f"""Create {n_cards} educational flashcards in {language} from this text:

{text[:5000]}

Return JSON:
{{
  "flashcards": [
    {{"front":"...","back":"...","hint":"...","difficulty":"easy|med|hard","source":""}}
  ]
}}
"""
    try:
        data = ask_json(prompt, temperature=0.45)
        return [Flashcard(**c) for c in data.get("flashcards", [])]
    except Exception as exc:
        log.error("Flashcard-from-text failed: %s", exc)
        return []


# ── Evaluation ─────────────────────────────────────────────────────────────

def evaluate_flashcard_answer(
    card: Flashcard,
    student_answer: str,
    language: str = "fr",
) -> FlashcardEvaluation:
    """
    Semantically evaluate a student's answer to a flashcard.
    Returns verdict (PERFECT / PARTIAL / INCORRECT), score 0-1, and feedback.
    """
    prompt = f"""Evaluate this student's flashcard answer in {language}.

Card question: {card.front}
Expected answer: {card.back}
Student's answer: {student_answer}

Return JSON:
{{
  "verdict": "PERFECT|PARTIAL|INCORRECT",
  "score": 0.0,
  "feedback": "Short encouraging feedback in {language}",
  "model_answer": "Ideal answer in {language}"
}}

Scoring guide:
- PERFECT (0.9-1.0): covers all key points correctly
- PARTIAL (0.4-0.89): some correct elements but missing important parts
- INCORRECT (0-0.39): wrong or off-topic
"""
    try:
        data = ask_json(prompt, temperature=0.3)
        return FlashcardEvaluation(
            verdict=data.get("verdict", "INCORRECT"),
            score=float(data.get("score", 0.0)),
            feedback=data.get("feedback", ""),
            model_answer=data.get("model_answer", card.back),
        )
    except Exception as exc:
        log.error("Flashcard evaluation failed: %s", exc)
        return FlashcardEvaluation(
            verdict="INCORRECT", score=0.0,
            feedback="Could not evaluate answer.", model_answer=card.back,
        )
