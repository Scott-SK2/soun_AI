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

# Checks that are too vague / yes-no — force a re-roll when detected
BAD_CHECK_PATTERNS = [
    "do you understand", "did you understand", "are you sure",
    "is that clear", "make sense", "does that make sense",
    "got it", "ok?", "okay?",
]


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())


def is_confused(text: str) -> bool:
    t = _norm(text)
    return any(p in t for p in CONFUSION_PATTERNS)


def _has_bad_check(check: str) -> bool:
    """Return True if a Check question is too vague (yes/no style)."""
    t = _norm(check)
    return any(p in t for p in BAD_CHECK_PATTERNS)

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
            check = original_check_or_topic.strip()
        else:
            check = random.choice([
                f"Check: Define {concept} in one sentence.",
                f"Check: What is {concept}?",
                f"Check: Explain {concept} briefly."
            ])
        # Safety net: never emit a vague yes/no check
        if _has_bad_check(check):
            check = f"Check: In one sentence, define {concept}."
        return check

    # ── Gap diagnosis (LLM-assisted) ───────────────────────────────────────

    def diagnose_gaps(
        self,
        concept_title: str,
        student_answer: str,
        missing_points: List[str],
        language: str = "en",
    ) -> Dict:
        """
        Use the LLM to produce a structured Known / Gaps / Focus analysis.
        Falls back to a simple dict when the LLM engine is unavailable.

        Returns:
            {"known": [...], "gaps": [...], "focus": str}
        """
        if not missing_points:
            return {"known": [], "gaps": [], "focus": f"Review {concept_title}."}

        try:
            from llm_engine.llm_client import ask_json
        except ImportError:
            # Graceful degradation — no LLM available
            return {
                "known": [],
                "gaps": missing_points[:3],
                "focus": missing_points[0],
            }

        lang_note = "" if language == "en" else f" Respond in {language}."
        prompt = (
            f"A student is learning about '{concept_title}'.\n"
            f"Student answer: {student_answer}\n"
            f"Missing points: {missing_points}\n\n"
            f"Return JSON with keys:\n"
            f"  known  – list of things the student already understands (from their answer)\n"
            f"  gaps   – list of the top missing points (max 3, in plain simple words)\n"
            f"  focus  – one sentence: the single most important thing to fix first\n"
            f"{lang_note}"
        )
        try:
            result = ask_json(prompt)
            if isinstance(result, dict) and "gaps" in result:
                return result
        except Exception:
            pass

        return {"known": [], "gaps": missing_points[:3], "focus": missing_points[0]}

    def targeted_explain(
        self,
        concept_title: str,
        student_answer: str,
        missing_points: List[str],
        language: str = "en",
    ) -> TutorTurn:
        """
        Explain ONLY what the student is missing — not what they already know.
        Uses LLM when available; falls back to the existing correct_failed_answer logic.
        """
        if not missing_points:
            check = f"Check: In your own words, define {concept_title}."
            return TutorTurn(
                message=f"Great attempt! Try to be a bit more precise.\n\n{check}",
                next_check=check,
                target_concept=concept_title,
            )

        diagnosis = self.diagnose_gaps(concept_title, student_answer, missing_points, language)
        known = diagnosis.get("known", [])
        gaps = diagnosis.get("gaps", missing_points[:3])
        focus = diagnosis.get("focus", missing_points[0])

        msg_parts = []
        if known:
            good = "; ".join(str(k) for k in known[:2])
            msg_parts.append(f"You already understand: {good}.")

        msg_parts.append(f"The key gap is: {focus}")

        if len(gaps) > 1:
            extra = "; ".join(str(g) for g in gaps[1:3])
            msg_parts.append(f"Also missing: {extra}.")

        check = f"Check: In one sentence, explain {concept_title} — include the key idea above."
        msg_parts.append(f"\n{check}")

        return TutorTurn(
            message="\n".join(msg_parts),
            next_check=check,
            target_concept=concept_title,
        )