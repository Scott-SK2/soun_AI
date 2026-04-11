"""
soun_AI LLM Engine — switchable backend (OpenAI GPT-4o or local Phi-3 Mini).

Replaces OpenAI in the Soun project (same key, same model, new architecture):
    - quiz_generator        ← quiz-generation-service.ts
    - flashcard_generator   ← flashcard-service.ts
    - study_guide_generator ← study-guide-service.ts
    - image_analyzer        ← document-analysis-service.ts (vision)
    - diagram_generator     ← visual-generation-service.ts
    - voice_nlp             ← openai-service.ts

All calls go through llm_client.py (backend selector).
  LLM_BACKEND=openai  (default) → needs OPENAI_API_KEY
  LLM_BACKEND=local             → free Phi-3 Mini GGUF, no key needed
"""
from llm_engine.llm_client import ask, ask_json, ask_vision, current_backend
from llm_engine.quiz_generator import generate_quiz, evaluate_quiz_answers, QuizQuestion, QuizResult
from llm_engine.flashcard_generator import generate_flashcards, evaluate_flashcard_answer, Flashcard
from llm_engine.study_guide_generator import generate_study_guide, generate_document_summary, generate_teaching_explanation
from llm_engine.image_analyzer import analyze_image, image_to_chunks, ImageAnalysis
from llm_engine.diagram_generator import generate_diagram, DiagramResult
from llm_engine.voice_nlp import detect_intent, process_voice_command, NLPResult, VoiceCommandResult

__all__ = [
    # Core client
    "ask", "ask_json", "ask_vision", "current_backend",
    # Quiz
    "generate_quiz", "evaluate_quiz_answers", "QuizQuestion", "QuizResult",
    # Flashcards
    "generate_flashcards", "evaluate_flashcard_answer", "Flashcard",
    # Study guides
    "generate_study_guide", "generate_document_summary", "generate_teaching_explanation",
    # Vision
    "analyze_image", "image_to_chunks", "ImageAnalysis",
    # Diagrams
    "generate_diagram", "DiagramResult",
    # Voice / NLP
    "detect_intent", "process_voice_command", "NLPResult", "VoiceCommandResult",
]
