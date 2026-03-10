from tutoring_engine.runtime import TutoringRuntime

def main():
    concepts = [
        {"concept": "Photosynthesis", "definition": "the process by which plants convert sunlight into energy"},
        {"concept": "Chlorophyll", "definition": "a pigment found in chloroplasts"},
        {"concept": "Cellular respiration", "definition": "the process of converting glucose into energy"},
    ]

    rt = TutoringRuntime(concepts)

    # Case 2 simulation:
    # student asks a question -> app explains -> student says confused
    question = "Can you explain photosynthesis?"
    confused = "I don't understand."

    turn1 = rt.on_app_explained_and_student_confused(confused, question)
    print("\n--- APP ASKED ---\n", turn1.message)

    # student responds with what they know
    student_knowledge = "I know it has something to do with sunlight and plants."
    turn2 = rt.on_student_provides_what_they_know(student_knowledge)
    print("\n--- APP TAILORED ---\n", turn2.message)

if __name__ == "__main__":
    main()