from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional
import re
import random

from tutoring_engine.semantic_validation import ValidationResult

CONFUSION_PATTERNS = [
    "i don't understand", "i dont understand", "still dont understand", "still don't understand",
    "im confused", "i'm confused", "not clear", "i don't get it", "i dont get it",
    "can you explain", "explain again", "can you repeat"
]

def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())

def is_confused(text: str) -> bool:
    t = _norm(text)
    return any(p in t for p in CONFUSION_PATTERNS)

@dataclass
class TutorTurn:
    message: str
    next_check: Optional[str] = None
    awaiting_student_knowledge: bool = False
    target_concept: Optional[str] = None


class AdaptiveTutorEngine:
    """
    Your desired behavior (MVP, no LLM):
    - If student is confused AFTER an explanation and they only asked a question:
        -> Ask what they already know first
        -> Then tailor explanation
        -> Then Check
    - If student answered and failed:
        -> Explain only missing points
        -> Then Check
    """

    def __init__(self, concept_index: List[Dict]):
        self.by_name = {}
        for c in concept_index:
            name = (c.get("title") or c.get("concept") or "").strip()
            if name:
                self.by_name[name.lower()] = c
    @staticmethod
    def _short(text: str, n: int = 120) -> str:
        text = "" if text is None else str(text)
        text = text.strip()
        return text if len(text) <= n else text[:n].rsplit(" ", 1)[0] + "..."

    def ask_what_they_know(self, concept_guess: Optional[str]) -> TutorTurn:
        c = concept_guess or "this topic"
        return TutorTurn(
            message=f"Before I explain again, what do you already know about {c}? Say 1–2 sentences (even partial is fine).",
            awaiting_student_knowledge=True,
            target_concept=concept_guess,
        )

    def tailored_explanation_after_what_they_know(self, concept_title: str, student_knowledge: str) -> TutorTurn:
        concept = concept_title or "this topic"
        cobj = self.by_name.get(concept.lower())
        definition = (cobj.get("definition") if cobj else "") or ""

        sk = _norm(student_knowledge)

        # MVP tailoring heuristic
        if definition and any(w in sk for w in _norm(definition).split()[:4]):
            explanation = (
                f"Good — you already know part of it. The missing core detail is: {definition} "
                f"Try to restate it in one sentence."
            )
        else:
            explanation = (
                f"Thanks. Here’s the core idea: {concept} means {definition} "
                f"Now restate it in your own words."
            )

        check = f"Check: What is {concept}?"
        return TutorTurn(message=f"{explanation}\n\n{check}", next_check=check)

    def correct_failed_answer(self, check_question: str, student_answer: str, grade) -> TutorTurn:
        concept_title = grade.concept_title or "this concept"
        
        covered = grade.evidence.get("covered_points", [])
        missing = grade.evidence.get("missing_points", [])
        covered = [str(x) for x in (covered or [])]
        missing = [str(x) for x in (missing or [])]
        
        import re
        
        concept_title = (concept_title or "").strip()
        
        # Clean covered/missing
        covered = [c for c in (covered or []) if c and c.strip()]
        
        missing_raw = [m for m in (missing or []) if m and m.strip()]
        def _norm(s: str) -> str:
            return re.sub(r"\s+", " ", s.strip().lower())
        
        # Filter missing points:
        # # - remove pure headings equal to concept title
        # # - remove "2 Sustaining Superior Performance" style
        # # - remove points that are basically the title
        missing = []
        for m in missing_raw:
            m_clean = re.sub(r"^\d+\s+", "", m.strip())  # drop leading slide numbers
            if _norm(m_clean) == _norm(concept_title):
                continue
            if _norm(m) == _norm(concept_title):
                continue
            missing.append(m_clean)
        
        msg = "Your answer is not fully correct.\n\n"
        
        if covered:
            msg += "✔ You correctly mentioned:\n"
            for c in covered:
                msg += f"• {self._short(c)}\n"
            msg += "\n"
        
        if missing:
            msg += "✘ However, you missed important points:\n"
            for m in missing:
                msg += f"• {self._short(m)}\n"
            msg += "\n"
            
            # Tutor-style short explanation (no LLM)
            summary = " ".join(missing[:3])
            msg += (
                "Here’s the missing idea in plain words: "
                f"{self._short(summary, 220)} "
                "Try to connect it back to the definition in one sentence.\n"
            )
        else:
            msg += "Try to restate the concept more precisely in one sentence.\n"
            
        msg += f"\nNow try again: {check_question}"
        
        return TutorTurn(
            message=msg,
            next_check=check_question,
            target_concept=concept_title
        )

    def guess_concept_from_text(self, text: str) -> Optional[str]:
        t = _norm(text)
        for name in self.by_name.keys():
            if name in t:
                return name
        return None

    def _make_check(self, concept: str, original_check_or_topic: str) -> str:
        if original_check_or_topic.strip().lower().startswith("check:") and concept.lower() in original_check_or_topic.lower():
            return original_check_or_topic.strip()
        return random.choice([
            f"Check: Define {concept} in one sentence.",
            f"Check: What is {concept}?",
            f"Check: Explain {concept} briefly."
        ])