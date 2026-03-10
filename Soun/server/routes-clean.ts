import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from './db';
import { documents, users, courses, insertUserSchema, insertCourseSchema, insertDocumentSchema } from '../shared/schema';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { documentAnalysisService } from './services/document-analysis-service';
import { quizGenerationService } from './services/quiz-generation-service';
import { fileTypeFromBuffer } from 'file-type';
import * as CFB from 'cfb';

const router = Router();

// Configure multer for file uploads using memory storage
// Files are validated via magic number inspection before being written to disk
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Secure file validation using magic number (file signature) inspection
// This prevents attackers from uploading malicious files by forging MIME types/extensions
async function validateAndSaveFile(buffer: Buffer, originalName: string): Promise<{ 
  filename: string; 
  mimetype: string; 
  isValid: boolean; 
  error?: string;
}> {
  try {
    // Step 1: Detect actual file type from magic numbers
    const detectedType = await fileTypeFromBuffer(buffer);

    // Step 2: Define strict allowlist of safe file types based on magic number detection
    const allowedTypes = {
      // Modern Office formats (ZIP-based, strongly validated by file-type library)
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { exts: ['.docx'], mime: 'docx' },
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': { exts: ['.pptx'], mime: 'pptx' },
      // PDF
      'application/pdf': { exts: ['.pdf'], mime: 'pdf' },
      // Images
      'image/jpeg': { exts: ['.jpg', '.jpeg'], mime: 'jpeg' },
      'image/png': { exts: ['.png'], mime: 'png' },
      'image/gif': { exts: ['.gif'], mime: 'gif' },
    };

    // Step 3: Handle legacy Office formats (CFB/OLE containers)
    // Detect CFB format by magic number
    const isCFBFormat = buffer.length >= 8 && 
      buffer[0] === 0xD0 && buffer[1] === 0xCF && 
      buffer[2] === 0x11 && buffer[3] === 0xE0 &&
      buffer[4] === 0xA1 && buffer[5] === 0xB1 &&
      buffer[6] === 0xE1 && buffer[7] === 0xA1;

    let validatedMime: string;
    let validatedExt: string;

    if (isCFBFormat) {
      // Validate CFB structure and determine Office file type
      try {
        const cfb = CFB.read(buffer, { type: 'buffer' });
        
        // Check for PowerPoint streams
        const hasPowerPointStream = cfb.FileIndex.some(entry => 
          entry.name === 'PowerPoint Document' || 
          entry.name === 'Current User' ||
          entry.name.startsWith('Slide')
        );
        
        // Check for Word streams
        const hasWordStream = cfb.FileIndex.some(entry => 
          entry.name === 'WordDocument' || 
          entry.name === '1Table' ||
          entry.name === '0Table'
        );
        
        if (hasPowerPointStream) {
          console.log('[UPLOAD] Accepted legacy PowerPoint file (.ppt)');
          validatedMime = 'application/vnd.ms-powerpoint';
          validatedExt = '.ppt';
        } else if (hasWordStream) {
          console.log('[UPLOAD] Accepted legacy Word file (.doc)');
          validatedMime = 'application/msword';
          validatedExt = '.doc';
        } else {
          // Unknown CFB file type
          console.log('[UPLOAD] Rejected unknown CFB/OLE file');
          return {
            filename: '',
            mimetype: '',
            isValid: false,
            error: 'This Office file format is not supported. Please upload DOC, DOCX, PPT, PPTX, or PDF files.'
          };
        }
      } catch (error) {
        console.error('[UPLOAD] CFB parsing failed:', error);
        return {
          filename: '',
          mimetype: '',
          isValid: false,
          error: 'File validation failed. The file may be corrupted.'
        };
      }
    } else if (detectedType && allowedTypes[detectedType.mime as keyof typeof allowedTypes]) {
      // Modern format detected by file-type library
      const typeInfo = allowedTypes[detectedType.mime as keyof typeof allowedTypes];
      validatedMime = detectedType.mime;
      validatedExt = typeInfo.exts[0];
    } else if (buffer.length < 1000 && buffer.toString('utf8', 0, Math.min(1000, buffer.length)).match(/^[\x20-\x7E\s]*$/)) {
      // Heuristic for plain text: small file with printable ASCII
      validatedMime = 'text/plain';
      validatedExt = '.txt';
    } else {
      // Unrecognized or unsafe file type
      return {
        filename: '',
        mimetype: '',
        isValid: false,
        error: `File type not supported. Detected: ${detectedType?.mime || 'unknown'}. Please upload PDF, DOCX, PPTX, DOC, PPT, TXT, or images.`
      };
    }

    // Step 4: Write validated file to disk with sanitized filename
    const uploadDir = path.join(process.cwd(), 'server', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const basename = path.basename(originalName, path.extname(originalName))
      .replace(/[^a-zA-Z0-9-_]/g, '_')  // Sanitize filename
      .substring(0, 100);  // Limit length
    const filename = `${basename}-${uniqueSuffix}${validatedExt}`;
    const filepath = path.join(uploadDir, filename);

    await fs.writeFile(filepath, buffer);

    // Step 5: Log successful validation
    console.log(`[UPLOAD] Validated and saved: ${filename} (${validatedMime})`);

    return {
      filename,
      mimetype: validatedMime,
      isValid: true
    };

  } catch (error) {
    console.error('[UPLOAD] Validation error:', error);
    return {
      filename: '',
      mimetype: '',
      isValid: false,
      error: 'File validation failed'
    };
  }
}

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Authentication routes
router.get("/api/auth/me", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (user.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "User not found" });
    }

    const { password, ...userWithoutPassword } = user[0];
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Auth check error:", error);
    res.status(500).json({ error: "Failed to check authentication" });
  }
});

router.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (user.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user[0].id;

    const { password: _, ...userWithoutPassword } = user[0];
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

router.post("/api/auth/register", async (req, res) => {
  try {
    const userData = insertUserSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Generate username from email if not provided
    const username = userData.username || userData.email.split('@')[0];

    // Create user
    const newUsers = await db
      .insert(users)
      .values({
        ...userData,
        username,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
      })
      .returning();

    const newUser = newUsers[0];
    req.session.userId = newUser.id;

    const { password: _, ...userWithoutPassword } = newUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register" });
  }
});

router.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out successfully" });
  });
});

// Test user creation endpoint for development/testing
router.post("/api/auth/create-test-user", async (req, res) => {
  console.log('Creating test user and auto-login...');
  try {
    // Check if test user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'test@example.com'))
      .limit(1);

    let user;
    if (existingUser.length === 0) {
      // Create test user
      const hashedPassword = await bcrypt.hash('password123', 12);
      const newUsers = await db
        .insert(users)
        .values({
          email: 'test@example.com',
          password: hashedPassword,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          school: 'Demo University',
          program: 'Computer Science',
          year: '2023',
          education: 'Demo University - Computer Science (2023)'
        })
        .returning();
      user = newUsers[0];
    } else {
      user = existingUser[0];
    }

    // Auto-login the test user
    req.session.userId = user.id;

    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      message: 'Test user created and logged in',
      user: userWithoutPassword,
      invalidateAuth: true  // Signal frontend to refetch auth
    });
  } catch (error) {
    console.error('Create test user error:', error);
    res.status(500).json({ error: 'Failed to create test user' });
  }
});

// Course routes
router.get("/api/courses", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const userCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.userId, userId))
      .orderBy(desc(courses.id));

    res.json(userCourses);
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({ error: "Failed to get courses" });
  }
});

router.post("/api/courses", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const courseData = insertCourseSchema.parse({
      ...req.body,
      userId
    });

    const newCourses = await db
      .insert(courses)
      .values(courseData)
      .returning();

    res.json(newCourses[0]);
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
});

router.get("/api/courses/:courseId", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { courseId } = req.params;

    const course = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.userId, userId),
        eq(courses.courseId, courseId)
      ))
      .limit(1);

    if (course.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(course[0]);
  } catch (error) {
    console.error("Get course error:", error);
    res.status(500).json({ error: "Failed to get course" });
  }
});

// Document routes
router.get("/api/documents", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.uploadDate));

    res.json(userDocuments);
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({ error: "Failed to get documents" });
  }
});

router.get("/api/courses/:courseId/documents", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { courseId } = req.params;

    const courseDocuments = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.userId, userId),
        eq(documents.courseId, courseId)
      ))
      .orderBy(desc(documents.uploadDate));

    res.json(courseDocuments);
  } catch (error) {
    console.error("Get course documents error:", error);
    res.status(500).json({ error: "Failed to get course documents" });
  }
});

router.post("/api/courses/:courseId/documents", requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.session.userId!;
    const { title, tags } = req.body;

    console.log('Upload request:', { 
      courseId, 
      userId, 
      hasFile: !!req.file,
      filename: req.file?.originalname,
      mimetype: req.file?.mimetype
    });

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Verify course exists and belongs to user
    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.courseId, courseId),
        eq(courses.userId, userId)
      ));

    if (!course) {
      console.error('Course not found:', { courseId, userId });
      return res.status(404).json({ error: "Course not found or access denied" });
    }

    console.log('Course found:', course.name);

    // SECURITY: Validate file via magic number inspection before persisting
    const validation = await validateAndSaveFile(req.file.buffer, req.file.originalname);

    if (!validation.isValid) {
      console.log(`[UPLOAD] Rejected file: ${req.file.originalname} - ${validation.error}`);
      return res.status(415).json({ 
        error: validation.error || "Unsupported file type" 
      });
    }

    const uploadDir = path.join(process.cwd(), 'server', 'uploads');
    const filePath = path.join(uploadDir, validation.filename);

    // Parse and validate tags
    let parsedTags: string[] = [];
    try {
      parsedTags = tags ? JSON.parse(tags) : [];
      if (!Array.isArray(parsedTags)) {
        parsedTags = [];
      }
    } catch (error) {
      console.warn('Invalid tags format, using empty array');
    }

    // Extract content from validated file using the correct method
    let extractedContent = "";
    let extractedMetadata = null;

    try {
      // Use extractAndAnalyze which properly handles Buffer and file types
      const analysisResult = await documentAnalysisService.extractAndAnalyze(
        req.file.buffer,
        validation.mimetype,
        req.file.originalname,
        course.name  // Pass course name as context
      );

      extractedContent = analysisResult.extractedContent || "";
      extractedMetadata = JSON.stringify(analysisResult.analysis || {});
    } catch (error) {
      console.warn('Content extraction failed, saving with basic content:', error);
      extractedContent = `Document: ${req.file.originalname}`;
      extractedMetadata = JSON.stringify({
        keyTopics: [course.name],
        learningObjectives: [`Study material for ${course.name}`],
        difficulty: 'intermediate',
        estimatedStudyTime: 15,
        concepts: [],
        summary: `File uploaded: ${req.file.originalname}`,
        questions: [],
        prerequisites: [],
        relatedTopics: [],
        teachingPoints: []
      });
    }

    // Create document record with validated file info
    const documentData = {
      userId,
      courseId,
      title: title || req.file.originalname,
      filename: validation.filename,
      fileType: validation.mimetype,
      filePath,
      content: extractedContent,
      metadata: extractedMetadata,
      uploadDate: new Date(),
      tags: parsedTags
    };

    const newDocuments = await db
      .insert(documents)
      .values(documentData)
      .returning();

    const newDocument = newDocuments[0];

    res.json(newDocument);
  } catch (error) {
    console.error("Upload document error:", error);

    // Clean up uploaded file on error to prevent orphaned files
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Failed to clean up uploaded file:", unlinkError);
      }
    }

    res.status(500).json({ error: "Failed to upload document" });
  }
});

// Document download endpoint
router.get("/api/documents/:id/download", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const documentId = parseInt(req.params.id);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    // Get document and verify ownership
    const document = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.userId, userId)
      ))
      .limit(1);

    if (document.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const doc = document[0];

    // Check if file exists on disk
    if (!doc.filePath || !await fs.access(doc.filePath).then(() => true).catch(() => false)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    // Set proper headers for file download
    res.setHeader('Content-Type', doc.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);

    // Stream the file
    const fileBuffer = await fs.readFile(doc.filePath);
    res.send(fileBuffer);

  } catch (error) {
    console.error("Download document error:", error);
    res.status(500).json({ error: "Failed to download document" });
  }
});

// Document delete endpoint
router.delete("/api/documents/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const documentId = parseInt(req.params.id);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    // Get document and verify ownership
    const document = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.userId, userId)
      ))
      .limit(1);

    if (document.length === 0) {
      return res.status(404).json({ error: "Document not found or you don't have permission to delete it" });
    }

    const doc = document[0];

    // Delete physical file from disk
    if (doc.filePath) {
      try {
        await fs.unlink(doc.filePath);
        console.log(`Deleted file from disk: ${doc.filePath}`);
      } catch (unlinkError: any) {
        // Log the error but continue with database deletion
        // File might already be deleted or path might be invalid
        console.error("Failed to delete file from disk:", unlinkError.message);
      }
    }

    // Delete document record from database
    await db
      .delete(documents)
      .where(eq(documents.id, documentId));

    console.log(`Deleted document ${documentId} (${doc.title}) for user ${userId}`);

    res.json({ 
      success: true, 
      message: "Document deleted successfully",
      deletedDocument: {
        id: doc.id,
        title: doc.title,
        filename: doc.filename
      }
    });

  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// Voice processing routes - Clean and working version
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

      // First check if command mentions a specific course
      for (const [subject, id] of Object.entries(subjectMappings)) {
        if (cmd.toLowerCase().includes(subject)) {
          return id;
        }
      }

      // If no course mentioned but courseId provided from URL context, use it
      return courseId || null;
    };

    const detectedCourseId = detectCourseFromCommand(command);

    console.log('Voice command processing:', {
      command,
      courseIdFromRequest: courseId,
      detectedCourseId,
      userId
    });

    // Handle course-specific queries
    if (detectedCourseId) {
      try {
        // Query course documents for context - MUST filter by user to prevent cross-user access
        const courseDocuments = await db
          .select()
          .from(documents)
          .where(and(
            eq(documents.userId, userId),
            eq(documents.courseId, detectedCourseId)
          ))
          .limit(10); // Limit results for performance

        console.log(`Found ${courseDocuments.length} documents for course ${detectedCourseId} and user ${userId}`);

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
                  content: `You are a concise study assistant. You have access to course materials from ${courseContext}.

Available Content:
${documentContent}

Instructions:
- Give SHORT, focused answers (2-3 sentences maximum)
- Use simple, clear language for easy understanding
- Ask follow-up questions to keep the conversation interactive
- Break complex concepts into bite-sized pieces
- Be encouraging but brief`
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
                content: `You are a concise study assistant.

Instructions:
- Give SHORT, focused answers (2-3 sentences maximum)
- Use simple, clear language for easy understanding  
- Ask follow-up questions to keep the conversation interactive
- Break complex concepts into bite-sized pieces
- Be encouraging but brief`
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
        strugglingTopics: [],
        recommendations: []
      },
      multiModal: null
    });

  } catch (error) {
    console.error("Voice processing error:", error);
    res.status(500).json({ error: "Failed to process voice command" });
  }
});

// Voice history route
router.get("/api/voice/history", requireAuth, async (req, res) => {
  try {
    // Return empty history for now - can be enhanced later
    res.json([]);
  } catch (error) {
    console.error("Voice history error:", error);
    res.status(500).json({ error: "Failed to get voice history" });
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
    const { questions, userAnswers } = req.body;

    if (!questions || !userAnswers) {
      return res.status(400).json({ error: "Questions and user answers are required" });
    }

    const evaluation = await quizGenerationService.evaluateQuizAnswers(questions, userAnswers);
    res.json(evaluation);
  } catch (error) {
    console.error("Quiz evaluation error:", error);
    res.status(500).json({ error: "Failed to evaluate quiz" });
  }
});

router.post("/api/quiz/generate-interleaved", requireAuth, async (req, res) => {
  try {
    const { subject, topics, approaches, targetCount = 10 } = req.body;

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

// Adaptive Learning Path endpoints - UNIFIED endpoint to reduce API calls
router.get('/api/learning-path/combined/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { courseId } = req.query;

    const { adaptiveLearningService } = await import('./services/adaptive-learning-service');

    // Fetch both learning path and next step in parallel on the server side
    const [learningPath, nextStep] = await Promise.all([
      adaptiveLearningService.generateAdaptiveLearningPath(userId, courseId as string),
      adaptiveLearningService.getNextRecommendedStep(userId, courseId as string)
    ]);

    res.json({
      success: true,
      learningPath,
      nextStep,
      hasRecommendation: !!nextStep
    });
  } catch (error) {
    console.error('Error generating combined adaptive learning data:', error);
    res.status(500).json({ error: 'Failed to generate adaptive learning data' });
  }
});

// Individual endpoints for backwards compatibility (prefer using /combined endpoint)
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

export default router;