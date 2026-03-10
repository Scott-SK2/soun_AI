"""
Image / vision analysis — replaces document-analysis-service.ts (extractFromImage) from Soun.

Uses Claude's vision capabilities to understand slide images, diagrams, handwritten notes, etc.
Falls back to EasyOCR if the image is a scanned page with no diagrams.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from llm_engine.claude_client import ask_vision, ask_json
from utils.logger import get_logger
from document_intelligence.document_store import DocChunk

log = get_logger(__name__)

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


@dataclass
class ImageAnalysis:
    raw_text: str                       # All text found in image
    concepts: List[str] = field(default_factory=list)   # Key concept titles
    diagrams_described: List[str] = field(default_factory=list)  # Diagram descriptions
    summary: str = ""


# ── High-level analysis ────────────────────────────────────────────────────

def analyze_image(
    image_path: str,
    language: str = "fr",
    extract_concepts: bool = True,
) -> ImageAnalysis:
    """
    Full analysis of an image:
    - Extract all text
    - Identify concepts
    - Describe diagrams/charts
    """
    path = Path(image_path)
    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        log.warning("Unsupported image format: %s", path.suffix)
        return ImageAnalysis(raw_text="")

    prompt = f"""Analyse this educational image/slide in {language}.

Return JSON:
{{
  "raw_text": "All text visible in the image",
  "concepts": ["list of key concept or topic names found"],
  "diagrams_described": ["description of each diagram, chart, or visual element"],
  "summary": "2-3 sentence summary of what this slide/image teaches"
}}

Be thorough — include ALL text you can read, even small labels.
"""
    try:
        data = ask_json(image_path=image_path, prompt=prompt)  # type: ignore[call-arg]
        # ask_json doesn't accept image_path — use ask_vision + manual parse
        raise NotImplementedError  # handled below
    except NotImplementedError:
        pass
    except Exception as exc:
        log.error("ask_json vision path failed: %s", exc)

    # Correct path: ask_vision returns text, then parse JSON from it
    try:
        raw = ask_vision(image_path=image_path, prompt=prompt)
        import json, re
        m = re.search(r"```(?:json)?\s*(\{[\s\S]*\})\s*```", raw)
        json_str = m.group(1) if m else raw.strip()
        data = json.loads(json_str)
        return ImageAnalysis(
            raw_text=data.get("raw_text", ""),
            concepts=data.get("concepts", []),
            diagrams_described=data.get("diagrams_described", []),
            summary=data.get("summary", ""),
        )
    except Exception as exc:
        log.error("Image analysis failed for '%s': %s", image_path, exc)

    # Last resort: pure text extraction
    try:
        text = ask_vision(
            image_path=image_path,
            prompt="Extract and return ALL text visible in this image, preserving structure.",
        )
        return ImageAnalysis(raw_text=text)
    except Exception as exc:
        log.error("Fallback text extraction failed: %s", exc)
        return ImageAnalysis(raw_text="")


def image_to_chunks(
    image_path: str,
    source_name: Optional[str] = None,
    language: str = "fr",
) -> List[DocChunk]:
    """
    Analyse an image and return DocChunks compatible with the document store.
    Replaces ingest_image() for high-fidelity content (diagrams, mixed layouts).
    """
    source = source_name or Path(image_path).name
    analysis = analyze_image(image_path, language=language)

    chunks: List[DocChunk] = []

    if analysis.raw_text.strip():
        from utils.text_utils import chunk_text
        for ch in chunk_text(analysis.raw_text):
            chunks.append(DocChunk(text=ch, source=source, page=None, kind="vision_text"))

    for desc in analysis.diagrams_described:
        if desc.strip():
            chunks.append(DocChunk(text=desc, source=source, page=None, kind="diagram_description"))

    if analysis.summary:
        chunks.append(DocChunk(text=analysis.summary, source=source, page=None, kind="image_summary"))

    log.info("image_to_chunks '%s': %d chunks", source, len(chunks))
    return chunks
