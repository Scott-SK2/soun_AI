from __future__ import annotations
from typing import List, Optional
import os
import ssl
import certifi

os.environ["SSL_CERT_FILE"] = certifi.where()
ssl._create_default_https_context = ssl.create_default_context

import numpy as np
from PIL import Image, ImageEnhance, ImageOps, ImageFilter

from document_intelligence.document_store import DocChunk
from utils.text_utils import clean_text, chunk_text
from utils.ocr_singleton import get_ocr_reader
from utils.logger import get_logger
from config import (
    OCR_LANGUAGES_IMAGE, OCR_CONFIDENCE_THRESHOLD,
    OCR_MIN_UPSCALE_PX, IMAGE_CONTRAST,
)

log = get_logger(__name__)


def _preprocess(img: Image.Image) -> Image.Image:
    """Greyscale + contrast + sharpen + upscale for better OCR accuracy."""
    img = ImageOps.grayscale(img)
    img = ImageOps.autocontrast(img)
    img = ImageEnhance.Contrast(img).enhance(IMAGE_CONTRAST)
    img = img.filter(ImageFilter.SHARPEN)
    w, h = img.size
    if max(w, h) < OCR_MIN_UPSCALE_PX:
        scale = OCR_MIN_UPSCALE_PX / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    return img


def _parse_result(item) -> tuple[str, float]:
    """Normalise EasyOCR result regardless of output format version."""
    if isinstance(item, (list, tuple)):
        if len(item) >= 3:
            return str(item[1]), float(item[2])
        if len(item) == 2:
            if isinstance(item[0], str):
                return item[0], float(item[1]) if isinstance(item[1], (int, float)) else 0.0
            return str(item[1]), 0.0
    return "", 0.0


def ingest_image(path: str, source_name: Optional[str] = None) -> List[DocChunk]:
    """OCR an image file (PNG/JPG/WebP) and return DocChunks."""
    source = source_name or os.path.basename(path)
    out: List[DocChunk] = []

    try:
        img = Image.open(path).convert("RGB")
    except Exception as exc:
        log.error("Cannot open image '%s': %s", path, exc)
        return out

    img = _preprocess(img)

    reader = get_ocr_reader(OCR_LANGUAGES_IMAGE)
    if reader is None:
        log.error("OCR reader unavailable — skipping '%s'", source)
        return out

    try:
        results = reader.readtext(np.array(img), detail=1, paragraph=True)
    except Exception as exc:
        log.error("OCR failed on '%s': %s", source, exc)
        return out

    good: List[str] = []
    for item in results:
        txt, conf = _parse_result(item)
        txt = clean_text(txt)
        if conf >= OCR_CONFIDENCE_THRESHOLD and len(txt) >= 4:
            good.append(txt)

    text = clean_text(" ".join(good))
    if text:
        for ch in chunk_text(text):
            out.append(DocChunk(text=ch, source=source, page=None, kind="ocr_text"))
    else:
        log.warning("No usable text extracted from image '%s'", source)

    log.info("Ingested image '%s': %d chunks", source, len(out))
    return out
