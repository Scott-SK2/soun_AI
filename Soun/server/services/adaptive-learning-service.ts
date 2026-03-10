
import { db } from "../db";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import { users, courses, documents, studyLevel as studyLevels } from "../../shared/schema";
import { semanticMemoryService } from "./semantic-memory-service";

export interface LearningPathStep {
  id: string;
  topic: string;
  courseId?: string;
  priority: 1 | 2 | 3 | 4 | 5; // 1 = highest priority
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  prerequisites: string[];
  reason: string;
  resources: Array<{
    type: 'document' | 'practice' | 'review' | 'quiz';
    title: string;
    description: string;
    documentId?: number;
  }>;
  adaptiveReason: 'weakness_detected' | 'prerequisite_missing' | 'natural_progression' | 'reinforcement_needed' | 'struggle_pattern';
}

export interface AdaptiveLearningPath {
  userId: number;
  pathId: string;
  title: string;
  description: string;
  totalEstimatedTime: number;
  steps: LearningPathStep[];
  generatedAt: Date;
  lastUpdated: Date;
  completedSteps: string[];
  adaptiveInsights: {
    strugglingTopics: string[];
    masteredTopics: string[];
    learningVelocity: number; // topics mastered per week
    preferredDifficulty: 'beginner' | 'intermediate' | 'advanced';
    voiceInteractionPatterns: string[];
  };
}

class AdaptiveLearningService {
  private learningPaths = new Map<number, AdaptiveLearningPath>();

  /**
   * Generate personalized learning path based on current mastery and struggles
   */
  async generateAdaptiveLearningPath(userId: number, courseId?: string): Promise<AdaptiveLearningPath> {
    try {
      // PERFORMANCE: Run independent queries in parallel to reduce API response time
      const [masteryLevels, strugglingTopics, personalizedContext, learningPatterns] = await Promise.all([
        this.getMasteryLevels(userId, courseId),
        semanticMemoryService.getStrugglingTopics(userId, courseId),
        semanticMemoryService.getPersonalizedContext(userId),
        this.analyzeLearningPatterns(userId, courseId)
      ]);
      
      // Generate adaptive steps
      const steps = await this.generateAdaptiveSteps(
        userId,
        masteryLevels,
        strugglingTopics,
        personalizedContext,
        learningPatterns,
        courseId
      );
      
      // Create learning path
      const pathId = `adaptive_${userId}_${Date.now()}`;
      const adaptivePath: AdaptiveLearningPath = {
        userId,
        pathId,
        title: courseId ? `Adaptive Learning Path - ${courseId}` : 'Personalized Learning Journey',
        description: this.generatePathDescription(steps, strugglingTopics.length, personalizedContext.masteredTopics.length),
        totalEstimatedTime: steps.reduce((total, step) => total + step.estimatedTime, 0),
        steps: steps.sort((a, b) => a.priority - b.priority),
        generatedAt: new Date(),
        lastUpdated: new Date(),
        completedSteps: [],
        adaptiveInsights: {
          strugglingTopics: strugglingTopics.map(s => s.topic),
          masteredTopics: personalizedContext.masteredTopics,
          learningVelocity: learningPatterns.learningVelocity,
          preferredDifficulty: learningPatterns.preferredDifficulty,
          voiceInteractionPatterns: learningPatterns.voicePatterns
        }
      };
      
      // Store the path
      this.learningPaths.set(userId, adaptivePath);
      
      console.log(`Generated adaptive learning path for user ${userId} with ${steps.length} steps`);
      return adaptivePath;
      
    } catch (error) {
      console.error('Error generating adaptive learning path:', error);
      throw error;
    }
  }

  /**
   * Update learning path based on new performance data
   */
  async updateAdaptivePath(userId: number, completedStepId: string, performance: 'excellent' | 'good' | 'struggling'): Promise<AdaptiveLearningPath> {
    const currentPath = this.learningPaths.get(userId);
    
    if (!currentPath) {
      // Generate new path if none exists
      return this.generateAdaptiveLearningPath(userId);
    }

    // Mark step as completed
    if (!currentPath.completedSteps.includes(completedStepId)) {
      currentPath.completedSteps.push(completedStepId);
    }

    const completedStep = currentPath.steps.find(s => s.id === completedStepId);
    
    if (completedStep && performance === 'struggling') {
      // Add reinforcement steps for struggling topics
      const reinforcementSteps = await this.generateReinforcementSteps(userId, completedStep.topic, completedStep.courseId);
      
      // Insert reinforcement steps with high priority
      for (const reinforcementStep of reinforcementSteps) {
        reinforcementStep.priority = 1; // Highest priority
        currentPath.steps.unshift(reinforcementStep);
      }
      
      // Record the struggle
      await semanticMemoryService.recordStruggle(
        userId,
        completedStep.topic,
        completedStep.courseId || null,
        'application',
        performance === 'struggling' ? 4 : 2,
        { stepId: completedStepId, performance }
      );
    } else if (completedStep && performance === 'excellent') {
      // Accelerate learning - suggest advanced topics
      const acceleratedSteps = await this.generateAcceleratedSteps(userId, completedStep.topic, completedStep.courseId);
      currentPath.steps.push(...acceleratedSteps);
      
      // Record success
      await semanticMemoryService.recordSuccess(userId, completedStep.topic, completedStep.courseId || null);
    }

    // Re-prioritize remaining steps
    await this.reprioritizeSteps(currentPath, userId);
    
    currentPath.lastUpdated = new Date();
    this.learningPaths.set(userId, currentPath);
    
    return currentPath;
  }

  /**
   * Get next recommended step based on current context
   */
  async getNextRecommendedStep(userId: number, currentContext?: string): Promise<LearningPathStep | null> {
    let path = this.learningPaths.get(userId);
    
    if (!path) {
      path = await this.generateAdaptiveLearningPath(userId);
    }

    // Find next incomplete step
    const nextStep = path.steps.find(step => !path.completedSteps.includes(step.id));
    
    if (!nextStep) {
      // Path completed, generate new one
      path = await this.generateAdaptiveLearningPath(userId);
      return path.steps[0] || null;
    }

    // If current context provided, prioritize contextually relevant steps
    if (currentContext) {
      const contextualStep = path.steps.find(step => 
        !path.completedSteps.includes(step.id) &&
        (step.topic.toLowerCase().includes(currentContext.toLowerCase()) ||
         step.prerequisites.some(prereq => prereq.toLowerCase().includes(currentContext.toLowerCase())))
      );
      
      if (contextualStep) {
        return contextualStep;
      }
    }

    return nextStep;
  }

  /**
   * Analyze user's learning patterns from historical data
   */
  private async analyzeLearningPatterns(userId: number, courseId?: string) {
    try {
      // Get mastery progression over time
      const masteryHistory = await this.getMasteryHistory(userId, courseId);
      
      // Calculate learning velocity (topics mastered per week)
      const weeklyProgress = this.calculateLearningVelocity(masteryHistory);
      
      // Determine preferred difficulty based on performance
      const preferredDifficulty = this.determinePreferredDifficulty(masteryHistory);
      
      // Analyze voice interaction patterns
      const voicePatterns = await this.analyzeVoicePatterns(userId);
      
      return {
        learningVelocity: weeklyProgress,
        preferredDifficulty,
        voicePatterns,
        strongAreas: masteryHistory.filter(m => m.masteryLevel >= 80).map(m => m.topic),
        improvementAreas: masteryHistory.filter(m => m.masteryLevel < 60).map(m => m.topic)
      };
    } catch (error) {
      console.error('Error analyzing learning patterns:', error);
      return {
        learningVelocity: 2, // Default
        preferredDifficulty: 'intermediate' as const,
        voicePatterns: [],
        strongAreas: [],
        improvementAreas: []
      };
    }
  }

  /**
   * Get subject-specific vocal learning strategies
   */
  private getVocalLearningStrategies(subject: string): Array<{
    strategy: string;
    description: string;
    vocalTechniques: string[];
  }> {
    const strategies: Record<string, Array<{
      strategy: string;
      description: string;
      vocalTechniques: string[];
    }>> = {
      mathematics: [
        {
          strategy: "Verbal Problem Solving",
          description: "Talk through each step of mathematical problems out loud",
          vocalTechniques: [
            "Explain your reasoning for each step",
            "Verbalize the mathematical operations you're performing",
            "Describe patterns you notice in problems",
            "Teach the solution method to an imaginary student"
          ]
        },
        {
          strategy: "Concept Explanation",
          description: "Explain mathematical concepts using everyday language",
          vocalTechniques: [
            "Describe abstract concepts using real-world analogies",
            "Explain why formulas work the way they do",
            "Verbally compare different solution methods",
            "Create verbal mnemonics for complex formulas"
          ]
        }
      ],
      physics: [
        {
          strategy: "Phenomenon Description",
          description: "Describe physical phenomena and relate them to equations",
          vocalTechniques: [
            "Explain what's happening physically in a problem",
            "Relate mathematical equations to real-world behavior",
            "Describe energy transformations verbally",
            "Explain cause-and-effect relationships in physics systems"
          ]
        }
      ],
      chemistry: [
        {
          strategy: "Reaction Narration",
          description: "Verbally describe chemical processes and reactions",
          vocalTechniques: [
            "Narrate what happens during chemical reactions",
            "Explain molecular interactions in simple terms",
            "Describe electron movement and bonding",
            "Relate chemical properties to everyday experiences"
          ]
        }
      ],
      engineering: [
        {
          strategy: "Design Reasoning",
          description: "Verbally justify design decisions and trade-offs",
          vocalTechniques: [
            "Explain why certain design choices were made",
            "Describe system interactions and dependencies",
            "Verbalize problem-solving approaches",
            "Justify material and method selections"
          ]
        }
      ],
      "computer science": [
        {
          strategy: "Algorithm Explanation",
          description: "Describe algorithms and code logic verbally",
          vocalTechniques: [
            "Explain algorithm steps in plain English",
            "Describe data flow through programs",
            "Verbalize debugging thought processes",
            "Explain time and space complexity trade-offs"
          ]
        }
      ]
    };

    return strategies[subject.toLowerCase()] || [
      {
        strategy: "Verbal Teaching",
        description: "Explain concepts as if teaching someone else",
        vocalTechniques: [
          "Break down complex ideas into simple explanations",
          "Use analogies and examples",
          "Anticipate and answer potential questions",
          "Summarize key points clearly"
        ]
      }
    ];
  }

  /**
   * Generate adaptive learning steps based on analysis
   */
  private async generateAdaptiveSteps(
    userId: number,
    masteryLevels: any[],
    strugglingTopics: any[],
    personalizedContext: any,
    learningPatterns: any,
    courseId?: string
  ): Promise<LearningPathStep[]> {
    const steps: LearningPathStep[] = [];
    let stepCounter = 0;

    // Determine if this is a practice-heavy subject
    const practiceHeavySubjects = ['mathematics', 'physics', 'chemistry', 'engineering', 'statistics', 'computer science', 'economics', 'accounting'];
    const isPracticeHeavy = practiceHeavySubjects.some(subject => 
      courseId?.toLowerCase().includes(subject) || 
      strugglingTopics.some(t => t.topic.toLowerCase().includes(subject))
    );

    // Get vocal learning strategies for the subject
    let vocalStrategies: any[] = [];
    if (isPracticeHeavy && courseId) {
      const detectedSubject = practiceHeavySubjects.find(subject => 
        courseId.toLowerCase().includes(subject)
      ) || 'general';
      vocalStrategies = this.getVocalLearningStrategies(detectedSubject);
    }

    // 1. Address immediate struggles (highest priority)
    for (const struggle of strugglingTopics.slice(0, 3)) {
      const baseStep = {
        id: `struggle_${++stepCounter}`,
        topic: struggle.topic,
        courseId: struggle.courseId,
        priority: 1,
        difficulty: 'beginner' as const,
        estimatedTime: 45,
        prerequisites: [],
        reason: `You've shown difficulty with ${struggle.topic}. Let's break it down and build understanding.`,
        resources: await this.getTopicResources(userId, struggle.topic, 'review'),
        adaptiveReason: 'weakness_detected' as const
      };

      // Add vocal practice enhancement for practice-heavy subjects
      if (isPracticeHeavy && vocalStrategies.length > 0) {
        const strategy = vocalStrategies[0]; // Use primary strategy
        baseStep.reason += ` We'll use vocal techniques: ${strategy.vocalTechniques.slice(0, 2).join(' and ')}.`;
        baseStep.resources.push({
          type: 'practice',
          title: `${strategy.strategy} for ${struggle.topic}`,
          description: `${strategy.description} - ${strategy.vocalTechniques[0]}`
        });
      }

      steps.push(baseStep);
    }

    // Add vocal practice sessions for practice-heavy subjects
    if (isPracticeHeavy && vocalStrategies.length > 0) {
      for (const strategy of vocalStrategies.slice(0, 2)) {
        steps.push({
          id: `vocal_practice_${++stepCounter}`,
          topic: `Vocal Practice: ${strategy.strategy}`,
          courseId: courseId,
          priority: 2,
          difficulty: 'intermediate' as const,
          estimatedTime: 30,
          prerequisites: [],
          reason: `Practice explaining concepts out loud to deepen understanding. ${strategy.description}`,
          resources: [
            {
              type: 'practice',
              title: strategy.strategy,
              description: strategy.description
            },
            ...strategy.vocalTechniques.map(technique => ({
              type: 'practice' as const,
              title: `Technique: ${technique}`,
              description: `Practice this vocal learning technique to improve mastery`
            }))
          ],
          adaptiveReason: 'natural_progression' as const
        });
      }
    }

    // 2. Fill prerequisite gaps (high priority)
    const prerequisiteGaps = await this.identifyPrerequisiteGaps(masteryLevels, learningPatterns.strongAreas);
    for (const gap of prerequisiteGaps.slice(0, 2)) {
      steps.push({
        id: `prerequisite_${++stepCounter}`,
        topic: gap.topic,
        courseId: courseId,
        priority: 2,
        difficulty: gap.difficulty,
        estimatedTime: 30,
        prerequisites: gap.prerequisites,
        reason: `Mastering ${gap.topic} will help you understand more advanced concepts.`,
        resources: await this.getTopicResources(userId, gap.topic, 'document'),
        adaptiveReason: 'prerequisite_missing'
      });
    }

    // 3. Natural progression (medium priority)
    const progressionTopics = await this.identifyNaturalProgression(masteryLevels, learningPatterns.strongAreas);
    for (const topic of progressionTopics.slice(0, 3)) {
      steps.push({
        id: `progression_${++stepCounter}`,
        topic: topic.name,
        courseId: courseId,
        priority: 3,
        difficulty: learningPatterns.preferredDifficulty,
        estimatedTime: topic.estimatedTime,
        prerequisites: topic.prerequisites,
        reason: `Ready to build on your strong foundation in ${topic.prerequisites.join(', ')}.`,
        resources: await this.getTopicResources(userId, topic.name, 'document'),
        adaptiveReason: 'natural_progression'
      });
    }

    // 4. Reinforcement for partially mastered topics (low priority)
    const reinforcementTopics = masteryLevels.filter(m => m.masteryLevel >= 60 && m.masteryLevel < 80);
    for (const topic of reinforcementTopics.slice(0, 2)) {
      steps.push({
        id: `reinforcement_${++stepCounter}`,
        topic: topic.topic,
        courseId: topic.courseId,
        priority: 4,
        difficulty: 'intermediate',
        estimatedTime: 25,
        prerequisites: [],
        reason: `Strengthen your understanding of ${topic.topic} to achieve mastery.`,
        resources: await this.getTopicResources(userId, topic.topic, 'practice'),
        adaptiveReason: 'reinforcement_needed'
      });
    }

    return steps;
  }

  /**
   * Generate reinforcement steps for struggling topics
   */
  private async generateReinforcementSteps(userId: number, topic: string, courseId?: string): Promise<LearningPathStep[]> {
    return [{
      id: `reinforcement_${Date.now()}`,
      topic: `${topic} - Fundamentals Review`,
      courseId,
      priority: 1,
      difficulty: 'beginner',
      estimatedTime: 20,
      prerequisites: [],
      reason: `Let's revisit the basics of ${topic} to build a stronger foundation.`,
      resources: await this.getTopicResources(userId, topic, 'review'),
      adaptiveReason: 'struggle_pattern'
    }];
  }

  /**
   * Generate accelerated steps for high performers
   */
  private async generateAcceleratedSteps(userId: number, topic: string, courseId?: string): Promise<LearningPathStep[]> {
    return [{
      id: `accelerated_${Date.now()}`,
      topic: `Advanced ${topic} Applications`,
      courseId,
      priority: 3,
      difficulty: 'advanced',
      estimatedTime: 35,
      prerequisites: [topic],
      reason: `Since you've mastered ${topic}, let's explore advanced applications.`,
      resources: await this.getTopicResources(userId, topic, 'practice'),
      adaptiveReason: 'natural_progression'
    }];
  }

  // Helper methods
  private async getMasteryLevels(userId: number, courseId?: string) {
    try {
      let query = db.select().from(studyLevels).where(eq(studyLevels.userId, userId));
      
      if (courseId) {
        query = query.where(eq(studyLevels.courseId, courseId));
      }
      
      return await query.orderBy(desc(studyLevels.masteryLevel));
    } catch (error) {
      console.error('Error fetching mastery levels:', error);
      return [];
    }
  }

  private async getMasteryHistory(userId: number, courseId?: string) {
    // For now, return current mastery levels
    // In a real implementation, you'd have a history table
    return this.getMasteryLevels(userId, courseId);
  }

  private calculateLearningVelocity(masteryHistory: any[]): number {
    // Simple calculation - topics with >80% mastery per week
    const masteredTopics = masteryHistory.filter(m => m.masteryLevel >= 80).length;
    return Math.max(1, Math.floor(masteredTopics / 4)); // Assuming 4 weeks of data
  }

  private determinePreferredDifficulty(masteryHistory: any[]): 'beginner' | 'intermediate' | 'advanced' {
    const averageMastery = masteryHistory.reduce((sum, m) => sum + m.masteryLevel, 0) / masteryHistory.length;
    
    if (averageMastery >= 85) return 'advanced';
    if (averageMastery >= 70) return 'intermediate';
    return 'beginner';
  }

  private async analyzeVoicePatterns(userId: number): Promise<string[]> {
    // Analyze common voice interaction patterns
    // This would integrate with your voice interaction history
    return ['question_asking', 'explanation_seeking', 'example_requesting'];
  }

  private async identifyPrerequisiteGaps(masteryLevels: any[], strongAreas: string[]): Promise<any[]> {
    // Identify topics that are prerequisites for stronger areas but aren't mastered
    return [
      {
        topic: 'Basic Math Foundations',
        difficulty: 'beginner' as const,
        prerequisites: [],
      }
    ];
  }

  private async identifyNaturalProgression(masteryLevels: any[], strongAreas: string[]): Promise<any[]> {
    return strongAreas.slice(0, 2).map(area => ({
      name: `Advanced ${area}`,
      estimatedTime: 40,
      prerequisites: [area]
    }));
  }

  private async getTopicResources(userId: number, topic: string, type: 'document' | 'practice' | 'review' | 'quiz') {
    // Get relevant resources for the topic from user's documents
    try {
      const userDocs = await db.select()
        .from(documents)
        .where(eq(documents.userId, userId))
        .limit(3);

      return userDocs.map(doc => ({
        type: 'document' as const,
        title: doc.title,
        description: `Study material for ${topic}`,
        documentId: doc.id
      }));
    } catch (error) {
      return [{
        type: 'review' as const,
        title: `${topic} Review`,
        description: `Comprehensive review of ${topic} concepts`
      }];
    }
  }

  private generatePathDescription(steps: LearningPathStep[], strugglesCount: number, masteredCount: number): string {
    return `Personalized learning path with ${steps.length} steps. Addressing ${strugglesCount} areas for improvement while building on ${masteredCount} mastered topics.`;
  }

  private async reprioritizeSteps(path: AdaptiveLearningPath, userId: number): Promise<void> {
    // Re-analyze and adjust priorities based on current performance
    const currentStruggles = await semanticMemoryService.getStrugglingTopics(userId);
    
    for (const step of path.steps) {
      if (!path.completedSteps.includes(step.id)) {
        // Increase priority for steps related to current struggles
        const isRelatedToStruggle = currentStruggles.some(s => 
          step.topic.toLowerCase().includes(s.topic.toLowerCase())
        );
        
        if (isRelatedToStruggle) {
          step.priority = Math.max(1, step.priority - 1);
        }
      }
    }
    
    // Re-sort by priority
    path.steps.sort((a, b) => a.priority - b.priority);
  }
}

export const adaptiveLearningService = new AdaptiveLearningService();
