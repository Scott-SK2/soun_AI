from __future__ import annotations
from typing import List, Optional
import os
import re
import os, ssl, certifi
os.environ["SSL_CERT_FILE"] = certifi.where()
ssl._create_default_https_context = ssl.create_default_context

from pypdf import PdfReader
import fitz  # pymupdf
from PIL import Image
import numpy as np
import easyocr

from document_intelligence.document_store import DocChunk
from document_intelligence.ingest_pptx import _chunk_text  # reuse chunker


def _clean(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


# Create reader once (slow to init)
_EASY_OCR_READER = None

def _get_ocr_reader():
    global _EASY_OCR_READER
    if _EASY_OCR_READER is not None:
        return _EASY_OCR_READER
    try:
        _EASY_OCR_READER = easyocr.Reader(["en"], gpu=False)
        return _EASY_OCR_READER
    except Exception as e:
        print("[OCR] EasyOCR init failed:", e)
        return None


def _ocr_image(pil_img: Image.Image) -> str:
    reader = _get_ocr_reader()
    if reader is None:
        return ""
    img = np.array(pil_img)
    results = reader.readtext(img, detail=0)
    return _clean(" ".join(results))


def ingest_pdf(path: str, source_name: Optional[str] = None, ocr_min_chars: int = 40) -> List[DocChunk]:
    """
    Extract PDF text with pypdf.
    If a page has too little text, render page and OCR it.
    """
    source = source_name or os.path.basename(path)
    out: List[DocChunk] = []

    # 1) Text extraction
    reader = PdfReader(path)

    # 2) Also open with pymupdf for rendering when needed
    doc = fitz.open(path)

    for page_idx, page in enumerate(reader.pages, start=1):
        raw_text = page.extract_text() or ""
        raw_text = _clean(raw_text)

        if len(raw_text) >= ocr_min_chars:
            for ch in _chunk_text(raw_text):
                out.append(DocChunk(text=ch, source=source, page=page_idx, kind="pdf_text"))
            continue

        # OCR fallback
        pix = doc.load_page(page_idx - 1).get_pixmap(dpi=200)
        pil = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        ocr_text = _ocr_image(pil)

        if ocr_text:
            for ch in _chunk_text(ocr_text):
                out.append(DocChunk(text=ch, source=source, page=page_idx, kind="ocr_text"))

    doc.close()
    return out