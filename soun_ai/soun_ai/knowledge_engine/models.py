# soun_ai/knowledge_engine/models.py

from typing import List, Dict, Optional
from datetime import datetime
import uuid


class KnowledgeUnit:
    """
    Atomic unit of knowledge.
    Example: a definition, explanation, rule, formula, concept description, etc.
    """

    def __init__(
        self,
        content: str,
        concept: str,
        course_id: str,
        source: str,
        metadata: Optional[Dict] = None,
    ):
        self.id = str(uuid.uuid4())
        self.content = content              # actual knowledge text
        self.concept = concept              # e.g. "Photosynthesis", "Newton's First Law"
        self.course_id = course_id          # course identifier
        self.source = source                # file name / doc id
        self.metadata = metadata or {}      # page, slide, confidence, etc
        self.created_at = datetime.utcnow()

    def to_dict(self):
        return {
            "id": self.id,
            "content": self.content,
            "concept": self.concept,
            "course_id": self.course_id,
            "source": self.source,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
        }


class Concept:
    """
    Represents a concept inside a course.
    Example: "Derivatives", "Cell division", "World War II"
    """

    def __init__(self, name: str, course_id: str, description: Optional[str] = None):
        self.id = str(uuid.uuid4())
        self.name = name
        self.course_id = course_id
        self.description = description
        self.knowledge_units: List[KnowledgeUnit] = []
        self.related_concepts: List[str] = []  # concept IDs
        self.created_at = datetime.utcnow()

    def add_knowledge(self, ku: KnowledgeUnit):
        self.knowledge_units.append(ku)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "course_id": self.course_id,
            "description": self.description,
            "knowledge_units": [k.to_dict() for k in self.knowledge_units],
            "related_concepts": self.related_concepts,
            "created_at": self.created_at.isoformat(),
        }


class Course:
    """
    Represents a full course uploaded by a student.
    """

    def __init__(self, course_id: str, name: str):
        self.course_id = course_id
        self.name = name
        self.concepts: Dict[str, Concept] = {}
        self.documents: List[str] = []   # filenames / doc ids
        self.created_at = datetime.utcnow()

    def add_concept(self, concept: Concept):
        self.concepts[concept.name] = concept

    def add_document(self, doc_name: str):
        if doc_name not in self.documents:
            self.documents.append(doc_name)

    def to_dict(self):
        return {
            "course_id": self.course_id,
            "name": self.name,
            "concepts": {k: v.to_dict() for k, v in self.concepts.items()},
            "documents": self.documents,
            "created_at": self.created_at.isoformat(),
        }
