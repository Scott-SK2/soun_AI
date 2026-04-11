from __future__ import annotations

from typing import List, Dict, Tuple
import re

from document_intelligence.document_store import DocChunk
from utils.text_utils import clean_text, normalize_title
from utils.logger import get_logger
from config import (
    CONCEPT_MAX_PER_COURSE, CONCEPT_TITLE_MIN_LEN, CONCEPT_TITLE_MAX_LEN,
    CONCEPT_DEF_MIN_LEN, CONCEPT_DEF_MAX_LEN,
    CONCEPT_KEYPOINT_MIN, CONCEPT_KEYPOINT_MAX, CONCEPT_MAX_KEYPOINTS,
)

log = get_logger(__name__)

# -----------------------
# Heuristics / constants
# -----------------------

STOP_TITLES = {
    "introduction", "agenda", "overview", "summary", "conclusion",
    "learning objectives", "objectives", "table of contents",
    "course overview", "course material", "course materials",
}

BAD_TITLES = {
    "what", "why", "how", "when", "where", "who", "which",
    "there", "this", "that", "these", "those", "it", "we",
    "slide", "chapter", "case", "example",
    "intro", "intro…personal", "intro…academic", "intro…practice",
}

ADMIN_PREFIXES = (
    "guest sessions", "course material", "course positioning",
    "course logistics", "schedule", "grading",
)

# Domain-agnostic pattern templates — extend this list for new domains
DOMAIN_PATTERNS: List[str] = [
    r"\bThe Threat of [A-Z][A-Za-z\- ]{3,40}\b",
    r"\bStrategies to [A-Za-z ]{3,60}\b",
    r"\bPossible Responses to [A-Za-z\- ]{3,60}\b",
    r"\bSustaining Superior Performance\b",
    r"\bCompetitive Advantage\b",
    r"\b[A-Z][A-Za-z]+ Theory\b",
    r"\b[A-Z][A-Za-z]+ Framework\b",
    r"\b[A-Z][A-Za-z]+ Model\b",
    r"\b[A-Z][A-Za-z]+ Analysis\b",
    r"\bPrinciples? of [A-Z][A-Za-z ]{3,40}\b",
]

# -----------------------
# Helpers
# -----------------------

def _slug(s: str) -> str:
    s = clean_text(s).lower()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s).strip("-")
    return s[:60] if len(s) > 60 else s


def _is_footerish(text: str) -> bool:
    low = (text or "").lower()
    return ("©" in text) or ("prof." in low) or ("faculty" in low) or ("copyright" in low)


def _is_question_title(s: str) -> bool:
    s = clean_text(s)
    if "?" in s:
        return True
    return bool(re.match(r"^(what|why|how|when|where|who|which)\b", s.lower()))


def _title_is_valid(title: str) -> bool:
    t = clean_text(title)
    if not t:
        return False
    low = t.lower()

    if _is_footerish(t) or _is_question_title(t):
        return False
    if low in STOP_TITLES or low in BAD_TITLES:
        return False
    if low.startswith("intro"):
        return False
    if len(t) < CONCEPT_TITLE_MIN_LEN or len(t) > CONCEPT_TITLE_MAX_LEN:
        return False
    if sum(ch.isdigit() for ch in t) >= 6:
        return False

    words = re.findall(r"[A-Za-z]{3,}", t)
    return len(words) >= 2


def _extract_definitions(text: str) -> List[Tuple[str, str]]:
    """Extract 'X is/refers to/means Y' definition sentences."""
    t = clean_text(text)
    out: List[Tuple[str, str]] = []

    candidates = re.split(r"(?<=[.!?])\s+", t)
    pat = re.compile(
        r"^\s*([A-Z][A-Za-z0-9/\-\s]{2,80})\s+"
        r"(is|are|refers to|means|can be defined as)\s+(.+)$"
    )

    for sent in candidates:
        sent = sent.strip()
        if len(sent) < CONCEPT_DEF_MIN_LEN or len(sent) > CONCEPT_DEF_MAX_LEN:
            continue
        m = pat.match(sent)
        if not m:
            continue

        raw_title = clean_text(m.group(1))
        verb = m.group(2)
        rest = clean_text(m.group(3))
        title = normalize_title(raw_title)

        if not _title_is_valid(title):
            continue
        definition = f"{title} {verb} {rest}"
        if _is_footerish(definition):
            continue
        out.append((title, definition))

    return out


def _extract_pattern_concepts(text: str) -> List[str]:
    """Extract concept titles using DOMAIN_PATTERNS."""
    t = clean_text(text)
    found: List[str] = []

    for pat in DOMAIN_PATTERNS:
        for m in re.finditer(pat, t):
            title = normalize_title(m.group(0))
            title = re.sub(r"\s{2,}", " ", title).strip()
            if CONCEPT_TITLE_MIN_LEN <= len(title) <= CONCEPT_TITLE_MAX_LEN:
                if not _is_footerish(title) and not _is_question_title(title):
                    found.append(title)

    seen: set = set()
    out: List[str] = []
    for x in found:
        k = x.lower()
        if k not in seen:
            seen.add(k)
            out.append(x)
    return out


def _extract_keypoints(text: str, max_points: int = CONCEPT_MAX_KEYPOINTS) -> List[str]:
    """Extract bullet-like fragments as key points."""
    t = (text or "").replace("\x00", " ")
    parts = re.split(r"[•\n\r\t]| - | \u2022 ", t)

    cleaned: List[str] = []
    for p in parts:
        p = clean_text(p)
        if not (CONCEPT_KEYPOINT_MIN <= len(p) <= CONCEPT_KEYPOINT_MAX):
            continue
        if _is_footerish(p) or re.fullmatch(r"\d+", p) or "?" in p:
            continue
        p = re.sub(r"^\d+\s+", "", p).strip()
        p = p.replace(" o ", " • ")
        if len(p) < CONCEPT_KEYPOINT_MIN:
            continue
        cleaned.append(p)

    seen: set = set()
    out: List[str] = []
    for p in cleaned:
        k = p.lower()
        if k not in seen:
            seen.add(k)
            out.append(p)
            if len(out) >= max_points:
                break
    return out


# -----------------------
# Public API
# -----------------------

def build_concept_index(chunks: List[DocChunk], max_concepts: int = CONCEPT_MAX_PER_COURSE) -> List[Dict]:
    """
    Build concept_index used by SemanticValidator + Tutor engine.
    Output dict: {"id","title","definition","key_points","sources"}
    """
    concepts: Dict[str, Dict] = {}

    # 1) Definitions
    for ch in chunks:
        for title, definition in _extract_definitions(ch.text):
            cid = _slug(title)
            if not cid:
                continue
            entry = concepts.setdefault(cid, {
                "id": cid, "title": title,
                "definition": "", "key_points": [], "sources": set(),
            })
            if not entry["definition"] or len(definition) < len(entry["definition"]):
                entry["definition"] = definition
            entry["sources"].add(ch.source)

    # 2) Headings (first line of chunk)
    for ch in chunks:
        raw = (ch.text or "").strip()
        first = raw.split("\n", 1)[0] if "\n" in raw else raw[:120]
        first = normalize_title(first)
        if not _title_is_valid(first):
            continue
        cid = _slug(first)
        if not cid:
            continue
        entry = concepts.setdefault(cid, {
            "id": cid, "title": first,
            "definition": "", "key_points": [], "sources": set(),
        })
        entry["sources"].add(ch.source)

    # 3) Pattern-based concepts
    for ch in chunks:
        for title in _extract_pattern_concepts(ch.text):
            cid = _slug(title)
            if not cid:
                continue
            entry = concepts.setdefault(cid, {
                "id": cid, "title": title,
                "definition": "", "key_points": [], "sources": set(),
            })
            entry["sources"].add(ch.source)

    # 4) Key points
    for ch in chunks:
        kps = _extract_keypoints(ch.text)
        if not kps:
            continue
        raw = (ch.text or "").strip()
        first = raw.split("\n", 1)[0] if "\n" in raw else raw[:120]
        first = normalize_title(first)

        candidate_id = None
        if _title_is_valid(first):
            cid = _slug(first)
            if cid in concepts:
                candidate_id = cid

        if candidate_id is None:
            low = (ch.text or "").lower()
            for cid, entry in concepts.items():
                t = entry["title"].lower()
                if len(t) >= 14 and t in low:
                    candidate_id = cid
                    break

        if candidate_id is None:
            continue

        entry = concepts[candidate_id]
        existing = {x.lower() for x in entry["key_points"]}
        for kp in kps:
            if kp.lower() not in existing:
                entry["key_points"].append(kp)

    # 5) Deduplicate "Threat of X" vs "The Threat of X"
    to_remove = []
    for cid, e in concepts.items():
        t = e["title"].strip()
        if t.lower().startswith("threat of "):
            alt_id = _slug("The " + t)
            if alt_id in concepts:
                to_remove.append(cid)
    for cid in to_remove:
        concepts.pop(cid, None)

    # 6) Finalise
    out = list(concepts.values())
    for e in out:
        e["sources"] = sorted(list(e["sources"]))
        e["key_points"] = e["key_points"][:CONCEPT_MAX_KEYPOINTS]

    # 7) Filter admin/logistics concepts
    out = [
        e for e in out
        if not any(e["title"].lower().startswith(p) for p in ADMIN_PREFIXES)
    ]

    # 8) Rank: has definition > more keypoints > shorter title
    def _rank(e):
        return (-int(bool(e["definition"])), -len(e["key_points"]), len(e["title"]))

    out.sort(key=_rank)
    result = out[:max_concepts]
    log.info("Built concept index: %d concepts (from %d chunks)", len(result), len(chunks))
    return result
