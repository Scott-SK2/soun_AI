"""
Voice & NLP processing — replaces openai-service.ts from Soun.

Handles:
- Natural language command detection (what does the student want?)
- Emotion / engagement detection
- Conversational response generation
- Voice annotation creation
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from llm_engine.claude_client import ask, ask_json
from utils.logger import get_logger

log = get_logger(__name__)


# ── Data structures ────────────────────────────────────────────────────────

@dataclass
class NLPResult:
    intent: str                     # 'explain' | 'quiz' | 'flashcard' | 'summary' | 'example' | 'unknown'
    topic: Optional[str] = None     # Extracted topic/concept
    emotion: str = "neutral"        # 'engaged' | 'confused' | 'frustrated' | 'neutral'
    confidence: float = 1.0
    raw_response: str = ""


@dataclass
class ConversationTurn:
    role: str           # 'user' | 'assistant'
    content: str


@dataclass
class VoiceCommandResult:
    response: str                           # Text response to speak
    action: str                             # What the app should do next
    parameters: dict = field(default_factory=dict)  # Action parameters
    emotion: str = "neutral"


# ── Intent detection ───────────────────────────────────────────────────────

def detect_intent(
    user_message: str,
    context: str = "",
    language: str = "fr",
) -> NLPResult:
    """
    Detect what the student wants to do from their message.
    """
    prompt = f"""Analyse this student message in {language} and detect their intent.

Student message: "{user_message}"
Context: {context[:500] if context else 'none'}

Return JSON:
{{
  "intent": "explain|quiz|flashcard|summary|example|study_guide|unknown",
  "topic": "the concept or topic they mentioned (or null)",
  "emotion": "engaged|confused|frustrated|neutral",
  "confidence": 0.0
}}

Intent definitions:
- explain: wants an explanation of a concept
- quiz: wants to be tested / take a quiz
- flashcard: wants flashcard practice
- summary: wants a summary of material
- example: wants a real-world example
- study_guide: wants a structured study guide
- unknown: unclear intent
"""
    try:
        data = ask_json(prompt, temperature=0.2)
        return NLPResult(
            intent=data.get("intent", "unknown"),
            topic=data.get("topic"),
            emotion=data.get("emotion", "neutral"),
            confidence=float(data.get("confidence", 1.0)),
        )
    except Exception as exc:
        log.error("Intent detection failed: %s", exc)
        return NLPResult(intent="unknown")


# ── Emotion detection ──────────────────────────────────────────────────────

def detect_emotion(text: str, language: str = "fr") -> str:
    """Quick emotion classification from student text."""
    prompt = f"""Classify the emotion in this student message in one word.
Message: "{text}"
Return JSON: {{"emotion": "engaged|confused|frustrated|bored|neutral"}}"""
    try:
        data = ask_json(prompt, temperature=0.1)
        return data.get("emotion", "neutral")
    except Exception:
        return "neutral"


# ── Conversational response ────────────────────────────────────────────────

def process_voice_command(
    user_message: str,
    history: List[ConversationTurn],
    concept_index: list[dict],
    language: str = "fr",
) -> VoiceCommandResult:
    """
    Process a voice command with full conversation history.
    Determines intent + generates response + action to take.
    """
    nlp = detect_intent(user_message, language=language)

    # Build conversation history text
    history_text = "\n".join(
        f"{t.role.upper()}: {t.content}" for t in history[-5:]  # last 5 turns
    )

    # Concepts summary for context
    concepts_summary = ", ".join(
        c.get("title", "") for c in concept_index[:20]
    )

    system = f"""You are a friendly AI tutor assistant.
Available course concepts: {concepts_summary}.
Respond naturally in {language}. Be concise (2-3 sentences for voice output).
If the student seems confused, be extra encouraging."""

    prompt = f"""Conversation so far:
{history_text}

Student just said: "{user_message}"
Detected intent: {nlp.intent}, topic: {nlp.topic}, emotion: {nlp.emotion}

Respond naturally and indicate what action the app should take.
Return JSON:
{{
  "response": "Your spoken response in {language}",
  "action": "explain|quiz|flashcard|summary|diagram|none",
  "parameters": {{"topic": "{nlp.topic or ''}"}},
  "emotion": "{nlp.emotion}"
}}"""

    try:
        data = ask_json(prompt, system=system, temperature=0.5)
        return VoiceCommandResult(
            response=data.get("response", ""),
            action=data.get("action", "none"),
            parameters=data.get("parameters", {}),
            emotion=data.get("emotion", "neutral"),
        )
    except Exception as exc:
        log.error("Voice command processing failed: %s", exc)
        return VoiceCommandResult(
            response="Désolé, je n'ai pas pu traiter cette commande.",
            action="none",
        )


# ── Voice annotation ───────────────────────────────────────────────────────

def create_voice_annotation(
    document_text: str,
    timestamp_seconds: float,
    note: str,
    language: str = "fr",
) -> str:
    """
    Generate a smart voice annotation by linking a spoken note to document context.
    """
    prompt = f"""A student made a voice note while studying in {language}.

Document context at this point:
{document_text[:1000]}

Student's spoken note: "{note}"
Timestamp: {timestamp_seconds:.1f}s

Generate a clean, structured annotation in {language} that:
1. Captures the student's thought
2. Links it to the relevant concept in the document
3. Suggests a follow-up action (review, practice, question to ask)

Keep it concise (3-4 sentences).
"""
    try:
        return ask(prompt, temperature=0.4)
    except Exception as exc:
        log.error("Voice annotation failed: %s", exc)
        return note  # fallback to raw note
