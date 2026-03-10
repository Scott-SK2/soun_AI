from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import re

# We assume you already built this in Phase 2:
# document_intelligence/semantic_engine.py should expose SemanticEngine
from document_intelligence.semantic_engine import SemanticEngine


def _normalize(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text

def _concept_key(concept: Dict) -> str:
    """
    Stable identifier for a concept across different data formats.
    Priority:
    - explicit 'id'
    - else title/concept lowercased
    """
    if "id" in concept and concept["id"]:
        return str(concept["id"]).strip().lower()
    name = concept.get("title") or concept.get("concept") or ""
    return _normalize(name)

def _expected_points_from_definition(defn: str) -> List[str]:
    d = _normalize(defn)
    if not d:
        return []

    # Split on separators but keep meaningful chunks
    parts = re.split(r"[;,]| and | but | which | that ", d)

    pts = []
    for p in parts:
        p = p.strip()

        # drop junk fragments
        if len(p) < 18:
            continue
        if p in {"the process by", "the process", "process by"}:
            continue

        pts.append(p)

    # If we filtered too much, fall back to full definition
    if not pts and len(d) >= 18:
        pts = [d]

    # dedupe while preserving order
    out = []
    seen = set()
    for p in pts:
        if p not in seen:
            seen.add(p)
            out.append(p)

    return out[:6]

def _is_idk(text: str) -> bool:
    s = _normalize(text)
    return s in {
        "i dont know", "i don't know", "idk", "dont know", "don't know",
        "no idea", "not sure", "i have no idea", "??", "?"
    }


@dataclass
class ValidationResult:
    verdict: str               # "PASS" or "FAIL"
    reason: str
    concept_id: Optional[str] = None
    concept_title: Optional[str] = None
    similarity: Optional[float] = None
    evidence: Optional[Dict] = None


class SemanticValidator:
    """
    Local semantic grading:
    - chooses the most likely concept for a check question
    - compares student answer embedding to the concept's reference text
    - applies strict thresholding + quick safety rules (IDK, too short, etc.)
    """

    def __init__(
            self,
            semantic_engine: SemanticEngine,
            concept_index: List[Dict],
            pass_threshold: float = 0.65,
            fail_threshold: float = 0.55,
            point_threshold: float = 0.60,
            min_points_to_pass: int = 1,
            min_answer_chars: int = 12,
    ):
        """
        concept_index items expected shape (flexible):
        {
          "id": "...",
          "title": "...",
          "definition": "...",
          "aliases": [... optional ...],
          "common_mistakes": [... optional ...]
        }
        """
        self.se = semantic_engine
        self.concepts = concept_index
        self.pass_threshold = pass_threshold
        self.fail_threshold = fail_threshold
        self.point_threshold = point_threshold
        self.min_points_to_pass = min_points_to_pass
        self.min_answer_chars = min_answer_chars
        # Pre-build reference texts for each concept
        self._concept_refs: List[Tuple[Dict, str]] = []
        for c in self.concepts:
            ref = self._build_concept_reference(c)
            self._concept_refs.append((c, ref))

        # Cache embeddings (huge speedup)
        self._concept_ref_embeddings = self.se.embed_texts([ref for _, ref in self._concept_refs])
        self._concept_key_to_index = {}
        for i, (c, _) in enumerate(self._concept_refs):
            self._concept_key_to_index[_concept_key(c)] = i

    def _build_concept_reference(self, concept: Dict) -> str:
        parts = []
        # Support BOTH concept formats:
        # # A) {"id","title","definition","key_points"...}
        # # B) {"concept","definition"...} from your Knowledge Engine
        title = concept.get("title") or concept.get("concept") or ""
        definition = concept.get("definition") or ""
        if title:
            parts.append(f"Title: {title}")
        if definition:
            parts.append(f"Definition: {definition}")
        aliases = concept.get("aliases") or []
        if aliases:
            parts.append("Also known as: " + ", ".join(aliases))
        kp = concept.get("key_points") or []
        if kp:
            parts.append("Key points: " + "; ".join(kp))
        ex = concept.get("examples") or []
        if ex:
            parts.append("Examples: " + "; ".join(ex))
        extra = concept.get("raw") or ""
        if extra and extra not in definition:
            parts.append(f"Extra: {extra}")
        return "\n".join(parts).strip()
    

    def _pick_concept_for_check(self, check_question: str) -> Tuple[Optional[Dict], Optional[float]]:
        if not self.concepts:
            return None, None

        check_emb = self.se.embed_texts([check_question])[0]
        sims = self.se.cosine_similarities(check_emb, self._concept_ref_embeddings)

        best_idx = int(max(range(len(sims)), key=lambda i: sims[i]))
        best_sim = float(sims[best_idx])
        best_concept = self._concept_refs[best_idx][0]
        return best_concept, best_sim

    def validate(self, check_question: str, student_answer: str, difficulty: str = "easy") -> ValidationResult:
        # -------------------------
        # Basic guards
        # -------------------------
        if _is_idk(student_answer):
            return ValidationResult(
                verdict="FAIL",
                reason="Student did not answer (IDK).",
                evidence={"rule": "idk"},
            )
        
        if len(_normalize(student_answer)) < self.min_answer_chars:
            return ValidationResult(
                verdict="FAIL",
                reason="Answer is too short to be confidently correct.",
                evidence={"rule": "too_short", "min_chars": self.min_answer_chars},
            )
        # -------------------------
        # Pick concept for this Check
        # -------------------------
        concept, concept_match_sim = self._pick_concept_for_check(check_question)
        if not concept:
            return ValidationResult(
                verdict="FAIL",
                reason="No concepts available to grade against.",
                evidence={"rule": "no_concepts"},
            )
        
        concept_id = concept.get("id") or (concept.get("concept") or concept.get("title") or "").lower().replace(" ", "-")
        concept_title = concept.get("title") or concept.get("concept") or concept_id
        
        # -------------------------
        # Embed + similarity to concept reference
        # -------------------------
        
        answer_emb = self.se.embed_texts([student_answer])[0]
        
        concept_idx = self._concept_key_to_index[_concept_key(concept)]
        concept_ref_emb = self._concept_ref_embeddings[concept_idx]
        
        sim = float(self.se.cosine_similarity(answer_emb, concept_ref_emb))
        
        # -------------------------
        # Key-point coverage
        # -------------------------
        definition = concept.get("definition") or ""
        key_points = concept.get("key_points") or _expected_points_from_definition(definition)
        
        covered_points = []
        coverage_ratio = 0.0
        missing_points = list(key_points) if key_points else []
        
        if key_points:
            kp_embs = self.se.embed_texts(key_points)
            kp_sims = self.se.cosine_similarities(answer_emb, kp_embs)
            for kp, s in zip(key_points, kp_sims):
                if float(s) >= self.point_threshold:
                    covered_points.append(kp)
            
            coverage_ratio = len(covered_points) / max(1, len(key_points))
            missing_points = [kp for kp in key_points if kp not in covered_points]
            
        # -------------------------
        # Difficulty thresholds
        # -------------------------
        difficulty = (difficulty or "easy").lower().strip()
        if difficulty == "easy":
            pass_sim = max(0.50, self.pass_threshold - 0.10)  # e.g. 0.55 if pass_threshold=0.65
            require_points = 0
            min_coverage = 0.0
        elif difficulty in ("med", "medium"):
            pass_sim = self.pass_threshold
            require_points = max(1, self.min_points_to_pass)
            min_coverage = 0.5
        else:  # hard
            pass_sim = max(self.pass_threshold + 0.05, 0.70)
            require_points = max(2, self.min_points_to_pass)
            min_coverage = 0.7
        
        # -------------------------
        # Verdict logic (ONE system)
        # -------------------------
        if sim >= pass_sim:
            if require_points == 0:
                verdict = "PASS"
                reason = "Meaning matches the expected concept."
            else:
                if (coverage_ratio >= min_coverage) or (len(covered_points) >= require_points):
                    verdict = "PASS"
                    reason = "Meaning matches and key points are covered."
                else:
                    verdict = "FAIL"
                    reason = "Answer is related but missing key details."
        else:
            # backup: strong key-point coverage can rescue a slightly-low similarity on harder modes
            if require_points > 0 and ((coverage_ratio >= min_coverage) or (len(covered_points) >= require_points + 1)):
                verdict = "PASS"
                reason = "Key points are well covered."
            else:
                verdict = "FAIL"
                reason = "Meaning does not match the expected concept."
        evidence = {
            "difficulty": difficulty,
            "sim": sim,
            "pass_sim": pass_sim,
            "concept_match_sim": concept_match_sim,
            "point_threshold": self.point_threshold,
            "covered_points": covered_points,
            "coverage_ratio": coverage_ratio,
            "missing_points": missing_points,
            "all_key_points": key_points,
        }
        return ValidationResult(
            verdict=verdict,
            reason=reason,
            concept_id=concept_id,
            concept_title=concept_title,
            similarity=sim,
            evidence=evidence,
        )