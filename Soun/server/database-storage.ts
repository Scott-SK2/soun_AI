import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { 
  users, 
  courses,
  documents,
  studyLevel,
  type User, 
  type InsertUser, 
  type Course,
  type InsertCourse,
  type Document,
  type InsertDocument,
  type ExamScore,
  type InsertExamScore,
  type QuizQuestion,
  type InsertQuizQuestion,
  type QuizAttempt,
  type InsertQuizAttempt,
  type QuizSession,
  type InsertQuizSession,
  type StudyLevel,
  type InsertStudyLevel
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { IStorage } from "./storage";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  private db = db;
  private connectionRetries = 0;
  private maxRetries = 3;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
    this.ensureConnection();
  }

  private async ensureConnection() {
    try {
      // Test connection with a simple query
      await this.db.select().from(users).limit(1);
    } catch (error) {
      console.error('Database connection failed:', error);
      if (this.connectionRetries < this.maxRetries) {
        this.connectionRetries++;
        console.log(`Retrying database connection... (${this.connectionRetries}/${this.maxRetries})`);
        setTimeout(() => this.ensureConnection(), 2000);
      } else {
        console.error('Max database connection retries exceeded');
      }
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        const result = await operation();
        // Reset connection retries on successful operation
        this.connectionRetries = 0;
        return result;
      } catch (error) {
        retries++;
        console.error(`Database operation failed (attempt ${retries}/${maxRetries}):`, error);
        
        if (retries >= maxRetries) {
          throw new Error(`Database operation failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
    
    throw new Error('Database operation failed');
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.executeWithRetry(() => db.select().from(users).where(eq(users.id, id)));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.executeWithRetry(() => db.select().from(users).where(eq(users.email, email)));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await this.executeWithRetry(() => db.insert(users).values([user]).returning());
    return createdUser;
  }

  async getUserStats(userId: number): Promise<any> {
    // For now, just return basic stats
    return {
      coursesEnrolled: await this.getCourses(userId).then(courses => courses.length),
      totalStudyHours: 0,
      completedAssignments: 0,
      upcomingDeadlines: [],
    };
  }

  // Course methods
  async getCourses(userId: number): Promise<Course[]> {
    return await this.executeWithRetry(() => db.select().from(courses).where(eq(courses.userId, userId)));
  }

  async getCourseById(userId: number, courseId: string): Promise<Course | undefined> {
    const [course] = await this.executeWithRetry(() => db.select()
      .from(courses)
      .where(and(
        eq(courses.userId, userId),
        eq(courses.courseId, courseId)
      )));
    return course;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [createdCourse] = await this.executeWithRetry(() => db.insert(courses).values([course]).returning());
    return createdCourse;
  }

  async getCurriculumOverview(userId: number): Promise<any> {
    const userCourses = await this.getCourses(userId);

    // Return empty data if no real courses exist
    if (userCourses.length === 0) {
      return {
        totalCourses: 0,
        currentSemester: {
          name: "No courses yet",
          courses: []
        },
        courseRelationships: [],
        upcomingCourses: []
      };
    }

    // Process real course data
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentSemester = currentMonth >= 8 ? "Fall" : currentMonth >= 5 ? "Summer" : "Spring";

    const currentSemesterCourses = userCourses
      .filter(course => course.semester === currentSemester && course.year === currentYear)
      .map(course => ({
        courseId: course.courseId,
        name: course.name,
        credits: course.credits || 3,
        progress: Math.floor(Math.random() * 40) + 40 // Random progress between 40-80%
      }));

    // Extract prerequisite relationships
    const courseRelationships: {source: string, target: string, type: string}[] = [];
    userCourses.forEach(course => {
      if (course.prerequisites && course.prerequisites.length > 0) {
        course.prerequisites.forEach(prereq => {
          courseRelationships.push({
            source: prereq,
            target: course.courseId,
            type: "prerequisite"
          });
        });
      }

      if (course.relatedCourses && course.relatedCourses.length > 0) {
        course.relatedCourses.forEach(related => {
          courseRelationships.push({
            source: course.courseId,
            target: related,
            type: "related"
          });
        });
      }
    });

    // Upcoming courses example (courses with future dates)
    const nextSemester = currentSemester === "Spring" ? "Summer" : 
                         currentSemester === "Summer" ? "Fall" : "Spring";
    const nextYear = nextSemester === "Spring" && currentSemester === "Fall" ? currentYear + 1 : currentYear;

    const upcomingCourses = userCourses
      .filter(course => 
        (course.semester === nextSemester && course.year === nextYear) ||
        (course.year > currentYear)
      )
      .map(course => ({
        courseId: course.courseId,
        name: course.name,
        semester: course.semester,
        year: course.year
      }));

    return {
      totalCourses: userCourses.length,
      currentSemester: {
        name: `${currentSemester} ${currentYear}`,
        courses: currentSemesterCourses
      },
      courseRelationships: courseRelationships,
      upcomingCourses: upcomingCourses
    };
  }

  async getRelatedCoursesData(userId: number, courseId: string): Promise<any> {
    const userCourses = await this.getCourses(userId);
    const course = userCourses.find(c => c.courseId === courseId);

    if (!course) {
      return { prerequisites: [], relatedCourses: [] };
    }

    const prerequisiteCourses = course.prerequisites
      ? await Promise.all(course.prerequisites.map(async prereqId => {
          const userCourse = userCourses.find(c => c.courseId === prereqId);
          if (userCourse) {
            return {
              id: userCourse.courseId,
              name: userCourse.name,
              type: "User Course"
            };
          }

          return {
            id: prereqId,
            name: prereqId,
            type: "External Course"
          };
        }))
      : [];

    const relatedCoursesList = course.relatedCourses
      ? await Promise.all(course.relatedCourses.map(async relatedId => {
          const userCourse = userCourses.find(c => c.courseId === relatedId);
          if (userCourse) {
            return {
              id: userCourse.courseId,
              name: userCourse.name,
              type: "User Course"
            };
          }

          return {
            id: relatedId,
            name: relatedId,
            type: "External Course"
          };
        }))
      : [];

    return {
      prerequisites: prerequisiteCourses,
      relatedCourses: relatedCoursesList
    };
  }

  // Assignment methods - Stubbed 
  async getAssignments(userId: number): Promise<any[]> {
    return [];
  }

  async createAssignment(assignment: any): Promise<any> {
    return { id: 1, ...assignment };
  }

  async updateAssignment(id: number, data: any): Promise<any> {
    return { id, ...data };
  }

  // Study session methods - Stubbed
  async getStudySessionsByDate(userId: number, date: string): Promise<any[]> {
    return [];
  }

  async createStudySession(session: any): Promise<any> {
    return { id: 1, ...session };
  }

  async completeStudySession(id: number): Promise<any> {
    return { id, completed: true };
  }

  // Progress methods - Stubbed
  async getWeeklyProgress(userId: number): Promise<any[]> {
    return [];
  }

  async getSubjectDistribution(userId: number): Promise<any[]> {
    return [];
  }

  async getProgressSummary(userId: number): Promise<any> {
    return {};
  }

  async addStudyProgress(progress: any): Promise<any> {
    return progress;
  }

  // Achievements methods - Stubbed
  async getAchievements(userId: number): Promise<any[]> {
    return [];
  }

  async addAchievement(achievement: any): Promise<any> {
    return achievement;
  }

  // Voice commands methods - Stubbed
  async saveVoiceCommand(command: any): Promise<any> {
    return command;
  }

  async getVoiceCommandHistory(userId: number): Promise<any[]> {
    return [];
  }

  async getStudySession(userId: number, sessionId: number): Promise<any> {
    return null;
  }

  // Voice biometrics methods - Stubbed
  async saveVoiceProfile(userId: number, profile: any): Promise<void> {
    // Nothing to return
  }

  async getVoiceProfile(userId: number): Promise<any | null> {
    return null;
  }

  async getAllVoiceProfiles(): Promise<any[]> {
    return [];
  }

  async getStudyQuestions(userId: number, subject: string, count: number = 3): Promise<any[]> {
    return [];
  }

  async checkStudyAnswer(userId: number, questionId: number, answer: string): Promise<any> {
    return { correct: false };
  }

  async getSubjectMaterial(userId: number, subject: string): Promise<any> {
    return {};
  }

  // Exam score methods - Stubbed
  async getExamScores(userId: number): Promise<ExamScore[]> {
    return [];
  }

  async getExamScoresByCourse(userId: number, courseId: string): Promise<ExamScore[]> {
    return [];
  }

  async createExamScore(examScore: InsertExamScore): Promise<ExamScore> {
    return { id: 1, ...examScore } as ExamScore;
  }

  async getExamScoreAnalytics(userId: number): Promise<any> {
    return {};
  }

  // Document methods - Working implementation
  async getDocuments(userId: number): Promise<Document[]> {
    const userDocuments = await this.executeWithRetry(() => db.select().from(documents).where(eq(documents.userId, userId)));
    return userDocuments;
  }

  async getDocumentsByCourse(userId: number, courseId: string): Promise<Document[]> {
    const courseDocuments = await this.executeWithRetry(() => db.select().from(documents).where(
      and(eq(documents.userId, userId), eq(documents.courseId, courseId))
    ));
    return courseDocuments;
  }

  async getDocumentById(docId: number): Promise<Document | undefined> {
    const [document] = await this.executeWithRetry(() => db.select().from(documents).where(eq(documents.id, docId)));
    return document || undefined;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await this.executeWithRetry(() => db
      .insert(documents)
      .values(document)
      .returning());
    return newDocument;
  }

  async extractDocumentContent(docId: number, fileBuffer: Buffer, fileType: string): Promise<Document | undefined> {
    return undefined;
  }

  // Quiz Question methods - Stubbed
  async getQuizQuestions(courseId: string, topic?: string, difficulty?: string): Promise<QuizQuestion[]> {
    return [];
  }

  async getQuizQuestion(questionId: number): Promise<QuizQuestion | undefined> {
    return undefined;
  }

  async createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    return { id: 1, ...question } as QuizQuestion;
  }

  async updateQuizQuestion(questionId: number, question: Partial<InsertQuizQuestion>): Promise<QuizQuestion> {
    return { id: questionId, ...question } as QuizQuestion;
  }

  async deleteQuizQuestion(questionId: number): Promise<boolean> {
    return true;
  }

  // Quiz Attempt methods - Stubbed
  async recordQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    return { id: 1, ...attempt } as QuizAttempt;
  }

  async getQuizAttempts(userId: number, courseId?: string, topic?: string): Promise<QuizAttempt[]> {
    return [];
  }

  async getQuizAttemptById(attemptId: number): Promise<QuizAttempt | undefined> {
    return undefined;
  }

  // Quiz Session methods - Stubbed
  async createQuizSession(session: InsertQuizSession): Promise<QuizSession> {
    return { id: 1, ...session } as QuizSession;
  }

  async updateQuizSession(sessionId: number, sessionData: Partial<InsertQuizSession>): Promise<QuizSession> {
    return { id: sessionId, ...sessionData } as QuizSession;
  }

  async getQuizSessionById(sessionId: number): Promise<QuizSession | undefined> {
    return undefined;
  }

  async getQuizSessionsByUser(userId: number, courseId?: string): Promise<QuizSession[]> {
    return [];
  }

  // Study Level (Mastery) methods - Database implementation
  async getStudyLevelsByCourse(userId: number, courseId: string): Promise<StudyLevel[]> {
    const levels = await this.executeWithRetry(() => db.select()
      .from(studyLevel)
      .where(and(eq(studyLevel.userId, userId), eq(studyLevel.courseId, courseId))));
    return levels;
  }

  async getStudyLevelByTopic(userId: number, courseId: string, topic: string): Promise<StudyLevel | undefined> {
    const [level] = await this.executeWithRetry(() => db.select()
      .from(studyLevel)
      .where(and(
        eq(studyLevel.userId, userId), 
        eq(studyLevel.courseId, courseId),
        eq(studyLevel.topic, topic)
      )));
    return level;
  }

  async updateStudyLevel(userId: number, courseId: string, topic: string, data: Partial<InsertStudyLevel>): Promise<StudyLevel> {
    const [updated] = await this.executeWithRetry(() => db.insert(studyLevel)
      .values({
        userId,
        courseId,
        topic,
        masteryLevel: data.masteryLevel || 0,
        questionsAttempted: data.questionsAttempted || 0,
        questionsCorrect: data.questionsCorrect || 0,
        ...data
      })
      .onConflictDoUpdate({
        target: [studyLevel.userId, studyLevel.courseId, studyLevel.topic],
        set: data
      })
      .returning());
    return updated;
  }

  async getOverallCourseStudyLevel(userId: number, courseId: string): Promise<number> {
    const levels = await this.getStudyLevelsByCourse(userId, courseId);
    if (levels.length === 0) return 0;

    const average = levels.reduce((sum: number, level: StudyLevel) => sum + level.masteryLevel, 0) / levels.length;
    return Math.round(average);
  }

  async getStudyLevelSummary(userId: number): Promise<any> {
    const levels = await this.executeWithRetry(() => db.select()
      .from(studyLevel)
      .where(eq(studyLevel.userId, userId)));

    if (levels.length === 0) {
      return {
        overallMastery: 0,
        topicsStudied: 0,
        totalQuestions: 0,
        correctAnswers: 0
      };
    }

    const totalQuestions = levels.reduce((sum: number, level: StudyLevel) => sum + level.questionsAttempted, 0);
    const correctAnswers = levels.reduce((sum: number, level: StudyLevel) => sum + level.questionsCorrect, 0);
    const overallMastery = levels.reduce((sum: number, level: StudyLevel) => sum + level.masteryLevel, 0) / levels.length;

    // Calculate mastery potential and improvement factors
    const avgAccuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const topicsWithHighMastery = levels.filter(l => l.masteryLevel >= 80).length;
    const topicsWithLowMastery = levels.filter(l => l.masteryLevel < 60).length;
    
    // Predict potential mastery based on current trajectory
    const masteryPotential = this.calculateMasteryPotential(levels, avgAccuracy, totalQuestions);
    
    // Calculate improvement factors
    const improvementFactors = this.calculateImprovementFactors(levels, avgAccuracy, totalQuestions);

    return {
      overallMastery: Math.round(overallMastery),
      topicsStudied: levels.length,
      totalQuestions,
      correctAnswers,
      avgAccuracy: Math.round(avgAccuracy),
      masteryPotential,
      improvementFactors,
      topicsWithHighMastery,
      topicsWithLowMastery
    };
  }

  private calculateMasteryPotential(levels: StudyLevel[], avgAccuracy: number, totalQuestions: number): {
    currentMastery: number;
    projectedMastery: number;
    potentialIncrease: number;
    confidenceLevel: 'low' | 'medium' | 'high';
  } {
    const currentMastery = levels.reduce((sum, l) => sum + l.masteryLevel, 0) / levels.length;
    
    // Factors affecting potential mastery
    const consistencyFactor = this.calculateConsistency(levels);
    const practiceFactor = Math.min(totalQuestions / (levels.length * 20), 1); // Optimal: 20 questions per topic
    const accuracyFactor = avgAccuracy / 100;
    
    // Project potential mastery (realistic ceiling based on current performance)
    const projectedMastery = Math.min(
      currentMastery + (
        (consistencyFactor * 15) + // Up to 15% from consistency
        (practiceFactor * 10) +     // Up to 10% from sufficient practice
        (accuracyFactor * 10)       // Up to 10% from high accuracy
      ),
      95 // Realistic maximum
    );
    
    const potentialIncrease = projectedMastery - currentMastery;
    
    // Determine confidence level
    let confidenceLevel: 'low' | 'medium' | 'high' = 'low';
    if (totalQuestions >= levels.length * 15 && consistencyFactor > 0.6) {
      confidenceLevel = 'high';
    } else if (totalQuestions >= levels.length * 8 && consistencyFactor > 0.4) {
      confidenceLevel = 'medium';
    }
    
    return {
      currentMastery: Math.round(currentMastery),
      projectedMastery: Math.round(projectedMastery),
      potentialIncrease: Math.round(potentialIncrease),
      confidenceLevel
    };
  }

  private calculateConsistency(levels: StudyLevel[]): number {
    if (levels.length === 0) return 0;
    
    const masteryLevels = levels.map(l => l.masteryLevel);
    const mean = masteryLevels.reduce((sum, m) => sum + m, 0) / masteryLevels.length;
    const variance = masteryLevels.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / masteryLevels.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower std dev = higher consistency (normalized to 0-1)
    return Math.max(0, 1 - (stdDev / 50));
  }

  private calculateImprovementFactors(levels: StudyLevel[], avgAccuracy: number, totalQuestions: number): {
    factors: Array<{
      factor: string;
      current: number;
      target: number;
      impact: 'high' | 'medium' | 'low';
      recommendations: string[];
    }>;
    overallImpactScore: number;
  } {
    const factors = [];
    let totalImpact = 0;

    // Factor 1: Practice Volume
    const avgQuestionsPerTopic = totalQuestions / levels.length;
    const practiceScore = Math.min(avgQuestionsPerTopic / 20, 1) * 100;
    if (practiceScore < 80) {
      factors.push({
        factor: 'Practice Volume',
        current: Math.round(practiceScore),
        target: 100,
        impact: practiceScore < 50 ? 'high' : 'medium',
        recommendations: [
          'Complete at least 15-20 practice questions per topic',
          'Use spaced repetition - practice topics multiple times over weeks',
          'Focus on weak topics identified in your learning insights'
        ]
      });
      totalImpact += (practiceScore < 50 ? 3 : 2);
    }

    // Factor 2: Accuracy Consistency
    const accuracyScore = avgAccuracy;
    if (accuracyScore < 85) {
      factors.push({
        factor: 'Answer Accuracy',
        current: Math.round(accuracyScore),
        target: 90,
        impact: accuracyScore < 70 ? 'high' : 'medium',
        recommendations: [
          'Review incorrect answers thoroughly to understand mistakes',
          'Use the Feynman Technique - explain concepts in simple terms',
          'Create concept maps to connect related ideas',
          'Take advantage of post-question explanations'
        ]
      });
      totalImpact += (accuracyScore < 70 ? 3 : 2);
    }

    // Factor 3: Topic Coverage
    const consistencyScore = this.calculateConsistency(levels) * 100;
    if (consistencyScore < 70) {
      factors.push({
        factor: 'Study Consistency',
        current: Math.round(consistencyScore),
        target: 85,
        impact: 'high',
        recommendations: [
          'Balance your study time across all topics',
          'Don\'t neglect difficult topics - they need more attention',
          'Use the adaptive learning path to identify gaps',
          'Set up regular study sessions (e.g., Pomodoro technique)'
        ]
      });
      totalImpact += 3;
    }

    // Factor 4: Vocal Learning Usage
    const vocalLearningScore = 40; // Placeholder - can be enhanced with actual voice data
    if (vocalLearningScore < 60) {
      factors.push({
        factor: 'Active Recall & Vocal Learning',
        current: vocalLearningScore,
        target: 75,
        impact: 'medium',
        recommendations: [
          'Use voice flashcards to practice active recall',
          'Explain concepts out loud to yourself or others',
          'Record yourself explaining topics and listen back',
          'Use the vocal practice helper for problem-solving'
        ]
      });
      totalImpact += 2;
    }

    // Factor 5: Regular Review
    const reviewScore = 50; // Placeholder - can calculate from last updated dates
    if (reviewScore < 75) {
      factors.push({
        factor: 'Regular Review',
        current: reviewScore,
        target: 85,
        impact: 'high',
        recommendations: [
          'Review topics at increasing intervals (1 day, 3 days, 1 week)',
          'Use interleaved practice - mix different problem types',
          'Revisit mastered topics monthly to prevent forgetting',
          'Set up study reminders for review sessions'
        ]
      });
      totalImpact += 3;
    }

    return {
      factors,
      overallImpactScore: Math.min(totalImpact / 15 * 100, 100) // Normalized to 100
    };
  }
}