"""
Central configuration for soun_AI.
All magic numbers, thresholds, and paths live here.
"""
from __future__ import annotations
import os
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent   # .../soun_ai/
DATA_DIR     = PROJECT_ROOT / "data"
PROGRESS_FILE = PROJECT_ROOT / "progress.json"
LOG_DIR      = PROJECT_ROOT / "logs"

# ── Text chunking ──────────────────────────────────────────────────────────
CHUNK_MAX_CHARS: int = 800
CHUNK_OVERLAP:   int = 120

# ── OCR ────────────────────────────────────────────────────────────────────
OCR_MIN_CHARS:       int   = 40       # below this → use OCR fallback on PDFs
OCR_CONFIDENCE_THRESHOLD: float = 0.50
OCR_LANGUAGES_PDF:   list  = ["en"]
OCR_LANGUAGES_IMAGE: list  = ["en", "fr", "nl"]
OCR_DPI:             int   = 200      # PDF render DPI
OCR_MIN_UPSCALE_PX:  int   = 1400    # images smaller than this are upscaled
IMAGE_CONTRAST:      float = 1.8
OCR_GPU:             bool  = False

# ── Concept extraction ─────────────────────────────────────────────────────
CONCEPT_MAX_PER_COURSE: int = 120
CONCEPT_TITLE_MIN_LEN:  int = 10
CONCEPT_TITLE_MAX_LEN:  int = 75
CONCEPT_DEF_MIN_LEN:    int = 25
CONCEPT_DEF_MAX_LEN:    int = 260
CONCEPT_KEYPOINT_MIN:   int = 25
CONCEPT_KEYPOINT_MAX:   int = 170
CONCEPT_MAX_KEYPOINTS:  int = 5

# ── Semantic / embeddings ──────────────────────────────────────────────────
EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

# ── Tutoring thresholds ────────────────────────────────────────────────────
PASS_THRESHOLD:        float = 0.65
FAIL_THRESHOLD:        float = 0.55
POINT_THRESHOLD:       float = 0.52
MIN_POINTS_TO_PASS:    int   = 1
CONCEPT_MATCH_MIN_SIM: float = 0.55

# ── Difficulty thresholds (mastery %) ─────────────────────────────────────
DIFF_HARD_PCT:  int = 75
DIFF_MED_PCT:   int = 40
DIFF_EASY_PCT:  int = 0

# ── Semantic validation per-difficulty ─────────────────────────────────────
DIFF_THRESHOLDS: dict = {
    "easy": {"pass_sim": 0.55, "min_points": 0, "min_coverage": 0.0},
    "med":  {"pass_sim": 0.65, "min_points": 1, "min_coverage": 0.5},
    "hard": {"pass_sim": 0.70, "min_points": 2, "min_coverage": 0.7},
}

# ── Progress / mastery ─────────────────────────────────────────────────────
MASTERY_BASELINE:         float = 0.10
MASTERY_READY_FOR_EXAM:   float = 0.75
MASTERY_UNDERSTANDING:    float = 0.40
MASTERY_DELTA_GOOD:       float = 0.10
MASTERY_DELTA_BAD:        float = -0.08
MASTERY_EXPL_FACTOR:      float = 1.25
MASTERY_DIMINISH_PER_ATT: float = 0.03
MASTERY_DIMINISH_FLOOR:   float = 0.40

# ── LLM engine (Phase 2) ───────────────────────────────────────────────────
ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")
LLM_MODEL: str = os.environ.get("LLM_MODEL", "claude-sonnet-4-6")
LLM_MAX_TOKENS: int = 2048
LLM_TEMPERATURE: float = 0.4
