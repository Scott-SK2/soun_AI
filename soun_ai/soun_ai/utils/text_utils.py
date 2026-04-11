"""
Centralised text utilities — single source of truth for clean/chunk/normalize.
Replaces duplicate _clean() / _chunk_text() / _normalize_title() functions
scattered across ingest_pdf, ingest_pptx, ingest_image, concept_builder, etc.
"""
from __future__ import annotations
import re
from typing import List

from config import CHUNK_MAX_CHARS, CHUNK_OVERLAP


# ── Basic cleaning ─────────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    """Remove null bytes and collapse whitespace."""
    if not text:
        return ""
    text = text.replace("\x00", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


# ── Chunking ───────────────────────────────────────────────────────────────

def chunk_text(
    text: str,
    max_chars: int = CHUNK_MAX_CHARS,
    overlap: int = CHUNK_OVERLAP,
) -> List[str]:
    """
    Split text into overlapping chunks at word boundaries.
    Returns an empty list for blank input.
    """
    text = clean_text(text)
    if not text:
        return []

    chunks: List[str] = []
    i = 0
    while i < len(text):
        j = min(len(text), i + max_chars)
        # try to break at a word boundary
        if j < len(text):
            boundary = text.rfind(" ", i, j)
            if boundary > i:
                j = boundary
        chunk = text[i:j].strip()
        if chunk:
            chunks.append(chunk)
        if j >= len(text):
            break
        i = max(0, j - overlap)
    return chunks


# ── Title normalisation ────────────────────────────────────────────────────

def _strip_leading_numbering(s: str) -> str:
    s = clean_text(s)
    s = re.sub(r"^(slide\s*)?\d+(\.\d+)?\s*[-:.)]*\s*", "", s, flags=re.I)
    s = re.sub(r"^\d+\s+\d+(\.\d+)?\s*[-:.)]*\s*", "", s)
    return s.strip()


def _strip_trailing_slide_number(s: str) -> str:
    return re.sub(r"\s\d{1,2}$", "", clean_text(s)).strip()


def normalize_title(s: str) -> str:
    """Clean, strip leading numbers and trailing slide numbers from a title."""
    s = _strip_leading_numbering(s)
    s = _strip_trailing_slide_number(s)
    return clean_text(s)
