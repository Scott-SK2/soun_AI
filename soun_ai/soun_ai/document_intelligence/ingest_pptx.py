from __future__ import annotations
from typing import List, Optional
import os

from pptx import Presentation

from document_intelligence.document_store import DocChunk
from utils.text_utils import clean_text, chunk_text
from utils.logger import get_logger

log = get_logger(__name__)


def ingest_pptx(path: str, source_name: Optional[str] = None) -> List[DocChunk]:
    """Extract text and speaker notes from a PowerPoint file."""
    source = source_name or os.path.basename(path)
    out: List[DocChunk] = []

    try:
        prs = Presentation(path)
    except Exception as exc:
        log.error("Failed to open PPTX '%s': %s", path, exc)
        return out

    for slide_idx, slide in enumerate(prs.slides, start=1):
        # --- Slide text ---
        slide_texts = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text:
                slide_texts.append(shape.text)

        slide_joined = clean_text("\n".join(slide_texts))
        if slide_joined:
            for ch in chunk_text(slide_joined):
                out.append(DocChunk(text=ch, source=source, page=slide_idx, kind="slide_text"))

        # --- Speaker notes ---
        try:
            if slide.has_notes_slide and slide.notes_slide:
                notes_frame = slide.notes_slide.notes_text_frame
                if notes_frame and notes_frame.text:
                    notes_text = clean_text(notes_frame.text)
                    if notes_text:
                        for ch in chunk_text(notes_text):
                            out.append(DocChunk(text=ch, source=source, page=slide_idx, kind="speaker_notes"))
        except Exception as exc:
            log.warning("Could not read notes for slide %d in '%s': %s", slide_idx, path, exc)

    log.info("Ingested PPTX '%s': %d chunks from %d slides", source, len(out), len(prs.slides))
    return out
