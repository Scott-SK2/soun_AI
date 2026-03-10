"""
Shared Pydantic models used across all routers.
"""
from __future__ import annotations

from typing import Any, List, Optional
from pydantic import BaseModel, Field


# ── Common ─────────────────────────────────────────────────────────────────

class SessionParams(BaseModel):
    user_id: str = "default"
    course_id: str = "default_course"


# ── Documents ──────────────────────────────────────────────────────────────

class ConceptOut(BaseModel):
    id: str
    title: str
    definition: str
    key_points: List[str]
    sources: List[str]


class IngestResponse(BaseModel):
    chunks_loaded: int
    concepts_found: int
    concepts: List[ConceptOut]


# ── Tutoring ───────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str
    user_id: str = "default"
    course_id: str = "default_course"


class AskResponse(BaseModel):
    message: str
    next_check: Optional[str] = None
    target_concept: Optional[str] = None


class GradeRequest(BaseModel):
    check_question: str
    student_answer: str
    user_id: str = "default"
    course_id: str = "default_course"


class GradeResponse(BaseModel):
    verdict: str          # PASS | FAIL
    reason: str
    similarity: float
    concept_id: Optional[str] = None
    concept_title: Optional[str] = None
    covered_points: List[str] = []
    missing_points: List[str] = []
    coverage_ratio: float = 0.0


class CorrectRequest(BaseModel):
    check_question: str
    student_answer: str
    grade: GradeResponse
    user_id: str = "default"
    course_id: str = "default_course"


class ProgressResponse(BaseModel):
    course_percent: int
    course_status: str
    report: str


# ── Quiz ───────────────────────────────────────────────────────────────────

class QuizGenerateRequest(BaseModel):
    topic: str
    context: str
    n_questions: int = Field(default=5, ge=1, le=10)
    difficulty: str = "med"
    language: str = "fr"


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    explanation: str
    difficulty: str


class QuizResponse(BaseModel):
    questions: List[QuizQuestion]


class QuizEvaluateRequest(BaseModel):
    questions: List[QuizQuestion]
    student_answers: List[int]
    language: str = "fr"


class QuizEvaluateResponse(BaseModel):
    score: float
    feedback: str
    questions: List[QuizQuestion]


# ── Flashcards ─────────────────────────────────────────────────────────────

class FlashcardGenerateRequest(BaseModel):
    concepts: Optional[List[dict]] = None
    text: Optional[str] = None
    n_cards: int = Field(default=10, ge=1, le=50)
    language: str = "fr"


class FlashcardOut(BaseModel):
    front: str
    back: str
    hint: Optional[str] = None
    difficulty: str
    source: Optional[str] = None


class FlashcardEvalRequest(BaseModel):
    card: FlashcardOut
    student_answer: str
    language: str = "fr"


class FlashcardEvalResponse(BaseModel):
    verdict: str
    score: float
    feedback: str
    model_answer: str


# ── Study guide ────────────────────────────────────────────────────────────

class StudyGuideRequest(BaseModel):
    concepts: List[dict]
    course_name: str = "Course"
    language: str = "fr"
    voice: bool = False


class StudySummaryRequest(BaseModel):
    text: str
    source_name: str = "document"
    language: str = "fr"


# ── Vision ─────────────────────────────────────────────────────────────────

class ImageAnalysisResponse(BaseModel):
    raw_text: str
    concepts: List[str]
    diagrams_described: List[str]
    summary: str
    chunks_added: int = 0


# ── Diagram ────────────────────────────────────────────────────────────────

class DiagramRequest(BaseModel):
    concept: dict
    diagram_type: str = "concept_map"
    language: str = "fr"


class DiagramResponse(BaseModel):
    svg: str
    title: str
    description: str
    diagram_type: str


# ── Voice / NLP ────────────────────────────────────────────────────────────

class VoiceCommandRequest(BaseModel):
    message: str
    history: List[dict] = []
    concepts: List[dict] = []
    language: str = "fr"
    user_id: str = "default"
    course_id: str = "default_course"


class VoiceCommandResponse(BaseModel):
    response: str
    action: str
    parameters: dict
    emotion: str


class IntentRequest(BaseModel):
    message: str
    context: str = ""
    language: str = "fr"


class IntentResponse(BaseModel):
    intent: str
    topic: Optional[str]
    emotion: str
    confidence: float
