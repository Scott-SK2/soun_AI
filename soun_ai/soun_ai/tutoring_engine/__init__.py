# Lazy imports to avoid loading sentence-transformers at import time
from tutoring_engine.progress import ProgressTracker


def TutoringRuntime(*args, **kwargs):
    from tutoring_engine.runtime import TutoringRuntime as _RT
    return _RT(*args, **kwargs)


def SemanticValidator(*args, **kwargs):
    from tutoring_engine.semantic_validation import SemanticValidator as _SV
    return _SV(*args, **kwargs)


__all__ = [
    "TutoringRuntime", "SemanticValidator", "ProgressTracker",
]
