import OpenAI from 'openai';
import { storage } from '../storage';

interface SearchResult {
  documentId: number;
  title: string;
  filename: string;
  courseId: string;
  relevantContent: string;
  relevanceScore: number;
  summary: string;
}

interface CrossFileSearchResult {
  query: string;
  totalDocuments: number;
  relevantDocuments: SearchResult[];
  synthesizedAnswer: string;
  sources: string[];
}

class CrossFileSearchService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required for cross-file search');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Search across all user's documents for relevant information
   */
  async searchAcrossFiles(
    userId: number, 
    query: string, 
    courseId?: string,
    maxResults: number = 5
  ): Promise<CrossFileSearchResult> {
    try {
      // Get documents based on scope (course-specific or all)
      const documents = courseId 
        ? await storage.getDocumentsByCourse(userId, courseId)
        : await this.getAllUserDocuments(userId);

      if (documents.length === 0) {
        return {
          query,
          totalDocuments: 0,
          relevantDocuments: [],
          synthesizedAnswer: "No documents found to search through.",
          sources: []
        };
      }

      // Analyze each document for relevance to the query
      const relevantDocuments = await this.findRelevantDocuments(documents, query, maxResults);

      // Synthesize an answer from the most relevant documents
      const synthesizedAnswer = await this.synthesizeAnswer(query, relevantDocuments);

      return {
        query,
        totalDocuments: documents.length,
        relevantDocuments,
        synthesizedAnswer,
        sources: relevantDocuments.map(doc => `${doc.filename} (${doc.courseId})`)
      };

    } catch (error) {
      console.error('Cross-file search error:', error);
      return {
        query,
        totalDocuments: 0,
        relevantDocuments: [],
        synthesizedAnswer: "Search temporarily unavailable. Please try again.",
        sources: []
      };
    }
  }

  /**
   * Get all documents for a user across all courses
   */
  private async getAllUserDocuments(userId: number) {
    // Get all courses for the user first
    const courses = await storage.getCourses(userId);
    const allDocuments = [];

    for (const course of courses) {
      const courseDocuments = await storage.getDocumentsByCourse(userId, course.courseId);
      allDocuments.push(...courseDocuments);
    }

    return allDocuments;
  }

  /**
   * Analyze documents for relevance to the search query
   */
  private async findRelevantDocuments(
    documents: any[], 
    query: string, 
    maxResults: number
  ): Promise<SearchResult[]> {
    const relevantDocs: SearchResult[] = [];

    for (const doc of documents) {
      if (!doc.content) continue;

      try {
        // Use OpenAI to determine relevance and extract relevant content
        const relevanceAnalysis = await this.analyzeDocumentRelevance(doc, query);
        
        if (relevanceAnalysis.relevanceScore > 0.3) { // Threshold for relevance
          relevantDocs.push({
            documentId: doc.id,
            title: doc.title,
            filename: doc.filename,
            courseId: doc.courseId,
            relevantContent: relevanceAnalysis.relevantContent,
            relevanceScore: relevanceAnalysis.relevanceScore,
            summary: relevanceAnalysis.summary
          });
        }
      } catch (error) {
        console.error(`Error analyzing document ${doc.id}:`, error);
        // Fallback to simple text matching
        if (this.simpleTextMatch(doc.content, query)) {
          relevantDocs.push({
            documentId: doc.id,
            title: doc.title,
            filename: doc.filename,
            courseId: doc.courseId,
            relevantContent: this.extractRelevantText(doc.content, query),
            relevanceScore: 0.5,
            summary: `Content from ${doc.filename}`
          });
        }
      }
    }

    // Sort by relevance score and return top results
    return relevantDocs
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  /**
   * Use AI to analyze document relevance to the query
   */
  private async analyzeDocumentRelevance(document: any, query: string) {
    const prompt = `
Analyze this document content for relevance to the query: "${query}"

Document: ${document.filename}
Course: ${document.courseId}
Content: ${document.content.substring(0, 2000)}

Please provide:
1. Relevance score (0.0 to 1.0)
2. Most relevant content excerpt (max 300 words)
3. Brief summary of how this document relates to the query

Format as JSON:
{
  "relevanceScore": 0.8,
  "relevantContent": "specific relevant text...",
  "summary": "explanation of relevance..."
}
`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500
    });

    return JSON.parse(response.choices[0].message.content || '{"relevanceScore": 0, "relevantContent": "", "summary": ""}');
  }

  /**
   * Synthesize a comprehensive answer from multiple relevant documents
   */
  private async synthesizeAnswer(query: string, relevantDocuments: SearchResult[]): Promise<string> {
    if (relevantDocuments.length === 0) {
      return "No relevant information found in the uploaded documents.";
    }

    try {
      const documentSummaries = relevantDocuments.map(doc => 
        `**${doc.filename}** (${doc.courseId}): ${doc.relevantContent}`
      ).join('\n\n');

      const prompt = `
Based on the following information from multiple course documents, provide a comprehensive answer to: "${query}"

Available Information:
${documentSummaries}

Please:
1. Synthesize information from multiple sources when possible
2. Clearly indicate which source(s) support each point
3. Highlight any contradictions or differences between sources
4. Provide a clear, educational response
5. If information is incomplete, mention what additional details might be helpful

Answer:`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800
      });

      return response.choices[0].message.content || "Unable to synthesize answer from documents.";

    } catch (error) {
      console.error('Error synthesizing answer:', error);
      // Fallback to simple concatenation
      return relevantDocuments.map(doc => 
        `From ${doc.filename}: ${doc.summary}`
      ).join('\n\n');
    }
  }

  /**
   * Simple text matching fallback
   */
  private simpleTextMatch(content: string, query: string): boolean {
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    const contentLower = content.toLowerCase();
    
    return queryWords.some(word => contentLower.includes(word));
  }

  /**
   * Extract relevant text around query matches
   */
  private extractRelevantText(content: string, query: string): string {
    const queryWords = query.toLowerCase().split(' ');
    const sentences = content.split(/[.!?]+/);
    
    const relevantSentences = sentences.filter(sentence => 
      queryWords.some(word => sentence.toLowerCase().includes(word))
    );

    return relevantSentences.slice(0, 3).join('. ').substring(0, 300) + '...';
  }

  /**
   * Find documents that reference specific topics across courses
   */
  async findTopicAcrossFiles(
    userId: number,
    topic: string,
    excludeCourseId?: string
  ): Promise<SearchResult[]> {
    const searchQuery = `information about ${topic}`;
    const result = await this.searchAcrossFiles(userId, searchQuery);
    
    // Filter out excluded course if specified
    if (excludeCourseId) {
      result.relevantDocuments = result.relevantDocuments.filter(
        doc => doc.courseId !== excludeCourseId
      );
    }

    return result.relevantDocuments;
  }
}

export const crossFileSearchService = new CrossFileSearchService();