
import { db } from "../db";
import { eq, and, desc, sql, gte, between } from "drizzle-orm";
import { users, courses, documents, studyLevel as studyLevels } from "../../shared/schema";

export interface VoiceInteraction {
  id: string;
  userId: number;
  timestamp: Date;
  command: string;
  response: string;
  category: 'explanation' | 'navigation' | 'quiz' | 'study_session' | 'flashcard' | 'document_query' | 'other';
  courseContext?: string;
  duration: number; // in seconds
  audioFeatures?: {
    pitch: number;
    speed: number;
    volume: number;
    pauses: number;
  };
  emotionDetected?: {
    primaryEmotion: string;
    confidence: number;
    frustration?: number;
    confusion?: number;
  };
  contextData?: {
    multiModal?: boolean;
    adaptiveResponse?: boolean;
    strugglingTopics?: string[];
    followUpQuestions?: number;
  };
  outcomeMetrics?: {
    immediateUnderstanding?: number; // 1-5 scale
    retentionScore?: number; // calculated later
    engagementLevel?: number; // 1-5 scale
    completionRate?: number; // 0-1
  };
}

export interface LearningOutcome {
  userId: number;
  topic: string;
  courseId?: string;
  preInteractionMastery: number;
  postInteractionMastery: number;
  improvementScore: number;
  interactionIds: string[];
  timestamp: Date;
  retentionAfter24h?: number;
  retentionAfter7d?: number;
}

export interface AnalyticsInsight {
  type: 'interaction_pattern' | 'optimal_timing' | 'effective_features' | 'learning_velocity';
  title: string;
  description: string;
  data: any;
  confidence: number;
  recommendations: string[];
}

class VoiceAnalyticsService {
  private interactions = new Map<number, VoiceInteraction[]>();
  private learningOutcomes = new Map<number, LearningOutcome[]>();

  /**
   * Record a voice interaction with detailed metadata
   */
  async recordInteraction(interaction: Omit<VoiceInteraction, 'id'>): Promise<string> {
    const interactionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullInteraction: VoiceInteraction = {
      ...interaction,
      id: interactionId
    };

    // Store in memory (in production, this would go to a database)
    const userInteractions = this.interactions.get(interaction.userId) || [];
    userInteractions.push(fullInteraction);
    this.interactions.set(interaction.userId, userInteractions);

    // Analyze immediate patterns
    await this.analyzeImmediatePatterns(interaction.userId, fullInteraction);

    console.log(`Recorded voice interaction: ${interactionId} for user ${interaction.userId}`);
    return interactionId;
  }

  /**
   * Record learning outcome after a voice interaction
   */
  async recordLearningOutcome(outcome: LearningOutcome): Promise<void> {
    const userOutcomes = this.learningOutcomes.get(outcome.userId) || [];
    userOutcomes.push(outcome);
    this.learningOutcomes.set(outcome.userId, userOutcomes);

    // Update related interactions with outcome data
    await this.updateInteractionOutcomes(outcome);

    console.log(`Recorded learning outcome for user ${outcome.userId}: ${outcome.topic}`);
  }

  /**
   * Generate comprehensive analytics insights
   */
  async generateAnalyticsInsights(userId: number, timeframe: 'day' | 'week' | 'month' = 'week'): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];
    const userInteractions = this.getUserInteractions(userId, timeframe);
    const userOutcomes = this.getUserOutcomes(userId, timeframe);

    // 1. Interaction Pattern Analysis
    const patternInsights = await this.analyzeInteractionPatterns(userInteractions);
    insights.push(...patternInsights);

    // 2. Optimal Timing Analysis
    const timingInsights = await this.analyzeOptimalTiming(userInteractions, userOutcomes);
    insights.push(...timingInsights);

    // 3. Feature Effectiveness Analysis
    const featureInsights = await this.analyzeFeatureEffectiveness(userInteractions, userOutcomes);
    insights.push(...featureInsights);

    // 4. Learning Velocity Analysis
    const velocityInsights = await this.analyzeLearningVelocity(userOutcomes);
    insights.push(...velocityInsights);

    // 5. Vocal Learning Style Analysis
    const vocalStyleInsights = await this.analyzeVocalLearningStyle(userInteractions);
    insights.push(...vocalStyleInsights);

    // 6. Cognitive Load Assessment
    const cognitiveLoadInsights = await this.analyzeCognitiveLoad(userInteractions);
    insights.push(...cognitiveLoadInsights);

    // 7. Memory Retention Patterns
    const memoryInsights = await this.analyzeMemoryRetention(userInteractions, userOutcomes);
    insights.push(...memoryInsights);

    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze vocal learning style preferences
   */
  private async analyzeVocalLearningStyle(interactions: VoiceInteraction[]): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    // Analyze speaking patterns
    const avgSpeechSpeed = this.calculateAverageSpeechSpeed(interactions);
    const preferredExplanationLength = this.calculatePreferredExplanationLength(interactions);
    const emotionalEngagement = this.analyzeEmotionalEngagement(interactions);

    // Determine optimal vocal learning style
    let preferredStyle = 'balanced';
    if (avgSpeechSpeed > 160) {
      preferredStyle = 'fast-paced';
    } else if (avgSpeechSpeed < 120) {
      preferredStyle = 'methodical';
    }

    insights.push({
      type: 'learning_velocity',
      title: `${preferredStyle.charAt(0).toUpperCase() + preferredStyle.slice(1)} Vocal Learner`,
      description: `Your speaking patterns indicate you learn best with ${preferredStyle} explanations`,
      data: {
        avgSpeechSpeed,
        preferredExplanationLength,
        emotionalEngagement,
        style: preferredStyle
      },
      confidence: 0.82,
      recommendations: this.generateVocalStyleRecommendations(preferredStyle, avgSpeechSpeed)
    });

    return insights;
  }

  /**
   * Analyze cognitive load during vocal learning
   */
  private async analyzeCognitiveLoad(interactions: VoiceInteraction[]): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    const complexityIndicators = this.analyzeCognitiveDemand(interactions);
    
    if (complexityIndicators.overloadRisk > 0.7) {
      insights.push({
        type: 'interaction_pattern',
        title: 'Cognitive Overload Risk Detected',
        description: 'Your vocal learning sessions show signs of cognitive strain',
        data: complexityIndicators,
        confidence: 0.85,
        recommendations: [
          'Break complex topics into smaller vocal explanations',
          'Take more breaks between vocal practice sessions',
          'Focus on one concept at a time when speaking',
          'Use simpler vocabulary initially, then build complexity'
        ]
      });
    }

    return insights;
  }

  /**
   * Analyze memory retention patterns from vocal practice
   */
  private async analyzeMemoryRetention(interactions: VoiceInteraction[], outcomes: LearningOutcome[]): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    const retentionPatterns = this.analyzeVocalRetentionPatterns(interactions, outcomes);
    
    if (retentionPatterns.vocalAdvantage > 0.15) {
      insights.push({
        type: 'effective_features',
        title: 'Strong Vocal Memory Enhancement',
        description: 'Speaking concepts aloud significantly improves your retention',
        data: retentionPatterns,
        confidence: 0.88,
        recommendations: [
          'Continue prioritizing vocal explanation practice',
          'Record yourself explaining key concepts for review',
          'Teach concepts to others or explain to an imaginary audience',
          'Use the "vocal teaching" method for difficult topics'
        ]
      });
    }

    return insights;
  }

  // Helper methods for new analytics features
  private calculateAverageSpeechSpeed(interactions: VoiceInteraction[]): number {
    const speechInteractions = interactions.filter(i => i.audioFeatures?.speed);
    if (speechInteractions.length === 0) return 150; // default WPM
    
    return speechInteractions.reduce((sum, i) => sum + (i.audioFeatures?.speed || 150), 0) / speechInteractions.length;
  }

  private calculatePreferredExplanationLength(interactions: VoiceInteraction[]): number {
    const explanationInteractions = interactions.filter(i => i.category === 'explanation');
    if (explanationInteractions.length === 0) return 60; // default seconds
    
    return explanationInteractions.reduce((sum, i) => sum + i.duration, 0) / explanationInteractions.length;
  }

  private analyzeEmotionalEngagement(interactions: VoiceInteraction[]): number {
    const emotionalInteractions = interactions.filter(i => i.emotionDetected);
    if (emotionalInteractions.length === 0) return 0.5;
    
    const positiveEmotions = emotionalInteractions.filter(i => 
      ['joy', 'excitement', 'confidence', 'satisfaction'].includes(i.emotionDetected?.primaryEmotion || '')
    );
    
    return positiveEmotions.length / emotionalInteractions.length;
  }

  private generateVocalStyleRecommendations(style: string, speed: number): string[] {
    const recommendations: string[] = [];
    
    switch (style) {
      case 'fast-paced':
        recommendations.push('Use rapid-fire explanation drills for memorization');
        recommendations.push('Practice summarizing concepts in 30 seconds or less');
        recommendations.push('Try speed teaching techniques');
        break;
      case 'methodical':
        recommendations.push('Take time to elaborate on each step when speaking');
        recommendations.push('Use detailed verbal walkthroughs');
        recommendations.push('Practice explaining with multiple examples');
        break;
      default:
        recommendations.push('Vary your speaking pace based on concept difficulty');
        recommendations.push('Use both quick summaries and detailed explanations');
        break;
    }
    
    return recommendations;
  }

  private analyzeCognitiveDemand(interactions: VoiceInteraction[]): any {
    // Analyze indicators of cognitive overload
    const frustratedSessions = interactions.filter(i => 
      i.emotionDetected?.frustration && i.emotionDetected.frustration > 0.6
    ).length;
    
    const confusedSessions = interactions.filter(i => 
      i.emotionDetected?.confusion && i.emotionDetected.confusion > 0.6
    ).length;
    
    const longPauses = interactions.filter(i => 
      i.audioFeatures?.pauses && i.audioFeatures.pauses > 5
    ).length;
    
    const totalSessions = interactions.length;
    
    return {
      overloadRisk: totalSessions > 0 ? (frustratedSessions + confusedSessions + longPauses) / (totalSessions * 3) : 0,
      frustrationRate: totalSessions > 0 ? frustratedSessions / totalSessions : 0,
      confusionRate: totalSessions > 0 ? confusedSessions / totalSessions : 0,
      pauseFrequency: totalSessions > 0 ? longPauses / totalSessions : 0
    };
  }

  private analyzeVocalRetentionPatterns(interactions: VoiceInteraction[], outcomes: LearningOutcome[]): any {
    const vocalOutcomes = outcomes.filter(o => 
      o.interactionIds.some(id => {
        const interaction = interactions.find(i => i.id === id);
        return interaction?.category === 'explanation' || interaction?.category === 'study_session';
      })
    );
    
    const nonVocalOutcomes = outcomes.filter(o => !vocalOutcomes.includes(o));
    
    const vocalRetention = vocalOutcomes.length > 0 
      ? vocalOutcomes.reduce((sum, o) => sum + (o.retentionAfter24h || 0), 0) / vocalOutcomes.length
      : 0;
      
    const nonVocalRetention = nonVocalOutcomes.length > 0
      ? nonVocalOutcomes.reduce((sum, o) => sum + (o.retentionAfter24h || 0), 0) / nonVocalOutcomes.length
      : 0;
    
    return {
      vocalRetention,
      nonVocalRetention,
      vocalAdvantage: vocalRetention - nonVocalRetention,
      vocalSampleSize: vocalOutcomes.length,
      nonVocalSampleSize: nonVocalOutcomes.length
    };
  }

  /**
   * Get optimized interaction recommendations
   */
  async getOptimizationRecommendations(userId: number): Promise<{
    personalizedSettings: any;
    interactionStrategies: string[];
    timingRecommendations: string[];
    featureAdjustments: any;
  }> {
    const insights = await this.generateAnalyticsInsights(userId, 'month');
    const userInteractions = this.getUserInteractions(userId, 'month');
    
    // Analyze most effective interaction types
    const effectiveCategories = this.getMostEffectiveCategories(userInteractions);
    
    // Analyze optimal emotion states
    const optimalEmotions = this.getOptimalEmotionStates(userInteractions);
    
    // Analyze best timing patterns
    const optimalTiming = this.getOptimalTimingPatterns(userInteractions);

    return {
      personalizedSettings: {
        preferredInteractionTypes: effectiveCategories,
        optimalEmotionThreshold: optimalEmotions,
        recommendedSessionLength: this.getOptimalSessionLength(userInteractions),
        adaptiveResponseLevel: this.getOptimalAdaptiveLevel(userInteractions)
      },
      interactionStrategies: this.generateInteractionStrategies(insights),
      timingRecommendations: this.generateTimingRecommendations(optimalTiming),
      featureAdjustments: this.generateFeatureAdjustments(insights)
    };
  }

  /**
   * Track real-time learning effectiveness
   */
  async trackRealTimeLearningEffectiveness(
    userId: number,
    interactionId: string,
    feedbackType: 'immediate_understanding' | 'follow_up_question' | 'quiz_performance' | 'retention_check',
    score: number
  ): Promise<void> {
    const userInteractions = this.interactions.get(userId) || [];
    const interaction = userInteractions.find(i => i.id === interactionId);

    if (interaction) {
      if (!interaction.outcomeMetrics) {
        interaction.outcomeMetrics = {};
      }

      switch (feedbackType) {
        case 'immediate_understanding':
          interaction.outcomeMetrics.immediateUnderstanding = score;
          break;
        case 'follow_up_question':
          interaction.outcomeMetrics.followUpQuestions = (interaction.outcomeMetrics.followUpQuestions || 0) + 1;
          break;
        case 'quiz_performance':
          interaction.outcomeMetrics.retentionScore = score;
          break;
        case 'retention_check':
          interaction.outcomeMetrics.engagementLevel = score;
          break;
      }

      // Update the stored interaction
      const index = userInteractions.findIndex(i => i.id === interactionId);
      if (index !== -1) {
        userInteractions[index] = interaction;
        this.interactions.set(userId, userInteractions);
      }
    }
  }

  /**
   * Get performance dashboard data
   */
  async getPerformanceDashboard(userId: number): Promise<{
    overallEffectiveness: number;
    categoryPerformance: Array<{
      category: string;
      effectiveness: number;
      volume: number;
      trend: 'improving' | 'stable' | 'declining';
    }>;
    learningVelocity: number;
    retentionRate: number;
    engagementMetrics: {
      averageSessionLength: number;
      interactionsPerDay: number;
      completionRate: number;
    };
    recommendations: string[];
  }> {
    const userInteractions = this.getUserInteractions(userId, 'month');
    const userOutcomes = this.getUserOutcomes(userId, 'month');

    // Calculate overall effectiveness
    const overallEffectiveness = this.calculateOverallEffectiveness(userInteractions, userOutcomes);

    // Calculate category performance
    const categoryPerformance = await this.calculateCategoryPerformance(userInteractions, userOutcomes);

    // Calculate learning velocity
    const learningVelocity = this.calculateLearningVelocity(userOutcomes);

    // Calculate retention rate
    const retentionRate = this.calculateRetentionRate(userOutcomes);

    // Calculate engagement metrics
    const engagementMetrics = this.calculateEngagementMetrics(userInteractions);

    // Generate recommendations
    const recommendations = await this.generateDashboardRecommendations(userId, categoryPerformance, engagementMetrics);

    return {
      overallEffectiveness,
      categoryPerformance,
      learningVelocity,
      retentionRate,
      engagementMetrics,
      recommendations
    };
  }

  // Helper methods
  private getUserInteractions(userId: number, timeframe: string): VoiceInteraction[] {
    const userInteractions = this.interactions.get(userId) || [];
    const cutoffDate = this.getTimeframeCutoff(timeframe);
    return userInteractions.filter(i => i.timestamp >= cutoffDate);
  }

  private getUserOutcomes(userId: number, timeframe: string): LearningOutcome[] {
    const userOutcomes = this.learningOutcomes.get(userId) || [];
    const cutoffDate = this.getTimeframeCutoff(timeframe);
    return userOutcomes.filter(o => o.timestamp >= cutoffDate);
  }

  private getTimeframeCutoff(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  private async analyzeInteractionPatterns(interactions: VoiceInteraction[]): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    // Analyze category distribution
    const categoryStats = this.getCategoryStatistics(interactions);
    
    // Find most effective patterns
    const effectivePatterns = Object.entries(categoryStats)
      .filter(([_, stats]) => stats.avgOutcome > 3.5)
      .sort(([_, a], [__, b]) => b.avgOutcome - a.avgOutcome);

    if (effectivePatterns.length > 0) {
      insights.push({
        type: 'interaction_pattern',
        title: 'Most Effective Interaction Types',
        description: `${effectivePatterns[0][0]} interactions show the highest learning effectiveness`,
        data: { patterns: effectivePatterns },
        confidence: 0.85,
        recommendations: [
          `Focus more on ${effectivePatterns[0][0]} type interactions`,
          'Consider restructuring less effective interaction types'
        ]
      });
    }

    return insights;
  }

  private async analyzeOptimalTiming(interactions: VoiceInteraction[], outcomes: LearningOutcome[]): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    // Analyze time-of-day effectiveness
    const hourlyStats = this.getHourlyStatistics(interactions);
    const bestHours = Object.entries(hourlyStats)
      .sort(([_, a], [__, b]) => b.effectiveness - a.effectiveness)
      .slice(0, 3);

    insights.push({
      type: 'optimal_timing',
      title: 'Peak Learning Hours',
      description: `Learning effectiveness is highest between ${bestHours[0][0]}:00-${parseInt(bestHours[0][0]) + 1}:00`,
      data: { hourlyStats, bestHours },
      confidence: 0.78,
      recommendations: [
        `Schedule study sessions around ${bestHours[0][0]}:00`,
        'Consider push notifications during peak effectiveness hours'
      ]
    });

    return insights;
  }

  private async analyzeFeatureEffectiveness(interactions: VoiceInteraction[], outcomes: LearningOutcome[]): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    // Analyze multi-modal vs text-only
    const multiModalStats = this.getFeatureStatistics(interactions, 'multiModal');
    const adaptiveStats = this.getFeatureStatistics(interactions, 'adaptiveResponse');

    if (multiModalStats.withFeature.avgOutcome > multiModalStats.withoutFeature.avgOutcome + 0.5) {
      insights.push({
        type: 'effective_features',
        title: 'Multi-Modal Learning Advantage',
        description: 'Visual aids significantly improve learning outcomes',
        data: multiModalStats,
        confidence: 0.82,
        recommendations: [
          'Prioritize multi-modal responses for complex topics',
          'Generate visual aids for all explanation requests'
        ]
      });
    }

    return insights;
  }

  private async analyzeLearningVelocity(outcomes: LearningOutcome[]): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    if (outcomes.length < 5) return insights;

    // Calculate velocity trend
    const velocityTrend = this.calculateVelocityTrend(outcomes);
    
    insights.push({
      type: 'learning_velocity',
      title: 'Learning Acceleration',
      description: `Learning velocity is ${velocityTrend.trend} by ${velocityTrend.percentage}%`,
      data: { trend: velocityTrend },
      confidence: 0.75,
      recommendations: [
        velocityTrend.trend === 'improving' 
          ? 'Maintain current study patterns' 
          : 'Consider adjusting study frequency or methods'
      ]
    });

    return insights;
  }

  // Statistical calculation helpers
  private getCategoryStatistics(interactions: VoiceInteraction[]): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const category of ['explanation', 'navigation', 'quiz', 'study_session', 'flashcard']) {
      const categoryInteractions = interactions.filter(i => i.category === category);
      const outcomes = categoryInteractions
        .map(i => i.outcomeMetrics?.immediateUnderstanding || 0)
        .filter(o => o > 0);
      
      stats[category] = {
        count: categoryInteractions.length,
        avgOutcome: outcomes.length > 0 ? outcomes.reduce((a, b) => a + b, 0) / outcomes.length : 0,
        effectiveness: this.calculateCategoryEffectiveness(categoryInteractions)
      };
    }
    
    return stats;
  }

  private getHourlyStatistics(interactions: VoiceInteraction[]): Record<string, any> {
    const hourlyStats: Record<string, any> = {};
    
    for (let hour = 0; hour < 24; hour++) {
      const hourInteractions = interactions.filter(i => i.timestamp.getHours() === hour);
      const effectiveness = this.calculateHourEffectiveness(hourInteractions);
      
      hourlyStats[hour.toString()] = {
        count: hourInteractions.length,
        effectiveness,
        avgDuration: hourInteractions.reduce((sum, i) => sum + i.duration, 0) / Math.max(1, hourInteractions.length)
      };
    }
    
    return hourlyStats;
  }

  private getFeatureStatistics(interactions: VoiceInteraction[], feature: string): any {
    const withFeature = interactions.filter(i => i.contextData?.[feature] === true);
    const withoutFeature = interactions.filter(i => i.contextData?.[feature] !== true);
    
    return {
      withFeature: {
        count: withFeature.length,
        avgOutcome: this.calculateAverageOutcome(withFeature)
      },
      withoutFeature: {
        count: withoutFeature.length,
        avgOutcome: this.calculateAverageOutcome(withoutFeature)
      }
    };
  }

  private calculateOverallEffectiveness(interactions: VoiceInteraction[], outcomes: LearningOutcome[]): number {
    if (interactions.length === 0) return 0;
    
    const totalOutcomes = interactions
      .map(i => i.outcomeMetrics?.immediateUnderstanding || 0)
      .filter(o => o > 0);
    
    return totalOutcomes.length > 0 
      ? totalOutcomes.reduce((a, b) => a + b, 0) / totalOutcomes.length / 5 * 100
      : 0;
  }

  private async calculateCategoryPerformance(interactions: VoiceInteraction[], outcomes: LearningOutcome[]): Promise<any[]> {
    const categories = ['explanation', 'navigation', 'quiz', 'study_session', 'flashcard'];
    
    return categories.map(category => {
      const categoryInteractions = interactions.filter(i => i.category === category);
      const effectiveness = this.calculateCategoryEffectiveness(categoryInteractions);
      
      return {
        category,
        effectiveness,
        volume: categoryInteractions.length,
        trend: this.calculateCategoryTrend(categoryInteractions)
      };
    });
  }

  private calculateLearningVelocity(outcomes: LearningOutcome[]): number {
    if (outcomes.length < 2) return 0;
    
    const totalImprovement = outcomes.reduce((sum, o) => sum + o.improvementScore, 0);
    const timeSpan = Math.max(1, (new Date().getTime() - outcomes[0].timestamp.getTime()) / (7 * 24 * 60 * 60 * 1000)); // weeks
    
    return totalImprovement / timeSpan;
  }

  private calculateRetentionRate(outcomes: LearningOutcome[]): number {
    const withRetentionData = outcomes.filter(o => o.retentionAfter24h !== undefined);
    
    if (withRetentionData.length === 0) return 0;
    
    return withRetentionData.reduce((sum, o) => sum + (o.retentionAfter24h || 0), 0) / withRetentionData.length;
  }

  private calculateEngagementMetrics(interactions: VoiceInteraction[]): any {
    if (interactions.length === 0) {
      return {
        averageSessionLength: 0,
        interactionsPerDay: 0,
        completionRate: 0
      };
    }
    
    const avgSessionLength = interactions.reduce((sum, i) => sum + i.duration, 0) / interactions.length;
    const daySpan = Math.max(1, (new Date().getTime() - interactions[0].timestamp.getTime()) / (24 * 60 * 60 * 1000));
    const interactionsPerDay = interactions.length / daySpan;
    const completionRate = interactions.filter(i => (i.outcomeMetrics?.completionRate || 0) > 0.8).length / interactions.length;
    
    return {
      averageSessionLength,
      interactionsPerDay,
      completionRate
    };
  }

  // Additional helper methods
  private calculateCategoryEffectiveness(interactions: VoiceInteraction[]): number {
    if (interactions.length === 0) return 0;
    return this.calculateAverageOutcome(interactions);
  }

  private calculateHourEffectiveness(interactions: VoiceInteraction[]): number {
    if (interactions.length === 0) return 0;
    return this.calculateAverageOutcome(interactions);
  }

  private calculateAverageOutcome(interactions: VoiceInteraction[]): number {
    const outcomes = interactions
      .map(i => i.outcomeMetrics?.immediateUnderstanding || 0)
      .filter(o => o > 0);
    
    return outcomes.length > 0 ? outcomes.reduce((a, b) => a + b, 0) / outcomes.length : 0;
  }

  private calculateCategoryTrend(interactions: VoiceInteraction[]): 'improving' | 'stable' | 'declining' {
    if (interactions.length < 4) return 'stable';
    
    const recent = interactions.slice(-Math.floor(interactions.length / 2));
    const older = interactions.slice(0, Math.floor(interactions.length / 2));
    
    const recentAvg = this.calculateAverageOutcome(recent);
    const olderAvg = this.calculateAverageOutcome(older);
    
    if (recentAvg > olderAvg + 0.2) return 'improving';
    if (recentAvg < olderAvg - 0.2) return 'declining';
    return 'stable';
  }

  private calculateVelocityTrend(outcomes: LearningOutcome[]): any {
    if (outcomes.length < 4) return { trend: 'stable', percentage: 0 };
    
    const recent = outcomes.slice(-Math.floor(outcomes.length / 2));
    const older = outcomes.slice(0, Math.floor(outcomes.length / 2));
    
    const recentVelocity = recent.reduce((sum, o) => sum + o.improvementScore, 0) / recent.length;
    const olderVelocity = older.reduce((sum, o) => sum + o.improvementScore, 0) / older.length;
    
    const change = ((recentVelocity - olderVelocity) / Math.max(0.1, olderVelocity)) * 100;
    
    return {
      trend: change > 10 ? 'improving' : change < -10 ? 'declining' : 'stable',
      percentage: Math.abs(Math.round(change))
    };
  }

  private async analyzeImmediatePatterns(userId: number, interaction: VoiceInteraction): Promise<void> {
    // Immediate pattern analysis for real-time optimization
    const recentInteractions = this.getUserInteractions(userId, 'day');
    
    if (recentInteractions.length > 5) {
      const pattern = this.detectImmediatePattern(recentInteractions);
      if (pattern.shouldOptimize) {
        console.log(`Optimization opportunity detected for user ${userId}:`, pattern.recommendation);
      }
    }
  }

  private detectImmediatePattern(interactions: VoiceInteraction[]): any {
    // Detect patterns that require immediate optimization
    const frustrationCount = interactions.filter(i => 
      i.emotionDetected?.frustration && i.emotionDetected.frustration > 0.7
    ).length;
    
    if (frustrationCount >= 3) {
      return {
        shouldOptimize: true,
        recommendation: 'Switch to simpler explanations and more encouragement'
      };
    }
    
    return { shouldOptimize: false };
  }

  private async updateInteractionOutcomes(outcome: LearningOutcome): Promise<void> {
    const userId = outcome.userId;
    const userInteractions = this.interactions.get(userId) || [];
    
    // Update related interactions with outcome data
    for (const interactionId of outcome.interactionIds) {
      const interaction = userInteractions.find(i => i.id === interactionId);
      if (interaction) {
        if (!interaction.outcomeMetrics) {
          interaction.outcomeMetrics = {};
        }
        interaction.outcomeMetrics.retentionScore = outcome.improvementScore;
      }
    }
  }

  private getMostEffectiveCategories(interactions: VoiceInteraction[]): string[] {
    const categoryStats = this.getCategoryStatistics(interactions);
    return Object.entries(categoryStats)
      .sort(([_, a], [__, b]) => b.effectiveness - a.effectiveness)
      .slice(0, 3)
      .map(([category, _]) => category);
  }

  private getOptimalEmotionStates(interactions: VoiceInteraction[]): any {
    const positiveOutcomes = interactions.filter(i => 
      (i.outcomeMetrics?.immediateUnderstanding || 0) >= 4
    );
    
    const avgConfidence = positiveOutcomes.reduce((sum, i) => 
      sum + (i.emotionDetected?.confidence || 0), 0
    ) / Math.max(1, positiveOutcomes.length);
    
    return { optimalConfidenceThreshold: avgConfidence };
  }

  private getOptimalTimingPatterns(interactions: VoiceInteraction[]): any {
    const hourlyStats = this.getHourlyStatistics(interactions);
    const bestHour = Object.entries(hourlyStats)
      .sort(([_, a], [__, b]) => b.effectiveness - a.effectiveness)[0];
    
    return { 
      peakHour: parseInt(bestHour[0]),
      effectiveness: bestHour[1].effectiveness 
    };
  }

  private getOptimalSessionLength(interactions: VoiceInteraction[]): number {
    const effectiveInteractions = interactions.filter(i => 
      (i.outcomeMetrics?.immediateUnderstanding || 0) >= 4
    );
    
    return effectiveInteractions.length > 0
      ? effectiveInteractions.reduce((sum, i) => sum + i.duration, 0) / effectiveInteractions.length
      : 300; // default 5 minutes
  }

  private getOptimalAdaptiveLevel(interactions: VoiceInteraction[]): number {
    const adaptiveInteractions = interactions.filter(i => i.contextData?.adaptiveResponse);
    const regularInteractions = interactions.filter(i => !i.contextData?.adaptiveResponse);
    
    const adaptiveAvg = this.calculateAverageOutcome(adaptiveInteractions);
    const regularAvg = this.calculateAverageOutcome(regularInteractions);
    
    return adaptiveAvg > regularAvg ? 0.8 : 0.4; // High vs low adaptive response rate
  }

  private generateInteractionStrategies(insights: AnalyticsInsight[]): string[] {
    const strategies: string[] = [];
    
    for (const insight of insights) {
      if (insight.type === 'interaction_pattern' && insight.confidence > 0.8) {
        strategies.push(`Prioritize ${insight.title.toLowerCase()} based on high effectiveness`);
      }
      if (insight.type === 'effective_features') {
        strategies.push('Increase use of visual aids and adaptive responses');
      }
    }
    
    return strategies.slice(0, 3);
  }

  private generateTimingRecommendations(timing: any): string[] {
    return [
      `Schedule learning sessions around ${timing.peakHour}:00 for optimal effectiveness`,
      'Send study reminders 30 minutes before peak learning hours',
      'Avoid complex topics during low-effectiveness hours'
    ];
  }

  private generateFeatureAdjustments(insights: AnalyticsInsight[]): any {
    const adjustments: any = {};
    
    for (const insight of insights) {
      if (insight.type === 'effective_features') {
        adjustments.multiModalPriority = insight.confidence > 0.8 ? 'high' : 'medium';
      }
      if (insight.type === 'interaction_pattern') {
        adjustments.responseStyle = insight.confidence > 0.8 ? 'personalized' : 'standard';
      }
    }
    
    return adjustments;
  }

  private async generateDashboardRecommendations(
    userId: number, 
    categoryPerformance: any[], 
    engagementMetrics: any
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Analyze category performance
    const weakestCategory = categoryPerformance.sort((a, b) => a.effectiveness - b.effectiveness)[0];
    if (weakestCategory.effectiveness < 50) {
      recommendations.push(`Focus on improving ${weakestCategory.category} interactions`);
    }
    
    // Analyze engagement
    if (engagementMetrics.completionRate < 0.6) {
      recommendations.push('Break down learning sessions into shorter, more focused segments');
    }
    
    if (engagementMetrics.interactionsPerDay < 2) {
      recommendations.push('Increase daily voice interaction frequency for better retention');
    }
    
    return recommendations.slice(0, 4);
  }
}

export const voiceAnalyticsService = new VoiceAnalyticsService();
