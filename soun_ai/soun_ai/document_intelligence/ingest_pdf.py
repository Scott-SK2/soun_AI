from __future__ import annotations
from typing import List, Optional
import os
import ssl
import certifi

os.environ["SSL_CERT_FILE"] = certifi.where()
ssl._create_default_https_context = ssl.create_default_context

import numpy as np
from pypdf import PdfReader
import fitz  # pymupdf
from PIL import Image

from document_intelligence.document_store import DocChunk
from utils.text_utils import clean_text, chunk_text
from utils.ocr_singleton import get_ocr_reader
from utils.logger import get_logger
from config import OCR_MIN_CHARS, OCR_DPI, OCR_LANGUAGES_PDF

log = get_logger(__name__)


def _ocr_page(pil_img: Image.Image) -> str:
    reader = get_ocr_reader(OCR_LANGUAGES_PDF)
    if reader is None:
        return ""
    results = reader.readtext(np.array(pil_img), detail=0)
    return clean_text(" ".join(results))


def ingest_pdf(
    path: str,
    source_name: Optional[str] = None,
    ocr_min_chars: int = OCR_MIN_CHARS,
) -> List[DocChunk]:
    """
    Extract PDF text with pypdf.
    Falls back to EasyOCR for pages with too little selectable text.
    """
    source = source_name or os.path.basename(path)
    out: List[DocChunk] = []

    try:
        reader = PdfReader(path)
        doc = fitz.open(path)
    except Exception as exc:
        log.error("Failed to open PDF '%s': %s", path, exc)
        return out

    try:
        for page_idx, page in enumerate(reader.pages, start=1):
            raw_text = clean_text(page.extract_text() or "")

            if len(raw_text) >= ocr_min_chars:
                for ch in chunk_text(raw_text):
                    out.append(DocChunk(text=ch, source=source, page=page_idx, kind="pdf_text"))
                continue

            # OCR fallback
            try:
                pix = doc.load_page(page_idx - 1).get_pixmap(dpi=OCR_DPI)
                pil = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                ocr_text = _ocr_page(pil)
                if ocr_text:
                    for ch in chunk_text(ocr_text):
                        out.append(DocChunk(text=ch, source=source, page=page_idx, kind="ocr_text"))
                else:
                    log.debug("Page %d of '%s': no text via OCR either", page_idx, source)
            except Exception as exc:
                log.warning("OCR failed for page %d of '%s': %s", page_idx, source, exc)
    finally:
        doc.close()

    log.info("Ingested PDF '%s': %d chunks from %d pages", source, len(out), len(reader.pages))
    return out
