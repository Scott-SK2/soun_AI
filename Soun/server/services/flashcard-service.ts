/**
 * Flashcard service — delegates LLM calls to soun_AI FastAPI.
 * Session management (voice sessions) remains fully local.
 * Same public interface as before.
 */

import { db } from "../db";
import { documents } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import {
  apiGenerateFlashcards,
  apiEvaluateFlashcard,
  ApiFlashcard,
} from "./soun-ai-client";

// ── Interfaces (unchanged) ─────────────────────────────────────────────────

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  source?: string;
  lastReviewed?: Date;
  correctCount: number;
  incorrectCount: number;
  masteryLevel: number;
}

export interface FlashcardSession {
  id: string;
  userId: number;
  courseId?: string;
  flashcards: Flashcard[];
  currentIndex: number;
  sessionStartTime: Date;
  correctAnswers: number;
  totalAnswers: number;
  sessionType: "practice" | "review" | "challenge";
  isVoiceSession: boolean;
}

export interface VoiceFlashcardResponse {
  type: "question" | "feedback" | "summary" | "instructions";
  content: string;
  flashcard?: Flashcard;
  sessionStats?: { current: number; total: number; correctCount: number; accuracy: number };
  nextAction?: "continue" | "end" | "repeat";
}

// ── Format converter ───────────────────────────────────────────────────────

function apiToSoun(card: ApiFlashcard, index: number, source: string): Flashcard {
  const diff = card.difficulty as Flashcard["difficulty"];
  return {
    id: `card_${Date.now()}_${index}`,
    front: card.front,
    back: card.back,
    difficulty: ["easy", "medium", "hard"].includes(diff) ? diff : "medium",
    category: card.source ?? source,
    source: card.source ?? source,
    correctCount: 0,
    incorrectCount: 0,
    masteryLevel: 0,
  };
}

// ── Service class ──────────────────────────────────────────────────────────

export class FlashcardService {
  private activeSessions: Map<string, FlashcardSession> = new Map();

  async generateFlashcardsFromDocument(
    documentId: number,
    userId: number,
    count = 10,
  ): Promise<Flashcard[]> {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .limit(1);

    if (!doc) throw new Error("Document not found");

    const res = await apiGenerateFlashcards({ text: doc.content ?? "", nCards: count, language: "en" });
    return (res.flashcards ?? []).map((c, i) => apiToSoun(c, i, doc.title));
  }

  async generateFlashcardsFromVoiceCommand(
    userId: number,
    command: string,
    courseContext?: string,
  ): Promise<Flashcard[]> {
    // Build context from course documents if available
    let docText = "";
    if (courseContext) {
      const docs = await db
        .select()
        .from(documents)
        .where(and(eq(documents.userId, userId), eq(documents.courseId, courseContext)))
        .limit(3);
      docText = docs.map((d) => `${d.title}: ${(d.content ?? "").slice(0, 1500)}`).join("\n\n");
    }

    // Extract count from command (default 5)
    const countMatch = command.match(/\b(\d+)\b/);
    const count = countMatch ? Math.min(parseInt(countMatch[1]), 20) : 5;

    const text = [command, docText].filter(Boolean).join("\n\n");
    const res = await apiGenerateFlashcards({ text, nCards: count, language: "en" });
    return (res.flashcards ?? []).map((c, i) =>
      apiToSoun(c, i, courseContext ?? "Voice Generated"),
    );
  }

  async startVoiceSession(
    userId: number,
    flashcards: Flashcard[],
    sessionType: "practice" | "review" | "challenge" = "practice",
    courseId?: string,
  ): Promise<{ sessionId: string; response: VoiceFlashcardResponse }> {
    const sessionId = `voice_session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const session: FlashcardSession = {
      id: sessionId,
      userId,
      courseId,
      flashcards: this.shuffleFlashcards(flashcards),
      currentIndex: 0,
      sessionStartTime: new Date(),
      correctAnswers: 0,
      totalAnswers: 0,
      sessionType,
      isVoiceSession: true,
    };
    this.activeSessions.set(sessionId, session);

    return {
      sessionId,
      response: {
        type: "instructions",
        content: `Starting your ${sessionType} session with ${flashcards.length} flashcards. Say "skip" to skip, "end session" to finish. Here's your first question:`,
        sessionStats: { current: 1, total: flashcards.length, correctCount: 0, accuracy: 0 },
        nextAction: "continue",
      },
    };
  }

  async processVoiceAnswer(
    sessionId: string,
    userAnswer: string,
  ): Promise<VoiceFlashcardResponse> {
    const session = this.activeSessions.get(sessionId);
    if (!session)
      return { type: "instructions", content: "Session not found. Please start a new session.", nextAction: "end" };

    const currentCard = session.flashcards[session.currentIndex];
    if (!currentCard) return this.endSession(sessionId);

    const cmd = userAnswer.toLowerCase().trim();
    if (cmd === "skip" || cmd === "next" || cmd === "pass") return this.skipCard(sessionId);
    if (cmd === "end session" || cmd === "stop" || cmd === "quit") return this.endSession(sessionId);
    if (cmd === "repeat" || cmd === "repeat question") return this.repeatQuestion(sessionId);

    if (!(currentCard as any).attemptCount) (currentCard as any).attemptCount = 0;
    (currentCard as any).attemptCount++;

    const evaluation = await this.evaluateAnswer(currentCard, userAnswer);
    let feedback = "";
    let shouldProceed = false;

    if (evaluation.isCorrect) {
      session.correctAnswers++;
      session.totalAnswers++;
      currentCard.correctCount++;
      currentCard.masteryLevel = Math.min(1, currentCard.masteryLevel + 0.1);
      const ok = ["Correct!", "Exactly right!", "Perfect!", "Great job!", "That's right!"];
      feedback = ok[Math.floor(Math.random() * ok.length)];
      if (evaluation.feedback?.length > 10) feedback += ` ${evaluation.feedback}`;
      shouldProceed = true;
    } else {
      currentCard.incorrectCount++;
      currentCard.masteryLevel = Math.max(0, currentCard.masteryLevel - 0.05);
      if ((currentCard as any).attemptCount === 1) {
        const prompts = ["Not quite. Want to give it another shot?", "That's not quite right. Try again?"];
        feedback = prompts[Math.floor(Math.random() * prompts.length)];
      } else if ((currentCard as any).attemptCount === 2) {
        feedback = "Still not quite. Think it through and try once more.";
      } else {
        session.totalAnswers++;
        feedback = `Here's how it works: ${currentCard.back}.`;
        if (evaluation.missingElements?.length) feedback += ` Missing: ${evaluation.missingElements.join(", ")}.`;
        shouldProceed = true;
      }
    }
    currentCard.lastReviewed = new Date();

    if (shouldProceed) {
      session.currentIndex++;
      if (session.currentIndex < session.flashcards.length)
        (session.flashcards[session.currentIndex] as any).attemptCount = 0;
    }

    if (shouldProceed && session.currentIndex >= session.flashcards.length) {
      const summary = this.endSession(sessionId);
      return {
        type: "feedback",
        content: `${feedback} ${summary.content}`,
        sessionStats: { current: session.currentIndex, total: session.flashcards.length, correctCount: session.correctAnswers, accuracy: session.totalAnswers > 0 ? session.correctAnswers / session.totalAnswers : 0 },
        nextAction: "end",
      };
    }

    const stats = {
      current: session.currentIndex + 1,
      total: session.flashcards.length,
      correctCount: session.correctAnswers,
      accuracy: session.totalAnswers > 0 ? session.correctAnswers / session.totalAnswers : 0,
    };

    if (shouldProceed) {
      const next = session.flashcards[session.currentIndex];
      return { type: "feedback", content: `${feedback} Ready for the next question? ${next.front}`, flashcard: next, sessionStats: stats, nextAction: "continue" };
    }
    return { type: "feedback", content: feedback, flashcard: currentCard, sessionStats: stats, nextAction: "continue" };
  }

  getNextQuestion(sessionId: string): VoiceFlashcardResponse {
    const session = this.activeSessions.get(sessionId);
    if (!session) return { type: "instructions", content: "Session not found.", nextAction: "end" };
    const card = session.flashcards[session.currentIndex];
    if (!card) return this.endSession(sessionId);
    return {
      type: "question",
      content: card.front,
      flashcard: card,
      sessionStats: { current: session.currentIndex + 1, total: session.flashcards.length, correctCount: session.correctAnswers, accuracy: session.totalAnswers > 0 ? session.correctAnswers / session.totalAnswers : 0 },
      nextAction: "continue",
    };
  }

  private async evaluateAnswer(
    flashcard: Flashcard,
    userAnswer: string,
  ): Promise<{ isCorrect: boolean; feedback: string; confidence: number; missingElements?: string[] }> {
    try {
      const apiCard: ApiFlashcard = {
        front: flashcard.front,
        back: flashcard.back,
        difficulty: flashcard.difficulty,
        source: flashcard.source ?? null,
      };
      const res = await apiEvaluateFlashcard(apiCard, userAnswer, "en");
      return {
        isCorrect: res.verdict === "PASS",
        feedback: res.feedback ?? "",
        confidence: res.score ?? 0.5,
        missingElements: [],
      };
    } catch {
      const isCorrect = this.simpleAnswerMatch(flashcard.back, userAnswer);
      return { isCorrect, feedback: isCorrect ? "Good job!" : "Not quite right.", confidence: 0.5 };
    }
  }

  getSessionStats(sessionId: string) {
    const s = this.activeSessions.get(sessionId);
    if (!s) return null;
    return { current: s.currentIndex + 1, total: s.flashcards.length, correctCount: s.correctAnswers, totalAnswers: s.totalAnswers, accuracy: s.totalAnswers > 0 ? s.correctAnswers / s.totalAnswers : 0, timeElapsed: Date.now() - s.sessionStartTime.getTime() };
  }

  // ── Local helpers ────────────────────────────────────────────────────────

  private simpleAnswerMatch(correct: string, user: string): boolean {
    const n = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, "").trim();
    const a = n(correct), b = n(user);
    return a === b || a.includes(b) || b.includes(a) || this.calcSim(a, b) > 0.7;
  }

  private calcSim(a: string, b: string): number {
    const w1 = a.split(" "), w2 = b.split(" ");
    return w1.filter((w) => w2.includes(w)).length / Math.max(w1.length, w2.length);
  }

  private skipCard(sessionId: string): VoiceFlashcardResponse {
    const s = this.activeSessions.get(sessionId)!;
    const card = s.flashcards[s.currentIndex];
    s.currentIndex++;
    s.totalAnswers++;
    if (s.currentIndex >= s.flashcards.length) return this.endSession(sessionId);
    const next = s.flashcards[s.currentIndex];
    return { type: "feedback", content: `Skipped. Answer: ${card.back}. Next: ${next.front}`, flashcard: next, sessionStats: { current: s.currentIndex + 1, total: s.flashcards.length, correctCount: s.correctAnswers, accuracy: s.totalAnswers > 0 ? s.correctAnswers / s.totalAnswers : 0 }, nextAction: "continue" };
  }

  private repeatQuestion(sessionId: string): VoiceFlashcardResponse {
    const s = this.activeSessions.get(sessionId)!;
    const card = s.flashcards[s.currentIndex];
    return { type: "question", content: `Let me repeat: ${card.front}`, flashcard: card, sessionStats: { current: s.currentIndex + 1, total: s.flashcards.length, correctCount: s.correctAnswers, accuracy: s.totalAnswers > 0 ? s.correctAnswers / s.totalAnswers : 0 }, nextAction: "continue" };
  }

  private endSession(sessionId: string): VoiceFlashcardResponse {
    const s = this.activeSessions.get(sessionId);
    if (!s) return { type: "summary", content: "Session already ended.", nextAction: "end" };
    const accuracy = s.totalAnswers > 0 ? s.correctAnswers / s.totalAnswers : 0;
    const duration = Math.round((Date.now() - s.sessionStartTime.getTime()) / 60000);
    const msg = accuracy >= 0.9 ? "Excellent work!" : accuracy >= 0.7 ? "Good job!" : accuracy >= 0.5 ? "Keep practicing!" : "Keep studying!";
    this.activeSessions.delete(sessionId);
    return { type: "summary", content: `Session complete! ${s.correctAnswers}/${s.totalAnswers} correct (${Math.round(accuracy * 100)}%) in ${duration} min. ${msg}`, sessionStats: { current: s.flashcards.length, total: s.flashcards.length, correctCount: s.correctAnswers, accuracy }, nextAction: "end" };
  }

  private shuffleFlashcards(cards: Flashcard[]): Flashcard[] {
    const a = [...cards];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

export const flashcardService = new FlashcardService();
