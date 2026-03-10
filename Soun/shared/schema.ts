import { pgTable, text, serial, integer, boolean, date, time, timestamp, decimal, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  school: text("school").notNull(),
  program: text("program").notNull(),
  year: text("year").notNull(),
  // Career motivation fields
  programChoiceReason: text("program_choice_reason"),
  careerGoals: text("career_goals"),
  // Keep name and education for backward compatibility
  name: text("name").default(""),
  education: text("education").default(""),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  school: true,
  program: true,
  year: true,
}).extend({
  username: z.string().optional(),
  name: z.string().optional(),
  education: z.string().optional(),
  programChoiceReason: z.string().optional(),
  careerGoals: z.string().optional(),
});

export const selectUserSchema = createInsertSchema(users);

// Study Sessions
export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  isPriority: boolean("is_priority").default(false),
  completed: boolean("completed").default(false),
});

export const insertStudySessionSchema = createInsertSchema(studySessions).pick({
  userId: true,
  title: true,
  subject: true,
  startTime: true,
  endTime: true,
  date: true,
  notes: true,
  isPriority: true,
});

// Assignments
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  course: text("course").notNull(),
  dueDate: date("due_date").notNull(),
  progress: integer("progress").default(0),
});

export const insertAssignmentSchema = createInsertSchema(assignments).pick({
  userId: true,
  title: true,
  course: true,
  dueDate: true,
  progress: true,
});

// Study Progress
export const studyProgress = pgTable("study_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subject: text("subject").notNull(),
  date: date("date").notNull(),
  minutes: integer("minutes").notNull(),
});

export const insertStudyProgressSchema = createInsertSchema(studyProgress).pick({
  userId: true,
  subject: true,
  date: true,
  minutes: true,
});

// Achievements
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  dateEarned: timestamp("date_earned").notNull(),
});

export const insertAchievementSchema = createInsertSchema(achievements).pick({
  userId: true,
  title: true,
  description: true,
  icon: true,
  dateEarned: true,
});

// Voice Commands
export const voiceCommands = pgTable("voice_commands", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: text("course_id"),  // Associated course (optional)
  command: text("command").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  processed: boolean("processed").default(false),
  response: text("response"),
  context: text("context"), // To store context for multi-turn conversation
  sessionId: text("session_id"), // To group commands in the same study session
  category: text("category"), // Type of command (question, quiz, explanation, etc.)
});

export const insertVoiceCommandSchema = createInsertSchema(voiceCommands).pick({
  userId: true,
  courseId: true,
  command: true,
  timestamp: true,
  response: true,
  context: true,
  sessionId: true,
  category: true,
});

// Exam Scores - NEW
export const examScores = pgTable("exam_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: text("course_id").notNull(),
  courseName: text("course_name").notNull(),
  examName: text("exam_name").notNull(),
  score: decimal("score").notNull(),
  maxScore: decimal("max_score").notNull(),
  date: date("date").notNull(),
  feedback: text("feedback"),
});

export const insertExamScoreSchema = createInsertSchema(examScores).pick({
  userId: true,
  courseId: true,
  courseName: true,
  examName: true,
  score: true,
  maxScore: true,
  date: true,
  feedback: true,
});

// Courses - NEW
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: text("course_id").notNull(),
  name: text("name").notNull(),
  instructor: text("instructor"),
  credits: integer("credits"),
  semester: text("semester").notNull(),
  year: integer("year").notNull(),
  description: text("description"),
  prerequisites: text("prerequisites").array(),
  relatedCourses: text("related_courses").array(),
});

export const insertCourseSchema = createInsertSchema(courses).pick({
  userId: true,
  courseId: true,
  name: true,
  instructor: true,
  credits: true,
  semester: true,
  year: true,
  description: true,
  prerequisites: true,
  relatedCourses: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStudySession = z.infer<typeof insertStudySessionSchema>;
export type StudySession = typeof studySessions.$inferSelect;

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

export type InsertStudyProgress = z.infer<typeof insertStudyProgressSchema>;
export type StudyProgress = typeof studyProgress.$inferSelect;

export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

export type InsertVoiceCommand = z.infer<typeof insertVoiceCommandSchema>;
export type VoiceCommand = typeof voiceCommands.$inferSelect;

export type InsertExamScore = z.infer<typeof insertExamScoreSchema>;
export type ExamScore = typeof examScores.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

// Documents - NEW
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: text("course_id").notNull(), // Now required for course exclusivity
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(), // pptx, pdf, docx, etc.
  filePath: text("file_path"), // Path to the actual uploaded file on disk
  content: text("content"), // Extracted text content
  metadata: text("metadata"), // Structured data (JSON string) for special file types
  uploadDate: timestamp("upload_date").notNull(),
  tags: text("tags").array(),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  userId: true,
  courseId: true,
  title: true,
  filename: true,
  fileType: true,
  filePath: true,
  content: true,
  metadata: true,
  uploadDate: true,
  tags: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Quiz Questions - NEW
export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  courseId: text("course_id").notNull(),
  topic: text("topic").notNull(),
  difficulty: text("difficulty").notNull(), // easy, medium, hard
  questionType: text("question_type").notNull(), // multiple_choice, true_false, short_answer, etc.
  question: text("question").notNull(),
  options: text("options").array(), // Array of possible answers for multiple choice
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"), // Explanation of the correct answer
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).pick({
  courseId: true,
  topic: true,
  difficulty: true,
  questionType: true,
  question: true,
  options: true,
  correctAnswer: true,
  explanation: true,
  tags: true,
});

// Quiz Attempts - NEW
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: text("course_id").notNull(),
  topic: text("topic").notNull(),
  questionId: integer("question_id").notNull(),
  userAnswer: text("user_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  attemptedAt: timestamp("attempted_at").defaultNow(),
  timeSpent: integer("time_spent"), // time spent on this question in seconds
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).pick({
  userId: true,
  courseId: true,
  topic: true,
  questionId: true,
  userAnswer: true,
  isCorrect: true,
  timeSpent: true,
});

// Study Level (Mastery Tracking) - NEW
export const studyLevel = pgTable("study_level", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: text("course_id").notNull(),
  topic: text("topic").notNull(),
  masteryLevel: integer("mastery_level").notNull(), // 0-100 percentage
  questionsAttempted: integer("questions_attempted").notNull(),
  questionsCorrect: integer("questions_correct").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  strengths: text("strengths").array(), // topics/concepts the student is strong in
  weaknesses: text("weaknesses").array(), // topics/concepts the student needs improvement in
  recommendedActions: text("recommended_actions").array(), // suggested study actions
});

export const insertStudyLevelSchema = createInsertSchema(studyLevel).pick({
  userId: true,
  courseId: true,
  topic: true,
  masteryLevel: true,
  questionsAttempted: true,
  questionsCorrect: true,
  strengths: true,
  weaknesses: true,
  recommendedActions: true,
});

// Quiz Sessions - NEW
export const quizSessions = pgTable("quiz_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: text("course_id").notNull(),
  topics: text("topics").array(),
  questionsCount: integer("questions_count").notNull(),
  correctCount: integer("correct_count").notNull(),
  score: integer("score").notNull(), // Percentage score
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: text("status").notNull(), // in_progress, completed, abandoned
  feedback: text("feedback"), // Overall feedback for the quiz session
});

export const insertQuizSessionSchema = createInsertSchema(quizSessions).pick({
  userId: true,
  courseId: true,
  topics: true,
  questionsCount: true,
  correctCount: true,
  score: true,
  startTime: true,
  endTime: true,
  status: true,
  feedback: true,
});

// Export types for new entities
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;

export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;

export type InsertStudyLevel = z.infer<typeof insertStudyLevelSchema>;
export type StudyLevel = typeof studyLevel.$inferSelect;

export type InsertQuizSession = z.infer<typeof insertQuizSessionSchema>;
export type QuizSession = typeof quizSessions.$inferSelect;

// Export the table aliases that the routes expect
export const studyLevels = studyLevel; // Legacy alias for backward compatibility
export const masteryData = studyLevel; // Another alias expected by components
export const schoolDirectory = pgTable("school_directory", {
  id: serial("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  name: text("name").notNull(),
  programId: text("program_id").notNull(),
  programName: text("program_name").notNull(),
  description: text("description"),
  credits: integer("credits"),
  duration: text("duration"),
  lastVerified: timestamp("last_verified"),
  dataSource: text("data_source").notNull(),
});
