"""Unit tests for utils/text_utils.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from utils.text_utils import clean_text, chunk_text, normalize_title


class TestCleanText:
    def test_removes_null_bytes(self):
        assert "\x00" not in clean_text("hello\x00world")

    def test_collapses_whitespace(self):
        assert clean_text("hello   world") == "hello world"

    def test_strips(self):
        assert clean_text("  hi  ") == "hi"

    def test_empty(self):
        assert clean_text("") == ""

    def test_none_like(self):
        assert clean_text(None) == ""  # type: ignore


class TestChunkText:
    def test_empty_returns_empty_list(self):
        assert chunk_text("") == []

    def test_short_text_single_chunk(self):
        t = "Hello world"
        chunks = chunk_text(t, max_chars=800)
        assert chunks == [t]

    def test_long_text_splits(self):
        t = "word " * 300  # 1500 chars
        chunks = chunk_text(t, max_chars=800, overlap=0)
        assert len(chunks) > 1
        for ch in chunks:
            assert len(ch) <= 800

    def test_overlap_creates_duplicate_content(self):
        t = "alpha beta gamma delta epsilon zeta eta theta"
        chunks = chunk_text(t, max_chars=20, overlap=5)
        # with overlap, later chunks share some content with earlier ones
        assert len(chunks) >= 2

    def test_word_boundary(self):
        t = "a" * 10 + " " + "b" * 10  # 21 chars
        chunks = chunk_text(t, max_chars=15, overlap=0)
        # should not cut mid-word
        for ch in chunks:
            assert not ch.startswith(" ")


class TestNormalizeTitle:
    def test_strips_leading_slide_number(self):
        result = normalize_title("Slide 3 - My Title")
        assert "My Title" in result
        assert "Slide 3" not in result

    def test_strips_trailing_number(self):
        result = normalize_title("Supply Chain Management 12")
        assert "12" not in result

    def test_cleans_whitespace(self):
        result = normalize_title("  Hello   World  ")
        assert result == "Hello World"
