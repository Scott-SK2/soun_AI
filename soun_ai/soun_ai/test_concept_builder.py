from document_intelligence.ingestion import ingest_file
from document_intelligence.concept_builder import build_concept_index

def main():
    files = [
        r"C:\Users\dimak\Downloads\0. Course Overview.pptx",
        r"C:\Users\dimak\Downloads\Ch 5 - Sustaining superior performance 2025.pdf",
    ]

    chunks = []
    for f in files:
        chunks.extend(ingest_file(f))

    concepts = build_concept_index(chunks)

    print("Total chunks:", len(chunks))
    print("Extracted concepts:", len(concepts))

    for c in concepts[:15]:
        print("\n---")
        print("ID:", c["id"])
        print("Title:", c["title"])
        if c["definition"]:
            print("Definition:", c["definition"])
        if c["key_points"]:
            print("Key points:", c["key_points"])
        print("Sources:", c["sources"])

if __name__ == "__main__":
    main()