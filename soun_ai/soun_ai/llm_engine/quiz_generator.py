"""
Quiz generation — replaces quiz-generation-service.ts from Soun.

Generates, adapts, and evaluates quizzes from course concepts or raw text.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import List, Optional

from llm_engine.claude_client import ask_json, ask
from utils.logger import get_logger

log = get_logger(__name__)


@dataclass
class QuizQuestion:
    question: str
    options: List[str]           # A, B, C, D
    correct_index: int           # 0-based
    explanation: str
    difficulty: str = "med"      # easy / med / hard


@dataclass
class QuizResult:
    questions: List[QuizQuestion] = field(default_factory=list)
    score: Optional[float] = None      # 0-1 if evaluated
    feedback: Optional[str] = None


# ── Generation ─────────────────────────────────────────────────────────────

def generate_quiz(
    topic: str,
    context: str,
    n_questions: int = 5,
    difficulty: str = "med",
    language: str = "fr",
) -> QuizResult:
    """
    Generate a multiple-choice quiz from topic + context material.

    Args:
        topic: The concept being tested.
        context: Raw course text / definition / key points.
        n_questions: Number of questions (1-10).
        difficulty: 'easy', 'med', or 'hard'.
        language: Output language ('fr', 'en', …).
    """
    n_questions = max(1, min(10, n_questions))

    prompt = f"""Generate {n_questions} multiple-choice quiz questions about "{topic}" in {language}.

Context material:
{context[:4000]}

Difficulty: {difficulty}

Return a JSON object with this exact structure:
{{
  "questions": [
    {{
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_index": 0,
      "explanation": "...",
      "difficulty": "{difficulty}"
    }}
  ]
}}

Rules:
- correct_index is 0 for A, 1 for B, 2 for C, 3 for D.
- For 'hard': require application, analysis, or evaluation.
- For 'easy': focus on recall and basic understanding.
- All options must be plausible; avoid obviously wrong distractors.
- Explanations must reference the context material.
"""
    try:
        data = ask_json(prompt, temperature=0.5)
        questions = []
        for q in data.get("questions", []):
            questions.append(QuizQuestion(
                question=q.get("question", ""),
                options=q.get("options", []),
                correct_index=int(q.get("correct_index", 0)),
                explanation=q.get("explanation", ""),
                difficulty=q.get("difficulty", difficulty),
            ))
        log.info("Generated %d quiz questions for '%s'", len(questions), topic)
        return QuizResult(questions=questions)
    except Exception as exc:
        log.error("Quiz generation failed for '%s': %s", topic, exc)
        return QuizResult()


def generate_adaptive_followup(
    topic: str,
    student_answer: str,
    was_correct: bool,
    language: str = "fr",
) -> QuizResult:
    """Generate a follow-up question based on whether the student was right or wrong."""
    if was_correct:
        prompt = f"""The student correctly answered a question about "{topic}" in {language}.
Generate 1 harder follow-up multiple-choice question to deepen understanding.
Return JSON: {{"questions": [{{"question":"...","options":["A.","B.","C.","D."],"correct_index":0,"explanation":"...","difficulty":"hard"}}]}}"""
    else:
        prompt = f"""The student answered incorrectly about "{topic}" in {language}.
Their answer: "{student_answer}"
Generate 1 easier clarifying multiple-choice question to reinforce basics.
Return JSON: {{"questions": [{{"question":"...","options":["A.","B.","C.","D."],"correct_index":0,"explanation":"...","difficulty":"easy"}}]}}"""

    try:
        data = ask_json(prompt, temperature=0.4)
        questions = [QuizQuestion(**q) for q in data.get("questions", [])]
        return QuizResult(questions=questions)
    except Exception as exc:
        log.error("Adaptive follow-up failed: %s", exc)
        return QuizResult()


# ── Evaluation ─────────────────────────────────────────────────────────────

def evaluate_quiz_answers(
    questions: List[QuizQuestion],
    student_answers: List[int],
    language: str = "fr",
) -> QuizResult:
    """
    Evaluate a completed quiz and return score + feedback.

    Args:
        questions: The quiz questions.
        student_answers: List of chosen option indices (0-based).
        language: Feedback language.
    """
    if not questions:
        return QuizResult(score=0.0, feedback="No questions to evaluate.")

    correct = sum(
        1 for q, a in zip(questions, student_answers) if a == q.correct_index
    )
    score = correct / len(questions)

    summary_lines = []
    for i, (q, a) in enumerate(zip(questions, student_answers)):
        is_right = a == q.correct_index
        mark = "✓" if is_right else "✗"
        summary_lines.append(
            f"Q{i+1} {mark}: {q.question}\n"
            f"  Your answer: {q.options[a] if 0 <= a < len(q.options) else 'n/a'}\n"
            f"  Correct: {q.options[q.correct_index]}\n"
            f"  {q.explanation}"
        )

    summary = "\n\n".join(summary_lines)

    feedback_prompt = f"""A student scored {correct}/{len(questions)} on a quiz in {language}.
Summary:
{summary[:3000]}

Write 2-3 sentences of encouraging, constructive feedback.
Point out what they understood well and what to review.
"""
    try:
        feedback = ask(feedback_prompt, temperature=0.4)
    except Exception as exc:
        log.warning("Feedback generation failed: %s", exc)
        feedback = f"Score: {correct}/{len(questions)}."

    return QuizResult(questions=questions, score=score, feedback=feedback)
