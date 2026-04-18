/**
 * Study guide service — delegates LLM calls to soun_AI FastAPI.
 * DB queries and response building remain local.
 * Same public interface as before.
 */

import { db } from "../db";
import { documents } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { apiStudyGuide, apiSummarize, apiVoiceAnnotate } from "./soun-ai-client";

// ── Interfaces (unchanged) ─────────────────────────────────────────────────

export interface StudyGuide {
  id: string;
  title: string;
  courseId: string;
  documentIds: number[];
  sections: StudyGuideSection[];
  keyTerms: KeyTerm[];
  practiceQuestions: PracticeQuestion[];
  summary: string;
  estimatedStudyTime: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  createdAt: Date;
  lastUpdated: Date;
}

export interface StudyGuideSection {
  title: string;
  content: string;
  subsections?: StudyGuideSubsection[];
  keyPoints: string[];
  examples: string[];
  relatedConcepts: string[];
}

export interface StudyGuideSubsection {
  title: string;
  content: string;
  keyPoints: string[];
}

export interface KeyTerm {
  term: string;
  definition: string;
  context: string;
  importance: "high" | "medium" | "low";
  relatedTerms: string[];
}

export interface PracticeQuestion {
  question: string;
  type: "multiple-choice" | "short-answer" | "essay" | "true-false";
  difficulty: "easy" | "medium" | "hard";
  answer: string;
  explanation: string;
  sourceSection: string;
}

export interface DocumentAnnotation {
  id: string;
  documentId: number;
  userId: number;
  content: string;
  type: "note" | "question" | "summary" | "highlight";
  position?: { page?: number; paragraph?: number; startOffset?: number; endOffset?: number };
  audioNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentSummary {
  documentId: number;
  title: string;
  executiveSummary: string;
  keyPoints: string[];
  mainTopics: string[];
  conclusions: string[];
  actionItems?: string[];
  readingTime: number;
  compressionRatio: number;
  generatedAt: Date;
}

// ── Service class ──────────────────────────────────────────────────────────

export class StudyGuideService {
  async generateStudyGuide(
    userId: number,
    documentIds: number[],
    courseId?: string,
    customTitle?: string,
  ): Promise<StudyGuide> {
    const docs = await db
      .select()
      .from(documents)
      .where(and(eq(documents.userId, userId), documents.id.in(documentIds)));

    if (!docs.length) throw new Error("No documents found for study guide generation");

    const courseName = customTitle || `Study Guide (${docs.length} document${docs.length > 1 ? "s" : ""})`;

    // Build a lightweight concept list from document titles + content excerpts
    const concepts = docs.map((d) => ({
      title: d.title,
      definition: (d.content ?? "").slice(0, 400),
      key_points: [],
    }));

    const guide = await apiStudyGuide(concepts, courseName, "en");

    const sections: StudyGuideSection[] = (guide.sections ?? []).map((s) => ({
      title: s.heading,
      content: s.content,
      keyPoints: s.key_points ?? [],
      examples: [],
      relatedConcepts: [],
    }));

    const practiceQuestions: PracticeQuestion[] = (guide.exam_tips ?? []).map((tip) => ({
      question: tip,
      type: "short-answer",
      difficulty: "medium",
      answer: "",
      explanation: "",
      sourceSection: "",
    }));

    return {
      id: `sg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      title: guide.title || courseName,
      courseId: courseId ?? docs[0]?.courseId ?? "general",
      documentIds,
      sections,
      keyTerms: [],
      practiceQuestions,
      summary: guide.summary ?? "",
      estimatedStudyTime: 60,
      difficulty: "intermediate",
      createdAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  async createVoiceAnnotation(
    userId: number,
    documentId: number,
    voiceNote: string,
    position?: DocumentAnnotation["position"],
    annotationType: DocumentAnnotation["type"] = "note",
  ): Promise<DocumentAnnotation> {
    const result = await apiVoiceAnnotate("", 0, voiceNote, "en");
    const processedContent = result.annotation || voiceNote;

    return {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      documentId,
      userId,
      content: processedContent,
      type: annotationType,
      position,
      audioNote: voiceNote,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async generateDocumentSummary(
    documentId: number,
    maxLength: "short" | "medium" | "long" = "medium",
  ): Promise<DocumentSummary> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) throw new Error("Document not found");

    const content = doc.content ?? "";
    const wordCount = content.split(/\s+/).length;

    const result = await apiSummarize(content.slice(0, 8000), doc.title, "en");
    const summaryText = result.summary ?? "";
    const summaryWords = summaryText.split(/\s+/);

    // Parse summary into structured sections (split on newlines)
    const lines = summaryText.split("\n").filter((l) => l.trim());
    const keyPoints = lines.filter((l) => l.startsWith("-") || l.startsWith("•")).map((l) => l.replace(/^[-•]\s*/, ""));
    const mainTopics = lines.filter((l) => /^\d+\./.test(l)).map((l) => l.replace(/^\d+\.\s*/, ""));

    return {
      documentId,
      title: doc.title,
      executiveSummary: lines[0] ?? summaryText.slice(0, 300),
      keyPoints: keyPoints.length ? keyPoints : [summaryText.slice(0, 200)],
      mainTopics: mainTopics.length ? mainTopics : [doc.title],
      conclusions: lines.slice(-2).filter((l) => l.length > 20),
      actionItems: [],
      readingTime: Math.ceil(wordCount / 200),
      compressionRatio: wordCount > 0 ? summaryWords.length / wordCount : 0,
      generatedAt: new Date(),
    };
  }

  async generateVoiceStudyGuide(
    userId: number,
    voiceCommand: string,
    courseContext?: string,
  ): Promise<StudyGuide | null> {
    if (!courseContext) return null;

    const docs = await db
      .select()
      .from(documents)
      .where(and(eq(documents.userId, userId), eq(documents.courseId, courseContext)))
      .limit(5);

    if (!docs.length) return null;

    const ids = docs.map((d) => d.id);
    return this.generateStudyGuide(userId, ids, courseContext);
  }
}

export const studyGuideService = new StudyGuideService();
