import express from "express";
import multer from "multer";
import { db } from "./db";
import { insertUserSchema, selectUserSchema, users, courses, documents, voiceCommands, studyLevel as studyLevels } from "../shared/schema";
import type { User, Course, Document } from "../shared/schema";
import bcrypt from "bcryptjs";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { documentAnalysisService } from "./services/document-analysis-service";
import { quizGenerationService } from "./services/quiz-generation-service";
import { crossFileSearchService } from "./services/cross-file-search-service";
import { semanticMemoryService } from "./services/semantic-memory-service";
import { visualGenerationService } from "./services/visual-generation-service";
import { studyGuideService } from './services/study-guide-service';
import { flashcardService } from './services/flashcard-service';
import { voiceAnalyticsService } from "./services/voice-analytics-service";

// Placeholder functions for new vocal features (to be implemented)
async function generateAdaptiveChallenges(userId: number, difficulty: number) {
  console.log(`Generating ${difficulty}-level challenges for user ${userId}`);
  return [
    { id: 'challenge-1', type: 'pronunciation', text: 'She sells seashells by the seashore.', difficulty: 1, score: null },
    { id: 'challenge-2', type: 'intonation', text: 'Are you coming to the party?', difficulty: 2, score: null },
  ];
}

async function processChallengeAttempt(userId: number, challengeId: string, file?: Express.Multer.File) {
  console.log(`Processing attempt for challenge ${challengeId} by user ${userId}`);
  // Simulate processing and feedback
  const simulatedScore = Math.floor(Math.random() * 100);
  return {
    challengeId,
    userId,
    score: simulatedScore,
    feedback: `Your score is ${simulatedScore}%. Try to focus on clarity.`,
    passed: simulatedScore > 70
  };
}

async function analyzeVocalPerformance(targetText: string, transcript: string, audioFeatures: any) {
  console.log(`Analyzing performance for: "${targetText}"`);
  // Simulate analysis
  const score = Math.floor(Math.random() * 100);
  return {
    targetText,
    transcript,
    audioFeatures,
    overallScore: score,
    fluency: Math.floor(Math.random() * 100),
    pronunciation: Math.floor(Math.random() * 100),
    intonation: Math.floor(Math.random() * 100),
    feedback: `Your overall score is ${score}%. Keep practicing!`
  };
}


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Session type augmentation
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

// Authentication middleware with enhanced validation
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Validate session integrity
  if (typeof req.session.userId !== 'number' || req.session.userId <= 0) {
    req.session.destroy(() => {
      res.status(401).json({ error: "Invalid session" });
    });
    return;
  }

  next();
};

// Recent activity endpoint for dashboard
router.get("/api/user/recent-activity", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get recent courses with document counts
    const userCourses = await db
      .select({
        id: courses.id,
        courseId: courses.courseId,
        name: courses.name,
        instructor: courses.instructor,
        semester: courses.semester,
        year: courses.year,
        documentCount: sql<number>`cast(count(${documents.id}) as int)`
      })
      .from(courses)
      .leftJoin(documents, eq(documents.courseId, courses.courseId))
      .where(eq(courses.userId, userId!))
      .groupBy(courses.id, courses.courseId, courses.name, courses.instructor, courses.semester, courses.year)
      .orderBy(desc(courses.year), desc(courses.semester))
      .limit(10);

    // Get recent documents
    const recentDocs = await db
      .select({
        id: documents.id,
        title: documents.title,
        courseId: documents.courseId,
        courseName: courses.name,
        uploadDate: documents.uploadDate
      })
      .from(documents)
      .innerJoin(courses, eq(documents.courseId, courses.courseId))
      .where(eq(courses.userId, userId!))
      .orderBy(desc(documents.uploadDate))
      .limit(10);

    // Calculate basic progress stats
    const totalCourses = userCourses.length;
    const totalDocuments = recentDocs.length;

    // Get average mastery if available
    const masteryStats = await db
      .select({
        avgMastery: sql<number>`avg(${studyLevels.masteryLevel})`
      })
      .from(studyLevels)
      .where(eq(studyLevels.userId, userId!));

    const averageMastery = Math.round(masteryStats[0]?.avgMastery || 0);

    res.json({
      courses: userCourses,
      documents: recentDocs,
      progress: {
        totalCourses,
        totalDocuments,
        averageMastery
      }
    });
  } catch (error) {
    console.error("Recent activity fetch error:", error);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

// User mastery data endpoint
router.get("/api/user/mastery", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get mastery data grouped by course with aggregation
    const userMastery = await db
      .select({
        courseId: courses.courseId,
        courseName: courses.name,
        topic: studyLevels.topic,
        masteryLevel: studyLevels.masteryLevel,
        lastUpdated: studyLevels.lastUpdated,
        questionsAttempted: studyLevels.questionsAttempted,
        questionsCorrect: studyLevels.questionsCorrect
      })
      .from(studyLevels)
      .innerJoin(courses, eq(studyLevels.courseId, courses.courseId))
      .where(and(eq(studyLevels.userId, userId!), eq(courses.userId, userId!)))
      .orderBy(desc(studyLevels.lastUpdated));

    // Group by course and calculate stats
    const courseMap = new Map();
    let totalMastery = 0;
    let totalTopics = 0;

    for (const record of userMastery) {
      if (!courseMap.has(record.courseId)) {
        courseMap.set(record.courseId, {
          courseId: record.courseId,
          courseName: record.courseName,
          masteryLevels: [],
          topicsStudied: 0,
          accuracy: 0,
          totalQuestionAttempts: 0
        });
      }

      const course = courseMap.get(record.courseId);
      course.masteryLevels.push({
        topic: record.topic,
        masteryLevel: record.masteryLevel,
        lastUpdated: record.lastUpdated
      });
      course.topicsStudied++;
      totalMastery += record.masteryLevel;
      totalTopics++;
    }

    // Calculate averages for each course
    const coursesData = Array.from(courseMap.values()).map(course => ({
      ...course,
      averageMastery: Math.round(
        course.masteryLevels.reduce((sum: number, level: any) => sum + level.masteryLevel, 0) /
        course.masteryLevels.length
      ) || 0,
      accuracy: 85, // Placeholder - could be calculated from quiz results
      totalQuestionAttempts: course.topicsStudied * 3 // Placeholder
    }));

    const overallMastery = totalTopics > 0 ? Math.round(totalMastery / totalTopics) : 0;
    const topicsStudied = totalTopics;

    // Find most studied course
    const mostStudiedCourse = coursesData.reduce((max, course) =>
      course.topicsStudied > (max?.topicsStudied || 0) ? course : max, null);

    res.json({
      overallMastery,
      topicsStudied,
      courses: coursesData,
      mostStudiedCourse
    });
  } catch (error) {
    console.error("Mastery data fetch error:", error);
    res.status(500).json({
      overallMastery: 0,
      topicsStudied: 0,
      courses: [],
      mostStudiedCourse: null
    });
  }
});

// Get detailed mastery statistics with predictions
router.get("/api/user/mastery-stats", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = req.user!.id;
    const stats = await storage.getUserMasteryStatistics(userId);
    res.json(stats);
  } catch (error) {
    console.error("Mastery stats fetch error:", error);
    res.status(500).json({ error: "Failed to fetch mastery statistics" });
  }
});

// Authentication routes
router.post("/api/auth/register", async (req, res) => {
  try {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid input", details: result.error.issues });
    }

    const { username, email, password, firstName, lastName } = result.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    const [user] = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      school: result.data.school || "",
      program: result.data.program || "",
      year: result.data.year || "",
      name: `${firstName} ${lastName}`,
      education: ""
    }).returning();

    req.session.userId = user.id;

    // Ensure session is saved before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: "Session save failed" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ message: "User registered successfully", user: userWithoutPassword });
    });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(400).json({ error: "Username or email already exists" });
    } else {
      res.status(500).json({ error: "Registration failed" });
    }
  }
});

router.post("/api/auth/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginField = username || email;

    console.log('Login attempt:', { loginField, hasPassword: !!password });

    if (!loginField || !password) {
      return res.status(400).json({ error: "Username/email and password required" });
    }

    const [user] = await db.select().from(users).where(eq(users.email, loginField));

    console.log('User found:', !!user);

    if (!user) {
      return res.status(401).json({ error: "User not found. Please register first." });
    }

    const passwordMatch = await bcrypt.compare(password.toString(), user.password);
    console.log('Password match:', passwordMatch);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    req.session.userId = user.id;

    // Ensure session is saved before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: "Session save failed" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ message: "Login successful", user: userWithoutPassword });
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logout successful" });
  });
});

router.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId!));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Course routes
router.get("/api/courses", requireAuth, async (req, res) => {
  try {
    const userCourses = await db
      .select({
        id: courses.id,
        courseId: courses.courseId,
        name: courses.name,
        instructor: courses.instructor,
        semester: courses.semester,
        year: courses.year,
        credits: courses.credits,
        description: courses.description,
        documentCount: sql<number>`cast(count(${documents.id}) as int)`
      })
      .from(courses)
      .leftJoin(documents, eq(documents.courseId, courses.courseId))
      .where(eq(courses.userId, req.session.userId!))
      .groupBy(courses.id)
      .orderBy(desc(courses.year));

    res.json(userCourses);
  } catch (error) {
    console.error("Courses fetch error:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// Curriculum overview route
router.get("/api/curriculum-overview", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    // Get courses with semester filtering
    const userCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.userId, userId))
      .orderBy(desc(courses.year), courses.semester);

    // Determine current semester (you might want to make this more sophisticated)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    let currentSemester = 'Fall';

    if (currentMonth >= 0 && currentMonth <= 4) {
      currentSemester = 'Spring';
    } else if (currentMonth >= 5 && currentMonth <= 7) {
      currentSemester = 'Summer';
    }

    const currentSemesterCourses = userCourses.filter(course =>
      course.year === currentYear && course.semester === currentSemester
    );

    // Group courses for upcoming semesters
    const upcomingCourses = userCourses.filter(course =>
      course.year > currentYear ||
      (course.year === currentYear && course.semester !== currentSemester)
    ).slice(0, 5);

    res.json({
      currentSemester: {
        semester: currentSemester,
        year: currentYear,
        courses: currentSemesterCourses.map(course => ({
          ...course,
          progress: Math.floor(Math.random() * 100) // Placeholder - you could calculate real progress
        }))
      },
      upcomingCourses,
      courseRelationships: [] // Placeholder for now
    });
  } catch (error) {
    console.error("Curriculum overview fetch error:", error);
    res.status(500).json({ error: "Failed to fetch curriculum overview" });
  }
});

// Exam scores routes
router.get("/api/exam-scores", requireAuth, async (req, res) => {
  try {
    // For now, return empty array since exam scores table doesn't exist
    // You would need to create an examScores table in your schema
    res.json([]);
  } catch (error) {
    console.error("Exam scores fetch error:", error);
    res.status(500).json({ error: "Failed to fetch exam scores" });
  }
});

router.get("/api/exam-scores/analytics", requireAuth, async (req, res) => {
  try {
    // For now, return placeholder analytics
    // You would calculate these from actual exam scores
    res.json({
      averageScore: 0,
      improvement: 0,
      totalExams: 0,
      coursePerformance: [],
      recentExams: []
    });
  } catch (error) {
    console.error("Exam analytics fetch error:", error);
    res.status(500).json({ error: "Failed to fetch exam analytics" });
  }
});

router.post("/api/exam-scores", requireAuth, async (req, res) => {
  try {
    // For now, just return success
    // You would need to implement exam scores storage
    res.json({ success: true, message: "Exam score recorded" });
  } catch (error) {
    console.error("Add exam score error:", error);
    res.status(500).json({ error: "Failed to add exam score" });
  }
});

router.post("/api/courses", requireAuth, async (req, res) => {
  try {
    const { courseId, name, instructor } = req.body;

    if (!courseId || !name || !instructor) {
      return res.status(400).json({ error: "Course ID, name, and instructor are required" });
    }

    const [course] = await db.insert(courses).values({
      userId: req.session.userId!,
      courseId,
      name,
      instructor,
      semester: "Fall", // Default values for required fields
      year: new Date().getFullYear(),
    }).returning();

    res.json(course);
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(400).json({ error: "Course ID already exists for this user" });
    } else {
      console.error("Course creation error:", error);
      res.status(500).json({ error: "Failed to create course" });
    }
  }
});

router.get("/api/courses/:courseId", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.userId, req.session.userId!)));

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const courseDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.courseId, course.courseId))
      .orderBy(desc(documents.uploadDate));

    res.json({ course, documents: courseDocuments });
  } catch (error) {
    console.error("Course fetch error:", error);
    res.status(500).json({ error: "Failed to fetch course" });
  }
});

// Get documents for a course
router.get("/api/courses/:courseId/documents", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    // First verify the course exists and belongs to the user
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.userId, req.session.userId!)));

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Fetch all documents for this course
    const courseDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.courseId, course.courseId))
      .orderBy(desc(documents.uploadDate));

    res.json(courseDocuments);
  } catch (error) {
    console.error("Course documents fetch error:", error);
    res.status(500).json({ error: "Failed to fetch course documents" });
  }
});

// Document routes
router.get("/api/documents", requireAuth, async (req, res) => {
  try {
    const userDocuments = await db
      .select({
        id: documents.id,
        title: documents.title,
        filename: documents.filename,
        fileType: documents.fileType,
        uploadDate: documents.uploadDate,
        courseId: documents.courseId,
        courseName: courses.name,
        metadata: documents.metadata
      })
      .from(documents)
      .innerJoin(courses, eq(documents.courseId, courses.courseId))
      .where(eq(courses.userId, req.session.userId!))
      .orderBy(desc(documents.uploadDate));

    res.json(userDocuments);
  } catch (error) {
    console.error("Documents fetch error:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.post("/api/documents/upload", requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    const courseIdInt = parseInt(courseId);
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, courseIdInt), eq(courses.userId, req.session.userId!)));

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const { extractedContent, analysis } = await documentAnalysisService.extractAndAnalyze(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      course.name
    );

    const [document] = await db.insert(documents).values({
      userId: req.session.userId!,
      courseId: course.courseId,
      title: req.file.originalname,
      filename: req.file.originalname,
      fileType: req.file.mimetype,
      content: extractedContent,
      metadata: JSON.stringify(analysis),
      uploadDate: new Date()
    }).returning();

    res.json({
      message: "File uploaded successfully",
      document,
      analysis
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

router.get("/api/documents/:documentId/analysis", requireAuth, async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);

    const [document] = await db
      .select({
        id: documents.id,
        metadata: documents.metadata,
        courseId: documents.courseId
      })
      .from(documents)
      .innerJoin(courses, eq(documents.courseId, courses.courseId))
      .where(and(eq(documents.id, documentId), eq(courses.userId, req.session.userId!)));

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const analysis = document.metadata ? JSON.parse(document.metadata) : null;
    res.json({ analysis });
  } catch (error) {
    console.error("Document analysis fetch error:", error);
    res.status(500).json({ error: "Failed to fetch document analysis" });
  }
});

router.post("/api/documents/:documentId/explain", async (req, res) => {
  try {
    const { documentId } = req.params;
    const { topic, level = 'intermediate' } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Get the document
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, parseInt(documentId)));

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Generate explanation
    const explanation = await documentAnalysisService.generateTeachingExplanation(
      document.content,
      topic,
      level
    );

    res.json({ explanation, topic, level });
  } catch (error) {
    console.error('Explanation generation error:', error);
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

// Generate personalized examples for explanations
router.post('/api/documents/:id/examples', async (req, res) => {
  try {
    const { id } = req.params;
    const { topic, explanation, exampleCount = 3 } = req.body;

    if (!topic || !explanation) {
      return res.status(400).json({ error: 'Topic and explanation are required' });
    }

    // Get the document for context
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, parseInt(id)));

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get user profile from the request
    const userId = req.session?.userId;
    let userProfile = null;

    if (userId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (user) {
        userProfile = {
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
          school: user.school,
          program: user.program,
          year: user.year,
          interests: [] // You could expand this based on user's course history
        };
      }
    }

    // Generate personalized examples
    const result = await documentAnalysisService.generatePersonalizedExamples(
      topic,
      explanation,
      userProfile || undefined,
      document.content,
      exampleCount
    );

    res.json(result);
  } catch (error) {
    console.error('Example generation error:', error);
    res.status(500).json({ error: 'Failed to generate examples' });
  }
});


// Voice processing routes
router.post("/api/voice/process", requireAuth, async (req, res) => {
  try {
    const { command, courseId, sessionId, contextSwitch, context, audioFeatures } = req.body;

    if (!command) {
      return res.status(400).json({ error: "Command is required" });
    }

    console.log(`Processing voice command: "${command}" with context:`, context);

    const userId = req.session.userId!;
    let response = "";
    let courseContext = null;
    let action = 'explain';
    let navigationData = null;

    const currentSessionId = `session_${userId}_${Date.now()}`;

    // Get personalized learning context
    let personalizedContext = {
      strugglingTopics: [],
      masteredTopics: [],
      recommendations: [],
      encouragement: [],
      relatedStruggles: []
    };

    try {
      personalizedContext = await semanticMemoryService.getPersonalizedContext(
        userId,
        courseId || 'general',
        command
      );
    } catch (error) {
      console.warn('Failed to get personalized context:', error);
    }

    // Get conversation context
    let conversationContext = {
      topics: [],
      recentTopics: [],
      sessionDuration: 0
    };

    try {
      conversationContext = await semanticMemoryService.getConversationContext(
        userId,
        currentSessionId
      );
    } catch (error) {
      console.warn('Failed to get conversation context:', error);
    }

    // Check for navigation commands
    const navigationCommands = {
      'dashboard': /(?:go to|open|show|navigate to)?\s*(?:dashboard|home)/i,
      'courses': /(?:go to|open|show|navigate to)?\s*(?:courses?|my courses?)/i,
      'voice': /(?:go to|open|show|navigate to)?\s*(?:voice|voice assistant|voice page)/i,
      'progress': /(?:go to|open|show|navigate to)?\s*(?:progress|my progress|analytics)/i,
      'planner': /(?:go to|open|show|navigate to)?\s*(?:planner|study planner|schedule)/i,
    };

    for (const [page, pattern] of Object.entries(navigationCommands)) {
      if (pattern.test(command.toLowerCase())) {
        action = 'navigate';
        navigationData = { page };
        response = `Navigating to ${page} page...`;
        return res.json({ response, action, data: navigationData, courseContext });
      }
    }

    // Detect course context
    const detectCourseFromCommand = (cmd: string): string | null => {
      const subjectMappings: Record<string, string> = {
        'entrepreneurship': '011274',
        'business': '011274',
        'technological entrepreneurship': '011274',
        'tech entrepreneurship': '011274',
      };

      for (const [subject, id] of Object.entries(subjectMappings)) {
        if (cmd.toLowerCase().includes(subject)) {
          return id;
        }
      }

      return courseId;
    };

    const detectedCourseId = detectCourseFromCommand(command);

    // Handle course-specific queries
    if (detectedCourseId) {
      try {
        // Query course documents for context
        const courseDocuments = await db
          .select()
          .from(documents)
          .where(eq(documents.courseId, detectedCourseId));

        if (courseDocuments.length > 0) {
          courseContext = `Course: ${detectedCourseId}`;
          const documentContent = courseDocuments.map(doc => doc.content).join('\n\n');

          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: `You are an intelligent study assistant. You have access to course materials from ${courseContext}.

Available Content:
${documentContent}

Instructions:
- Answer questions thoroughly using the available course content
- Provide explanations that help students understand concepts deeply
- Be encouraging and supportive in your responses
- Reference specific course materials when possible`
                },
                {
                  role: "user",
                  content: command
                }
              ],
              temperature: 0.7,
              max_tokens: 1000
            })
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            response = aiData.choices[0].message.content;
          } else {
            response = `I found your course materials for ${detectedCourseId}, but I'm having trouble processing your request right now. Please try again.`;
          }
        } else {
          response = `I don't have any documents for course "${detectedCourseId}" yet. Try uploading some course materials first.`;
        }
      } catch (error) {
        console.error('Course-specific processing error:', error);
        response = "I'm having trouble accessing your course materials right now. Please try again.";
      }
    } else {
      // Handle general questions
      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are an intelligent study assistant.

Instructions:
- Answer questions thoroughly using general knowledge
- Provide explanations that help students understand concepts deeply
- Be encouraging and supportive in your responses`
              },
              {
                role: "user",
                content: command
              }
            ],
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          response = aiData.choices[0].message.content;
        } else {
          response = "I'm having trouble processing your request right now. Please try again.";
        }
      } catch (error) {
        console.error('General processing error:', error);
        response = "I'm having trouble processing your request right now. Please try again.";
      }
    }

    // Return the response
    res.json({
      response,
      courseContext,
      action,
      data: navigationData,
      contextSwitch: null,
      semanticContext: {
        strugglingTopics: personalizedContext.strugglingTopics.slice(0, 3),
        recommendations: personalizedContext.recommendations.slice(0, 2)
      },
      multiModal: null
    });

  } catch (error) {
    console.error("Voice processing error:", error);
    res.status(500).json({ error: "Failed to process voice command" });
  }
});

// Quiz routes
router.post("/api/quiz/post-explanation", requireAuth, async (req, res) => {
  try {
    const { topic, explanation, documentContext, difficulty = 'adaptive' } = req.body;

    if (!topic || !explanation) {
      return res.status(400).json({ error: "Topic and explanation are required" });
    }

    const questions = await quizGenerationService.generatePostExplanationQuiz(
      topic,
      explanation,
      documentContext,
      difficulty
    );

    res.json({ questions });
  } catch (error) {
    console.error("Post-explanation quiz generation error:", error);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});

router.post("/api/quiz/evaluate", requireAuth, async (req, res) => {
  try {
    const { questions, userAnswers, attemptHistory } = req.body;

    if (!questions || !userAnswers) {
      return res.status(400).json({ error: "Questions and user answers are required" });
    }

    const evaluation = await quizGenerationService.evaluateQuizAnswers(questions, userAnswers);

    // Apply adaptive feedback logic
    const adaptiveResults = evaluation.results.map((result) => {
      const questionId = result.questionId;
      const attempts = attemptHistory?.[questionId] || 1;

      if (result.isCorrect) {
        // Short confirmation for correct answers
        const correctResponses = ["Correct!", "Exactly right!", "Perfect!", "Great job!", "That's right!"];
        result.adaptiveFeedback = correctResponses[Math.floor(Math.random() * correctResponses.length)];
        result.shouldRevealAnswer = false;
      } else {
        // Adaptive feedback based on attempts
        if (attempts === 1) {
          result.adaptiveFeedback = "Hmm, not quite. Want to give it another shot?";
          result.shouldRevealAnswer = false;
        } else if (attempts === 2) {
          result.adaptiveFeedback = "Still not quite right. Think about the key concepts and try once more.";
          result.shouldRevealAnswer = false;
        } else {
          result.adaptiveFeedback = `Here's how it works: ${result.explanation || result.correctAnswer}. You were close!`;
          result.shouldRevealAnswer = true;
        }
      }

      return result;
    });

    const userId = req.session.userId;

    for (const result of adaptiveResults) {
      const question = questions.find((q: any) => q.id === result.questionId);
      if (question) {
        await db.insert(studyLevels).values({
          userId: userId!,
          courseId: "general",
          topic: question.conceptTested,
          masteryLevel: Math.round(result.conceptMastery * 100),
          questionsAttempted: 1,
          questionsCorrect: result.isCorrect ? 1 : 0,
          lastUpdated: new Date()
        });
      }
    }

    res.json({
      ...evaluation,
      results: adaptiveResults
    });
  } catch (error) {
    console.error("Quiz evaluation error:", error);
    res.status(500).json({ error: "Failed to evaluate quiz" });
  }
});

router.post("/api/quiz/generate-interleaved", requireAuth, async (req, res) => {
  try {
    const { subject, topics, approaches, targetCount = 8 } = req.body;

    if (!subject || !topics || !approaches) {
      return res.status(400).json({ error: "Subject, topics, and approaches are required" });
    }

    const questions = await quizGenerationService.generateInterleavedPracticeQuiz(
      subject,
      topics,
      approaches,
      targetCount
    );

    res.json({ questions });
  } catch (error) {
    console.error("Interleaved practice quiz generation error:", error);
    res.status(500).json({ error: "Failed to generate interleaved practice quiz" });
  }
});

// New endpoint for adaptive flashcard feedback
router.post("/api/flashcards/process-voice-answer", requireAuth, async (req, res) => {
  try {
    const { sessionId, answer } = req.body;

    if (!sessionId || !answer) {
      return res.status(400).json({ error: "Session ID and answer are required" });
    }

    const result = await flashcardService.processVoiceAnswer(sessionId, answer);
    res.json(result);
  } catch (error) {
    console.error("Flashcard processing error:", error);
    res.status(500).json({ error: "Failed to process flashcard answer" });
  }
});

// Adaptive Learning Path endpoints
router.get('/api/learning-path/adaptive/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { courseId } = req.query;

    const { adaptiveLearningService } = await import('./services/adaptive-learning-service');
    const learningPath = await adaptiveLearningService.generateAdaptiveLearningPath(
      userId,
      courseId as string
    );

    res.json({
      success: true,
      learningPath
    });
  } catch (error) {
    console.error('Error generating adaptive learning path:', error);
    res.status(500).json({ error: 'Failed to generate adaptive learning path' });
  }
});

router.post('/api/learning-path/complete-step', async (req, res) => {
  try {
    const { userId, stepId, performance } = req.body;

    if (!['excellent', 'good', 'struggling'].includes(performance)) {
      return res.status(400).json({ error: 'Invalid performance value' });
    }

    const { adaptiveLearningService } = await import('./services/adaptive-learning-service');
    const updatedPath = await adaptiveLearningService.updateAdaptivePath(
      userId,
      stepId,
      performance as 'excellent' | 'good' | 'struggling'
    );

    res.json({
      success: true,
      updatedPath
    });
  } catch (error) {
    console.error('Error updating adaptive learning path:', error);
    res.status(500).json({ error: 'Failed to update learning path' });
  }
});

router.get('/api/learning-path/next-step/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { context } = req.query;

    const { adaptiveLearningService } = await import('./services/adaptive-learning-service');
    const nextStep = await adaptiveLearningService.getNextRecommendedStep(
      userId,
      context as string
    );

    res.json({
      success: true,
      nextStep,
      hasRecommendation: !!nextStep
    });
  } catch (error) {
    console.error('Error getting next learning step:', error);
    res.status(500).json({ error: 'Failed to get next learning step' });
  }
});


// Helper functions for semantic memory
function extractMainTopic(message: string): string | null {
  // Extract the main topic from a message
  const topicPatterns = [
    /explain\s+(.+?)(?:\s+to\s+me)?$/i,
    /what\s+is\s+(.+?)\??$/i,
    /how\s+does\s+(.+?)\s+work/i,
    /tell\s+me\s+about\s+(.+?)$/i,
    /help\s+me\s+with\s+(.+?)$/i,
  ];

  for (const pattern of topicPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim().toLowerCase();
    }
  }

  // Fallback: extract common academic terms
  const academicTerms = message.match(/\b(mathematics?|physics|chemistry|biology|programming|algorithm|equation|theory|concept|principle)\b/gi);
  if (academicTerms && academicTerms.length > 0) {
    return academicTerms[0].toLowerCase();
  }

  return null;
}

function extractTopicsFromMessage(message: string): string[] {
  const topics: string[] = [];

  // Extract main topic
  const mainTopic = extractMainTopic(message);
  if (mainTopic) {
    topics.push(mainTopic);
  }

  // Extract other academic terms
  const academicPatterns = [
    /\b(mathematics?|math|calculus|algebra|geometry|trigonometry|statistics)\b/gi,
    /\b(physics|mechanics|thermodynamics|electromagnetism|quantum|relativity)\b/gi,
    /\b(chemistry|organic|inorganic|biochemistry|molecular|atomic)\b/gi,
    /\b(biology|genetics|molecular|anatomy|physiology|evolution)\b/gi,
    /\b(programming|coding|algorithm|data structure|database|software)\b/gi,
    /\b(history|historical|ancient|medieval|modern|contemporary)\b/gi,
    /\b(literature|english|writing|grammar|poetry|prose)\b/gi,
    /\b(economics|business|entrepreneurship|finance|marketing|management)\b/gi,
  ];

  for (const pattern of academicPatterns) {
    const matches = message.match(pattern);
    if (matches) {
      topics.push(...matches.map(m => m.toLowerCase()));
    }
  }

  return [...new Set(topics)]; // Remove duplicates
}

// Study session routes
router.post("/api/study-sessions", requireAuth, async (req, res) => {
  try {
    const { title, subject, startTime, endTime, date, notes, isPriority, type = 'session' } = req.body;
    const userId = req.session.userId;

    if (!title || !subject || !startTime || !endTime) {
      return res.status(400).json({ error: "Title, subject, start time, and end time are required" });
    }

    // In a real implementation, you would save to database
    // For now, we'll return a mock response
    const session = {
      id: Date.now(),
      userId,
      title,
      subject,
      startTime,
      endTime,
      date: date || new Date().toISOString().split('T')[0],
      notes,
      isPriority: isPriority || false,
      type,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    res.json({
      message: "Study session created successfully",
      session
    });
  } catch (error) {
    console.error("Study session creation error:", error);
    res.status(500).json({ error: "Failed to create study session" });
  }
});

router.post("/api/study-sessions/:id/complete", requireAuth, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.session.userId;
    const { completionRate, actualDuration, keyTopics } = req.body;

    // In a real implementation, update the session in database
    const completedSession = {
      id: sessionId,
      userId,
      status: 'completed',
      completionRate: completionRate || 100,
      actualDuration: actualDuration,
      keyTopics: keyTopics || [],
      completedAt: new Date().toISOString()
    };

    // Record study level progress if topics were covered
    if (keyTopics && keyTopics.length > 0) {
      for (const topic of keyTopics) {
        await db.insert(studyLevels).values({
          userId: userId!,
          courseId: "general",
          topic: topic,
          masteryLevel: Math.min(100, 70 + (completionRate || 0) / 3),
          questionsAttempted: 1,
          questionsCorrect: completionRate >= 80 ? 1 : 0,
          lastUpdated: new Date()
        });
      }
    }

    res.json({
      message: "Study session completed successfully",
      session: completedSession
    });
  } catch (error) {
    console.error("Study session completion error:", error);
    res.status(500).json({ error: "Failed to complete study session" });
  }
});

router.get("/api/study-sessions", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { date } = req.query;

    // In a real implementation, fetch from database
    // For now, return empty array
    res.json([]);
  } catch (error) {
    console.error("Study sessions fetch error:", error);
    res.status(500).json({ error: "Failed to fetch study sessions" });
  }
});

router.post("/api/study-sessions/summary", requireAuth, async (req, res) => {
  try {
    const { totalDuration, studyTime, completedSessions, keyTopics, focusScore } = req.body;

    // Generate personalized recommendations
    const recommendations = [];

    if (focusScore < 70) {
      recommendations.push("Try using the Pomodoro Technique with shorter study intervals");
      recommendations.push("Consider eliminating distractions from your study environment");
    }

    if (completedSessions > 3) {
      recommendations.push("Excellent focus! You completed multiple study sessions");
      recommendations.push("Consider reviewing your notes to reinforce learning");
    }

    if (studyTime > 90) {
      recommendations.push("Great stamina! Remember to take breaks to maintain effectiveness");
    }

    const summary = {
      totalDuration,
      studyTime,
      completedSessions,
      keyTopics: keyTopics || [],
      focusScore,
      recommendations,
      createdAt: new Date().toISOString()
    };

    res.json({
      message: "Study session summary generated",
      summary
    });
  } catch (error) {
    console.error("Study session summary error:", error);
    res.status(500).json({ error: "Failed to generate study session summary" });
  }
});

// Enhanced Document Processing routes
router.post("/api/documents/study-guide", requireAuth, async (req, res) => {
  try {
    const { documentIds, courseId, title } = req.body;
    const userId = req.session.userId!;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: "Document IDs are required" });
    }

    const studyGuide = await studyGuideService.generateStudyGuide(
      userId,
      documentIds,
      courseId,
      title
    );

    res.json({
      message: "Study guide generated successfully",
      studyGuide
    });
  } catch (error) {
    console.error("Study guide generation error:", error);
    res.status(500).json({ error: "Failed to generate study guide" });
  }
});

// Voice-activated document annotation
router.post("/api/documents/:documentId/voice-annotation", requireAuth, async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const userId = req.session.userId!;
    const { voiceNote, position, type = 'note' } = req.body;

    if (!voiceNote) {
      return res.status(400).json({ error: "Voice note content is required" });
    }

    const annotation = await studyGuideService.createVoiceAnnotation(
      userId,
      documentId,
      voiceNote,
      position,
      type
    );

    res.json({
      message: "Voice annotation created successfully",
      annotation
    });
  } catch (error) {
    console.error("Voice annotation error:", error);
    res.status(500).json({ error: "Failed to create voice annotation" });
  }
});

// Generate document summary
router.post("/api/documents/:documentId/summary", requireAuth, async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const { length = 'medium' } = req.body;

    if (!['short', 'medium', 'long'].includes(length)) {
      return res.status(400).json({ error: "Invalid summary length" });
    }

    const summary = await studyGuideService.generateDocumentSummary(
      documentId,
      length
    );

    res.json({
      message: "Document summary generated successfully",
      summary
    });
  } catch (error) {
    console.error("Document summary error:", error);
    res.status(500).json({ error: "Failed to generate document summary" });
  }
});

// Voice-activated study guide generation
router.post("/api/voice/study-guide", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { voiceCommand, courseContext } = req.body;

    if (!voiceCommand) {
      return res.status(400).json({ error: "Voice command is required" });
    }

    const studyGuide = await studyGuideService.generateVoiceStudyGuide(
      userId,
      voiceCommand,
      courseContext
    );

    if (!studyGuide) {
      return res.status(404).json({ error: "No relevant documents found for study guide generation" });
    }

    res.json({
      message: "Study guide generated from voice command",
      studyGuide
    });
  } catch (error) {
    console.error("Voice study guide error:", error);
    res.status(500).json({ error: "Failed to generate study guide from voice command" });
  }
});

// Voice-Driven Flashcards routes
router.post("/api/flashcards/generate-from-document", async (req, res) => {
  try {
    const { documentId, count = 10 } = req.body;
    const userId = req.session.userId!; // Use authenticated user ID

    const flashcards = await flashcardService.generateFlashcardsFromDocument(
      parseInt(documentId),
      userId,
      count
    );

    res.json({ flashcards });
  } catch (error) {
    console.error("Flashcard generation error:", error);
    res.status(500).json({ error: "Failed to generate flashcards" });
  }
});

router.post("/api/flashcards/generate-from-voice", async (req, res) => {
  try {
    const { command, courseId } = req.body;
    const userId = req.session.userId!; // Use authenticated user ID

    const flashcards = await flashcardService.generateFlashcardsFromVoiceCommand(
      userId,
      command,
      courseId
    );

    res.json({ flashcards });
  } catch (error) {
    console.error("Voice flashcard generation error:", error);
    res.status(500).json({ error: "Failed to generate flashcards from voice command" });
  }
});

router.post("/api/flashcards/start-voice-session", async (req, res) => {
  try {
    const { command, sessionType = 'practice', courseId } = req.body;
    const userId = req.session.userId!; // Use authenticated user ID

    // First generate flashcards if needed
    const flashcards = await flashcardService.generateFlashcardsFromVoiceCommand(
      userId,
      command,
      courseId
    );

    if (flashcards.length === 0) {
      return res.status(400).json({ error: "No flashcards could be generated" });
    }

    // Start the voice session
    const result = await flashcardService.startVoiceSession(
      userId,
      flashcards,
      sessionType,
      courseId
    );

    res.json(result);
  } catch (error) {
    console.error("Voice session start error:", error);
    res.status(500).json({ error: "Failed to start voice flashcard session" });
  }
});

router.post("/api/flashcards/process-voice-answer", async (req, res) => {
  try {
    const { sessionId, answer } = req.body;

    const response = await flashcardService.processVoiceAnswer(sessionId, answer);

    res.json(response);
  } catch (error) {
    console.error("Voice answer processing error:", error);
    res.status(500).json({ error: "Failed to process voice answer" });
  }
});

router.get("/api/flashcards/next-question/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const response = flashcardService.getNextQuestion(sessionId);

    res.json(response);
  } catch (error) {
    console.error("Next question error:", error);
    res.status(500).json({ error: "Failed to get next question" });
  }
});

router.get("/api/flashcards/session-stats/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const stats = flashcardService.getSessionStats(sessionId);

    if (!stats) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(stats);
  } catch (error) {
    console.error("Session stats error:", error);
    res.status(500).json({ error: "Failed to get session stats" });
  }
});

// Enhanced Document Processing routes
router.post("/api/documents/:id/generate-study-guide", async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const { title, documentIds = [documentId], courseId } = req.body;
    const userId = req.session.userId!;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: "Document IDs are required" });
    }

    const studyGuide = await studyGuideService.generateStudyGuide(
      userId,
      documentIds,
      courseId,
      title
    );

    res.json({
      message: "Study guide generated successfully",
      studyGuide
    });
  } catch (error) {
    console.error("Study guide generation error:", error);
    res.status(500).json({ error: "Failed to generate study guide" });
  }
});

// Added API endpoints for Vocal Learning Enhancements
// Vocal Challenge routes
router.get('/api/vocal-challenges/adaptive/:difficulty', requireAuth, async (req, res) => {
  try {
    const { difficulty } = req.params;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const challenges = await generateAdaptiveChallenges(userId, parseInt(difficulty));
    res.json({ challenges });
  } catch (error) {
    console.error('Adaptive challenges error:', error);
    res.status(500).json({ error: 'Failed to generate challenges' });
  }
});

router.post('/api/vocal-challenges/attempt', requireAuth, upload.single('audioFile'), async (req, res) => {
  try {
    const { challengeId } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!req.file) {
        return res.status(400).json({ error: "No audio file provided for the attempt." });
    }

    const result = await processChallengeAttempt(userId, challengeId, req.file);
    res.json(result);
  } catch (error) {
    console.error('Challenge attempt error:', error);
    res.status(500).json({ error: 'Failed to process challenge attempt' });
  }
});

// Self-test routes
router.post('/api/quiz/generate-self-test', requireAuth, async (req, res) => {
  try {
    const { config, userDocuments, weakAreas } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Input validation
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Invalid config provided' });
    }

    if (!Array.isArray(userDocuments)) {
      return res.status(400).json({ error: 'Invalid userDocuments provided' });
    }

    const questions = await quizGenerationService.generateSelfTest(config, userDocuments, weakAreas || []);
    res.json({ questions });
  } catch (error) {
    console.error('Self-test generation error:', error);
    res.status(500).json({ error: 'Failed to generate self-test' });
  }
});

router.post('/api/quiz/evaluate-self-test', requireAuth, async (req, res) => {
  try {
    const { questions, userAnswers, testConfig, totalTime } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const evaluation = await quizGenerationService.evaluateSelfTest(questions, userAnswers, testConfig, totalTime);
    res.json(evaluation);
  } catch (error) {
    console.error('Self-test evaluation error:', error);
    res.status(500).json({ error: 'Failed to evaluate self-test' });
  }
});

// Vocal Assessment routes
router.post('/api/vocal-assessment/analyze', requireAuth, async (req, res) => {
  try {
    const { targetText, transcript, audioFeatures } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const assessment = await analyzeVocalPerformance(targetText, transcript, audioFeatures);

    await voiceAnalyticsService.recordInteraction({
      userId,
      timestamp: new Date(),
      command: 'vocal_assessment',
      response: 'Assessment completed',
      category: 'study_session',
      duration: audioFeatures?.duration || 0,
      audioFeatures,
      outcomeMetrics: {
        immediateUnderstanding: assessment.overallScore / 20, // Convert to 1-5 scale
        completionRate: 1.0
      }
    });

    res.json(assessment);
  } catch (error) {
    console.error('Vocal assessment error:', error);
    res.status(500).json({ error: 'Failed to analyze vocal performance' });
  }
});

export default router;