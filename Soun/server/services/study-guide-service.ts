
import OpenAI from "openai";
import { db } from "../db";
import { documents, courses } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable must be set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  difficulty: 'beginner' | 'intermediate' | 'advanced';
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
  importance: 'high' | 'medium' | 'low';
  relatedTerms: string[];
}

export interface PracticeQuestion {
  question: string;
  type: 'multiple-choice' | 'short-answer' | 'essay' | 'true-false';
  difficulty: 'easy' | 'medium' | 'hard';
  answer: string;
  explanation: string;
  sourceSection: string;
}

export interface DocumentAnnotation {
  id: string;
  documentId: number;
  userId: number;
  content: string;
  type: 'note' | 'question' | 'summary' | 'highlight';
  position?: {
    page?: number;
    paragraph?: number;
    startOffset?: number;
    endOffset?: number;
  };
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

export class StudyGuideService {
  /**
   * Generate a comprehensive study guide from multiple documents
   */
  async generateStudyGuide(
    userId: number,
    documentIds: number[],
    courseId?: string,
    customTitle?: string
  ): Promise<StudyGuide> {
    try {
      // Fetch documents and their content
      const documentsData = await db
        .select()
        .from(documents)
        .where(and(
          eq(documents.userId, userId),
          documents.id.in(documentIds)
        ));

      if (documentsData.length === 0) {
        throw new Error("No documents found for study guide generation");
      }

      // Combine document content
      const combinedContent = documentsData
        .map(doc => `Document: ${doc.title}\n${doc.content}`)
        .join('\n\n---\n\n');

      // Generate study guide using AI
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert study guide creator. Generate comprehensive, well-structured study guides that help students learn effectively. Create organized content with clear sections, key terms, and practice questions.`
          },
          {
            role: "user",
            content: `Create a comprehensive study guide from these documents:

${combinedContent}

Generate a study guide with:
1. Clear sections and subsections
2. Key terms with definitions
3. Important concepts and examples
4. Practice questions of various types
5. Summary of main points
6. Estimated study time

Format as JSON with the StudyGuide interface structure.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
      
      // Create study guide object
      const studyGuide: StudyGuide = {
        id: `sg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: customTitle || aiResponse.title || `Study Guide for ${documentsData.length} Documents`,
        courseId: courseId || documentsData[0]?.courseId || 'general',
        documentIds: documentIds,
        sections: aiResponse.sections || [],
        keyTerms: aiResponse.keyTerms || [],
        practiceQuestions: aiResponse.practiceQuestions || [],
        summary: aiResponse.summary || 'Generated study guide from uploaded materials',
        estimatedStudyTime: aiResponse.estimatedStudyTime || 60,
        difficulty: aiResponse.difficulty || 'intermediate',
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      return studyGuide;
    } catch (error) {
      console.error('Study guide generation error:', error);
      throw new Error('Failed to generate study guide');
    }
  }

  /**
   * Generate voice-activated annotations for documents
   */
  async createVoiceAnnotation(
    userId: number,
    documentId: number,
    voiceNote: string,
    position?: any,
    annotationType: 'note' | 'question' | 'summary' | 'highlight' = 'note'
  ): Promise<DocumentAnnotation> {
    try {
      // Convert voice note to structured annotation using AI
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert at converting voice notes into structured document annotations. Create clear, concise annotations that capture the intent and content of voice notes."
          },
          {
            role: "user",
            content: `Convert this voice note into a structured annotation:

Voice Note: "${voiceNote}"
Annotation Type: ${annotationType}

Create a clear, concise annotation that captures the key points and intent. If it's a question, ensure it's well-formulated. If it's a summary, make it comprehensive yet concise.`
          }
        ],
        temperature: 0.3,
      });

      const processedContent = response.choices[0].message.content || voiceNote;

      const annotation: DocumentAnnotation = {
        id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        documentId,
        userId,
        content: processedContent,
        type: annotationType,
        position,
        audioNote: voiceNote, // Store original voice note
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // In a real implementation, save to database
      // await db.insert(annotations).values(annotation);

      return annotation;
    } catch (error) {
      console.error('Voice annotation creation error:', error);
      throw new Error('Failed to create voice annotation');
    }
  }

  /**
   * Generate comprehensive summary for long documents
   */
  async generateDocumentSummary(
    documentId: number,
    maxLength: 'short' | 'medium' | 'long' = 'medium'
  ): Promise<DocumentSummary> {
    try {
      // Fetch document
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));

      if (!document) {
        throw new Error("Document not found");
      }

      const content = document.content;
      const originalWordCount = content.split(/\s+/).length;

      // Determine target length
      let targetWords: number;
      switch (maxLength) {
        case 'short':
          targetWords = Math.min(200, Math.floor(originalWordCount * 0.1));
          break;
        case 'medium':
          targetWords = Math.min(500, Math.floor(originalWordCount * 0.2));
          break;
        case 'long':
          targetWords = Math.min(1000, Math.floor(originalWordCount * 0.3));
          break;
      }

      // Generate summary using AI
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert at creating document summaries. Generate comprehensive yet concise summaries that capture the most important information, key points, and conclusions. Structure your response as JSON.`
          },
          {
            role: "user",
            content: `Create a ${maxLength} summary (approximately ${targetWords} words) of this document:

Document Title: ${document.title}
Content: ${content}

Structure the summary with:
1. Executive summary (main points)
2. Key points (bullet format)
3. Main topics covered
4. Conclusions and takeaways
5. Action items (if applicable)

Return as JSON with the DocumentSummary structure.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
      
      const summary: DocumentSummary = {
        documentId,
        title: document.title,
        executiveSummary: aiResponse.executiveSummary || 'Summary not available',
        keyPoints: aiResponse.keyPoints || [],
        mainTopics: aiResponse.mainTopics || [],
        conclusions: aiResponse.conclusions || [],
        actionItems: aiResponse.actionItems || [],
        readingTime: Math.ceil(originalWordCount / 200), // Assuming 200 WPM
        compressionRatio: originalWordCount > 0 ? 
          (aiResponse.executiveSummary?.split(/\s+/).length || 0) / originalWordCount : 0,
        generatedAt: new Date()
      };

      return summary;
    } catch (error) {
      console.error('Document summary generation error:', error);
      throw new Error('Failed to generate document summary');
    }
  }

  /**
   * Generate study guide from voice commands
   */
  async generateVoiceStudyGuide(
    userId: number,
    voiceCommand: string,
    courseContext?: string
  ): Promise<StudyGuide | null> {
    try {
      // Parse voice command to understand what documents to include
      const parseResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Parse voice commands to understand study guide generation requests. Extract key information about what documents or topics to include."
          },
          {
            role: "user",
            content: `Parse this voice command for study guide generation:

Command: "${voiceCommand}"
Course Context: ${courseContext || 'general'}

Determine:
1. What documents or topics to include
2. Study guide focus areas
3. Difficulty level preference
4. Any special requirements

Return as JSON with parsed information.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const parsedCommand = JSON.parse(parseResponse.choices[0].message.content || '{}');

      // Get relevant documents based on parsed command
      let relevantDocs = [];
      if (courseContext) {
        relevantDocs = await db
          .select()
          .from(documents)
          .where(and(
            eq(documents.userId, userId),
            eq(documents.courseId, courseContext)
          ))
          .limit(5); // Limit to avoid token overflow
      }

      if (relevantDocs.length === 0) {
        return null;
      }

      // Generate study guide
      const documentIds = relevantDocs.map(doc => doc.id);
      return await this.generateStudyGuide(
        userId,
        documentIds,
        courseContext,
        parsedCommand.title
      );
    } catch (error) {
      console.error('Voice study guide generation error:', error);
      throw new Error('Failed to generate study guide from voice command');
    }
  }
}

export const studyGuideService = new StudyGuideService();
