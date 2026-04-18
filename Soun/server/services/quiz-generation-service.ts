/**
 * Quiz generation service — delegates LLM calls to soun_AI FastAPI.
 * Same public interface as before; no OpenAI SDK dependency.
 */

import { documentAnalysisService } from "./document-analysis-service";
import {
  apiGenerateQuiz,
  apiEvaluateQuiz,
  ApiQuizQuestion as ApiQ,
} from "./soun-ai-client";

// ── Interfaces (unchanged) ─────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  question: string;
  type: "multiple-choice" | "true-false" | "short-answer" | "explanation";
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  conceptTested: string;
  documentReference?: string;
}

export interface QuizResult {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  explanation: string;
  conceptMastery: number;
}

export interface ConceptAssessment {
  concept: string;
  masteryLevel: number;
  strengths: string[];
  weaknesses: string[];
  recommendedActions: string[];
}

// ── Format converters ──────────────────────────────────────────────────────

function apiToSoun(q: ApiQ, index: number): QuizQuestion {
  const options = q.options ?? [];
  const correct = options[q.correct_index] ?? "";
  const rawDiff = q.difficulty ?? "medium";
  const difficulty: "easy" | "medium" | "hard" =
    rawDiff === "easy" || rawDiff === "hard" ? rawDiff : "medium";
  return {
    id: `q_${Date.now()}_${index}`,
    question: q.question,
    type: options.length > 0 ? "multiple-choice" : "short-answer",
    options: options.length > 0 ? options : undefined,
    correctAnswer: correct,
    explanation: q.explanation ?? "",
    difficulty,
    conceptTested: "general",
  };
}

function sounToApi(q: QuizQuestion): ApiQ {
  const options = q.options ?? [];
  const correctIndex = Math.max(
    0,
    options.findIndex((o) => o === q.correctAnswer),
  );
  return {
    question: q.question,
    options,
    correct_index: correctIndex,
    explanation: q.explanation,
    difficulty: q.difficulty,
  };
}

// ── Service class ──────────────────────────────────────────────────────────

export class QuizGenerationService {
  async generatePostExplanationQuiz(
    explanationTopic: string,
    explanationContent: string,
    documentContext?: string,
    difficulty: "adaptive" | "easy" | "medium" | "hard" = "adaptive",
  ): Promise<QuizQuestion[]> {
    const diff = difficulty === "adaptive" ? "med" : difficulty === "medium" ? "med" : difficulty;
    const context = [explanationContent, documentContext].filter(Boolean).join("\n\n");
    const res = await apiGenerateQuiz(explanationTopic, context, 3, diff, "en");
    return (res.questions ?? []).map(apiToSoun);
  }

  async generateDocumentQuiz(
    _documentId: number,
    documentContent: string,
    concepts: string[],
    targetCount = 5,
    difficulty: "mixed" | "easy" | "medium" | "hard" = "mixed",
    subject?: string,
  ): Promise<QuizQuestion[]> {
    const topic = concepts.slice(0, 5).join(", ") || subject || "general";
    const diff = difficulty === "mixed" || difficulty === "medium" ? "med" : difficulty;
    const context = documentContent.slice(0, 6000);
    const res = await apiGenerateQuiz(topic, context, targetCount, diff, "en");
    const questions = (res.questions ?? []).map(apiToSoun);
    const isPracticeHeavy = this._isPracticeHeavySubject(subject, documentContent, concepts);
    return isPracticeHeavy ? this.ensureInterleavedOrder(questions) : questions;
  }

  async evaluateQuizAnswers(
    questions: QuizQuestion[],
    userAnswers: { questionId: string; answer: string }[],
  ): Promise<{
    results: QuizResult[];
    overallScore: number;
    conceptAssessments: ConceptAssessment[];
    recommendations: string[];
  }> {
    const apiQuestions = questions.map(sounToApi);
    // Map text answers to indices
    const studentAnswers = questions.map((q) => {
      const ua = userAnswers.find((a) => a.questionId === q.id)?.answer ?? "";
      const idx = (q.options ?? []).findIndex((o) => o === ua);
      return idx >= 0 ? idx : 0;
    });

    const res = await apiEvaluateQuiz(apiQuestions, studentAnswers, "en");
    const score = res.score ?? 0;

    const results: QuizResult[] = questions.map((q, i) => {
      const ua = userAnswers.find((a) => a.questionId === q.id)?.answer ?? "";
      const isCorrect = studentAnswers[i] === (apiQuestions[i].correct_index ?? 0);
      return {
        questionId: q.id,
        userAnswer: ua,
        isCorrect,
        explanation: q.explanation,
        conceptMastery: isCorrect ? 0.8 : 0.3,
      };
    });

    const passedConcepts = questions.filter((_, i) => results[i].isCorrect).map((q) => q.conceptTested);
    const failedConcepts = questions.filter((_, i) => !results[i].isCorrect).map((q) => q.conceptTested);
    const uniqueFailed = [...new Set(failedConcepts)];

    const conceptAssessments: ConceptAssessment[] = [
      ...new Set([...passedConcepts, ...failedConcepts]),
    ].map((c) => ({
      concept: c,
      masteryLevel: passedConcepts.includes(c) ? 0.8 : 0.3,
      strengths: passedConcepts.includes(c) ? ["Correct answer provided"] : [],
      weaknesses: failedConcepts.includes(c) ? ["Incorrect or incomplete answer"] : [],
      recommendedActions: failedConcepts.includes(c) ? [`Review concept: ${c}`] : [],
    }));

    return {
      results,
      overallScore: score,
      conceptAssessments,
      recommendations: uniqueFailed.map((c) => `Review and practice: ${c}`),
    };
  }

  async generateAdaptiveFollowUp(
    conceptAssessments: ConceptAssessment[],
    documentContext?: string,
  ): Promise<{
    reinforcementQuestions: QuizQuestion[];
    remedialExplanations: string[];
    advancedChallenges: QuizQuestion[];
  }> {
    const weak = conceptAssessments.filter((c) => c.masteryLevel < 0.7);
    const strong = conceptAssessments.filter((c) => c.masteryLevel > 0.8);
    const context = documentContext?.slice(0, 4000) ?? "";

    const [remedial, advanced] = await Promise.all([
      weak.length
        ? apiGenerateQuiz(weak.map((c) => c.concept).join(", "), context, 2, "easy", "en").then(
            (r) => (r.questions ?? []).map(apiToSoun),
          )
        : Promise.resolve([]),
      strong.length
        ? apiGenerateQuiz(strong.map((c) => c.concept).join(", "), context, 2, "hard", "en").then(
            (r) => (r.questions ?? []).map(apiToSoun),
          )
        : Promise.resolve([]),
    ]);

    return {
      reinforcementQuestions: remedial,
      remedialExplanations: weak.map((c) => `Review concept: ${c.concept}. ${c.weaknesses.join(". ")}`),
      advancedChallenges: advanced,
    };
  }

  async generateSelfTest(
    config: {
      selectedTopics: string[];
      difficulty: string;
      questionCount: number;
      testMode: string;
      includeVocalExplanations: boolean;
    },
    userDocuments: { title: string; content: string }[],
    weakAreas: string[],
  ): Promise<QuizQuestion[]> {
    const topics = config.testMode === "weak-areas" ? weakAreas : config.selectedTopics;
    const context = userDocuments.map((d) => `${d.title}: ${d.content.slice(0, 1000)}`).join("\n\n");
    const diff = config.difficulty === "medium" ? "med" : config.difficulty;
    const res = await apiGenerateQuiz(topics.join(", "), context, config.questionCount, diff, "en");
    return (res.questions ?? []).map(apiToSoun);
  }

  async evaluateSelfTest(
    questions: QuizQuestion[],
    userAnswers: { questionId: string; answer: string; confidence?: number; vocalExplanation?: string; timeSpent?: number }[],
    testConfig: { testMode: string; difficulty: string; includeVocalExplanations: boolean },
    totalTime: number,
  ): Promise<unknown> {
    const base = await this.evaluateQuizAnswers(questions, userAnswers);
    const correctAnswers = base.results.filter((r) => r.isCorrect).length;
    const avgConf =
      userAnswers.filter((a) => a.confidence).reduce((s, a) => s + (a.confidence ?? 0), 0) /
        (userAnswers.filter((a) => a.confidence).length || 1);

    return {
      ...base,
      correctAnswers,
      totalQuestions: questions.length,
      overallScore: correctAnswers / questions.length,
      averageConfidence: avgConf / 5,
      totalTimeMinutes: totalTime / 1000 / 60,
      testConfig,
    };
  }

  async generateInterleavedPracticeQuiz(
    subject: string,
    topics: string[],
    approaches: string[],
    targetCount = 8,
  ): Promise<QuizQuestion[]> {
    const topic = `${subject}: ${topics.join(", ")}`;
    const context = `Approaches: ${approaches.join(", ")}`;
    const res = await apiGenerateQuiz(topic, context, targetCount, "med", "en");
    return this.ensureInterleavedOrder((res.questions ?? []).map(apiToSoun));
  }

  // ── Local helpers (unchanged) ──────────────────────────────────────────

  private _isPracticeHeavySubject(
    subject?: string,
    content?: string,
    concepts?: string[],
  ): boolean {
    const heavy = ["mathematics", "physics", "chemistry", "engineering", "statistics", "computer science", "economics"];
    return heavy.some(
      (s) =>
        subject?.toLowerCase().includes(s) ||
        content?.toLowerCase().includes(s) ||
        concepts?.some((c) => c.toLowerCase().includes(s)),
    );
  }

  private ensureInterleavedOrder(questions: QuizQuestion[]): QuizQuestion[] {
    const methodKeywords = ["method", "approach", "technique", "strategy", "formula", "theorem"];
    const groups: Record<string, QuizQuestion[]> = {};
    const ungrouped: QuizQuestion[] = [];

    for (const q of questions) {
      const hasMethod = methodKeywords.some(
        (k) => q.question.toLowerCase().includes(k) || q.explanation.toLowerCase().includes(k),
      );
      if (hasMethod) {
        const m = q.explanation.match(/(method|approach|technique|formula|theorem)[\s:]?\s*([A-Za-z\s]+)/i);
        const key = m ? m[2].trim().slice(0, 20) : "general";
        (groups[key] ??= []).push(q);
      } else {
        ungrouped.push(q);
      }
    }

    const keys = Object.keys(groups);
    const interleaved: QuizQuestion[] = [];
    if (keys.length > 1) {
      const max = Math.max(...keys.map((k) => groups[k].length));
      for (let i = 0; i < max; i++) {
        for (const k of keys) {
          if (groups[k][i]) interleaved.push(groups[k][i]);
        }
      }
    } else {
      interleaved.push(...questions);
    }

    const result: QuizQuestion[] = [];
    let ui = 0;
    interleaved.forEach((q, idx) => {
      result.push(q);
      if ((idx + 1) % 3 === 0 && ui < ungrouped.length) result.push(ungrouped[ui++]);
    });
    while (ui < ungrouped.length) result.push(ungrouped[ui++]);
    return result;
  }
}

export const quizGenerationService = new QuizGenerationService();
