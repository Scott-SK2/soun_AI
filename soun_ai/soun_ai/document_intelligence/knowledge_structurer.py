class KnowledgeStructurer:
    def __init__(self):
        self.knowledge_base = {}

    def add_concepts(self, concepts, source):
        for c in concepts:
            name = c["concept"].lower()
            if name not in self.knowledge_base:
                self.knowledge_base[name] = {
                    "concept": c["concept"],
                    "definitions": [],
                    "sources": [],
                    "related": set()
                }

            self.knowledge_base[name]["definitions"].append(c["definition"])
            self.knowledge_base[name]["sources"].append(source)

    def link(self, a, b):
        a = a.lower()
        b = b.lower()
        if a in self.knowledge_base and b in self.knowledge_base:
            self.knowledge_base[a]["related"].add(b)
            self.knowledge_base[b]["related"].add(a)

    def export(self):
        out = {}
        for k, v in self.knowledge_base.items():
            out[k] = {
                "concept": v["concept"],
                "definitions": v["definitions"],
                "sources": v["sources"],
                "related": list(v["related"])
            }
        return out
