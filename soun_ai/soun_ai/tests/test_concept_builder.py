"""Unit tests for document_intelligence/concept_builder.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from document_intelligence.document_store import DocChunk
from document_intelligence.concept_builder import (
    build_concept_index, _title_is_valid, _extract_definitions, _extract_keypoints,
)


class TestTitleIsValid:
    def test_valid_title(self):
        assert _title_is_valid("Competitive Advantage") is True

    def test_too_short(self):
        assert _title_is_valid("Hi") is False

    def test_question(self):
        assert _title_is_valid("What is strategy?") is False

    def test_footer(self):
        assert _title_is_valid("© Faculty of Management") is False

    def test_stop_title(self):
        assert _title_is_valid("introduction") is False

    def test_too_long(self):
        assert _title_is_valid("A" * 80) is False


class TestExtractDefinitions:
    def test_simple_is(self):
        text = "Competitive Advantage is the ability to create superior value."
        results = _extract_definitions(text)
        assert len(results) == 1
        title, definition = results[0]
        assert "Competitive Advantage" in title

    def test_refers_to(self):
        text = "Market Positioning refers to how a firm differentiates itself."
        results = _extract_definitions(text)
        assert len(results) == 1

    def test_no_match(self):
        results = _extract_definitions("No definition here just text.")
        assert results == []


class TestExtractKeypoints:
    def test_bullet_extraction(self):
        text = "• Firms must reduce production costs to stay competitive\n• Quality management matters a great deal\n• Speed and agility are critical for market success"
        kps = _extract_keypoints(text)
        assert len(kps) >= 2

    def test_skips_questions(self):
        text = "• What is the goal?\n• Reduce production costs significantly"
        kps = _extract_keypoints(text)
        assert not any("?" in kp for kp in kps)


class TestBuildConceptIndex:
    def _chunk(self, text: str) -> DocChunk:
        return DocChunk(text=text, source="test.pdf", page=1, kind="pdf_text")

    def test_builds_from_definitions(self):
        chunks = [
            self._chunk("Competitive Advantage is the ability to create superior value for customers.")
        ]
        index = build_concept_index(chunks)
        titles = [e["title"] for e in index]
        assert any("Competitive Advantage" in t for t in titles)

    def test_filters_admin_concepts(self):
        chunks = [
            self._chunk("Course materials are available on Blackboard.")
        ]
        index = build_concept_index(chunks)
        assert not any("course material" in e["title"].lower() for e in index)

    def test_max_concepts_respected(self):
        chunks = [
            self._chunk(f"Concept{i} Theory is a well-known framework in management.") for i in range(200)
        ]
        index = build_concept_index(chunks, max_concepts=50)
        assert len(index) <= 50

    def test_no_duplicate_threat_of(self):
        chunks = [
            self._chunk("The Threat of New Entrants is a key force. Threat of New Entrants is also important.")
        ]
        index = build_concept_index(chunks)
        titles = [e["title"].lower() for e in index]
        # should not have both "threat of new entrants" and "the threat of new entrants"
        assert titles.count("threat of new entrants") <= 1
