from document_intelligence.ingest_pptx import ingest_pptx

def main():
    path = r"C:\Users\dimak\Downloads\0. Course Overview.pptx"  # CHANGE THIS
    chunks = ingest_pptx(path)
    print("Total chunks:", len(chunks))

    for i, ch in enumerate(chunks[:5], start=1):
        print(f"\n--- Chunk {i} ---")
        print("Source:", ch.source, "Slide:", ch.page, "Kind:", getattr(ch, "kind", "text"))
        print(ch.text[:350])

if __name__ == "__main__":
    main()