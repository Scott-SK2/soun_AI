from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional
from dataclasses import fields

from config import (
    MASTERY_BASELINE, MASTERY_READY_FOR_EXAM, MASTERY_UNDERSTANDING,
    MASTERY_DELTA_GOOD, MASTERY_DELTA_BAD, MASTERY_EXPL_FACTOR,
    MASTERY_DIMINISH_PER_ATT, MASTERY_DIMINISH_FLOOR,
    PROGRESS_FILE,
)
from utils.logger import get_logger

log = get_logger(__name__)

DEFAULT_START_PERCENT = int(MASTERY_BASELINE * 100)

EventType = Literal[
    "answer_check",     # PASS/FAIL to a Check
    "explanation",      # student explains a concept
    "example",          # student gives example
    "quiz",             # quiz result (webapp)
    "session_start",
    "session_end",
]


# ----------------------------
# Data structures
# ----------------------------

@dataclass
class ConceptStats:
    concept_id: str
    concept_title: str

    good_answers: int = 0
    bad_answers: int = 0
    explanation_good: int = 0
    explanation_bad: int = 0
    example_good: int = 0
    example_bad: int = 0

    last_similarity: float = 0.0
    last_coverage: float = 0.0

    # rolling mastery score 0..1
    mastery_score: float = 0.10  # will be clamped to course baseline minimum

    def status(self) -> str:
        if self.mastery_score >= MASTERY_READY_FOR_EXAM:
            return "ready_for_exam"
        if self.mastery_score >= MASTERY_UNDERSTANDING:
            return "understanding"
        return "not_ready"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "concept_id": self.concept_id,
            "concept_title": self.concept_title,
            "good_answers": self.good_answers,
            "bad_answers": self.bad_answers,
            "explanation_good": self.explanation_good,
            "explanation_bad": self.explanation_bad,
            "example_good": self.example_good,
            "example_bad": self.example_bad,
            "last_similarity": self.last_similarity,
            "last_coverage": self.last_coverage,
            "mastery_score": self.mastery_score,
        }

    @staticmethod
    def from_dict(d: Dict[str, Any]) -> "ConceptStats":
        cs = ConceptStats(
            concept_id=d.get("concept_id", ""),
            concept_title=d.get("concept_title", ""),
        )
        for k, v in d.items():
            if hasattr(cs, k):
                setattr(cs, k, v)
        return cs


@dataclass
class CourseStats:
    course_id: str
    baseline: float = 0.10  # 10% start
    study_time_sec: float = 0.0
    quiz_scores: List[float] = field(default_factory=list)

    # concept_id -> ConceptStats
    concepts: Dict[str, ConceptStats] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "course_id": self.course_id,
            "baseline": self.baseline,
            "study_time_sec": self.study_time_sec,
            "quiz_scores": list(self.quiz_scores),
            "concepts": {cid: cs.to_dict() for cid, cs in self.concepts.items()},
        }

    @staticmethod
    def from_dict(d: Dict[str, Any]) -> "CourseStats":
        course = CourseStats(
            course_id=d.get("course_id", ""),
            baseline=float(d.get("baseline", 0.10)),
            study_time_sec=float(d.get("study_time_sec", 0.0)),
            quiz_scores=list(d.get("quiz_scores", []) or []),
        )
        concepts = {}
        for cid, csd in (d.get("concepts", {}) or {}).items():
            if isinstance(csd, dict):
                concepts[cid] = ConceptStats.from_dict(csd)
        course.concepts = concepts
        return course


@dataclass
class ProgressEvent:
    ts: float
    event_type: EventType
    course_id: str
    concept_id: Optional[str] = None
    concept_title: Optional[str] = None
    verdict: Optional[str] = None
    similarity: Optional[float] = None
    coverage_ratio: Optional[float] = None
    quiz_score: Optional[float] = None
    quiz_total: Optional[int] = None
    quiz_correct: Optional[int] = None
    difficulty: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__.copy()

    @staticmethod
    def from_dict(d: Dict[str, Any]) -> "ProgressEvent":
        # Ignore old/unknown keys that may exist in progress.json
        allowed = {f.name for f in fields(ProgressEvent)}
        clean = {k: v for k, v in (d or {}).items() if k in allowed}
        return ProgressEvent(**clean)

# ----------------------------
# Progress Tracker
# ----------------------------

class ProgressTracker:
    """
    - Progress comes from interactions (answers/explanations/examples) and quiz scores.
    - Each course starts at baseline 10% (attendance/material seen assumption).
    - Mastery categories: not_ready / understanding / ready_for_exam
    - Stores to a stable absolute progress.json path by default.
    """

    def __init__(self, path: str | None = None, user_id: str = "default"):
        """
        Args:
            path: explicit path to the progress JSON file.
                  Defaults to <project_root>/progress_<user_id>.json
                  so each user gets their own file.
            user_id: logical user identifier (enables multi-user support).
        """
        self.user_id = user_id
        if path is None:
            fname = f"progress_{user_id}.json" if user_id != "default" else "progress.json"
            path = str(PROGRESS_FILE.parent / fname)

        self.path = path

        # canonical storage
        self.data: Dict[str, Any] = {
            "version": 1,
            "courses": {},
            "events": [],
            "sessions": {},
        }

        # in-memory objects
        self.courses: Dict[str, CourseStats] = {}
        self.events: List[ProgressEvent] = []

        self.load()
        self._hydrate_from_data()

    # ---------- persistence ----------

    def load(self) -> None:
        if not os.path.exists(self.path):
            return
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
            if isinstance(loaded, dict):
                self.data.update(loaded)
                self.data.setdefault("courses", {})
                self.data.setdefault("events", [])
                self.data.setdefault("sessions", {})
        except Exception:
            # corrupted file -> reset
            self.data = {"version": 1, "courses": {}, "events": [], "sessions": {}}

    def save(self) -> None:
        folder = os.path.dirname(self.path)
        if folder:
            os.makedirs(folder, exist_ok=True)
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)

    def _hydrate_from_data(self) -> None:
        """Convert JSON self.data -> in-memory objects."""
        self.courses = {}
        for course_id, cdict in (self.data.get("courses", {}) or {}).items():
            if isinstance(cdict, dict):
                course = CourseStats.from_dict(cdict)
                if not course.course_id:
                    course.course_id = course_id
                self.courses[course_id] = course

        self.events = []
        for edict in (self.data.get("events", []) or []):
            if isinstance(edict, dict):
                self.events.append(ProgressEvent.from_dict(edict))

    def _dehydrate_to_data(self) -> None:
        """Convert in-memory objects -> JSON self.data for saving."""
        self.data["courses"] = {cid: c.to_dict() for cid, c in self.courses.items()}
        self.data["events"] = [e.to_dict() for e in self.events]
        self.data.setdefault("sessions", {})

    # ---------- sessions ----------

    def start_session(self, course_id: str) -> None:
        now = datetime.utcnow().isoformat()
        
        # log session in JSON sessions
        self.data.setdefault("sessions", {})
        self.data["sessions"].setdefault(course_id, [])
        self.data["sessions"][course_id].append({
            "start": now,
            "end": None,
            "events": 0,
        })
        
        # optional: log an event
        self.events.append(
            ProgressEvent(
                ts=time.time(),
                event_type="session_start",
                course_id=course_id,
            )
        )
        
        self._dehydrate_to_data()
        self.save()
        
    def end_session(self, course_id: str) -> None:
        sess = self.data.get("sessions", {}).get(course_id, [])
        if not sess:
            return
        last = sess[-1]
        if last.get("end") is None:
            last["end"] = datetime.utcnow().isoformat()
            
        # add to study time
        try:
            start = datetime.fromisoformat(last["start"]) 
            end = datetime.fromisoformat(last["end"])
            elapsed = max(0.0, (end - start).total_seconds())
            course = self._course(course_id)
            course.study_time_sec += elapsed
        except Exception:
               pass
            
        self._dehydrate_to_data()
        self.save()

    # ---------- helpers ----------

    def _course(self, course_id: str) -> CourseStats:
        if course_id not in self.courses:
            self.courses[course_id] = CourseStats(course_id=course_id, baseline=DEFAULT_START_PERCENT / 100.0)
        return self.courses[course_id]

    def _concept(self, course: CourseStats, concept_id: str, concept_title: str) -> ConceptStats:
        if concept_id not in course.concepts:
            course.concepts[concept_id] = ConceptStats(
                concept_id=concept_id,
                concept_title=concept_title,
                mastery_score=course.baseline,
            )
        # keep title fresh
        if concept_title and not course.concepts[concept_id].concept_title:
            course.concepts[concept_id].concept_title = concept_title
        return course.concepts[concept_id]

    # ---------- scoring ----------

    def record_validation(
        self,
        course_id: str,
        concept_id: str,
        concept_title: str,
        event_type: EventType,  # "answer_check" | "explanation" | "example"
        verdict: str,
        similarity: float,
        coverage_ratio: float,
        covered_points: List[str],
        missing_points: List[str],
    ) -> None:
        ts = time.time()
        course = self._course(course_id)
        cs = self._concept(course, concept_id, concept_title)

        is_good = (verdict == "PASS")
        if event_type == "answer_check":
            cs.good_answers += int(is_good)
            cs.bad_answers += int(not is_good)
        elif event_type == "explanation":
            cs.explanation_good += int(is_good)
            cs.explanation_bad += int(not is_good)
        elif event_type == "example":
            cs.example_good += int(is_good)
            cs.example_bad += int(not is_good)

        cs.last_similarity = float(similarity or 0.0)
        cs.last_coverage = float(coverage_ratio or 0.0)

        # ----- mastery update (0..1) -----
        delta = MASTERY_DELTA_GOOD if is_good else MASTERY_DELTA_BAD
        delta += 0.08 * cs.last_coverage
        delta += 0.05 * cs.last_similarity

        if event_type in ("explanation", "example"):
            delta *= MASTERY_EXPL_FACTOR

        attempts = (
            cs.good_answers + cs.bad_answers +
            cs.explanation_good + cs.explanation_bad +
            cs.example_good + cs.example_bad
        )
        delta *= max(MASTERY_DIMINISH_FLOOR, 1.0 - attempts * MASTERY_DIMINISH_PER_ATT)

        baseline = float(course.baseline or MASTERY_BASELINE)
        cs.mastery_score = max(baseline, min(1.0, cs.mastery_score + delta))

        # Log event
        self.events.append(
            ProgressEvent(
                ts=ts,
                event_type=event_type,
                course_id=course_id,
                concept_id=concept_id,
                concept_title=concept_title,
                verdict=verdict,
                similarity=float(similarity or 0.0),
                coverage_ratio=float(coverage_ratio or 0.0),
            )
        )

        # Persist
        self._dehydrate_to_data()
        self.save()

    def record_quiz(self, course_id: str, score_0_1: float, total: int, correct: int, difficulty: str = "med") -> None:
        ts = time.time()
        course = self._course(course_id)
        score_0_1 = max(0.0, min(1.0, float(score_0_1)))
        course.quiz_scores.append(score_0_1)

        self.events.append(
            ProgressEvent(
                ts=ts,
                event_type="quiz",
                course_id=course_id,
                quiz_score=score_0_1,
                quiz_total=int(total),
                quiz_correct=int(correct),
                difficulty=difficulty,
            )
        )

        self._dehydrate_to_data()
        self.save()

    # ---------- reporting ----------

    def compute_course_percent(self, course_id: str) -> float:
        course = self._course(course_id)
        baseline = float(course.baseline or (DEFAULT_START_PERCENT / 100.0))

        if not course.concepts:
            # no info yet: baseline only
            return baseline

        # average mastery across concepts, never below baseline
        avg = sum(cs.mastery_score for cs in course.concepts.values()) / max(1, len(course.concepts))
        return max(baseline, min(1.0, avg))

    def get_course_percent(self, course_id: str) -> int:
        return int(round(self.compute_course_percent(course_id) * 100))

    def get_course_status(self, course_id: str) -> str:
        pct = self.get_course_percent(course_id)
        if pct >= 75:
            return "ready_for_exam"
        if pct >= 40:
            return "understanding"
        return "not_ready"

    def get_concept_percent(self, course_id: str, concept_id: str) -> int:
        course = self._course(course_id)
        cs = course.concepts.get(concept_id)
        if not cs:
            return int(round((course.baseline or 0.10) * 100))
        return int(round(cs.mastery_score * 100))

    def get_next_practice_concepts(self, course_id: str, k: int = 5) -> List[ConceptStats]:
        course = self._course(course_id)
        return sorted(course.concepts.values(), key=lambda c: c.mastery_score)[:k]