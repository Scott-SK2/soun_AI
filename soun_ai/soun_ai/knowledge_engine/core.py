# soun_ai/knowledge_engine/core.py

from typing import Dict, List
from .models import Course, Concept, KnowledgeUnit


class KnowledgeEngine:

    def __init__(self):
        self.courses: Dict[str, Course] = {}

    # ---------- Course Management ----------

    def create_course(self, course_id: str, name: str) -> Course:
        if course_id not in self.courses:
            self.courses[course_id] = Course(course_id, name)
        return self.courses[course_id]

    def get_course(self, course_id: str) -> Course:
        return self.courses.get(course_id)

    # ---------- Concept Management ----------

    def add_concept(self, course_id: str, concept_name: str, description: str = None) -> Concept:
        course = self.get_course(course_id)
        if not course:
            raise ValueError(f"Course {course_id} does not exist")

        if concept_name not in course.concepts:
            concept = Concept(concept_name, course_id, description)
            course.add_concept(concept)
        return course.concepts[concept_name]

    # ---------- Knowledge Management ----------

    def add_knowledge_unit(
        self,
        course_id: str,
        concept_name: str,
        content: str,
        source: str,
        metadata: dict = None,
    ) -> KnowledgeUnit:

        course = self.get_course(course_id)
        if not course:
            raise ValueError(f"Course {course_id} does not exist")

        concept = self.add_concept(course_id, concept_name)

        ku = KnowledgeUnit(
            content=content,
            concept=concept_name,
            course_id=course_id,
            source=source,
            metadata=metadata,
        )

        concept.add_knowledge(ku)
        return ku

    # ---------- Query ----------

    def get_course_knowledge(self, course_id: str) -> List[KnowledgeUnit]:
        course = self.get_course(course_id)
        if not course:
            return []

        all_units = []
        for concept in course.concepts.values():
            all_units.extend(concept.knowledge_units)
        return all_units

    def search_by_concept(self, course_id: str, concept_name: str) -> List[KnowledgeUnit]:
        course = self.get_course(course_id)
        if not course:
            return []
        concept = course.concepts.get(concept_name)
        if not concept:
            return []
        return concept.knowledge_units
