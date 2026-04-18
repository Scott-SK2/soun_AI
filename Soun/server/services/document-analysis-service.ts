/**
 * Document analysis service — delegates LLM calls to soun_AI FastAPI.
 * Content extraction (PDF, PPTX, Word) remains fully local.
 * Same public interface as before.
 */

import { apiSummarize, apiGenerateQuiz, apiVoiceCommand } from "./soun-ai-client";

// ── Interfaces (unchanged) ─────────────────────────────────────────────────

export interface DocumentAnalysis {
  summary: string;
  keyTopics: string[];
  learningObjectives: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedStudyTime: number;
  concepts: ConceptAnalysis[];
  questions: StudyQuestion[];
  prerequisites: string[];
  relatedTopics: string[];
  teachingPoints: TeachingPoint[];
}

export interface ConceptAnalysis {
  concept: string;
  definition: string;
  importance: "high" | "medium" | "low";
  examples: string[];
  applications: string[];
}

export interface StudyQuestion {
  question: string;
  type: "multiple-choice" | "short-answer" | "essay" | "practical";
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  answer?: string;
}

export interface TeachingPoint {
  point: string;
  explanation: string;
  examples: string[];
  commonMistakes: string[];
}

// ── Service class ──────────────────────────────────────────────────────────

export class DocumentAnalysisService {
  async analyzeDocument(
    content: string,
    filename: string,
    courseContext?: string,
  ): Promise<DocumentAnalysis> {
    const maxLen = 8000;
    let analysisContent = content;
    if (content.length > maxLen) {
      const half = Math.floor(maxLen / 2);
      analysisContent =
        content.slice(0, half) +
        `\n\n[... ${Math.round((content.length - maxLen) / 1000)}k additional characters ...]\n\n` +
        content.slice(content.length - half);
    }

    const source = courseContext ? `${filename} (${courseContext})` : filename;
    const result = await apiSummarize(analysisContent, source, "en");
    const summaryText = result.summary ?? "";

    // Generate study questions from content
    let questions: StudyQuestion[] = [];
    try {
      const qRes = await apiGenerateQuiz(filename, analysisContent.slice(0, 4000), 5, "med", "en");
      questions = (qRes.questions ?? []).map((q) => ({
        question: q.question,
        type: q.options?.length ? ("multiple-choice" as const) : ("short-answer" as const),
        difficulty: (q.difficulty as StudyQuestion["difficulty"]) ?? "medium",
        topic: filename,
        answer: q.options?.[q.correct_index] ?? "",
      }));
    } catch {
      // Non-blocking: continue without questions
    }

    // Parse summary into structured analysis
    const lines = summaryText.split("\n").filter((l) => l.trim());
    const keyTopics = lines
      .filter((l) => l.startsWith("-") || l.startsWith("•"))
      .map((l) => l.replace(/^[-•]\s*/, ""))
      .slice(0, 8);

    const formatted = this.buildFallbackAnalysis(filename, courseContext);
    return {
      ...formatted,
      summary: summaryText || formatted.summary,
      keyTopics: keyTopics.length ? keyTopics : formatted.keyTopics,
      questions,
    };
  }

  async extractAndAnalyze(
    fileBuffer: Buffer,
    fileType: string,
    filename: string,
    courseContext?: string,
  ): Promise<{ extractedContent: string; analysis: DocumentAnalysis }> {
    let extractedContent = "";

    try {
      switch (fileType) {
        case "application/pdf":
          extractedContent = await this.extractFromPDF(fileBuffer);
          break;
        case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        case "application/vnd.ms-powerpoint":
          extractedContent = await this.extractFromPowerPoint(fileBuffer);
          break;
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        case "application/msword":
          extractedContent = await this.extractFromWord(fileBuffer);
          break;
        case "image/jpeg":
        case "image/png":
        case "image/gif":
          extractedContent = await this.extractFromImage(fileBuffer, filename);
          break;
        default:
          try {
            extractedContent = fileBuffer.toString("utf-8");
          } catch {
            extractedContent = `Binary file: ${filename} (${fileType}, ${fileBuffer.length} bytes)`;
          }
      }

      let analysis: DocumentAnalysis;
      try {
        analysis = await this.analyzeDocument(extractedContent, filename, courseContext);
      } catch (err) {
        console.error("[document-analysis] analyzeDocument error:", err);
        analysis = this.buildFallbackAnalysis(filename, courseContext);
      }

      return { extractedContent, analysis };
    } catch (err) {
      console.error("[document-analysis] extractAndAnalyze error:", err);
      return {
        extractedContent: `File uploaded: ${filename}`,
        analysis: this.buildFallbackAnalysis(filename, courseContext),
      };
    }
  }

  async generateTeachingExplanation(
    documentContent: string,
    specificTopic: string,
    _studentLevel: "beginner" | "intermediate" | "advanced" = "intermediate",
  ): Promise<string> {
    const result = await apiVoiceCommand(
      `Explain "${specificTopic}" based on this content: ${documentContent.slice(0, 3000)}`,
      [],
      [],
      "en",
    );
    return result.response || "";
  }

  async generateStudyQuestions(
    documentContent: string,
    questionCount = 10,
    difficulty: "mixed" | "easy" | "medium" | "hard" = "mixed",
  ): Promise<StudyQuestion[]> {
    const diff = difficulty === "mixed" || difficulty === "medium" ? "med" : difficulty;
    const res = await apiGenerateQuiz("document study", documentContent.slice(0, 6000), questionCount, diff, "en");
    return (res.questions ?? []).map((q) => ({
      question: q.question,
      type: q.options?.length ? ("multiple-choice" as const) : ("short-answer" as const),
      difficulty: (q.difficulty as StudyQuestion["difficulty"]) ?? "medium",
      topic: "general",
      answer: q.options?.[q.correct_index] ?? "",
    }));
  }

  async generatePersonalizedExamples(
    topic: string,
    explanation: string,
    userProfile?: { name?: string; school?: string; program?: string; year?: string; interests?: string[] },
    documentContext?: string,
    exampleCount = 3,
  ): Promise<{
    examples: Array<{ title: string; description: string; context: string; difficulty: string; relevanceReason: string }>;
    personalizedNote?: string;
  }> {
    const profileDesc = userProfile
      ? `Student: ${userProfile.name ?? "Student"}, ${userProfile.program ?? "General"}, ${userProfile.year ?? ""}`
      : "";
    const prompt = `Generate ${exampleCount} real-world examples for topic: "${topic}". ${profileDesc}. Explanation: ${explanation.slice(0, 500)}. ${documentContext ? `Context: ${documentContext.slice(0, 500)}` : ""}`;

    const result = await apiVoiceCommand(prompt, [], [], "en");
    // Return a structured default since the voice command returns plain text
    return {
      examples: [
        { title: topic, description: result.response ?? explanation, context: profileDesc, difficulty: "intermediate", relevanceReason: "Based on course material" },
      ],
    };
  }

  // ── Local helpers (unchanged) ────────────────────────────────────────────

  private buildFallbackAnalysis(filename: string, courseContext?: string): DocumentAnalysis {
    return {
      summary: `File uploaded: ${filename}`,
      keyTopics: [courseContext ?? "uploaded-file"],
      learningObjectives: [`Study material for ${courseContext ?? "course"}`],
      difficulty: "intermediate",
      estimatedStudyTime: 30,
      concepts: [],
      questions: [],
      prerequisites: [],
      relatedTopics: [],
      teachingPoints: [],
    };
  }

  private async extractFromPDF(buffer: Buffer): Promise<string> {
    try {
      let text = buffer.toString("utf-8")
        .replace(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\/[A-Za-z]+\s+/g, " ")
        .replace(/\d+\s+\d+\s+obj/g, " ")
        .replace(/endobj/g, " ")
        .replace(/stream\s+.*?\s+endstream/gs, " ")
        .trim();
      if (text.length > 50000) {
        text = text.split(/[.!?]+/).filter((s) => s.trim().length > 20).slice(0, 200).join(". ") + ".";
      }
      return text.length > 50 ? text : "PDF content could not be extracted as text";
    } catch {
      return "PDF processing failed";
    }
  }

  private async extractFromPowerPoint(buffer: Buffer): Promise<string> {
    try {
      const content = buffer.toString("utf-8");
      const matches = content.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
      if (matches?.length) {
        let text = matches.map((m) => m.replace(/<[^>]+>/g, "").trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
        if (text.length > 30000) text = text.slice(0, 30000) + "...";
        return text || "No readable text found in PowerPoint";
      }
      return "PowerPoint structure not recognized";
    } catch {
      return "PowerPoint processing failed";
    }
  }

  private async extractFromWord(buffer: Buffer): Promise<string> {
    try {
      const content = buffer.toString("utf-8");
      const matches = content.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (matches) {
        return matches.map((m) => m.replace(/<[^>]+>/g, "")).join(" ").trim() || "Word document: no readable text";
      }
      return "Word document structure not recognized";
    } catch {
      return "Word document processing failed";
    }
  }

  private async extractFromImage(_buffer: Buffer, filename: string): Promise<string> {
    // Vision analysis requires saving the file and calling POST /vision/analyze.
    // Saving to a temp path and calling the FastAPI is done at the route level when needed.
    // Return a placeholder so uploads don't fail; vision features work via the /vision/analyze endpoint.
    return `Image file uploaded: ${filename}. Use the vision analysis feature to extract text content.`;
  }
}

export const documentAnalysisService = new DocumentAnalysisService();
