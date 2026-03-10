from document_intelligence.ingest_image import ingest_image

def main():
    path = r"C:\Users\dimak\Downloads\IMG_8866.jpg"  # CHANGE THIS
    chunks = ingest_image(path)
    print("Total chunks:", len(chunks))
    if chunks:
        print("Kind:", chunks[0].kind, "Source:", chunks[0].source)
        print(chunks[0].text[:500])

if __name__ == "__main__":
    main()