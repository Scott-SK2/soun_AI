from tutoring_engine.runtime import TutoringRuntime
from document_intelligence.ingestion import ingest_file

def main():
    from document_intelligence.concept_builder import build_concept_index
    concepts = build_concept_index(all_chunks)
    runtime = TutoringRuntime(concepts)
    runtime.load_course_chunks(all_chunks)

    runtime = TutoringRuntime(concepts)

    files = [
        r"C:\Users\dimak\Downloads\0. Course Overview.pptx",
        r"C:\Users\dimak\Downloads\Ch 5 - Sustaining superior performance 2025.pdf",
        # r"C:\Users\dimak\Downloads\handwritten.jpg",
    ]

    all_chunks = []
    for f in files:
        all_chunks.extend(ingest_file(f))

    print("Total ingested chunks:", len(all_chunks))
    runtime.load_course_chunks(all_chunks)


    # simulate your confusion flow
    q = "Can you explain sustaining superior performance?"
    turn0 = runtime.answer_question(q)
    print(turn0.message)
    ask = runtime.on_app_explained_and_student_confused("I don't understand", q)
    print("\n--- ASK ---\n", ask.message)

    tailored = runtime.on_student_provides_what_they_know("I know it is about keeping performance high over time.")
    print("\n--- TAILORED + DOC ---\n", tailored.message)

if __name__ == "__main__":
    main()