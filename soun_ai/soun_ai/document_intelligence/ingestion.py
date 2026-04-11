from __future__ import annotations
from typing import List
import os

from document_intelligence.document_store import DocChunk


def ingest_file(path: str) -> List[DocChunk]:
    ext = os.path.splitext(path)[1].lower()

    if ext == ".pdf":
        from document_intelligence.ingest_pdf import ingest_pdf
        return ingest_pdf(path)
    if ext in {".pptx", ".ppt"}:
        from document_intelligence.ingest_pptx import ingest_pptx
        return ingest_pptx(path)
    if ext in {".png", ".jpg", ".jpeg", ".webp"}:
        from document_intelligence.ingest_image import ingest_image
        return ingest_image(path)

    raise ValueError(f"Unsupported file type: {ext}")
