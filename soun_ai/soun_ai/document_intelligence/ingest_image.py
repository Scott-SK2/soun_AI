from __future__ import annotations
from typing import List, Optional
import os
import re
import os, ssl, certifi
os.environ["SSL_CERT_FILE"] = certifi.where()
ssl._create_default_https_context = ssl.create_default_context

from PIL import Image
import numpy as np
import easyocr

from document_intelligence.document_store import DocChunk
from document_intelligence.ingest_pptx import _chunk_text
from PIL import ImageEnhance, ImageOps, ImageFilter

def _clean(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


_EASY_OCR_READER = None

def _get_ocr_reader():
    global _EASY_OCR_READER
    if _EASY_OCR_READER is None:
        _EASY_OCR_READER = easyocr.Reader(["en", "fr", "nl"], gpu=False)
    return _EASY_OCR_READER


def ingest_image(path: str, source_name: Optional[str] = None) -> List[DocChunk]:
    source = source_name or os.path.basename(path)
    img = Image.open(path).convert("RGB")
    # --- preprocess for handwriting OCR ---
    img = ImageOps.grayscale(img)
    img = ImageOps.autocontrast(img)
    # Increase contrast a bit
    img = ImageEnhance.Contrast(img).enhance(1.8)
    # Slight sharpening
    img = img.filter(ImageFilter.SHARPEN)
    # Optional: upscale small images
    w, h = img.size
    if max(w, h) < 1400:
        scale = 1400 / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)))
    reader = _get_ocr_reader()
    results = reader.readtext(np.array(img), detail=1, paragraph=True)
    # results items: (bbox, text, confidence)
    good = []
    for item in results:
        # Most common: (bbox, text, conf)
        if isinstance(item, (list, tuple)) and len(item) >= 3:
            txt = item[1]
            conf = float(item[2])
            # Some versions: (text, conf) or (bbox, text)
        elif isinstance(item, (list, tuple)) and len(item) == 2:
            # Try to guess which is text
            if isinstance(item[0], str):
                txt = item[0]
                conf = float(item[1]) if isinstance(item[1], (int, float)) else 0.0
            else:
                txt = item[1]
                conf = 0.0
        else:
            continue
        
        txt = _clean(str(txt))
        if conf >= 0.50 and len(txt) >= 4:
            good.append(txt)
    text = _clean(" ".join(good))
    
    out: List[DocChunk] = []
    if text:
        for ch in _chunk_text(text):
            out.append(DocChunk(text=ch, source=source, page=None, kind="ocr_text"))
    return out