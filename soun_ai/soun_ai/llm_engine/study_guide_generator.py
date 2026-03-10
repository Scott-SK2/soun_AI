"""
Study guide & summary generation — replaces study-guide-service.ts from Soun.

Generates structured study guides, summaries, and voice annotations.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from llm_engine.claude_client import ask, ask_json
from utils.logger import get_logger

log = get_logger(__name__)


@dataclass
class StudyGuide:
    title: str
    sections: List[dict]          # [{"heading": str, "content": str, "key_points": List[str]}]
    summary: str
    exam_tips: List[str]
    language: str = "fr"


# ── Study guide ────────────────────────────────────────────────────────────

def generate_study_guide(
    concept_index: list[dict],
    course_name: str = "Course",
    language: str = "fr",
) -> StudyGuide:
    """
    Build a full structured study guide from a concept index.
    """
    concepts_text = "\n".join(
        f"## {c.get('title','')}\n"
        f"Definition: {c.get('definition','N/A')}\n"
        f"Key points: {'; '.join(c.get('key_points', []))}"
        for c in concept_index[:40]
    )

    prompt = f"""Create a comprehensive study guide in {language} for "{course_name}".

Concepts to cover:
{concepts_text[:6000]}

Return JSON:
{{
  "title": "Study Guide: {course_name}",
  "sections": [
    {{
      "heading": "Section title",
      "content": "Explanation paragraph",
      "key_points": ["point 1", "point 2"]
    }}
  ],
  "summary": "Overall 3-sentence summary",
  "exam_tips": ["Tip 1", "Tip 2", "Tip 3"]
}}

Requirements:
- Group related concepts into logical sections.
- Write in clear, student-friendly {language}.
- Include 4-8 sections.
- Exam tips should be concrete and actionable.
"""
    try:
        data = ask_json(prompt, temperature=0.4)
        return StudyGuide(
            title=data.get("title", f"Study Guide: {course_name}"),
            sections=data.get("sections", []),
            summary=data.get("summary", ""),
            exam_tips=data.get("exam_tips", []),
            language=language,
        )
    except Exception as exc:
        log.error("Study guide generation failed: %s", exc)
        return StudyGuide(title=course_name, sections=[], summary="", exam_tips=[])


# ── Document summary ───────────────────────────────────────────────────────

def generate_document_summary(
    text: str,
    source_name: str = "document",
    language: str = "fr",
) -> str:
    """Summarise a document chunk/extract into concise study notes."""
    prompt = f"""Summarise this excerpt from "{source_name}" into clear study notes in {language}.

Text:
{text[:5000]}

Write a structured summary with:
- 2-3 sentence overview
- Main concepts as bullet points
- Any important definitions
Keep it concise but complete.
"""
    try:
        return ask(prompt, temperature=0.35)
    except Exception as exc:
        log.error("Document summary failed: %s", exc)
        return ""


# ── Voice study guide ──────────────────────────────────────────────────────

def generate_voice_study_guide(
    concept_index: list[dict],
    course_name: str = "Course",
    language: str = "fr",
) -> str:
    """
    Generate a conversational study guide optimised for text-to-speech.
    Returns plain text (no markdown), natural-sounding sentences.
    """
    concepts_text = "\n".join(
        f"{c.get('title','')}: {c.get('definition','') or ', '.join(c.get('key_points',[]))}"
        for c in concept_index[:20]
    )

    prompt = f"""Create a spoken study guide in {language} for "{course_name}".

Concepts:
{concepts_text[:4000]}

Rules:
- Write as if speaking to a student — natural, conversational {language}.
- No markdown, no bullet points, no headers.
- Use transitions like "Ensuite", "Passons à", "Il est important de noter que".
- Cover each concept in 2-3 sentences.
- End with a brief motivating closing remark.
"""
    try:
        return ask(prompt, temperature=0.5)
    except Exception as exc:
        log.error("Voice study guide failed: %s", exc)
        return ""


# ── Teaching explanation ───────────────────────────────────────────────────

def generate_teaching_explanation(
    concept: dict,
    student_level: str = "undergraduate",
    language: str = "fr",
) -> str:
    """
    Generate a clear, pedagogical explanation of a single concept.
    """
    title = concept.get("title", "")
    definition = concept.get("definition", "")
    key_points = concept.get("key_points", [])

    prompt = f"""Explain the concept "{title}" to a {student_level} student in {language}.

Definition: {definition}
Key points: {'; '.join(key_points)}

Write a clear, engaging explanation (3-5 paragraphs) that:
- Starts with the core idea in simple terms
- Builds understanding progressively
- Includes a concrete real-world example
- Ends with the key takeaway
"""
    try:
        return ask(prompt, temperature=0.45)
    except Exception as exc:
        log.error("Teaching explanation failed for '%s': %s", title, exc)
        return definition  # fallback to raw definition
