from document_intelligence.semantic_engine import SemanticEngine
from document_intelligence.concept_engine import ConceptEngine
from document_intelligence.knowledge_structurer import KnowledgeStructurer

text = """
Photosynthesis is the process by which plants convert sunlight into energy.
Chlorophyll is a pigment found in chloroplasts.
Cellular respiration is the process of converting glucose into energy.
"""

semantic = SemanticEngine()
concept_engine = ConceptEngine()
structurer = KnowledgeStructurer()

concepts = concept_engine.extract_concepts(text)
structurer.add_concepts(concepts, source="biology_notes.pdf")
structurer.link("Photosynthesis", "Cellular respiration")

embeddings = semantic.embed([c["definition"] for c in concepts])

print("\n--- CONCEPTS ---")
for c in concepts:
    print(c)

print("\n--- KNOWLEDGE BASE ---")
print(structurer.export())

print("\n--- EMBEDDINGS SHAPE ---")
print(embeddings.shape)
