
import OpenAI from "openai";
import { db } from "../db";
import { documents, courses } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { and } from "drizzle-orm";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable must be set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  source?: string; // document or manual creation
  lastReviewed?: Date;
  correctCount: number;
  incorrectCount: number;
  masteryLevel: number; // 0-1 scale
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
  sessionType: 'practice' | 'review' | 'challenge';
  isVoiceSession: boolean;
}

export interface VoiceFlashcardResponse {
  type: 'question' | 'feedback' | 'summary' | 'instructions';
  content: string;
  flashcard?: Flashcard;
  sessionStats?: {
    current: number;
    total: number;
    correctCount: number;
    accuracy: number;
  };
  nextAction?: 'continue' | 'end' | 'repeat';
}

export class FlashcardService {
  private activeSessions: Map<string, FlashcardSession> = new Map();

  /**
   * Generate flashcards from document content
   */
  async generateFlashcardsFromDocument(
    documentId: number,
    userId: number,
    count: number = 10
  ): Promise<Flashcard[]> {
    try {
      // Get document content
      const document = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
        .limit(1);

      if (!document.length) {
        throw new Error('Document not found');
      }

      const doc = document[0];
      const content = doc.content || '';

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert educator creating flashcards for effective spaced repetition learning. Create clear, concise flashcards that test understanding, not just memorization."
          },
          {
            role: "user",
            content: `Create ${count} flashcards from this document content:

Document: ${doc.title}
Content: ${content.substring(0, 8000)} ${content.length > 8000 ? '...' : ''}

Guidelines:
1. Create questions that test understanding, application, and recall
2. Keep questions clear and specific
3. Provide concise but complete answers
4. Vary difficulty levels (easy, medium, hard)
5. Include different question types (definitions, applications, comparisons)
6. Focus on key concepts and important details

Return as JSON with flashcards array containing: front (question), back (answer), difficulty, category.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"flashcards": []}');
      return this.validateFlashcards(result.flashcards || [], doc.title);
    } catch (error) {
      console.error('Flashcard generation error:', error);
      throw new Error('Failed to generate flashcards from document');
    }
  }

  /**
   * Generate flashcards from voice command
   */
  async generateFlashcardsFromVoiceCommand(
    userId: number,
    command: string,
    courseContext?: string
  ): Promise<Flashcard[]> {
    try {
      // Parse the voice command to understand what flashcards to create
      const parseResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Parse voice commands for flashcard creation. Extract topics, difficulty preferences, and count."
          },
          {
            role: "user",
            content: `Parse this voice command: "${command}"

Course context: ${courseContext || 'general'}

Extract:
1. Topics to create flashcards about
2. Number of cards requested (default 5)
3. Difficulty preference (easy/medium/hard/mixed)
4. Any specific requirements

Return as JSON with parsed information.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const parsedCommand = JSON.parse(parseResponse.choices[0].message.content || '{}');
      
      // Get relevant documents if course context is provided
      let documentContent = '';
      if (courseContext) {
        const relevantDocs = await db
          .select()
          .from(documents)
          .where(and(
            eq(documents.userId, userId),
            eq(documents.courseId, courseContext)
          ))
          .limit(3);

        documentContent = relevantDocs
          .map(doc => `${doc.title}: ${doc.content?.substring(0, 2000)}`)
          .join('\n\n');
      }

      // Generate flashcards based on parsed command
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Create educational flashcards based on user requests. Focus on effective learning and spaced repetition principles."
          },
          {
            role: "user",
            content: `Create ${parsedCommand.count || 5} flashcards about: ${parsedCommand.topics || 'general study topics'}

Difficulty: ${parsedCommand.difficulty || 'mixed'}
Course Context: ${courseContext || 'general'}

${documentContent ? `Reference Materials:\n${documentContent}` : ''}

Create flashcards that:
1. Test important concepts and understanding
2. Are appropriate for the specified difficulty level
3. Include varied question types
4. Help with active recall and comprehension

Return as JSON with flashcards array.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"flashcards": []}');
      return this.validateFlashcards(result.flashcards || [], parsedCommand.topics || 'Voice Generated');
    } catch (error) {
      console.error('Voice flashcard generation error:', error);
      throw new Error('Failed to generate flashcards from voice command');
    }
  }

  /**
   * Start a voice flashcard session
   */
  async startVoiceSession(
    userId: number,
    flashcards: Flashcard[],
    sessionType: 'practice' | 'review' | 'challenge' = 'practice',
    courseId?: string
  ): Promise<{ sessionId: string; response: VoiceFlashcardResponse }> {
    const sessionId = `voice_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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
      isVoiceSession: true
    };

    this.activeSessions.set(sessionId, session);

    const response: VoiceFlashcardResponse = {
      type: 'instructions',
      content: `Starting your ${sessionType} session with ${flashcards.length} flashcards. I'll ask you questions, and you can answer with your voice. Say "skip" to move to the next card, or "end session" to finish. Ready? Here's your first question:`,
      sessionStats: {
        current: 1,
        total: flashcards.length,
        correctCount: 0,
        accuracy: 0
      },
      nextAction: 'continue'
    };

    return { sessionId, response };
  }

  /**
   * Process voice answer in flashcard session
   */
  async processVoiceAnswer(
    sessionId: string,
    userAnswer: string
  ): Promise<VoiceFlashcardResponse> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        type: 'instructions',
        content: "I couldn't find your session. Please start a new flashcard session.",
        nextAction: 'end'
      };
    }

    const currentCard = session.flashcards[session.currentIndex];
    if (!currentCard) {
      return this.endSession(sessionId);
    }

    // Handle special commands
    const command = userAnswer.toLowerCase().trim();
    if (command === 'skip' || command === 'next' || command === 'pass') {
      return this.skipCard(sessionId);
    }
    if (command === 'end session' || command === 'stop' || command === 'quit') {
      return this.endSession(sessionId);
    }
    if (command === 'repeat' || command === 'repeat question') {
      return this.repeatQuestion(sessionId);
    }

    // Initialize attempt tracking for this card if not exists
    if (!(currentCard as any).attemptCount) {
      (currentCard as any).attemptCount = 0;
    }
    
    (currentCard as any).attemptCount++;
    
    const evaluation = await this.evaluateAnswer(currentCard, userAnswer);
    
    let feedback = "";
    let shouldProceed = false;
    
    if (evaluation.isCorrect) {
      session.correctAnswers++;
      session.totalAnswers++;
      currentCard.correctCount++;
      currentCard.masteryLevel = Math.min(1, currentCard.masteryLevel + 0.1);
      
      // Immediate short confirmation for correct answers
      const correctResponses = [
        "Correct!", "Exactly right!", "Perfect!", "Great job!", "That's right!",
        "Excellent!", "Well done!", "Spot on!", "Nice work!", "You got it!"
      ];
      feedback = correctResponses[Math.floor(Math.random() * correctResponses.length)];
      
      if (evaluation.feedback && evaluation.feedback.length > 10) {
        feedback += ` ${evaluation.feedback}`;
      }
      
      shouldProceed = true;
    } else {
      currentCard.incorrectCount++;
      currentCard.masteryLevel = Math.max(0, currentCard.masteryLevel - 0.05);
      
      // Adaptive feedback based on attempt count
      if ((currentCard as any).attemptCount === 1) {
        // First incorrect attempt - gentle encouragement
        const encouragingResponses = [
          "Hmm, not quite. Want to give it another shot?",
          "That's not quite right. Care to try again?",
          "Not exactly. Would you like another attempt?",
          "Close, but not quite there. Try once more?",
          "Not quite right. Give it another go?"
        ];
        feedback = encouragingResponses[Math.floor(Math.random() * encouragingResponses.length)];
        shouldProceed = false; // Don't move to next card yet
      } else if ((currentCard as any).attemptCount === 2) {
        // Second incorrect attempt - another gentle prompt with hint
        const secondAttemptResponses = [
          "Still not quite right. Think about it differently and try once more.",
          "Not quite there yet. Consider what key elements might be missing and try again.", 
          "That's still not it. Take a moment to think through the concept and give it another shot.",
          "Close, but missing something important. One more try?"
        ];
        feedback = secondAttemptResponses[Math.floor(Math.random() * secondAttemptResponses.length)];
        shouldProceed = false; // Don't move to next card yet
      } else {
        // Third attempt or more - provide correct answer with explanation
        session.totalAnswers++; // Count this as final attempt
        let detailedExplanation = `Here's how it works: ${currentCard.back}.`;
        
        if (evaluation.missingElements && evaluation.missingElements.length > 0) {
          detailedExplanation += ` You were missing these key elements: ${evaluation.missingElements.join(', ')}.`;
        }
        
        if (evaluation.feedback) {
          detailedExplanation += ` ${evaluation.feedback}`;
        }
        
        feedback = detailedExplanation;
        shouldProceed = true;
      }
    }

    currentCard.lastReviewed = new Date();

    // Only proceed to next card if should proceed
    if (shouldProceed) {
      session.currentIndex++;
      // Reset attempt count for next card
      if (session.currentIndex < session.flashcards.length) {
        (session.flashcards[session.currentIndex] as any).attemptCount = 0;
      }
    }

    // Check if session is complete
    if (shouldProceed && session.currentIndex >= session.flashcards.length) {
      const summaryResponse = this.endSession(sessionId);
      return {
        type: 'feedback',
        content: `${feedback} ${summaryResponse.content}`,
        sessionStats: {
          current: session.currentIndex,
          total: session.flashcards.length,
          correctCount: session.correctAnswers,
          accuracy: session.totalAnswers > 0 ? session.correctAnswers / session.totalAnswers : 0
        },
        nextAction: 'end'
      };
    }

    // Continue to next card or stay on current card
    if (shouldProceed) {
      const nextCard = session.flashcards[session.currentIndex];
      return {
        type: 'feedback',
        content: `${feedback} Ready for the next question? ${nextCard.front}`,
        flashcard: nextCard,
        sessionStats: {
          current: session.currentIndex + 1,
          total: session.flashcards.length,
          correctCount: session.correctAnswers,
          accuracy: session.totalAnswers > 0 ? session.correctAnswers / session.totalAnswers : 0
        },
        nextAction: 'continue'
      };
    } else {
      // Stay on current card for retry
      return {
        type: 'feedback',
        content: feedback,
        flashcard: currentCard,
        sessionStats: {
          current: session.currentIndex + 1,
          total: session.flashcards.length,
          correctCount: session.correctAnswers,
          accuracy: session.totalAnswers > 0 ? session.correctAnswers / session.totalAnswers : 0
        },
        nextAction: 'continue'
      };
    }
  }

  /**
   * Get next question in session
   */
  getNextQuestion(sessionId: string): VoiceFlashcardResponse {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        type: 'instructions',
        content: "Session not found. Please start a new flashcard session.",
        nextAction: 'end'
      };
    }

    const currentCard = session.flashcards[session.currentIndex];
    if (!currentCard) {
      return this.endSession(sessionId);
    }

    return {
      type: 'question',
      content: currentCard.front,
      flashcard: currentCard,
      sessionStats: {
        current: session.currentIndex + 1,
        total: session.flashcards.length,
        correctCount: session.correctAnswers,
        accuracy: session.totalAnswers > 0 ? session.correctAnswers / session.totalAnswers : 0
      },
      nextAction: 'continue'
    };
  }

  private async evaluateAnswer(flashcard: Flashcard, userAnswer: string): Promise<{
    isCorrect: boolean;
    feedback: string;
    confidence: number;
    missingElements?: string[];
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert educator evaluating student answers. Focus on accuracy while being encouraging. Identify missing key elements when answers are incomplete."
          },
          {
            role: "user",
            content: `Evaluate this flashcard answer:

Question: ${flashcard.front}
Correct Answer: ${flashcard.back}
Student Answer: ${userAnswer}

Analyze:
1. Is the answer correct, partially correct, or incorrect?
2. What key elements are missing (if any)?
3. Provide constructive feedback that guides learning
4. Rate confidence in your evaluation (0-1)

For missing elements, be specific about what concepts or details the student should include.

Return as JSON with: isCorrect (boolean), feedback (string), confidence (0-1), missingElements (array of strings).`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"isCorrect": false, "feedback": "Could not evaluate", "confidence": 0}');
      return {
        isCorrect: result.isCorrect || false,
        feedback: result.feedback || "Could not evaluate your answer.",
        confidence: result.confidence || 0,
        missingElements: result.missingElements || []
      };
    } catch (error) {
      console.error('Answer evaluation error:', error);
      // Fallback to simple text matching
      const isCorrect = this.simpleAnswerMatch(flashcard.back, userAnswer);
      return {
        isCorrect,
        feedback: isCorrect ? "Good job!" : "That's not quite right.",
        confidence: 0.5,
        missingElements: []
      };
    }
  }

  private simpleAnswerMatch(correctAnswer: string, userAnswer: string): boolean {
    const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const correct = normalize(correctAnswer);
    const user = normalize(userAnswer);
    
    // Check for exact match or significant overlap
    return correct === user || 
           correct.includes(user) || 
           user.includes(correct) ||
           this.calculateSimilarity(correct, user) > 0.7;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    const intersection = words1.filter(word => words2.includes(word));
    return intersection.length / Math.max(words1.length, words2.length);
  }

  private skipCard(sessionId: string): VoiceFlashcardResponse {
    const session = this.activeSessions.get(sessionId)!;
    const currentCard = session.flashcards[session.currentIndex];
    
    session.currentIndex++;
    session.totalAnswers++;

    if (session.currentIndex >= session.flashcards.length) {
      return this.endSession(sessionId);
    }

    const nextCard = session.flashcards[session.currentIndex];
    return {
      type: 'feedback',
      content: `Skipped. The answer was: ${currentCard.back}. Next question: ${nextCard.front}`,
      flashcard: nextCard,
      sessionStats: {
        current: session.currentIndex + 1,
        total: session.flashcards.length,
        correctCount: session.correctAnswers,
        accuracy: session.totalAnswers > 0 ? session.correctAnswers / session.totalAnswers : 0
      },
      nextAction: 'continue'
    };
  }

  private repeatQuestion(sessionId: string): VoiceFlashcardResponse {
    const session = this.activeSessions.get(sessionId)!;
    const currentCard = session.flashcards[session.currentIndex];
    
    return {
      type: 'question',
      content: `Let me repeat the question: ${currentCard.front}`,
      flashcard: currentCard,
      sessionStats: {
        current: session.currentIndex + 1,
        total: session.flashcards.length,
        correctCount: session.correctAnswers,
        accuracy: session.totalAnswers > 0 ? session.correctAnswers / session.totalAnswers : 0
      },
      nextAction: 'continue'
    };
  }

  private endSession(sessionId: string): VoiceFlashcardResponse {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        type: 'summary',
        content: "Session already ended.",
        nextAction: 'end'
      };
    }

    const accuracy = session.totalAnswers > 0 ? session.correctAnswers / session.totalAnswers : 0;
    const duration = Math.round((Date.now() - session.sessionStartTime.getTime()) / 1000 / 60);
    
    let performanceMessage = '';
    if (accuracy >= 0.9) {
      performanceMessage = "Excellent work! You're mastering this material.";
    } else if (accuracy >= 0.7) {
      performanceMessage = "Good job! You're on the right track.";
    } else if (accuracy >= 0.5) {
      performanceMessage = "Not bad! Keep practicing to improve.";
    } else {
      performanceMessage = "Keep studying! This material needs more review.";
    }

    this.activeSessions.delete(sessionId);

    return {
      type: 'summary',
      content: `Session complete! You got ${session.correctAnswers} out of ${session.totalAnswers} correct (${Math.round(accuracy * 100)}% accuracy) in ${duration} minutes. ${performanceMessage} Say "start new session" to practice more, or "create flashcards" to make new ones.`,
      sessionStats: {
        current: session.flashcards.length,
        total: session.flashcards.length,
        correctCount: session.correctAnswers,
        accuracy
      },
      nextAction: 'end'
    };
  }

  private shuffleFlashcards(flashcards: Flashcard[]): Flashcard[] {
    const shuffled = [...flashcards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private validateFlashcards(flashcards: any[], source: string): Flashcard[] {
    return flashcards.map((card, index) => ({
      id: `card_${Date.now()}_${index}`,
      front: card.front || card.question || 'Question not available',
      back: card.back || card.answer || 'Answer not available',
      difficulty: ['easy', 'medium', 'hard'].includes(card.difficulty) ? card.difficulty : 'medium',
      category: card.category || source,
      source,
      correctCount: 0,
      incorrectCount: 0,
      masteryLevel: 0
    }));
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    return {
      current: session.currentIndex + 1,
      total: session.flashcards.length,
      correctCount: session.correctAnswers,
      totalAnswers: session.totalAnswers,
      accuracy: session.totalAnswers > 0 ? session.correctAnswers / session.totalAnswers : 0,
      timeElapsed: Date.now() - session.sessionStartTime.getTime()
    };
  }
}

export const flashcardService = new FlashcardService();
