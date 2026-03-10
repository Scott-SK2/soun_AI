// User related types
export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  school: string;
  program: string;
  year: string;
  initials: string;
}

// Assignment tracking
export interface Assignment {
  id: number;
  title: string;
  course: string;
  dueDate: string;
  progress: number;
}

// Study session planning
export interface StudySession {
  id: number;
  title: string;
  subject: string;
  startTime: string;
  endTime: string;
  notes?: string;
  isPriority: boolean;
}

// Progress tracking
export interface WeeklyStudyData {
  day: string;
  minutes: number;
  isPast: boolean;
  isToday: boolean;
}

export interface SubjectDistribution {
  name: string;
  minutes: number;
  percentage: number;
  color: string;
}

// Achievements
export interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  dateEarned: string;
}

// Voice commands
export interface VoiceCommand {
  command: string;
  response: string;
  action: string;
  timestamp: Date;
}

// Course related types
export interface Course {
  id: string;
  title: string;
  code: string;
  instructor: string;
  description?: string;
  term: string;
  credits: number;
  materials?: number;
  lastUpdated: string;
}

export interface CourseMaterial {
  id: number;
  title: string;
  type: string;
  fileType: string;
  uploadDate: string;
  description?: string;
  courseId: string;
  fileUrl?: string;
}

// Study Mastery tracking
export interface StudyLevel {
  id: number;
  userId: number;
  courseId: string;
  topic: string;
  masteryLevel: number; // 0-100 percentage
  questionsAttempted: number;
  questionsCorrect: number;
  lastUpdated: Date | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  recommendedActions: string[] | null;
}

export interface CourseStudyLevel {
  courseLevels: StudyLevel[];
  overallLevel: number;
}

export interface TopicMastery {
  topic: string;
  masteryLevel: number;
  lastUpdated: Date | null;
}

export interface CourseMastery {
  courseId: string;
  courseName: string;
  averageMastery: number;
  topicsStudied: number;
  accuracy: number;
  totalQuestionAttempts: number;
  masteryLevels: TopicMastery[];
}

export interface MasterySummary {
  courses: CourseMastery[];
  overallMastery: number; 
  topicsStudied: number;
  mostStudiedCourse: CourseMastery | null;
}

// Quiz related types
export interface QuizQuestion {
  id: number;
  courseId: string;
  topic: string;
  difficulty: string;
  questionType: string;
  question: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  tags: string[] | null;
}

export interface QuizAttempt {
  id: number;
  userId: number;
  courseId: string;
  topic: string;
  questionId: number;
  userAnswer: string;
  isCorrect: boolean;
  attemptedAt: Date | null;
  timeSpent: number | null;
}

export interface QuizSession {
  id: number;
  userId: number;
  courseId: string;
  topics: string[] | null;
  questionsCount: number;
  correctCount: number;
  score: number;
  startTime: Date;
  endTime: Date | null;
  status: string; // 'in_progress', 'completed', 'abandoned'
  feedback: string | null;
}
