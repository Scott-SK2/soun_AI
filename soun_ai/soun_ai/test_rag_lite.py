from tutoring_engine.runtime import TutoringRuntime
from document_intelligence.document_store import DocChunk

def main():
    concepts = [
        {"concept": "Photosynthesis", "definition": "the process by which plants convert sunlight into energy"},
        {"concept": "Chlorophyll", "definition": "a pigment found in chloroplasts"},
        {"concept": "Cellular respiration", "definition": "the process of converting glucose into energy"},
    ]

    rt = TutoringRuntime(concepts)

    # Fake chunks (later these come from real PDF/PPT extraction)
    chunks = [
        DocChunk(
            text="Photosynthesis occurs in chloroplasts and uses sunlight to produce glucose, releasing oxygen as a byproduct.",
            source="biology_notes.pdf",
            page=2
        ),
        DocChunk(
            text="Chlorophyll is a green pigment that absorbs light energy, mainly blue and red wavelengths.",
            source="biology_notes.pdf",
            page=3
        ),
        DocChunk(
            text="Cellular respiration breaks down glucose to produce ATP, often using oxygen and producing carbon dioxide.",
            source="biology_notes.pdf",
            page=5
        )
    ]
    rt.load_course_chunks(chunks)

    # Case 2: question -> app explained -> student confused -> ask what they know -> tailored + evidence
    q = "Can you explain photosynthesis?"
    turn1 = rt.on_app_explained_and_student_confused("I don't understand", q)
    print("\n--- ASK ---\n", turn1.message)

    turn2 = rt.on_student_provides_what_they_know("I know it uses sunlight.")
    print("\n--- TAILORED + DOC ---\n", turn2.message)

if __name__ == "__main__":
    main()