from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import re

from document_intelligence.semantic_engine import SemanticEngine
from document_intelligence.document_store import DocumentStore, DocChunk
from tutoring_engine.semantic_validation import SemanticValidator, ValidationResult
from tutoring_engine.adaptive_tutor import AdaptiveTutorEngine, TutorTurn, is_confused
from tutoring_engine.progress import ProgressTracker


def _clean_topic(q: str) -> str:
    q = (q or "").strip()
    q = re.sub(r"[?!.]+$", "", q)

    # common request prefixes
    q = re.sub(r"^(can you|could you|please)\s+", "", q, flags=re.I)
    q = re.sub(r"^(can you explain)\s+", "", q, flags=re.I)
    q = re.sub(r"^(explain|define|describe|tell me about)\s+", "", q, flags=re.I)

    q = q.strip()
    if not q:
        return "This topic"
    return q[0].upper() + q[1:]


def _extract_topic_from_check(check_question: str) -> str:
    """
    "Check: In one sentence, define: X" -> "X"
    fallback: cleaned full string
    """
    s = (check_question or "").strip()
    m = re.search(r":\s*([^:]+)\s*$", s)
    if m:
        cand = m.group(1).strip()
        return cand if cand else _clean_topic(s)
    return _clean_topic(s)


@dataclass
class RuntimeState:
    awaiting_student_knowledge: bool = False
    last_topic_or_check: Optional[str] = None
    last_concept_guess: Optional[str] = None


class TutoringRuntime:
    def __init__(
        self,
        concept_index: List[Dict],
        pass_threshold: float = 0.65,
        fail_threshold: float = 0.55,
        point_threshold: float = 0.52,
        min_points_to_pass: int = 1,
    ):
        self.concepts = concept_index
        self.semantic_engine = SemanticEngine()
        self.docs = DocumentStore(self.semantic_engine)

        self.validator = SemanticValidator(
            semantic_engine=self.semantic_engine,
            concept_index=concept_index,
            pass_threshold=pass_threshold,
            fail_threshold=fail_threshold,
            point_threshold=point_threshold,
            min_points_to_pass=min_points_to_pass,
        )
        self.tutor = AdaptiveTutorEngine(concept_index)
        self.state = RuntimeState()

        # Progress tracking
        self.course_id = "default_course"  # later: real course id per user/course
        self.progress = ProgressTracker()  # should auto-load progress.json

    # -------------------------
    # Course ingestion
    # -------------------------

    def load_course_chunks(self, chunks: List[DocChunk]) -> None:
        self.docs.add_chunks(chunks)
        self.docs.build()

    def load_course(self, files: list[str]) -> None:
        """
        Ingest course documents and build concept index automatically.
        """
        from document_intelligence.ingestion import ingest_file
        from document_intelligence.concept_builder import build_concept_index

        all_chunks: List[DocChunk] = []
        for f in files:
            all_chunks.extend(ingest_file(f))

        # store docs for retrieval
        self.load_course_chunks(all_chunks)

        # build concepts from docs
        concept_index = build_concept_index(all_chunks)

        # update runtime state
        self.concepts = concept_index

        # rebuild tutor + validator with the new concepts
        self.validator = SemanticValidator(
            semantic_engine=self.semantic_engine,
            concept_index=concept_index,
            pass_threshold=self.validator.pass_threshold,
            fail_threshold=self.validator.fail_threshold,
            point_threshold=self.validator.point_threshold,
            min_points_to_pass=self.validator.min_points_to_pass,
        )
        self.tutor = AdaptiveTutorEngine(concept_index)
        
        _ = self.progress._course(self.course_id)


    # -------------------------
    # Retrieval helpers
    # -------------------------

    def _format_slide_text(self, text: str) -> str:
        """
        Clean PDF/PPT slide text and extract the most relevant bullets/sentences.
        """
        if not text:
            return ""

        # Fix missing spaces in camel words
        text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)

        # Normalize whitespace
        text = re.sub(r"\s+", " ", text).strip()

        # Split into pseudo-sentences/bullets
        parts = re.split(r"•|\s-\s|\. ", text)

        cleaned: List[str] = []
        for p in parts:
            p = p.strip()
            if len(p) < 40:
                continue
            # Remove footer-ish junk
            low = p.lower()
            if "prof." in low or "copyright" in low or "faculty of" in low:
                continue
            cleaned.append(p)

        if cleaned:
            return "• " + "\n• ".join(cleaned[:3])

        return text[:520]

    def _append_doc_snippet_once(self, message: str, chunk: DocChunk) -> str:
        tag = f"From your course material ({chunk.source}"
        if tag in message:
            return message

        snippet = (chunk.text or "").strip()
        if len(snippet) > 420:
            snippet = snippet[:420].rsplit(" ", 1)[0] + "..."

        return (
            message
            + f"\n\nFrom your course material ({chunk.source}"
            + (f", p.{chunk.page}" if chunk.page is not None else "")
            + f"):\n{snippet}"
        )

    def _score_chunk_for_explanation(self, text: str) -> float:
        t = (text or "").strip()
        if not t:
            return -1e9

        # penalties for common junk
        if "©" in t:
            return -50.0
        if len(t) < 60:
            return -10.0
        if t.rstrip().endswith("?"):
            return -6.0

        letters = sum(ch.isalpha() for ch in t)
        digits = sum(ch.isdigit() for ch in t)
        if letters < 30:
            return -8.0
        if digits > letters:
            return -5.0

        words = re.findall(r"[A-Za-z]{3,}", t)
        return min(len(words), 160) / 10.0  # ~0..16

    # -------------------------
    # Concept matching
    # -------------------------

    def _match_question_to_concept(self, question: str) -> Dict | None:
        """
        Match a question to the closest concept (dict) using cosine similarity.
        Returns the concept dict or None.
        """
        if not self.concepts:
            return None

        q_emb = self.semantic_engine.embed(question)
        if hasattr(q_emb, "shape") and len(q_emb.shape) == 2:
            q_emb = q_emb[0]

        best = None
        best_score = -1.0

        for c in self.concepts:
            title = (c.get("title") or c.get("concept") or "").strip()
            if not title:
                continue

            t_emb = self.semantic_engine.embed(title)
            if hasattr(t_emb, "shape") and len(t_emb.shape) == 2:
                t_emb = t_emb[0]

            score = self.semantic_engine.cosine_similarity(q_emb, t_emb)
            if score > best_score:
                best_score = score
                best = c

        return best if best is not None and best_score >= 0.55 else None

    # -------------------------
    # Progress + difficulty
    # -------------------------

    def _get_concept_mastery_percent(self, concept_id: str) -> int:
        """
        Safe mastery getter. Uses ProgressTracker.get_concept_percent if present,
        otherwise reads internal structures as a fallback.
        """
        try:
            if hasattr(self.progress, "get_concept_percent"):
                return int(self.progress.get_concept_percent(self.course_id, concept_id))
        except Exception:
            pass

        try:
            course = getattr(self.progress, "courses", {}).get(self.course_id)
            if course and concept_id in course.concepts:
                return int(round(course.concepts[concept_id].mastery_score * 100))
        except Exception:
            pass

        return 10  # baseline fallback

    def _difficulty_for_concept(self, concept_id: str) -> str:
        pct = self._get_concept_mastery_percent(concept_id)
        if pct >= 75:
            return "hard"
        if pct >= 40:
            return "med"
        return "easy"

    def make_adaptive_check(self, concept_title: str, concept_id: str) -> str:
        mastery = self._get_concept_mastery_percent(concept_id)

        if mastery < 25:
            return f"Check: In one sentence, define: {concept_title}"
        if mastery < 50:
            return f"Check: In 2 sentences, explain: {concept_title}"
        if mastery < 75:
            return f"Check: Explain {concept_title} and mention 2 key threats."
        return f"Check: Apply {concept_title} to a real business example."

    # -------------------------
    # Main tutoring flow
    # -------------------------

    def answer_question(self, question: str) -> TutorTurn:
        """
        Answer a student question using retrieved course chunks (no LLM).
        Returns an explanation + adaptive Check question.
        """
        raw_topic = _clean_topic(question)

        matched = self._match_question_to_concept(question)
        if matched:
            concept_id = (matched.get("id") or matched.get("title") or raw_topic or "unknown")
            concept_title = matched.get("title") or raw_topic
            topic = concept_title
        else:
            concept_id = str(raw_topic).lower().strip().replace(" ", "-")
            concept_title = raw_topic
            topic = raw_topic

        self.state.last_concept_guess = concept_title
        self.state.last_topic_or_check = question

        check = self.make_adaptive_check(concept_title, concept_id)

        hits = self.docs.query(topic, top_k=10)
        if not hits:
            return TutorTurn(
                message="I couldn't find relevant material in your course documents.",
                next_check=None,
            )

        best_chunk = None
        for ch, sim in hits:
            text_low = (ch.text or "").lower()

            if topic.lower() in text_low:
                if len(ch.text or "") < 120:
                    continue
                if any(w in text_low for w in ["focuses", "explores", "means", "refers to"]):
                    best_chunk = ch
                    break

        if best_chunk is None:
            best_chunk = hits[0][0]

        snippet = self._format_slide_text(best_chunk.text)
        if len(snippet) > 520:
            snippet = snippet[:520].rsplit(" ", 1)[0] + "..."

        msg = (
            f"Here’s what your course material says:\n{snippet}\n\n"
            f"From your course material ({best_chunk.source}"
            + (f", p.{best_chunk.page}" if best_chunk.page is not None else "")
            + ")"
        )

        return TutorTurn(
            message=msg + "\n\n" + check,
            next_check=check,
            target_concept=concept_title,
        )

    def on_app_explained_and_student_confused(self, student_message: str, original_question: str) -> TutorTurn:
        """
        student asked a question -> app explained -> student: "I don't understand"
        => ask what they already know first.
        """
        if not is_confused(student_message):
            return TutorTurn(message="OK — what part should we clarify?", next_check=None)

        topic = self.state.last_concept_guess or _clean_topic(original_question)
        self.state.awaiting_student_knowledge = True
        self.state.last_topic_or_check = original_question
        self.state.last_concept_guess = topic

        return self.tutor.ask_what_they_know(topic)

    def on_student_provides_what_they_know(self, student_knowledge: str) -> TutorTurn:
        """
        Called after we asked: 'what do you already know?'
        Produces tailored explanation + Check (+ optional doc snippet).
        """
        if not self.state.awaiting_student_knowledge:
            return TutorTurn(message="Tell me what you want to learn, and I’ll help.", next_check=None)

        concept = self.state.last_concept_guess or "this topic"
        turn = self.tutor.tailored_explanation_after_what_they_know(concept, student_knowledge)

        hits = self.docs.query(f"{concept} {student_knowledge}", top_k=6)
        best_chunk = None
        best_sc = -1e9
        for ch, sim in hits:
            sc = self._score_chunk_for_explanation(ch.text)
            if sc > best_sc:
                best_sc = sc
                best_chunk = ch

        definition_empty = (
            "means  " in (turn.message or "")
            or "means \n" in (turn.message or "")
            or "means  Now" in (turn.message or "")
        )

        concept_id = (concept or "unknown").lower().strip().replace(" ", "-")
        adaptive_check = self.make_adaptive_check(concept, concept_id)

        if definition_empty and best_chunk:
            snippet = (best_chunk.text or "").strip()
            if len(snippet) > 420:
                snippet = snippet[:420].rsplit(" ", 1)[0] + "..."
            turn.message = f"Thanks. Based on your course material, the core idea is:\n{snippet}\n\n{adaptive_check}"
            turn.next_check = adaptive_check
        else:
            # keep tutor explanation, just ensure the check is adaptive
            turn.next_check = adaptive_check
            if best_chunk:
                turn.message = self._append_doc_snippet_once(turn.message, best_chunk)
            # add the adaptive check at the end if not present
            if adaptive_check not in (turn.message or ""):
                turn.message = (turn.message or "").rstrip() + "\n\n" + adaptive_check

        # Reset state
        self.state.awaiting_student_knowledge = False
        self.state.last_concept_guess = None

        return turn

    # -------------------------
    # Grading + correction
    # -------------------------

    def grade(self, check_question: str, student_answer: str) -> ValidationResult:
        """
        Validate once (difficulty-aware), then record progress from returned grade.
        """
        self.state.last_topic_or_check = check_question

        # Determine concept for difficulty
        topic = _extract_topic_from_check(check_question)
        matched = self._match_question_to_concept(topic)
        
        if matched:
            concept_title = matched.get("title") or topic
            concept_id = matched.get("id") or concept_title
        else:
            concept_title = topic
            concept_id = concept_title

        concept_id = str(concept_id).lower().strip().replace(" ", "-")

        difficulty = self._difficulty_for_concept(concept_id)

        grade = self.validator.validate(check_question, student_answer, difficulty=difficulty)

        # Record progress based on the grade returned
        evidence = getattr(grade, "evidence", None) or {}
        cov = evidence.get("coverage_ratio", 0.0)
        covered = evidence.get("covered_points", [])
        missing = evidence.get("missing_points", [])
        
        gid = getattr(grade, "concept_id", None) or concept_id
        gid = str(gid).lower().strip().replace(" ", "-")
        gtitle = getattr(grade, "concept_title", None) or concept_title

        gid = str(gid).lower().strip().replace(" ", "-")

        self.progress.record_validation(
            course_id=self.course_id,
            concept_id=gid,
            concept_title=gtitle,
            event_type="answer_check",
            verdict=getattr(grade, "verdict", "FAIL"),
            similarity=float(getattr(grade, "similarity", 0.0) or 0.0),
            coverage_ratio=float(cov or 0.0),
            covered_points=list(covered or []),
            missing_points=list(missing or []),
        )

        return grade

    def correct(self, check_question: str, student_answer: str, grade: ValidationResult) -> TutorTurn:
        self.state.last_topic_or_check = check_question

        turn = self.tutor.correct_failed_answer(check_question, student_answer, grade)

        # Adaptive next check
        if grade and getattr(grade, "concept_id", None) and getattr(grade, "concept_title", None):
            next_check = self.make_adaptive_check(grade.concept_title, grade.concept_id)
            turn.next_check = next_check
            turn.message = (turn.message or "").replace(
                f"Now try again: {check_question}",
                f"Now try again: {next_check}",
            )

        # Add 1 good doc snippet for missing points (if any)
        missing_points = []
        try:
            missing_points = (grade.evidence or {}).get("missing_points", []) or []
        except Exception:
            missing_points = []

        query = f"{turn.target_concept or ''} " + " ".join(missing_points[:3])
        hits = self.docs.query(query, top_k=3)

        best = None
        for ch, sim in hits:
            low = (ch.text or "").lower()
            if any(w in low for w in ["focuses", "explores", "means", "is", "refers to"]):
                best = ch
                break
        if best is None and hits:
            best = hits[0][0]

        if best:
            turn.message = self._append_doc_snippet_once(turn.message, best)

        return turn

    # -------------------------
    # Session + reporting
    # -------------------------

    def start_study_session(self) -> None:
        self.progress.start_session(self.course_id)

    def end_study_session(self) -> None:
        self.progress.end_session(self.course_id)

    def get_progress_report(self) -> str:
        pct = self.progress.get_course_percent(self.course_id)
        status = self.progress.get_course_status(self.course_id)
        weakest = self.progress.get_next_practice_concepts(self.course_id, k=5)

        lines = [f"Course progress: {pct}% ({status})"]
        if weakest:
            lines.append("\nFocus next on:")
            for c in weakest:
                lines.append(f"• {c.concept_title} — {int(c.mastery_score * 100)}% ({c.status()})")
        return "\n".join(lines)