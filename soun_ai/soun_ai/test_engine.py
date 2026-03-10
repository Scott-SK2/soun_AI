print("TEST FILE IS RUNNING")

from knowledge_engine.core import KnowledgeEngine

print("IMPORT WORKED")

ke = KnowledgeEngine()

print("ENGINE CREATED")

ke.create_course("bio_101", "Biology 101")

ke.add_knowledge_unit(
    course_id="bio_101",
    concept_name="Photosynthesis",
    content="Photosynthesis is the process by which plants convert sunlight into energy.",
    source="notes.pdf",
)

print("KNOWLEDGE ADDED")

units = ke.search_by_concept("bio_101", "Photosynthesis")

print("UNITS FOUND:", len(units))

for u in units:
    print("UNIT:", u.content)
