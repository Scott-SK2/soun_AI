from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Tuple
import numpy as np

from document_intelligence.semantic_engine import SemanticEngine


@dataclass
class DocChunk:
    text: str
    source: str
    page: Optional[int] = None
    kind: str = "text"   # e.g. slide_text, speaker_notes, pdf_text, ocr_text


class DocumentStore:
    """
    Minimal local vector store for course chunks.
    - add chunks
    - embed once
    - query top-k by cosine similarity (embeddings are normalized)
    """

    def __init__(self, semantic_engine: SemanticEngine):
        self.se = semantic_engine
        self.chunks: List[DocChunk] = []
        self.embeddings: Optional[np.ndarray] = None

    def add_chunks(self, chunks: List[DocChunk]) -> None:
        self.chunks.extend(chunks)
        self.embeddings = None

    def build(self) -> None:
        if not self.chunks:
            self.embeddings = np.zeros((0, 1), dtype=np.float32)
            return
        texts = [c.text for c in self.chunks]
        vecs = self.se.embed(texts)  # numpy array (n, dim), normalized
        self.embeddings = vecs.astype(np.float32)

    def query(self, query_text: str, top_k: int = 2) -> List[Tuple[DocChunk, float]]:
        if self.embeddings is None:
            self.build()
        if self.embeddings is None or len(self.chunks) == 0:
            return []

        q = self.se.embed(query_text)[0]  # (dim,)
        sims = (self.embeddings @ q).tolist()  # cosine since normalized

        idxs = sorted(range(len(sims)), key=lambda i: sims[i], reverse=True)[:top_k]
        return [(self.chunks[i], float(sims[i])) for i in idxs]