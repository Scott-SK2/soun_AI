from document_intelligence.ingest_pdf import ingest_pdf

def main():
    path = r"C:\Users\dimak\Downloads\Ch 5 - Sustaining superior performance 2025.pdf"  # CHANGE THIS
    chunks = ingest_pdf(path)
    print("Total chunks:", len(chunks))

    # show distribution of kinds
    kinds = {}
    for c in chunks:
        kinds[c.kind] = kinds.get(c.kind, 0) + 1
    print("Kinds:", kinds)

    for c in chunks[:3]:
        print("\n---", c.kind, "page", c.page, "---")
        print(c.text[:350])

if __name__ == "__main__":
    main()