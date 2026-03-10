"""
Thread-safe OCR singleton factory.
Separates PDF-OCR (English only) from Image-OCR (multilingual).
Supports explicit cleanup to free GPU/CPU memory.
"""
from __future__ import annotations
import threading
from typing import Optional

from utils.logger import get_logger
from config import OCR_LANGUAGES_PDF, OCR_LANGUAGES_IMAGE, OCR_GPU

log = get_logger(__name__)

_lock = threading.Lock()
_readers: dict[str, object] = {}   # key = frozenset of languages


def get_ocr_reader(languages: list[str] | None = None) -> Optional[object]:
    """
    Return (or lazily create) an EasyOCR reader for the given languages.
    Falls back to PDF languages if none specified.
    Thread-safe singleton per language set.
    """
    if languages is None:
        languages = OCR_LANGUAGES_PDF

    key = ",".join(sorted(languages))

    with _lock:
        if key in _readers:
            return _readers[key]

        try:
            import easyocr
            log.info("Initialising EasyOCR reader for languages: %s", languages)
            reader = easyocr.Reader(languages, gpu=OCR_GPU)
            _readers[key] = reader
            log.info("EasyOCR ready.")
            return reader
        except Exception as exc:
            log.error("EasyOCR init failed for %s: %s", languages, exc)
            return None


def release_ocr_reader(languages: list[str] | None = None) -> None:
    """Release a specific OCR reader from memory."""
    if languages is None:
        languages = OCR_LANGUAGES_PDF
    key = ",".join(sorted(languages))
    with _lock:
        _readers.pop(key, None)
        log.info("Released EasyOCR reader for: %s", languages)


def release_all() -> None:
    """Release all OCR readers."""
    with _lock:
        _readers.clear()
        log.info("All EasyOCR readers released.")
