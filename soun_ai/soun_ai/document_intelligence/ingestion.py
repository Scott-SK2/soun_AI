from __future__ import annotations
from typing import List
import os

from document_intelligence.document_store import DocChunk
from document_intelligence.ingest_pptx import ingest_pptx
from document_intelligence.ingest_pdf import ingest_pdf
from document_intelligence.ingest_image import ingest_image


def ingest_file(path: str) -> List[DocChunk]:
    ext = os.path.splitext(path)[1].lower()

    if ext == ".pdf":
        return ingest_pdf(path)
    if ext in {".pptx", ".ppt"}:
        return ingest_pptx(path)
    if ext in {".png", ".jpg", ".jpeg", ".webp"}:
        return ingest_image(path)

    raise ValueError(f"Unsupported file type: {ext}")