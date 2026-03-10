from tutoring_engine.runtime import TutoringRuntime
from tutoring_engine.progress import ProgressTracker


def main():
    files = [
        r"C:\Users\dimak\Downloads\Ch 5 - Sustaining superior performance 2025.pdf",
    ]

    # 1) Create runtime + start a single study session
    runtime = TutoringRuntime(concept_index=[])
    runtime.start_study_session()

    # 2) Load course ONCE (build concepts, load docs, etc.)
    runtime.load_course(files)

    # 3) Ask a question -> retrieved explanation + check
    q = "Can you explain sustaining superior performance?"
    turn0 = runtime.answer_question(q)
    print("\n--- ANSWER ---\n", turn0.message)

    # 4) Student confused -> ask what they know
    ask = runtime.on_app_explained_and_student_confused("I don't understand", q)
    print("\n--- ASK ---\n", ask.message)

    # 5) Student provides what they know -> tailored explanation + check
    tailored = runtime.on_student_provides_what_they_know(
        "I know it has to do with sustainability and competition."
    )
    print("\n--- TAILORED ---\n", tailored.message)

    check_q = tailored.next_check or "Check: In one sentence, define: Sustaining Superior Performance"

    # 6) Simulate a bad answer (FAIL) -> correction
    student_bad = "It is about imitation."
    grade_bad = runtime.grade(check_q, student_bad)
    turn_bad = runtime.correct(check_q, student_bad, grade_bad)
    print("\n--- CORRECTION (BAD) ---\n", turn_bad.message)

    # 7) Simulate a good answer (PASS) -> mastery should increase
    student_good = (
        "It is about sustaining a competitive advantage over time despite threats like imitation and substitution."
    )
    grade_good = runtime.grade(check_q, student_good)
    print("\nGOOD verdict:", grade_good.verdict)
    print("GOOD reason:", grade_good.reason)
    print("GOOD sim:", getattr(grade_good, "similarity", None))
    print("GOOD evidence:", getattr(grade_good, "evidence", None))

    # 8) Show progress report
    print("\n--- PROGRESS (IN-MEMORY) ---\n", runtime.get_progress_report())

    # 9) Ask again: should show adaptive check
    turn2 = runtime.answer_question("Can you explain sustaining superior performance?")
    print("\n--- NEW CHECK ---\n", turn2.next_check)

    # 10) End the study session (writes progress.json)
    runtime.end_study_session()

    # 11) Prove persistence: reload progress from disk
    p = ProgressTracker()
    print("\n--- PROGRESS (PERSISTED) ---")
    print("Course percent:", p.get_course_percent("default_course"))
    print("Course status:", p.get_course_status("default_course"))


if __name__ == "__main__":
    main()