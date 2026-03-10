import re

class ConceptEngine:
    def __init__(self):
        self.definition_patterns = [
            r"(.+?) is defined as (.+)",
            r"(.+?) refers to (.+)",
            r"(.+?) is (.+)",
            r"(.+?) means (.+)"
        ]

    def extract_concepts(self, text):
        concepts = []
        sentences = re.split(r"[.\n]", text)

        for s in sentences:
            s = s.strip()
            for pattern in self.definition_patterns:
                m = re.match(pattern, s, re.IGNORECASE)
                if m:
                    concept = m.group(1).strip()
                    definition = m.group(2).strip()
                    concepts.append({
                        "concept": concept,
                        "definition": definition,
                        "raw": s
                    })

        return concepts
