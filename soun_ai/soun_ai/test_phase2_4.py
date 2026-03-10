from document_intelligence.semantic_engine import SemanticEngine
from tutoring_engine.semantic_validation import SemanticValidator

def main():
    se = SemanticEngine(model_id="sentence-transformers/all-MiniLM-L6-v2")
    # Example concept index (later this will come from your Knowledge Engine)
    concepts = [
        {"concept": "Photosynthesis", "definition": "the process by which plants convert sunlight into energy"},
        {"concept": "Chlorophyll", "definition": "a pigment found in chloroplasts"},
        {"concept": "Cellular respiration", "definition": "the process of converting glucose into energy"},
    ]

    validator = SemanticValidator(
        semantic_engine=se,
        concept_index=concepts,
        point_threshold=0.52,
        min_points_to_pass=1,
        pass_threshold=0.65,
        fail_threshold=0.55,
    )
    

    check = "Check: What is photosynthesis?"
    answer_good = "It’s the process plants use to turn sunlight into energy."
    answer_bad = "It’s a pigment in chloroplasts."

    r1 = validator.validate(check, answer_good)
    r2 = validator.validate(check, answer_bad)

    print("\n--- GOOD ANSWER ---")
    print(r1)

    print("\n--- BAD ANSWER ---")
    print(r2)

if __name__ == "__main__":
    main()
