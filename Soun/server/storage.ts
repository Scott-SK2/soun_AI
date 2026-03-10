import { 
  users, 
  type User, 
  type InsertUser, 
  type Assignment, 
  type StudySession, 
  type VoiceCommand, 
  type ExamScore, 
  type InsertExamScore,
  type Course,
  type InsertCourse,
  type Document,
  type InsertDocument,
  type QuizQuestion,
  type InsertQuizQuestion,
  type QuizAttempt,
  type InsertQuizAttempt,
  type QuizSession,
  type InsertQuizSession,
  type StudyLevel,
  type InsertStudyLevel
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserStats(userId: number): Promise<any>;
  
  // Assignment methods
  getAssignments(userId: number): Promise<any[]>;
  createAssignment(assignment: any): Promise<any>;
  updateAssignment(id: number, data: any): Promise<any>;
  
  // Study session methods
  getStudySessionsByDate(userId: number, date: string): Promise<any[]>;
  createStudySession(session: any): Promise<any>;
  completeStudySession(id: number): Promise<any>;
  
  // Progress methods
  getWeeklyProgress(userId: number): Promise<any[]>;
  getSubjectDistribution(userId: number): Promise<any[]>;
  getProgressSummary(userId: number): Promise<any>;
  addStudyProgress(progress: any): Promise<any>;
  
  // Achievements methods
  getAchievements(userId: number): Promise<any[]>;
  addAchievement(achievement: any): Promise<any>;
  
  // Voice commands methods
  saveVoiceCommand(command: any): Promise<any>;
  getVoiceCommandHistory(userId: number): Promise<any[]>;
  getStudySession(userId: number, sessionId: number): Promise<any>;
  
  // Voice biometrics methods
  saveVoiceProfile(userId: number, profile: any): Promise<void>;
  getVoiceProfile(userId: number): Promise<any | null>;
  getAllVoiceProfiles(): Promise<any[]>;
  getStudyQuestions(userId: number, subject: string, count?: number): Promise<any[]>;
  checkStudyAnswer(userId: number, questionId: number, answer: string): Promise<any>;
  getSubjectMaterial(userId: number, subject: string): Promise<any>;
  
  // Exam score methods
  getExamScores(userId: number): Promise<ExamScore[]>;
  getExamScoresByCourse(userId: number, courseId: string): Promise<ExamScore[]>;
  createExamScore(examScore: InsertExamScore): Promise<ExamScore>;
  getExamScoreAnalytics(userId: number): Promise<any>;
  
  // Course methods
  getCourses(userId: number): Promise<Course[]>;
  getCourseById(userId: number, courseId: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  getCurriculumOverview(userId: number): Promise<any>;
  getRelatedCoursesData(userId: number, courseId: string): Promise<any>;
  
  // Document methods
  getDocuments(userId: number): Promise<Document[]>;
  getDocumentsByCourse(userId: number, courseId: string): Promise<Document[]>;
  getDocumentById(docId: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  extractDocumentContent(docId: number, fileBuffer: Buffer, fileType: string): Promise<Document | undefined>;
  
  // Quiz Question methods - NEW
  getQuizQuestions(courseId: string, topic?: string, difficulty?: string): Promise<QuizQuestion[]>;
  getQuizQuestion(questionId: number): Promise<QuizQuestion | undefined>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  updateQuizQuestion(questionId: number, question: Partial<InsertQuizQuestion>): Promise<QuizQuestion>;
  deleteQuizQuestion(questionId: number): Promise<boolean>;
  
  // Quiz Attempt methods - NEW
  recordQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  getQuizAttempts(userId: number, courseId?: string, topic?: string): Promise<QuizAttempt[]>;
  getQuizAttemptById(attemptId: number): Promise<QuizAttempt | undefined>;
  
  // Quiz Session methods - NEW
  createQuizSession(session: InsertQuizSession): Promise<QuizSession>;
  updateQuizSession(sessionId: number, sessionData: Partial<InsertQuizSession>): Promise<QuizSession>;
  getQuizSessionById(sessionId: number): Promise<QuizSession | undefined>;
  getQuizSessionsByUser(userId: number, courseId?: string): Promise<QuizSession[]>;
  
  // Study Level (Mastery) methods - NEW
  getStudyLevelsByCourse(userId: number, courseId: string): Promise<StudyLevel[]>;
  getStudyLevelByTopic(userId: number, courseId: string, topic: string): Promise<StudyLevel | undefined>;
  updateStudyLevel(userId: number, courseId: string, topic: string, data: Partial<InsertStudyLevel>): Promise<StudyLevel>;
  getOverallCourseStudyLevel(userId: number, courseId: string): Promise<number>; // Returns a percentage 0-100
  getStudyLevelSummary(userId: number): Promise<any>; // Summary of mastery across all courses
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private assignments: Map<number, any>;
  private studySessions: Map<number, any>;
  private studyProgress: Map<number, any[]>;
  private achievements: Map<number, any[]>;
  private voiceCommands: Map<number, any[]>;
  private voiceProfiles: Map<number, any>;
  private examScores: Map<number, ExamScore[]>;
  private courses: Map<number, Course[]>;
  private documents: Map<number, Document[]>;
  private quizQuestions: Map<string, QuizQuestion[]>; // keyed by courseId
  private quizAttempts: Map<number, QuizAttempt[]>; // keyed by userId
  private quizSessions: Map<number, QuizSession[]>; // keyed by userId
  private studyLevels: Map<number, StudyLevel[]>; // keyed by userId
  
  currentId: number;
  assignmentId: number;
  sessionId: number;
  progressId: number;
  achievementId: number;
  commandId: number;
  examScoreId: number;
  courseId: number;
  documentId: number;
  quizQuestionId: number;
  quizAttemptId: number;
  quizSessionId: number;
  studyLevelId: number;

  constructor() {
    this.users = new Map();
    this.assignments = new Map();
    this.studySessions = new Map();
    this.studyProgress = new Map();
    this.achievements = new Map();
    this.voiceCommands = new Map();
    this.voiceProfiles = new Map();
    this.examScores = new Map();
    this.courses = new Map();
    this.documents = new Map();
    this.quizQuestions = new Map();
    this.quizAttempts = new Map();
    this.quizSessions = new Map();
    this.studyLevels = new Map();
    
    this.currentId = 1;
    this.assignmentId = 1;
    this.sessionId = 1;
    this.progressId = 1;
    this.achievementId = 1;
    this.commandId = 1;
    this.examScoreId = 1;
    this.courseId = 1;
    this.documentId = 1;
    this.quizQuestionId = 1;
    this.quizAttemptId = 1;
    this.quizSessionId = 1;
    this.studyLevelId = 1;
    
    // Add seed data for demo purposes
    this.seedData();
  }

  // Seed some initial data
  private seedData() {
    // No test user or mock data is created
    // All users will be created through registration
    console.log("Storage initialized without test data");
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    
    // Create education field from school, program, and year for backward compatibility
    const education = `${insertUser.school} - ${insertUser.program} (${insertUser.year})`;
    
    // Create combined name field for backward compatibility
    const name = `${insertUser.firstName} ${insertUser.lastName}`;
    
    // Set default values for new career goal fields if not provided
    const programChoiceReason = insertUser.programChoiceReason || "";
    const careerGoals = insertUser.careerGoals || "";
    
    const user: User = { 
      ...insertUser, 
      id,
      education, // Add combined education field
      name,      // Add combined name field
      programChoiceReason,
      careerGoals
    };
    
    this.users.set(id, user);
    
    // Initialize collections for this user
    this.assignments.set(id, []);
    this.studySessions.set(id, []);
    this.studyProgress.set(id, []);
    this.achievements.set(id, [
      {
        id: this.achievementId++,
        title: "First Login",
        description: "You joined Soun for the first time",
        icon: "ri-login-box-fill",
        iconColor: "text-primary",
        bgColor: "bg-primary-100",
        dateEarned: new Date().toISOString()
      }
    ]);
    this.voiceCommands.set(id, []);
    this.examScores.set(id, []);
    this.courses.set(id, []);
    this.documents.set(id, []);
    this.quizAttempts.set(id, []);
    this.quizSessions.set(id, []);
    this.studyLevels.set(id, []);
    
    // Start with empty data - no sample data for new users
    
    return user;
  }

  async getUserStats(userId: number): Promise<any> {
    // Return empty stats for new users
    return {
      streak: 0,
      examReadiness: 0,
      focusTimeToday: 0, // in minutes
      focusTimeGoal: 180, // in minutes - default goal
    };
  }
  
  // Assignment methods
  async getAssignments(userId: number): Promise<any[]> {
    return this.assignments.get(userId) || [];
  }
  
  async createAssignment(assignment: any): Promise<any> {
    const id = this.assignmentId++;
    const newAssignment = { ...assignment, id };
    
    const userAssignments = this.assignments.get(assignment.userId) || [];
    userAssignments.push(newAssignment);
    this.assignments.set(assignment.userId, userAssignments);
    
    return newAssignment;
  }
  
  async updateAssignment(id: number, data: any): Promise<any> {
    const userId = data.userId;
    const userAssignments = this.assignments.get(userId) || [];
    
    const index = userAssignments.findIndex((a: any) => a.id === id);
    if (index === -1) throw new Error("Assignment not found");
    
    const updatedAssignment = { ...userAssignments[index], ...data };
    userAssignments[index] = updatedAssignment;
    
    this.assignments.set(userId, userAssignments);
    return updatedAssignment;
  }
  
  // Study session methods
  async getStudySessionsByDate(userId: number, date: string): Promise<any[]> {
    const userSessions = this.studySessions.get(userId) || [];
    return userSessions.filter((session: any) => session.date === date);
  }
  
  async createStudySession(session: any): Promise<any> {
    const id = this.sessionId++;
    const newSession = { ...session, id };
    
    const userSessions = this.studySessions.get(session.userId) || [];
    userSessions.push(newSession);
    this.studySessions.set(session.userId, userSessions);
    
    return newSession;
  }
  
  async completeStudySession(id: number): Promise<any> {
    // Find which user owns this session
    for (const [userId, sessions] of Array.from(this.studySessions.entries())) {
      const sessionIndex = sessions.findIndex((s: any) => s.id === id);
      
      if (sessionIndex !== -1) {
        const session = sessions[sessionIndex];
        session.completed = true;
        sessions[sessionIndex] = session;
        this.studySessions.set(userId, sessions);
        return session;
      }
    }
    
    throw new Error("Session not found");
  }
  
  // Progress methods
  async getWeeklyProgress(userId: number): Promise<any[]> {
    // Get the stored progress data for this user or initialize with empty data
    const userProgress = this.studyProgress.get(userId);
    
    // If there's existing data, use it - otherwise create empty data
    if (userProgress && userProgress.length > 0) {
      // Group and calculate based on real user data (implementation would go here)
      // For now, just using placeholder until real data tracking is implemented
    }
    
    // Create an empty weekly progress report
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Adjust to start from Monday (0 = Monday, 6 = Sunday)
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const weeklyData = [];
    for (let i = 0; i < 7; i++) {
      const isPast = i <= adjustedDay;
      const isToday = i === adjustedDay;
      
      weeklyData.push({
        day: i,
        minutes: 0, // Start with zero minutes
        isPast,
        isToday
      });
    }
    
    return weeklyData;
  }
  
  async getSubjectDistribution(userId: number): Promise<any[]> {
    // Get the user's recorded sessions
    const userSessions = this.studySessions.get(userId) || [];
    
    // If no sessions yet, return empty array
    if (userSessions.length === 0) {
      return [];
    }
    
    // Otherwise we would calculate real distribution based on user data
    // This would be implemented when we have actual session tracking
    
    // For simplicity, return an empty array for now
    return [];
  }
  
  async getProgressSummary(userId: number): Promise<any> {
    // Get the user's progress data
    const userProgress = this.studyProgress.get(userId) || [];
    
    // If no progress data yet, return empty stats
    if (userProgress.length === 0) {
      return {
        total: 0, // total minutes this week
        percentChange: 0 // percent change from last week
      };
    }
    
    // Otherwise calculate real stats (to be implemented with real tracking)
    // For now, return empty stats
    return {
      total: 0,
      percentChange: 0
    };
  }
  
  async addStudyProgress(progress: any): Promise<any> {
    const id = this.progressId++;
    const newProgress = { ...progress, id };
    
    const userProgress = this.studyProgress.get(progress.userId) || [];
    userProgress.push(newProgress);
    this.studyProgress.set(progress.userId, userProgress);
    
    return newProgress;
  }
  
  // Achievements methods
  async getAchievements(userId: number): Promise<any[]> {
    return this.achievements.get(userId) || [];
  }
  
  async addAchievement(achievement: any): Promise<any> {
    const id = this.achievementId++;
    const newAchievement = { ...achievement, id };
    
    const userAchievements = this.achievements.get(achievement.userId) || [];
    userAchievements.push(newAchievement);
    this.achievements.set(achievement.userId, userAchievements);
    
    return newAchievement;
  }
  
  // Voice commands methods
  async saveVoiceCommand(command: any): Promise<any> {
    const id = this.commandId++;
    const newCommand = { ...command, id };
    
    const userCommands = this.voiceCommands.get(command.userId) || [];
    userCommands.push(newCommand);
    this.voiceCommands.set(command.userId, userCommands);
    
    return newCommand;
  }
  
  async getVoiceCommandHistory(userId: number): Promise<any[]> {
    return this.voiceCommands.get(userId) || [];
  }
  
  // Voice biometrics methods
  async saveVoiceProfile(userId: number, profile: any): Promise<void> {
    const voiceProfile = {
      userId,
      voiceId: profile.voiceId,
      voiceFeatures: profile.voiceFeatures,
      createdAt: new Date(),
      updatedAt: new Date(),
      confidence: profile.confidence || 0.8
    };
    
    this.voiceProfiles.set(userId, voiceProfile);
  }
  
  async getVoiceProfile(userId: number): Promise<any | null> {
    return this.voiceProfiles.get(userId) || null;
  }
  
  async getAllVoiceProfiles(): Promise<any[]> {
    return Array.from(this.voiceProfiles.values());
  }
  
  // Study session interaction methods
  async getStudySession(userId: number, sessionId: number): Promise<any> {
    const userSessions = this.studySessions.get(userId) || [];
    const session = userSessions.find(s => s.id === sessionId);
    
    if (!session) {
      throw new Error("Study session not found");
    }
    
    // Augment session with additional study material
    return {
      ...session,
      studyTopics: [
        {
          id: 1,
          title: session.subject,
          description: `Key concepts in ${session.subject}`,
          questions: [
            { id: 101, question: `Explain the key principles of ${session.subject}`, difficulty: "medium" },
            { id: 102, question: `How would you apply ${session.subject} concepts in a real-world scenario?`, difficulty: "hard" },
            { id: 103, question: `What are the foundational elements of ${session.subject}?`, difficulty: "easy" }
          ]
        }
      ]
    };
  }
  
  async getStudyQuestions(userId: number, subject: string, count: number = 3): Promise<any[]> {
    // This would normally get questions from a real database
    // For now, return an empty array - questions will need to be created by the user
    console.log(`Requested ${count} questions about ${subject} for user ${userId}`);
    
    // Return empty array instead of mock data
    return [];
  }
  
  async checkStudyAnswer(userId: number, questionId: number, answer: string): Promise<any> {
    // In a real implementation, this would use NLP to evaluate the answer
    console.log(`Checking answer to question ${questionId} from user ${userId}: "${answer.substring(0, 30)}..."`);
    
    // Return a default response without mock data
    return {
      correct: false,
      score: 0,
      feedback: "Answer checking is not available yet. This feature will be enhanced with AI-based answer evaluation."
    };
  }
  
  async getSubjectMaterial(userId: number, subject: string): Promise<any> {
    // In a real system, this would fetch from a content database
    console.log(`Requested study material for ${subject} for user ${userId}`);
    
    // Return an empty structure instead of mock data
    return {
      subject,
      topics: [],
      keyTerms: [],
      resources: []
    };
  }
  
  // Exam score methods
  async getExamScores(userId: number): Promise<ExamScore[]> {
    return this.examScores.get(userId) || [];
  }
  
  async getExamScoresByCourse(userId: number, courseId: string): Promise<ExamScore[]> {
    const userExamScores = this.examScores.get(userId) || [];
    return userExamScores.filter(score => score.courseId === courseId);
  }
  
  async createExamScore(examScore: InsertExamScore): Promise<ExamScore> {
    const id = this.examScoreId++;
    const newExamScore = { ...examScore, id } as ExamScore;
    
    const userExamScores = this.examScores.get(examScore.userId) || [];
    userExamScores.push(newExamScore);
    this.examScores.set(examScore.userId, userExamScores);
    
    return newExamScore;
  }
  
  async getExamScoreAnalytics(userId: number): Promise<any> {
    const userExamScores = this.examScores.get(userId) || [];
    
    // Return empty analytics if no real data
    if (userExamScores.length === 0) {
      return {
        averageScore: 0,
        totalExams: 0,
        improvement: 0,
        coursePerformance: [],
        recentExams: []
      };
    }
    
    // Calculate real analytics
    const totalScore = userExamScores.reduce((sum, exam) => sum + Number(exam.score), 0);
    const averageScore = totalScore / userExamScores.length;
    
    // Group by course
    const courseGroups = new Map<string, ExamScore[]>();
    userExamScores.forEach(exam => {
      const courseScores = courseGroups.get(exam.courseId) || [];
      courseScores.push(exam);
      courseGroups.set(exam.courseId, courseScores);
    });
    
    // Calculate per-course performance
    const coursePerformance = Array.from(courseGroups.entries()).map(([courseId, scores]) => {
      const courseName = scores[0].courseName;
      const courseTotal = scores.reduce((sum, exam) => sum + Number(exam.score), 0);
      const courseAverage = courseTotal / scores.length;
      
      return {
        courseId,
        courseName, 
        averageScore: Number(courseAverage.toFixed(1))
      };
    });
    
    // Get recent exams (sorted by date, most recent first)
    const sortedExams = [...userExamScores].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const recentExams = sortedExams.slice(0, 3).map(exam => ({
      id: exam.id,
      courseName: exam.courseName,
      examName: exam.examName,
      score: exam.score,
      maxScore: exam.maxScore,
      date: exam.date
    }));
    
    return {
      averageScore: Number(averageScore.toFixed(1)),
      totalExams: userExamScores.length,
      improvement: 5.3, // This would need more logic in a real system
      coursePerformance,
      recentExams
    };
  }
  
  // Course methods
  async getCourses(userId: number): Promise<Course[]> {
    return this.courses.get(userId) || [];
  }
  
  async getCourseById(userId: number, courseId: string): Promise<Course | undefined> {
    const userCourses = this.courses.get(userId) || [];
    return userCourses.find(course => course.courseId === courseId);
  }
  
  async createCourse(course: InsertCourse): Promise<Course> {
    const id = this.courseId++;
    const newCourse = { ...course, id } as Course;
    
    const userCourses = this.courses.get(course.userId) || [];
    userCourses.push(newCourse);
    this.courses.set(course.userId, userCourses);
    
    return newCourse;
  }
  
  async getCurriculumOverview(userId: number): Promise<any> {
    const userCourses = this.courses.get(userId) || [];
    
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
    
    return {
      totalCourses: userCourses.length,
      currentSemester: {
        name: `${currentSemester} ${currentYear}`,
        courses: currentSemesterCourses
      },
      courseRelationships,
      upcomingCourses: [] // Would need more logic in a real system
    };
  }
  
  async getRelatedCoursesData(userId: number, courseId: string): Promise<any> {
    const userCourses = this.courses.get(userId) || [];
    const course = userCourses.find(c => c.courseId === courseId);
    
    if (!course) {
      return {
        prerequisites: [],
        relatedCourses: [],
        nextCourses: []
      };
    }
    
    // Find prerequisite courses details
    const prerequisites = course.prerequisites
      ? userCourses.filter(c => course.prerequisites?.includes(c.courseId))
        .map(c => ({
          courseId: c.courseId,
          name: c.name
        }))
      : [];
    
    // Find related courses details
    const relatedCourses = course.relatedCourses
      ? userCourses.filter(c => course.relatedCourses?.includes(c.courseId))
        .map(c => ({
          courseId: c.courseId,
          name: c.name
        }))
      : [];
    
    // Find courses that have this course as a prerequisite
    const nextCourses = userCourses
      .filter(c => c.prerequisites?.includes(course.courseId))
      .map(c => ({
        courseId: c.courseId,
        name: c.name
      }));
    
    return {
      prerequisites,
      relatedCourses,
      nextCourses
    };
  }
  
  // Helper method to add sample data for new users
  private addSampleDataForUser(userId: number) {
    // Initialize with empty collections
    // No sample data will be added
    console.log(`User ${userId} created with empty data collections`);
    
    // Just ensure the collections are initialized to empty arrays
    this.assignments.set(userId, []);
    this.studySessions.set(userId, []);
    this.studyProgress.set(userId, []);
    this.achievements.set(userId, []);
    this.voiceCommands.set(userId, []);
    this.examScores.set(userId, []);
    this.courses.set(userId, []);
    this.documents.set(userId, []);
    this.quizAttempts.set(userId, []);
    this.quizSessions.set(userId, []);
    this.studyLevels.set(userId, []);
  }
  
  // Helper method to get future date
  private getFutureDate(daysAhead: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toISOString().split('T')[0];
  }
  
  // Helper method to get past date
  private getPastDate(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }
  
  // Document methods
  async getDocuments(userId: number): Promise<Document[]> {
    return this.documents.get(userId) || [];
  }

  async getDocumentsByCourse(userId: number, courseId: string): Promise<Document[]> {
    const userDocuments = this.documents.get(userId) || [];
    return userDocuments.filter(doc => doc.courseId === courseId);
  }
  
  async getDocumentById(docId: number): Promise<Document | undefined> {
    // Search through all user documents to find the one with matching id
    for (const userDocs of this.documents.values()) {
      const doc = userDocs.find(d => d.id === docId);
      if (doc) return doc;
    }
    return undefined;
  }
  
  async createDocument(document: InsertDocument): Promise<Document> {
    const id = this.documentId++;
    const newDocument = { ...document, id } as Document;
    
    const userDocuments = this.documents.get(document.userId) || [];
    userDocuments.push(newDocument);
    this.documents.set(document.userId, userDocuments);
    
    return newDocument;
  }
  
  async extractDocumentContent(docId: number, fileBuffer: Buffer, fileType: string): Promise<Document | undefined> {
    // Find the document
    const doc = await this.getDocumentById(docId);
    if (!doc) {
      throw new Error("Document not found");
    }
    
    console.log(`Extracting content from ${fileType} document (id: ${docId})`);
    
    try {
      // No mock data - this would be implemented with real document parsing libraries
      let extractedContent = `Content extraction for ${fileType} files will be implemented with proper document libraries.`;
      
      // Update the document with a placeholder message
      const userDocuments = this.documents.get(doc.userId) || [];
      const docIndex = userDocuments.findIndex(d => d.id === docId);
      
      if (docIndex !== -1) {
        // Create an updated document with the extracted content placeholder
        const updatedDoc = { 
          ...userDocuments[docIndex], 
          content: extractedContent,
          metadata: null
        };
        
        userDocuments[docIndex] = updatedDoc;
        this.documents.set(doc.userId, userDocuments);
        
        return updatedDoc;
      }
      
      return undefined;
    } catch (error) {
      console.error("Error extracting document content:", error);
      throw new Error("Failed to extract document content");
    }
  }

  // ---------- Quiz Question methods ----------
  async getQuizQuestions(courseId: string, topic?: string, difficulty?: string): Promise<QuizQuestion[]> {
    const courseQuestions = this.quizQuestions.get(courseId) || [];
    
    // Filter by topic and difficulty if provided
    return courseQuestions.filter(q => {
      let match = true;
      if (topic) match = match && q.topic === topic;
      if (difficulty) match = match && q.difficulty === difficulty;
      return match;
    });
  }

  async getQuizQuestion(questionId: number): Promise<QuizQuestion | undefined> {
    // Search through all questions to find the one with matching ID
    for (const questions of this.quizQuestions.values()) {
      const question = questions.find(q => q.id === questionId);
      if (question) return question;
    }
    return undefined;
  }

  async createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    const id = this.quizQuestionId++;
    const newQuestion: QuizQuestion = {
      ...question,
      id,
      options: question.options || null,
      tags: question.tags || null,
      explanation: question.explanation || null,
      createdAt: new Date()
    };

    // Get the course's questions or initialize an empty array
    const courseQuestions = this.quizQuestions.get(question.courseId) || [];
    courseQuestions.push(newQuestion);
    this.quizQuestions.set(question.courseId, courseQuestions);

    return newQuestion;
  }

  async updateQuizQuestion(questionId: number, question: Partial<InsertQuizQuestion>): Promise<QuizQuestion> {
    // Find the question in all courses
    for (const [courseId, questions] of this.quizQuestions.entries()) {
      const index = questions.findIndex(q => q.id === questionId);
      
      if (index !== -1) {
        // Update the question with new data
        const updatedQuestion = { 
          ...questions[index], 
          ...question,
          updatedAt: new Date()
        };
        questions[index] = updatedQuestion;
        this.quizQuestions.set(courseId, questions);
        return updatedQuestion;
      }
    }
    
    throw new Error("Quiz question not found");
  }

  async deleteQuizQuestion(questionId: number): Promise<boolean> {
    // Find the question in all courses
    for (const [courseId, questions] of this.quizQuestions.entries()) {
      const index = questions.findIndex(q => q.id === questionId);
      
      if (index !== -1) {
        // Remove the question
        questions.splice(index, 1);
        this.quizQuestions.set(courseId, questions);
        return true;
      }
    }
    
    return false; // Question wasn't found
  }

  // ---------- Quiz Attempt methods ----------
  async recordQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const id = this.quizAttemptId++;
    const newAttempt: QuizAttempt = {
      ...attempt,
      id,
      attemptedAt: new Date(),
      timeSpent: attempt.timeSpent || null
    };

    // Get the user's attempts or initialize an empty array
    const userAttempts = this.quizAttempts.get(attempt.userId) || [];
    userAttempts.push(newAttempt);
    this.quizAttempts.set(attempt.userId, userAttempts);

    return newAttempt;
  }

  async getQuizAttempts(userId: number, courseId?: string, topic?: string): Promise<QuizAttempt[]> {
    const userAttempts = this.quizAttempts.get(userId) || [];
    
    // Filter by courseId and topic if provided
    return userAttempts.filter(a => {
      let match = true;
      if (courseId) match = match && a.courseId === courseId;
      if (topic) match = match && a.topic === topic;
      return match;
    });
  }

  async getQuizAttemptById(attemptId: number): Promise<QuizAttempt | undefined> {
    // Search through all users' attempts to find the one with matching ID
    for (const attempts of this.quizAttempts.values()) {
      const attempt = attempts.find(a => a.id === attemptId);
      if (attempt) return attempt;
    }
    return undefined;
  }

  // ---------- Quiz Session methods ----------
  async createQuizSession(session: InsertQuizSession): Promise<QuizSession> {
    const id = this.quizSessionId++;
    const newSession: QuizSession = {
      ...session,
      id,
      feedback: session.feedback || null,
      topics: session.topics || null,
      endTime: session.endTime || null
    };

    // Get the user's sessions or initialize an empty array
    const userSessions = this.quizSessions.get(session.userId) || [];
    userSessions.push(newSession);
    this.quizSessions.set(session.userId, userSessions);

    return newSession;
  }

  async updateQuizSession(sessionId: number, sessionData: Partial<InsertQuizSession>): Promise<QuizSession> {
    // Find the session in all users
    for (const [userId, sessions] of this.quizSessions.entries()) {
      const index = sessions.findIndex(s => s.id === sessionId);
      
      if (index !== -1) {
        // Update the session with new data
        const updatedSession = { 
          ...sessions[index], 
          ...sessionData,
          updatedAt: new Date()
        };
        sessions[index] = updatedSession;
        this.quizSessions.set(userId, sessions);
        return updatedSession;
      }
    }
    
    throw new Error("Quiz session not found");
  }

  async getQuizSessionById(sessionId: number): Promise<QuizSession | undefined> {
    // Search through all users' sessions to find the one with matching ID
    for (const sessions of this.quizSessions.values()) {
      const session = sessions.find(s => s.id === sessionId);
      if (session) return session;
    }
    return undefined;
  }

  async getQuizSessionsByUser(userId: number, courseId?: string): Promise<QuizSession[]> {
    const userSessions = this.quizSessions.get(userId) || [];
    
    // Filter by courseId if provided
    if (courseId) {
      return userSessions.filter(s => s.courseId === courseId);
    }
    
    return userSessions;
  }

  // ---------- Study Level (Mastery) methods ----------
  async getStudyLevelsByCourse(userId: number, courseId: string): Promise<StudyLevel[]> {
    const userLevels = this.studyLevels.get(userId) || [];
    return userLevels.filter(level => level.courseId === courseId);
  }

  async getStudyLevelByTopic(userId: number, courseId: string, topic: string): Promise<StudyLevel | undefined> {
    const userLevels = this.studyLevels.get(userId) || [];
    return userLevels.find(level => level.courseId === courseId && level.topic === topic);
  }

  async updateStudyLevel(userId: number, courseId: string, topic: string, data: Partial<InsertStudyLevel>): Promise<StudyLevel> {
    const userLevels = this.studyLevels.get(userId) || [];
    const levelIndex = userLevels.findIndex(
      level => level.courseId === courseId && level.topic === topic
    );
    
    if (levelIndex === -1) {
      // Create a new study level
      const id = this.studyLevelId++;
      const newLevel: StudyLevel = {
        id,
        userId,
        courseId,
        topic,
        masteryLevel: data.masteryLevel || 0,
        questionsAttempted: data.questionsAttempted || 0,
        questionsCorrect: data.questionsCorrect || 0,
        lastUpdated: new Date(),
        strengths: data.strengths || null,
        weaknesses: data.weaknesses || null,
        recommendedActions: data.recommendedActions || null
      };
      
      userLevels.push(newLevel);
      this.studyLevels.set(userId, userLevels);
      return newLevel;
    } else {
      // Update existing study level
      const updatedLevel = { 
        ...userLevels[levelIndex], 
        ...data,
        lastUpdated: new Date()
      };
      userLevels[levelIndex] = updatedLevel;
      this.studyLevels.set(userId, userLevels);
      return updatedLevel;
    }
  }

  async getOverallCourseStudyLevel(userId: number, courseId: string): Promise<number> {
    const courseLevels = await this.getStudyLevelsByCourse(userId, courseId);
    
    if (courseLevels.length === 0) {
      return 0; // No study data yet
    }
    
    // Calculate average mastery level
    const totalMastery = courseLevels.reduce((sum, level) => sum + level.masteryLevel, 0);
    return Math.round((totalMastery / courseLevels.length) * 100) / 100; // Round to 2 decimal places
  }

  async getStudyLevelSummary(userId: number): Promise<any> {
    const userLevels = this.studyLevels.get(userId) || [];
    
    // Group levels by course
    const courseGroups: { [courseId: string]: StudyLevel[] } = {};
    for (const level of userLevels) {
      if (!courseGroups[level.courseId]) {
        courseGroups[level.courseId] = [];
      }
      courseGroups[level.courseId].push(level);
    }
    
    // Calculate averages for each course
    const courseSummaries = [];
    for (const [courseId, levels] of Object.entries(courseGroups)) {
      // Get the course name
      const userCourses = this.courses.get(userId) || [];
      const course = userCourses.find(c => c.id.toString() === courseId);
      
      // Calculate averages
      const totalMastery = levels.reduce((sum, level) => sum + level.masteryLevel, 0);
      const averageMastery = Math.round((totalMastery / levels.length) * 100) / 100;
      
      const totalAttempts = levels.reduce((sum, level) => sum + level.questionsAttempted, 0);
      const totalCorrect = levels.reduce((sum, level) => sum + level.questionsCorrect, 0);
      const accuracy = totalAttempts > 0 
        ? Math.round((totalCorrect / totalAttempts) * 100) 
        : 0;
      
      courseSummaries.push({
        courseId,
        courseName: course?.name || 'Unknown Course',
        averageMastery,
        topicsStudied: levels.length,
        accuracy,
        totalQuestionAttempts: totalAttempts,
        masteryLevels: levels.map(l => ({
          topic: l.topic,
          masteryLevel: l.masteryLevel,
          lastUpdated: l.lastUpdated
        }))
      });
    }
    
    return {
      courses: courseSummaries,
      overallMastery: courseSummaries.length > 0
        ? Math.round(courseSummaries.reduce((sum, course) => sum + course.averageMastery, 0) / courseSummaries.length)
        : 0,
      topicsStudied: userLevels.length,
      mostStudiedCourse: courseSummaries.length > 0
        ? courseSummaries.reduce((a, b) => a.totalQuestionAttempts > b.totalQuestionAttempts ? a : b)
        : null
    };
  }
}

// Uncomment to use the in-memory storage
// export const storage = new MemStorage();

// Use persistent database storage
import { DatabaseStorage } from "./database-storage";
export const storage = new DatabaseStorage();
async function fetchSchoolData(schoolId: string, apiKey?: string) {
  // Example implementation for official API integration
  const schoolApis: Record<string, string> = {
    'MIT': 'https://api.mit.edu/v1',
    'STANFORD': 'https://api.stanford.edu/academics',
    // Add more schools as needed
  };

  if (schoolApis[schoolId.toUpperCase()]) {
    const response = await fetch(schoolApis[schoolId.toUpperCase()], {
      headers: {
        'Authorization': `Bearer ${apiKey || process.env[`${schoolId.toUpperCase()}_API_KEY`]}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch school data');
    }
    
    return await response.json();
  }
  
  throw new Error('School not supported');
}
// Clean storage - ready for your own data
