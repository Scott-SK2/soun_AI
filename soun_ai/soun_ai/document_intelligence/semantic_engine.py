from __future__ import annotations
import numpy as np
from typing import List, Union


class SemanticEngine:
    def __init__(self, model_id: str = "all-MiniLM-L6-v2"):
        self.model_id = model_id
        self._model = None  # lazy

    @property
    def model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_id)
        return self._model

    def embed(self, texts):
        if isinstance(texts, str):
            texts = [texts]
        return self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)

    # keep compatibility
    def embed_texts(self, texts):
        vecs = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return [np.array(v) for v in vecs]

    def cosine_similarity(self, a, b) -> float:
        a = np.array(a); b = np.array(b)
        denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-12
        return float(np.dot(a, b) / denom)

    def cosine_similarities(self, a, vectors):
        a = np.array(a)
        return [self.cosine_similarity(a, v) for v in vectors]

