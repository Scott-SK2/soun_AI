import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable must be set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DocumentAnalysis {
  summary: string;
  keyTopics: string[];
  learningObjectives: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedStudyTime: number; // minutes
  concepts: ConceptAnalysis[];
  questions: StudyQuestion[];
  prerequisites: string[];
  relatedTopics: string[];
  teachingPoints: TeachingPoint[];
}

export interface ConceptAnalysis {
  concept: string;
  definition: string;
  importance: 'high' | 'medium' | 'low';
  examples: string[];
  applications: string[];
}

export interface StudyQuestion {
  question: string;
  type: 'multiple-choice' | 'short-answer' | 'essay' | 'practical';
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  answer?: string;
}

export interface TeachingPoint {
  point: string;
  explanation: string;
  examples: string[];
  commonMistakes: string[];
}

export class DocumentAnalysisService {
  /**
   * Analyzes document content for educational understanding
   */
  async analyzeDocument(
    content: string, 
    filename: string, 
    courseContext?: string
  ): Promise<DocumentAnalysis> {
    try {
      // Chunk content if it's too large (approximate token limit check)
      const maxContentLength = 8000; // Much more conservative limit for token safety
      let analysisContent = content;
      
      if (content.length > maxContentLength) {
        console.log(`Content too large (${content.length} chars), chunking for analysis`);
        // Take first part and summary for analysis
        const chunkSize = Math.floor(maxContentLength / 2);
        const firstChunk = content.substring(0, chunkSize);
        const lastChunk = content.substring(content.length - chunkSize);
        
        analysisContent = `${firstChunk}\n\n[... DOCUMENT CONTINUES - ${Math.round((content.length - maxContentLength)/1000)}k additional characters ...]\n\n${lastChunk}`;
      }

      const prompt = this.buildAnalysisPrompt(analysisContent, filename, courseContext);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert educational content analyst. Analyze documents to understand their educational value, extract key concepts, and prepare teaching materials. Always return valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      const formattedAnalysis = this.validateAndFormatAnalysis(analysis);
      
      // Add note about chunking if content was truncated
      if (content.length > maxContentLength) {
        formattedAnalysis.summary = `${formattedAnalysis.summary}\n\nNote: This analysis is based on key sections of a large document (${Math.round(content.length/1000)}k characters).`;
      }
      
      return formattedAnalysis;
    } catch (error) {
      console.error('Document analysis error:', error);
      throw new Error('Failed to analyze document content');
    }
  }

  /**
   * Extracts and analyzes content from different file types
   */
  async extractAndAnalyze(
    fileBuffer: Buffer, 
    fileType: string, 
    filename: string,
    courseContext?: string
  ): Promise<{ extractedContent: string; analysis: DocumentAnalysis }> {
    let extractedContent = '';

    try {
      // Extract content based on file type
      switch (fileType) {
        case 'application/pdf':
          extractedContent = await this.extractFromPDF(fileBuffer);
          break;
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        case 'application/vnd.ms-powerpoint':
          extractedContent = await this.extractFromPowerPoint(fileBuffer);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          extractedContent = await this.extractFromWord(fileBuffer);
          break;
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
          extractedContent = await this.extractFromImage(fileBuffer);
          break;
        case 'text/plain':
        case 'text/html':
        case 'text/css':
        case 'text/javascript':
        case 'application/javascript':
        case 'application/json':
        case 'text/markdown':
        case 'text/csv':
          extractedContent = fileBuffer.toString('utf-8');
          break;
        case 'application/rtf':
          extractedContent = fileBuffer.toString('utf-8');
          break;
        case 'application/xml':
        case 'text/xml':
          extractedContent = fileBuffer.toString('utf-8');
          break;
        default:
          // For any other file type, provide basic file information
          try {
            extractedContent = fileBuffer.toString('utf-8');
          } catch {
            extractedContent = `Binary file uploaded: ${filename}\nFile Type: ${fileType}\nFile Size: ${fileBuffer.length} bytes\nFile successfully stored and ready for course access.`;
          }
      }

      // Try to analyze the extracted content, but don't fail upload if analysis fails
      let analysis = null;
      try {
        analysis = await this.analyzeDocument(extractedContent, filename, courseContext);
      } catch (analysisError) {
        console.error('Document analysis error:', analysisError);
        // Continue without analysis - upload will still succeed
      }
      
      return { 
        extractedContent, 
        analysis: analysis || {
          keyTopics: [courseContext || 'uploaded-file'],
          learningObjectives: [`Study material for ${courseContext || 'course'}`],
          difficulty: 'intermediate' as const,
          estimatedStudyTime: 30,
          concepts: [],
          summary: `File uploaded: ${filename}`,
          questions: [],
          prerequisites: [],
          relatedTopics: [],
          teachingPoints: []
        } 
      };
    } catch (error) {
      console.error('Content extraction error:', error);
      // For any file type, provide basic fallback content
      const basicContent = `File uploaded: ${filename}\nFile Type: ${fileType}\nCourse: ${courseContext}\nContent analysis unavailable but file stored successfully.`;
      return { 
        extractedContent: basicContent, 
        analysis: {
          keyTopics: [courseContext || 'uploaded-file'],
          learningObjectives: [`Study material for ${courseContext || 'course'}`],
          difficulty: 'intermediate' as const,
          estimatedStudyTime: 15,
          concepts: [],
          summary: `Basic file upload: ${filename}`,
          questions: [],
          prerequisites: [],
          relatedTopics: [],
          teachingPoints: []
        }
      };
    }
  }

  /**
   * Generates teaching explanations for specific topics from the document
   */
  async generateTeachingExplanation(
    documentContent: string,
    specificTopic: string,
    studentLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert educator. Explain concepts clearly and thoroughly for ${studentLevel} level students. Use examples, analogies, and step-by-step breakdowns when helpful.`
          },
          {
            role: "user",
            content: `Based on this document content, please explain "${specificTopic}" in detail:

${documentContent}

Provide a comprehensive explanation that helps students understand this topic thoroughly.`
          }
        ],
        temperature: 0.4,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Teaching explanation error:', error);
      throw new Error('Failed to generate teaching explanation');
    }
  }

  /**
   * Creates study questions based on document content
   */
  async generateStudyQuestions(
    documentContent: string,
    questionCount: number = 10,
    difficulty: 'mixed' | 'easy' | 'medium' | 'hard' = 'mixed'
  ): Promise<StudyQuestion[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert educator creating study questions. Generate diverse, educational questions that test understanding, application, and critical thinking. Return valid JSON."
          },
          {
            role: "user",
            content: `Create ${questionCount} study questions based on this content. Difficulty level: ${difficulty}

Content: ${documentContent}

Return JSON with array of questions, each having: question, type, difficulty, topic, and answer fields.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
      return result.questions || [];
    } catch (error) {
      console.error('Question generation error:', error);
      throw new Error('Failed to generate study questions');
    }
  }

  /**
   * Generates personalized examples for explanations
   */
  async generatePersonalizedExamples(
    topic: string,
    explanation: string,
    userProfile?: {
      name?: string;
      school?: string;
      program?: string;
      year?: string;
      interests?: string[];
    },
    documentContext?: string,
    exampleCount: number = 3
  ): Promise<{
    examples: Array<{
      title: string;
      description: string;
      context: string;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      relevanceReason: string;
    }>;
    personalizedNote?: string;
  }> {
    try {
      // Build personalization context
      let personalizationContext = '';
      if (userProfile) {
        personalizationContext = `
Student Profile:
- Name: ${userProfile.name || 'Student'}
- School: ${userProfile.school || 'University'}
- Program: ${userProfile.program || 'General Studies'}
- Academic Year: ${userProfile.year || 'Current'}
${userProfile.interests ? `- Interests: ${userProfile.interests.join(', ')}` : ''}

Please create examples that relate to their academic background and potential interests.`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert educator who creates personalized, relatable examples to help students understand concepts. Create examples that connect abstract concepts to real-world applications, especially those relevant to the student's background and interests. Always return valid JSON.`
          },
          {
            role: "user",
            content: `Generate ${exampleCount} personalized examples to illustrate this topic: "${topic}"

Explanation Given: ${explanation}

${personalizationContext}

${documentContext ? `Document Context: ${documentContext.substring(0, 1500)}` : ''}

Create examples that:
1. Relate to the student's academic program and background
2. Use real-world scenarios they might encounter
3. Progress from simple to more complex applications
4. Connect to their potential career interests
5. Are practical and memorable

Return JSON format:
{
  "examples": [
    {
      "title": "Brief, catchy title",
      "description": "Detailed example explanation",
      "context": "Why this example relates to the student",
      "difficulty": "beginner|intermediate|advanced",
      "relevanceReason": "Why this is relevant to their background"
    }
  ],
  "personalizedNote": "Optional personal message explaining the connection"
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"examples": []}');
      return {
        examples: result.examples || [],
        personalizedNote: result.personalizedNote
      };
    } catch (error) {
      console.error('Example generation error:', error);
      throw new Error('Failed to generate personalized examples');
    }
  }

  private buildAnalysisPrompt(content: string, filename: string, courseContext?: string): string {
    return `Analyze this educational document for comprehensive understanding:

Filename: ${filename}
${courseContext ? `Course Context: ${courseContext}` : ''}

Content: ${content}

Provide a thorough analysis including:
1. Summary of main content
2. Key topics and concepts
3. Learning objectives
4. Difficulty level assessment
5. Estimated study time (in minutes)
6. Detailed concept analysis with definitions, importance, examples
7. Study questions of various types
8. Prerequisites needed
9. Related topics for further study
10. Teaching points with explanations and common mistakes

Return as JSON matching the DocumentAnalysis interface structure.`;
  }

  private validateAndFormatAnalysis(analysis: any): DocumentAnalysis {
    // Ensure all required fields exist with defaults
    return {
      summary: analysis.summary || 'No summary available',
      keyTopics: Array.isArray(analysis.keyTopics) ? analysis.keyTopics : [],
      learningObjectives: Array.isArray(analysis.learningObjectives) ? analysis.learningObjectives : [],
      difficulty: ['beginner', 'intermediate', 'advanced'].includes(analysis.difficulty) 
        ? analysis.difficulty : 'intermediate',
      estimatedStudyTime: typeof analysis.estimatedStudyTime === 'number' 
        ? analysis.estimatedStudyTime : 30,
      concepts: Array.isArray(analysis.concepts) ? analysis.concepts : [],
      questions: Array.isArray(analysis.questions) ? analysis.questions : [],
      prerequisites: Array.isArray(analysis.prerequisites) ? analysis.prerequisites : [],
      relatedTopics: Array.isArray(analysis.relatedTopics) ? analysis.relatedTopics : [],
      teachingPoints: Array.isArray(analysis.teachingPoints) ? analysis.teachingPoints : []
    };
  }

  private async extractFromPDF(buffer: Buffer): Promise<string> {
    try {
      const text = buffer.toString('utf-8');
      // Extract readable content by filtering out binary data and common PDF artifacts
      let readable = text.replace(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g, ' ')
                        .replace(/\s+/g, ' ')
                        .replace(/\/[A-Za-z]+\s+/g, ' ') // Remove PDF commands
                        .replace(/\d+\s+\d+\s+obj/g, ' ') // Remove PDF object markers
                        .replace(/endobj/g, ' ')
                        .replace(/stream\s+.*?\s+endstream/gs, ' ') // Remove stream data
                        .trim();
      
      // If content is too long, focus on the most readable parts
      if (readable.length > 50000) {
        const sentences = readable.split(/[.!?]+/).filter(s => s.trim().length > 20);
        readable = sentences.slice(0, 200).join('. ') + '.';
      }
      
      return readable.length > 50 ? readable : "PDF content could not be extracted as text";
    } catch (error) {
      return "PDF processing failed - binary content detected";
    }
  }

  private async extractFromPowerPoint(buffer: Buffer): Promise<string> {
    try {
      const content = buffer.toString('utf-8');
      // Extract text patterns commonly found in PowerPoint XML
      const textMatches = content.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
      if (textMatches && textMatches.length > 0) {
        let extractedText = textMatches
          .map(match => match.replace(/<[^>]+>/g, '').trim())
          .filter(text => text.length > 0)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        // If content is very long, limit it to prevent token issues
        if (extractedText.length > 30000) {
          extractedText = extractedText.substring(0, 30000) + '...';
        }
        
        return extractedText || "PowerPoint slides processed but no readable text found";
      }
      
      // Try alternative PowerPoint text patterns
      const altMatches = content.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (altMatches && altMatches.length > 0) {
        const altText = altMatches
          .map(match => match.replace(/<[^>]+>/g, '').trim())
          .filter(text => text.length > 0)
          .join(' ')
          .trim();
        return altText || "PowerPoint content structure not recognized";
      }
      
      return "PowerPoint content structure not recognized";
    } catch (error) {
      return "PowerPoint processing failed";
    }
  }

  private async extractFromWord(buffer: Buffer): Promise<string> {
    try {
      // Word documents are also ZIP archives with XML content
      const content = buffer.toString('utf-8');
      // Extract text from Word document XML structure
      const textMatches = content.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (textMatches) {
        const extractedText = textMatches
          .map(match => match.replace(/<[^>]+>/g, ''))
          .join(' ')
          .trim();
        return extractedText || "Word document processed but no readable text found";
      }
      return "Word document structure not recognized";
    } catch (error) {
      return "Word document processing failed";
    }
  }

  private async extractFromImage(buffer: Buffer): Promise<string> {
    try {
      // Use OpenAI Vision API for image content extraction
      const base64Image = buffer.toString('base64');
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text content from this image. If it contains educational material, describe the content, diagrams, formulas, or any visual elements that would be important for learning."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Image extraction error:', error);
      return "Could not extract content from image";
    }
  }
}

export const documentAnalysisService = new DocumentAnalysisService();