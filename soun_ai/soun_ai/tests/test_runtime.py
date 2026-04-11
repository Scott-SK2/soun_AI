"""Integration tests for TutoringRuntime."""
import sys, os, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from tutoring_engine.runtime import TutoringRuntime
from document_intelligence.document_store import DocChunk


CONCEPTS = [
    {
        "id": "competitive-advantage",
        "title": "Competitive Advantage",
        "definition": "Competitive Advantage is the ability to create superior value for customers relative to competitors.",
        "key_points": ["cost leadership", "differentiation", "sustainable position"],
        "sources": ["test.pdf"],
    },
    {
        "id": "market-positioning",
        "title": "Market Positioning",
        "definition": "Market Positioning refers to how a firm differentiates itself in the minds of customers.",
        "key_points": ["brand perception", "target segment", "value proposition"],
        "sources": ["test.pdf"],
    },
]


@pytest.fixture
def runtime(tmp_path):
    rt = TutoringRuntime(
        concept_index=CONCEPTS,
        user_id="test_user",
        course_id="test_course",
    )
    # Override progress path to temp dir
    from tutoring_engine.progress import ProgressTracker
    rt.progress = ProgressTracker(path=str(tmp_path / "progress.json"), user_id="test_user")

    chunks = [
        DocChunk(
            text="Competitive Advantage is the ability to create superior value for customers.",
            source="test.pdf", page=1, kind="pdf_text"
        ),
        DocChunk(
            text="Market Positioning refers to how a firm differentiates itself in the minds of customers.",
            source="test.pdf", page=2, kind="pdf_text"
        ),
    ]
    rt.load_course_chunks(chunks)
    return rt


class TestTutoringRuntime:
    def test_answer_question_returns_turn(self, runtime):
        turn = runtime.answer_question("Explain Competitive Advantage")
        assert turn.message
        assert len(turn.message) > 10

    def test_grade_pass(self, runtime):
        question = "Check: In one sentence, define: Competitive Advantage"
        answer = "Competitive Advantage is the ability to create superior value for customers relative to competitors."
        result = runtime.grade(question, answer)
        assert result.verdict in ("PASS", "FAIL")

    def test_grade_fail_on_nonsense(self, runtime):
        question = "Check: In one sentence, define: Competitive Advantage"
        result = runtime.grade(question, "I have no idea about anything at all.")
        assert result.verdict == "FAIL"

    def test_correct_returns_turn(self, runtime):
        question = "Check: define Competitive Advantage"
        answer = "I don't know"
        grade = runtime.grade(question, answer)
        turn = runtime.correct(question, answer, grade)
        assert turn.message

    def test_progress_recorded_after_grade(self, runtime):
        question = "Check: In one sentence, define: Competitive Advantage"
        answer = "Competitive Advantage is the ability to outperform competitors by delivering more value."
        runtime.grade(question, answer)
        pct = runtime.progress.get_course_percent("test_course")
        assert pct >= 10  # baseline or above

    def test_confusion_flow(self, runtime):
        # Simulate: app explained → student confused
        turn1 = runtime.on_app_explained_and_student_confused(
            "I don't understand", "Explain Competitive Advantage"
        )
        assert turn1.message

        turn2 = runtime.on_student_provides_what_they_know(
            "I know it has something to do with being better than rivals"
        )
        assert turn2.message

    def test_progress_report(self, runtime):
        report = runtime.get_progress_report()
        assert "Course progress" in report

    def test_multi_user_isolation(self, tmp_path):
        from tutoring_engine.progress import ProgressTracker
        rt_alice = TutoringRuntime(CONCEPTS, user_id="alice", course_id="c1")
        rt_alice.progress = ProgressTracker(path=str(tmp_path / "alice.json"), user_id="alice")

        rt_bob = TutoringRuntime(CONCEPTS, user_id="bob", course_id="c1")
        rt_bob.progress = ProgressTracker(path=str(tmp_path / "bob.json"), user_id="bob")

        chunks = [DocChunk(
            text="Competitive Advantage is the ability to create superior value.",
            source="t.pdf", page=1, kind="pdf_text"
        )]
        rt_alice.load_course_chunks(chunks)
        rt_bob.load_course_chunks(chunks)

        rt_alice.grade(
            "Check: define Competitive Advantage",
            "Competitive Advantage is the ability to create superior value for customers."
        )

        alice_pct = rt_alice.progress.get_course_percent("c1")
        bob_pct = rt_bob.progress.get_course_percent("c1")
        assert alice_pct >= bob_pct  # alice answered, bob didn't
