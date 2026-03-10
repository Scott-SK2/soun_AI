"""
SVG diagram generation — replaces visual-generation-service.ts from Soun.

Generates SVG diagrams, concept maps, and visual aids for educational content.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional

from llm_engine.claude_client import ask
from utils.logger import get_logger

log = get_logger(__name__)


@dataclass
class DiagramResult:
    svg: str                        # Raw SVG markup
    title: str
    description: str
    diagram_type: str               # "concept_map" | "flowchart" | "comparison" | "timeline"


# ── SVG generation ─────────────────────────────────────────────────────────

def generate_diagram(
    concept: dict,
    diagram_type: str = "concept_map",
    language: str = "fr",
) -> DiagramResult:
    """
    Generate an SVG diagram for a concept.

    Args:
        concept: Concept dict with title, definition, key_points.
        diagram_type: 'concept_map', 'flowchart', 'comparison', 'timeline'.
        language: Label language.
    """
    title = concept.get("title", "Concept")
    definition = concept.get("definition", "")
    key_points = concept.get("key_points", [])

    type_instructions = {
        "concept_map": "a concept map showing the central concept and its relationships to key points",
        "flowchart": "a flowchart showing the process or decision steps related to this concept",
        "comparison": "a comparison diagram showing contrasting elements",
        "timeline": "a timeline showing the evolution or stages of this concept",
    }
    instruction = type_instructions.get(diagram_type, type_instructions["concept_map"])

    prompt = f"""Create {instruction} as a valid SVG for "{title}" in {language}.

Concept: {title}
Definition: {definition}
Key points: {'; '.join(key_points[:5])}

Requirements:
- Return ONLY valid SVG markup (starting with <svg and ending with </svg>)
- Use viewBox="0 0 800 600"
- Use clean, readable fonts (font-family: Arial, sans-serif)
- Use pastel colors (light blue: #E3F2FD, light green: #E8F5E9, light orange: #FFF3E0)
- Include the title, key points as labeled shapes
- Text must be in {language}
- Make it visually clear and educational
- No JavaScript, no external resources
"""
    try:
        raw = ask(prompt, temperature=0.3, max_tokens=3000)
        svg = _extract_svg(raw)
        if not svg:
            log.warning("No valid SVG in response for '%s'", title)
            svg = _fallback_svg(title, key_points, language)

        return DiagramResult(
            svg=svg,
            title=title,
            description=f"{diagram_type.replace('_', ' ').title()} for {title}",
            diagram_type=diagram_type,
        )
    except Exception as exc:
        log.error("Diagram generation failed for '%s': %s", title, exc)
        return DiagramResult(
            svg=_fallback_svg(title, key_points, language),
            title=title,
            description="",
            diagram_type=diagram_type,
        )


def extract_visualizable_concepts(concept_index: list[dict]) -> List[dict]:
    """
    Return concepts that are worth visualising (have key points or definitions).
    """
    return [
        c for c in concept_index
        if c.get("definition") or len(c.get("key_points", [])) >= 2
    ]


# ── Helpers ────────────────────────────────────────────────────────────────

def _extract_svg(text: str) -> str:
    """Extract SVG block from LLM response."""
    m = re.search(r"(<svg[\s\S]*?</svg>)", text, re.IGNORECASE)
    return m.group(1).strip() if m else ""


def _fallback_svg(title: str, key_points: List[str], language: str) -> str:
    """Minimal fallback SVG if generation fails."""
    items = "\n".join(
        f'<text x="40" y="{160 + i * 40}" font-size="14" fill="#333">• {kp[:60]}</text>'
        for i, kp in enumerate(key_points[:5])
    )
    return f"""<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
  <rect width="800" height="600" fill="#f9f9f9"/>
  <rect x="20" y="20" width="760" height="80" rx="10" fill="#E3F2FD"/>
  <text x="400" y="70" text-anchor="middle" font-size="22" font-weight="bold" fill="#1565C0">{title[:50]}</text>
  <line x1="20" y1="110" x2="780" y2="110" stroke="#ccc" stroke-width="1"/>
  {items}
</svg>"""
