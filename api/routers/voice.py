"""
/voice — NLP intent detection + conversational responses
Replaces: openai-service.ts
"""
from __future__ import annotations

from fastapi import APIRouter

from core.models import (
    VoiceCommandRequest, VoiceCommandResponse,
    IntentRequest, IntentResponse,
)

router = APIRouter()


@router.post("/command", response_model=VoiceCommandResponse)
def process_command(req: VoiceCommandRequest):
    """
    Process a voice command with conversation history.
    Returns spoken response + action for the app to take.
    """
    from llm_engine.voice_nlp import process_voice_command, ConversationTurn
    history = [ConversationTurn(role=t.get("role","user"), content=t.get("content",""))
               for t in req.history]
    result = process_voice_command(
        user_message=req.message,
        history=history,
        concept_index=req.concepts,
        language=req.language,
    )
    return VoiceCommandResponse(
        response=result.response,
        action=result.action,
        parameters=result.parameters,
        emotion=result.emotion,
    )


@router.post("/intent", response_model=IntentResponse)
def detect_intent(req: IntentRequest):
    """Detect the intent from a student message."""
    from llm_engine.voice_nlp import detect_intent as _detect
    result = _detect(req.message, context=req.context, language=req.language)
    return IntentResponse(
        intent=result.intent,
        topic=result.topic,
        emotion=result.emotion,
        confidence=result.confidence,
    )


@router.post("/annotate")
def annotate(
    document_text: str,
    timestamp_seconds: float,
    note: str,
    language: str = "fr",
):
    """Create a smart voice annotation linked to document context."""
    from llm_engine.voice_nlp import create_voice_annotation
    annotation = create_voice_annotation(document_text, timestamp_seconds, note, language)
    return {"annotation": annotation}
