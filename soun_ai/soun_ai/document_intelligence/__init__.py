# Lazy imports so heavy dependencies (pptx, fitz, easyocr) are only loaded on demand
from document_intelligence.document_store import DocumentStore, DocChunk
from document_intelligence.concept_builder import build_concept_index


def ingest_file(path: str):
    from document_intelligence.ingestion import ingest_file as _ingest
    return _ingest(path)


def get_semantic_engine(*args, **kwargs):
    from document_intelligence.semantic_engine import SemanticEngine
    return SemanticEngine(*args, **kwargs)


__all__ = [
    "ingest_file", "DocumentStore", "DocChunk",
    "build_concept_index", "get_semantic_engine",
]
