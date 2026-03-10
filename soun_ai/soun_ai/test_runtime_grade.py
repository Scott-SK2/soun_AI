from tutoring_engine.runtime import TutoringRuntime

def main():
    concepts = [
        {"concept": "Photosynthesis", "definition": "the process by which plants convert sunlight into energy"},
        {"concept": "Chlorophyll", "definition": "a pigment found in chloroplasts"},
        {"concept": "Cellular respiration", "definition": "the process of converting glucose into energy"},
    ]

    runtime = TutoringRuntime(concepts)

    check = "Check: What is photosynthesis?"
    good = "Plants use sunlight to make energy."
    bad = "It is a pigment in chloroplasts."

    print(runtime.grade(check, good))
    print(runtime.grade(check, bad))

if __name__ == "__main__":
    main()