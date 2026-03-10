
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { users, courses, documents, studyLevel as studyLevels } from "../../shared/schema";

// Types for semantic memory
export interface SemanticMemoryEntry {
  id: number;
  userId: number;
  topic: string;
  courseId?: string;
  struggleType: 'understanding' | 'retention' | 'application' | 'concept_connection';
  severityLevel: 1 | 2 | 3 | 4 | 5; // 1 = minor struggle, 5 = major struggle
  contextData: {
    originalQuestion?: string;
    assistantResponse?: string;
    userFeedback?: string;
    relatedTopics?: string[];
    sessionMetadata?: any;
  };
  firstEncountered: Date;
  lastEncountered: Date;
  encounterCount: number;
  resolved: boolean;
  resolutionNotes?: string;
}

export interface TopicContext {
  topic: string;
  courseId?: string;
  relatedConcepts: string[];
  difficultyLevel: number;
  userProficiency: number;
  lastStudied: Date;
  strugglesHistory: SemanticMemoryEntry[];
  successfulInteractions: number;
}

export interface ConversationContext {
  userId: number;
  sessionId: string;
  topics: string[];
  strugglingTopics: string[];
  masteredTopics: string[];
  conversationFlow: Array<{
    userMessage: string;
    assistantResponse: string;
    timestamp: Date;
    topicsDiscussed: string[];
    strugglesDetected?: string[];
  }>;
  sessionSummary?: string;
}

class SemanticMemoryService {
  private memoryStore = new Map<number, SemanticMemoryEntry[]>();
  private conversationContexts = new Map<string, ConversationContext>();
  private topicContexts = new Map<string, TopicContext>();

  /**
   * Record a struggle with a specific topic
   */
  async recordStruggle(
    userId: number,
    topic: string,
    courseId: string | null,
    struggleType: SemanticMemoryEntry['struggleType'],
    severityLevel: SemanticMemoryEntry['severityLevel'],
    contextData: SemanticMemoryEntry['contextData']
  ): Promise<void> {
    try {
      // Check if we already have this struggle recorded
      const existingStruggles = this.memoryStore.get(userId) || [];
      const existingStruggle = existingStruggles.find(s => 
        s.topic.toLowerCase() === topic.toLowerCase() && 
        s.courseId === courseId &&
        s.struggleType === struggleType
      );

      if (existingStruggle) {
        // Update existing struggle
        existingStruggle.lastEncountered = new Date();
        existingStruggle.encounterCount += 1;
        existingStruggle.severityLevel = Math.max(existingStruggle.severityLevel, severityLevel);
        existingStruggle.contextData = { ...existingStruggle.contextData, ...contextData };
      } else {
        // Create new struggle entry
        const newStruggle: SemanticMemoryEntry = {
          id: Date.now() + Math.random(),
          userId,
          topic,
          courseId: courseId || undefined,
          struggleType,
          severityLevel,
          contextData,
          firstEncountered: new Date(),
          lastEncountered: new Date(),
          encounterCount: 1,
          resolved: false
        };

        existingStruggles.push(newStruggle);
      }

      this.memoryStore.set(userId, existingStruggles);

      // Also update database study levels to reflect struggles
      await this.updateStudyLevel(userId, topic, courseId, false, severityLevel);

      console.log(`Recorded struggle for user ${userId}: ${topic} (${struggleType}, severity: ${severityLevel})`);
    } catch (error) {
      console.error('Error recording struggle:', error);
    }
  }

  /**
   * Record successful interaction with a topic
   */
  async recordSuccess(
    userId: number,
    topic: string,
    courseId: string | null,
    contextData: any = {}
  ): Promise<void> {
    try {
      // Update topic context
      const topicKey = `${userId}-${courseId}-${topic}`.toLowerCase();
      const topicContext = this.topicContexts.get(topicKey) || {
        topic,
        courseId: courseId || undefined,
        relatedConcepts: [],
        difficultyLevel: 3,
        userProficiency: 3,
        lastStudied: new Date(),
        strugglesHistory: [],
        successfulInteractions: 0
      };

      topicContext.successfulInteractions += 1;
      topicContext.lastStudied = new Date();
      topicContext.userProficiency = Math.min(5, topicContext.userProficiency + 0.2);

      this.topicContexts.set(topicKey, topicContext);

      // Check if this resolves any existing struggles
      const userStruggles = this.memoryStore.get(userId) || [];
      const relatedStruggles = userStruggles.filter(s => 
        s.topic.toLowerCase().includes(topic.toLowerCase()) || 
        topic.toLowerCase().includes(s.topic.toLowerCase())
      );

      for (const struggle of relatedStruggles) {
        if (!struggle.resolved && struggle.encounterCount >= 2) {
          struggle.resolved = true;
          struggle.resolutionNotes = `Resolved through successful interaction on ${new Date().toISOString()}`;
        }
      }

      // Update database study levels
      await this.updateStudyLevel(userId, topic, courseId, true, 5);

      console.log(`Recorded success for user ${userId}: ${topic}`);
    } catch (error) {
      console.error('Error recording success:', error);
    }
  }

  /**
   * Get user's struggling topics
   */
  async getStrugglingTopics(userId: number, courseId?: string): Promise<SemanticMemoryEntry[]> {
    const userStruggles = this.memoryStore.get(userId) || [];
    
    let filteredStruggles = userStruggles.filter(s => !s.resolved);
    
    if (courseId) {
      filteredStruggles = filteredStruggles.filter(s => s.courseId === courseId);
    }

    // Sort by severity and recency
    return filteredStruggles.sort((a, b) => {
      if (a.severityLevel !== b.severityLevel) {
        return b.severityLevel - a.severityLevel; // Higher severity first
      }
      return b.lastEncountered.getTime() - a.lastEncountered.getTime(); // More recent first
    });
  }

  /**
   * Get conversation context for personalized responses
   */
  async getConversationContext(userId: number, sessionId: string): Promise<ConversationContext> {
    const contextKey = `${userId}-${sessionId}`;
    
    if (!this.conversationContexts.has(contextKey)) {
      const strugglingTopics = await this.getStrugglingTopics(userId);
      
      const newContext: ConversationContext = {
        userId,
        sessionId,
        topics: [],
        strugglingTopics: strugglingTopics.map(s => s.topic),
        masteredTopics: await this.getMasteredTopics(userId),
        conversationFlow: []
      };
      
      this.conversationContexts.set(contextKey, newContext);
    }

    return this.conversationContexts.get(contextKey)!;
  }

  /**
   * Update conversation context with new interaction
   */
  async updateConversationContext(
    userId: number,
    sessionId: string,
    userMessage: string,
    assistantResponse: string,
    topicsDiscussed: string[],
    strugglesDetected: string[] = []
  ): Promise<void> {
    const context = await this.getConversationContext(userId, sessionId);
    
    // Add to conversation flow
    context.conversationFlow.push({
      userMessage,
      assistantResponse,
      timestamp: new Date(),
      topicsDiscussed,
      strugglesDetected
    });

    // Update topics list
    for (const topic of topicsDiscussed) {
      if (!context.topics.includes(topic)) {
        context.topics.push(topic);
      }
    }

    // Record new struggles
    for (const struggle of strugglesDetected) {
      if (!context.strugglingTopics.includes(struggle)) {
        context.strugglingTopics.push(struggle);
      }
      
      await this.recordStruggle(
        userId,
        struggle,
        null, // We can enhance this to detect course context
        'understanding', // Default type, can be enhanced
        3, // Default severity, can be enhanced
        {
          originalQuestion: userMessage,
          assistantResponse,
          sessionMetadata: { sessionId, timestamp: new Date() }
        }
      );
    }

    // Keep only last 20 interactions to prevent memory bloat
    if (context.conversationFlow.length > 20) {
      context.conversationFlow = context.conversationFlow.slice(-20);
    }

    this.conversationContexts.set(`${userId}-${sessionId}`, context);
  }

  /**
   * Get personalized response context based on memory
   */
  async getPersonalizedContext(userId: number, currentTopic?: string): Promise<{
    strugglingTopics: string[];
    masteredTopics: string[];
    relatedStruggles: SemanticMemoryEntry[];
    recommendations: string[];
    encouragement: string[];
  }> {
    const strugglingTopics = await this.getStrugglingTopics(userId);
    const masteredTopics = await this.getMasteredTopics(userId);
    
    let relatedStruggles: SemanticMemoryEntry[] = [];
    if (currentTopic) {
      relatedStruggles = strugglingTopics.filter(s => 
        s.topic.toLowerCase().includes(currentTopic.toLowerCase()) ||
        currentTopic.toLowerCase().includes(s.topic.toLowerCase()) ||
        (s.contextData.relatedTopics && s.contextData.relatedTopics.some(t => 
          t.toLowerCase().includes(currentTopic.toLowerCase())
        ))
      );
    }

    const recommendations = this.generateRecommendations(strugglingTopics, masteredTopics, currentTopic);
    const encouragement = this.generateEncouragement(userId, strugglingTopics, masteredTopics);

    return {
      strugglingTopics: strugglingTopics.map(s => s.topic),
      masteredTopics,
      relatedStruggles,
      recommendations,
      encouragement
    };
  }

  /**
   * Detect struggles from conversation patterns
   */
  detectStrugglePatterns(userMessage: string, assistantResponse: string): string[] {
    const struggles: string[] = [];
    
    const userMessageLower = userMessage.toLowerCase();
    
    // Patterns indicating confusion or struggle
    const confusionPatterns = [
      /i don'?t understand/,
      /i'?m confused/,
      /can you explain again/,
      /what does .* mean/,
      /i'?m lost/,
      /this is difficult/,
      /i can'?t figure out/,
      /help me with/,
      /i'?m stuck/
    ];

    const isConfused = confusionPatterns.some(pattern => pattern.test(userMessageLower));
    
    if (isConfused) {
      // Extract potential topic from the message
      const topics = this.extractTopicsFromMessage(userMessage);
      struggles.push(...topics);
    }

    // Check if user is asking the same question again (repetition indicates struggle)
    // This would require conversation history, which we'll implement in the context update

    return struggles;
  }

  /**
   * Extract topics from user message
   */
  private extractTopicsFromMessage(message: string): string[] {
    // Simple topic extraction - can be enhanced with NLP
    const topics: string[] = [];
    
    // Common academic subjects and concepts
    const topicPatterns = [
      /mathematics?|math|calculus|algebra|geometry/gi,
      /physics|mechanics|thermodynamics|electromagnetism/gi,
      /chemistry|organic|inorganic|biochemistry/gi,
      /biology|genetics|molecular|anatomy/gi,
      /computer science|programming|algorithms|data structures/gi,
      /history|historical|ancient|modern/gi,
      /literature|english|writing|grammar/gi,
      /economics|business|entrepreneurship|finance/gi,
      /psychology|sociology|philosophy/gi,
    ];

    for (const pattern of topicPatterns) {
      const matches = message.match(pattern);
      if (matches) {
        topics.push(...matches.map(m => m.toLowerCase()));
      }
    }

    // Extract quoted or emphasized terms
    const quotedTerms = message.match(/"([^"]+)"/g);
    if (quotedTerms) {
      topics.push(...quotedTerms.map(t => t.replace(/"/g, '').toLowerCase()));
    }

    return [...new Set(topics)]; // Remove duplicates
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(
    struggles: SemanticMemoryEntry[], 
    masteredTopics: string[], 
    currentTopic?: string
  ): string[] {
    const recommendations: string[] = [];

    if (struggles.length > 0) {
      const topStruggle = struggles[0];
      
      if (topStruggle.severityLevel >= 4) {
        recommendations.push(`Consider breaking down ${topStruggle.topic} into smaller concepts`);
        recommendations.push(`Try the Feynman Technique: explain ${topStruggle.topic} in simple terms`);
      }
      
      if (topStruggle.encounterCount >= 3) {
        recommendations.push(`You've struggled with ${topStruggle.topic} before. Let's try a different approach`);
        recommendations.push(`Consider seeking additional resources for ${topStruggle.topic}`);
      }

      // Look for patterns in struggle types
      const understandingStruggles = struggles.filter(s => s.struggleType === 'understanding').length;
      const retentionStruggles = struggles.filter(s => s.struggleType === 'retention').length;
      
      if (understandingStruggles > retentionStruggles) {
        recommendations.push("Focus on conceptual understanding rather than memorization");
        recommendations.push("Try using analogies and real-world examples");
      } else if (retentionStruggles > understandingStruggles) {
        recommendations.push("Use spaced repetition to improve memory retention");
        recommendations.push("Create flashcards for key concepts");
      }
    }

    return recommendations.slice(0, 3); // Limit to 3 recommendations
  }

  /**
   * Generate encouraging messages
   */
  private generateEncouragement(userId: number, struggles: SemanticMemoryEntry[], masteredTopics: string[]): string[] {
    const encouragement: string[] = [];

    if (masteredTopics.length > struggles.length) {
      encouragement.push(`Great job! You've mastered ${masteredTopics.length} topics`);
    }

    if (struggles.length > 0) {
      const recentProgress = struggles.filter(s => s.resolved).length;
      if (recentProgress > 0) {
        encouragement.push(`You've overcome ${recentProgress} challenges recently - keep it up!`);
      }
      
      encouragement.push("Remember, struggling with difficult concepts is part of learning");
      encouragement.push("Each question you ask helps you understand better");
    }

    return encouragement.slice(0, 2); // Limit to 2 encouragement messages
  }

  /**
   * Get mastered topics for a user
   */
  private async getMasteredTopics(userId: number): Promise<string[]> {
    try {
      const masteredLevels = await db
        .select({ topic: studyLevels.topic })
        .from(studyLevels)
        .where(and(
          eq(studyLevels.userId, userId),
          sql`${studyLevels.masteryLevel} >= 80`
        ));

      return masteredLevels.map(level => level.topic);
    } catch (error) {
      console.error('Error fetching mastered topics:', error);
      return [];
    }
  }

  /**
   * Update study level in database
   */
  private async updateStudyLevel(
    userId: number, 
    topic: string, 
    courseId: string | null, 
    isSuccess: boolean,
    severity: number
  ): Promise<void> {
    try {
      const masteryAdjustment = isSuccess ? 5 : -severity;
      const currentMastery = isSuccess ? Math.min(100, 70 + masteryAdjustment) : Math.max(0, 70 - masteryAdjustment);

      await db.insert(studyLevels).values({
        userId,
        courseId: courseId || "general",
        topic,
        masteryLevel: currentMastery,
        questionsAttempted: 1,
        questionsCorrect: isSuccess ? 1 : 0,
        lastUpdated: new Date()
      });
    } catch (error) {
      // If insert fails (duplicate), we could update, but for now just log
      console.log('Study level update note:', error);
    }
  }

  /**
   * Clear old conversation contexts to manage memory
   */
  cleanupOldContexts(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, context] of this.conversationContexts.entries()) {
      const lastInteraction = context.conversationFlow[context.conversationFlow.length - 1];
      if (lastInteraction && (now - lastInteraction.timestamp.getTime()) > maxAge) {
        this.conversationContexts.delete(key);
      }
    }
  }
}

export const semanticMemoryService = new SemanticMemoryService();

// Cleanup old contexts every hour
setInterval(() => {
  semanticMemoryService.cleanupOldContexts();
}, 60 * 60 * 1000);
