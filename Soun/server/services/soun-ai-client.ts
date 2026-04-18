/**
 * HTTP client for the soun_AI FastAPI microservice.
 * Configure the base URL with SOUN_AI_URL env var (default: http://localhost:8000).
 *
 * Backend selector is controlled by the FastAPI's own LLM_BACKEND env var:
 *   LLM_BACKEND=openai  → GPT-4o  (needs OPENAI_API_KEY in the FastAPI process)
 *   LLM_BACKEND=local   → Phi-3 Mini GGUF (free, no key needed)
 */

const BASE = process.env.SOUN_AI_URL ?? "http://localhost:8000";

// ── Generic helpers ────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`[soun-ai] POST ${path} → HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ── Quiz ───────────────────────────────────────────────────────────────────

export interface ApiQuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  difficulty: string;
}

export interface ApiQuizResponse {
  questions: ApiQuizQuestion[];
}

export interface ApiQuizEvalResponse {
  score: number;
  feedback: string;
  questions: ApiQuizQuestion[];
}

export async function apiGenerateQuiz(
  topic: string,
  context: string,
  nQuestions = 5,
  difficulty = "med",
  language = "en",
): Promise<ApiQuizResponse> {
  return post("/quiz/generate", {
    topic,
    context,
    n_questions: nQuestions,
    difficulty,
    language,
  });
}

export async function apiEvaluateQuiz(
  questions: ApiQuizQuestion[],
  studentAnswers: number[],
  language = "en",
): Promise<ApiQuizEvalResponse> {
  return post("/quiz/evaluate", { questions, student_answers: studentAnswers, language });
}

// ── Flashcards ─────────────────────────────────────────────────────────────

export interface ApiFlashcard {
  front: string;
  back: string;
  hint?: string | null;
  difficulty: string;
  source?: string | null;
}

export interface ApiFlashcardResponse {
  flashcards: ApiFlashcard[];
}

export interface ApiFlashcardEvalResponse {
  verdict: string;   // "PASS" | "FAIL"
  score: number;
  feedback: string;
  model_answer: string;
}

export async function apiGenerateFlashcards(
  opts: { text?: string | null; concepts?: unknown[] | null; nCards?: number; language?: string },
): Promise<ApiFlashcardResponse> {
  return post("/flashcards/generate", {
    text: opts.text ?? null,
    concepts: opts.concepts ?? null,
    n_cards: opts.nCards ?? 10,
    language: opts.language ?? "en",
  });
}

export async function apiEvaluateFlashcard(
  card: ApiFlashcard,
  studentAnswer: string,
  language = "en",
): Promise<ApiFlashcardEvalResponse> {
  return post("/flashcards/evaluate", { card, student_answer: studentAnswer, language });
}

// ── Study guide ────────────────────────────────────────────────────────────

export interface ApiStudyGuide {
  title: string;
  sections: Array<{ heading: string; content: string; key_points: string[] }>;
  summary: string;
  exam_tips: string[];
}

export interface ApiSummaryResponse {
  summary: string;
}

export async function apiStudyGuide(
  concepts: unknown[],
  courseName: string,
  language = "en",
): Promise<ApiStudyGuide> {
  return post("/study_guide/guide", { concepts, course_name: courseName, language });
}

export async function apiSummarize(
  text: string,
  sourceName: string,
  language = "en",
): Promise<ApiSummaryResponse> {
  return post("/study_guide/summary", { text, source_name: sourceName, language });
}

// ── Voice / NLP ────────────────────────────────────────────────────────────

export interface ApiVoiceCommandResponse {
  response: string;
  action: string;
  parameters: Record<string, unknown>;
  emotion: string;
}

export interface ApiIntentResponse {
  intent: string;
  topic: string | null;
  emotion: string;
  confidence: number;
}

export async function apiVoiceCommand(
  message: string,
  history: unknown[] = [],
  concepts: unknown[] = [],
  language = "en",
  userId = "default",
  courseId = "default_course",
): Promise<ApiVoiceCommandResponse> {
  return post("/voice/command", {
    message,
    history,
    concepts,
    language,
    user_id: userId,
    course_id: courseId,
  });
}

export async function apiDetectIntent(
  message: string,
  context = "",
  language = "en",
): Promise<ApiIntentResponse> {
  return post("/voice/intent", { message, context, language });
}

export async function apiVoiceAnnotate(
  documentText: string,
  timestampSeconds: number,
  note: string,
  language = "en",
): Promise<{ annotation: string }> {
  return post("/voice/annotate", {
    document_text: documentText,
    timestamp_seconds: timestampSeconds,
    note,
    language,
  });
}

// ── Vision / Diagrams ──────────────────────────────────────────────────────

export interface ApiDiagramResponse {
  svg: string;
  title: string;
  description: string;
  diagram_type: string;
}

export async function apiGenerateDiagram(
  concept: unknown,
  diagramType: string,
  language = "en",
): Promise<ApiDiagramResponse> {
  return post("/vision/diagram", { concept, diagram_type: diagramType, language });
}
