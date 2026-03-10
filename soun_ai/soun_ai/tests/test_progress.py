"""Unit tests for tutoring_engine/progress.py"""
import sys, os, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from tutoring_engine.progress import ProgressTracker


@pytest.fixture
def tracker(tmp_path):
    """Fresh tracker with temp file per test."""
    path = str(tmp_path / "progress.json")
    return ProgressTracker(path=path)


class TestProgressTracker:
    def test_initial_percent_is_baseline(self, tracker):
        pct = tracker.get_course_percent("course1")
        assert pct == 10

    def test_good_answer_increases_mastery(self, tracker):
        tracker.record_validation(
            course_id="c1", concept_id="comp-adv", concept_title="Competitive Advantage",
            event_type="answer_check", verdict="PASS",
            similarity=0.8, coverage_ratio=0.7, covered_points=["a"], missing_points=[],
        )
        pct = tracker.get_course_percent("c1")
        assert pct > 10

    def test_bad_answer_does_not_go_below_baseline(self, tracker):
        for _ in range(10):
            tracker.record_validation(
                course_id="c1", concept_id="comp-adv", concept_title="Competitive Advantage",
                event_type="answer_check", verdict="FAIL",
                similarity=0.2, coverage_ratio=0.0, covered_points=[], missing_points=["a"],
            )
        pct = tracker.get_course_percent("c1")
        assert pct >= 10  # never below baseline

    def test_multi_user_isolation(self, tmp_path):
        t1 = ProgressTracker(path=str(tmp_path / "p_alice.json"), user_id="alice")
        t2 = ProgressTracker(path=str(tmp_path / "p_bob.json"), user_id="bob")

        t1.record_validation(
            "c1", "comp-adv", "Competitive Advantage", "answer_check",
            "PASS", 0.9, 0.9, ["a"], [],
        )
        assert t1.get_course_percent("c1") > t2.get_course_percent("c1")

    def test_persistence(self, tmp_path):
        path = str(tmp_path / "progress.json")
        t = ProgressTracker(path=path)
        t.record_validation("c1", "comp-adv", "Competitive Advantage",
                             "answer_check", "PASS", 0.8, 0.7, ["a"], [])
        pct_before = t.get_course_percent("c1")

        # reload from disk
        t2 = ProgressTracker(path=path)
        assert t2.get_course_percent("c1") == pct_before

    def test_session_start_end(self, tracker):
        tracker.start_session("c1")
        tracker.end_session("c1")
        sessions = tracker.data.get("sessions", {}).get("c1", [])
        assert len(sessions) == 1
        assert sessions[0]["end"] is not None

    def test_status_levels(self, tracker):
        # pump mastery to >75%
        for _ in range(20):
            tracker.record_validation(
                "c1", "comp-adv", "Competitive Advantage",
                "answer_check", "PASS", 1.0, 1.0, ["a", "b"], [],
            )
        status = tracker.get_course_status("c1")
        assert status in ("understanding", "ready_for_exam")
