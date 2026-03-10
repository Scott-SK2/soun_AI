import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Header } from "@/components/ui/header";
import { MobileNav } from "@/components/ui/mobile-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Brain, FileText, TrendingUp, Upload } from "lucide-react";
import { speak } from "@/lib/text-to-speech";
import { useSoundPermission } from "@/context/sound-permission-context";
import { useAuth } from "@/context/auth-context";
import { StudyProgress } from '@/components/dashboard/study-progress';
import { UserProfile } from '@/components/dashboard/user-profile';
import { VoiceAssistant } from '@/components/dashboard/voice-assistant';
import { StudyPlan } from '@/components/dashboard/study-plan';
import { MotivationWidget } from '@/components/dashboard/motivation-widget';
import { ExamScores } from '@/components/dashboard/exam-scores';
import { UpcomingAssignments } from '@/components/dashboard/upcoming-assignments';
import { CurriculumTracker } from '@/components/dashboard/curriculum-tracker';
import { Achievements } from '@/components/dashboard/achievements';
import { AdaptiveLearningDashboard } from '@/components/learning/adaptive-learning-dashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const { isSoundEnabled } = useSoundPermission();
  const [, setLocation] = useLocation();
  const hasGreeted = useRef(false);

  // Fetch recent activity with extended caching
  const { data: recentActivity } = useQuery({
    queryKey: ['/api/user/recent-activity'],
    queryFn: async () => {
      const res = await fetch('/api/user/recent-activity');
      if (!res.ok) return { courses: [], documents: [], progress: {} };
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - activity doesn't change rapidly
    placeholderData: (previousData) => previousData, // Keep showing old data while refetching
  });

  // Play greeting when user logs in
  useEffect(() => {
    if (!hasGreeted.current && isSoundEnabled && user) {
      const greeting = `Hi ${user.firstName || 'there'}, ready to study with your AI tutor?`;
      speak(greeting, { rate: 1, pitch: 1, volume: 1 });
      hasGreeted.current = true;
    }
  }, [isSoundEnabled, user]);

  const activity = recentActivity || { courses: [], documents: [], progress: {} };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-1 pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.firstName || 'Student'}! 👋
            </h1>
            <p className="text-gray-600">
              Your AI tutor is ready to help you understand your course materials
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activity.courses?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Course materials available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activity.documents?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Study materials uploaded
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Understanding</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activity.progress?.averageMastery || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  Average concept mastery
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Actions */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">

            {/* Soun Card */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-600" />
                  Soun - Your Voice Tutor
                </CardTitle>
                <CardDescription>
                  Ask questions about your course materials using voice commands
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white rounded-lg border">
                  <p className="text-sm font-medium mb-2">🎙️ Try saying:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>"Explain photosynthesis from my biology notes"</li>
                    <li>"What are the key points in chapter 3?"</li>
                    <li>"Quiz me on calculus derivatives"</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  💡 Soun is available on every page - look for the floating blue button!
                </p>
              </CardContent>
            </Card>

            {/* Course Access */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Your Courses
                </CardTitle>
                <CardDescription>
                  Access course materials and upload new documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activity.courses?.length > 0 ? (
                  <div className="space-y-2">
                    {activity.courses.slice(0, 3).map((course: any) => (
                      <div key={course.id} className="flex items-center justify-between p-2 border rounded">
                        <span className="font-medium">{course.name}</span>
                        <Badge variant="outline">{course.documentCount || 0} docs</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No courses yet</p>
                  </div>
                )}
                <Button 
                  onClick={() => setLocation("/courses")} 
                  className="w-full"
                >
                  {activity.courses?.length > 0 ? 'View All Courses' : 'Create Your First Course'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <StudyProgress />
            <StudyPlan />
          </div>

          {/* Adaptive Learning Path Section */}
          <div className="space-y-6">
            <AdaptiveLearningDashboard />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <ExamScores />
            <UpcomingAssignments />
            <CurriculumTracker />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <MotivationWidget />
            <Achievements />
          </div>

          {/* Recent Activity */}
          {activity.documents?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Study Materials</CardTitle>
                <CardDescription>
                  Your latest uploaded documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activity.documents.slice(0, 5).map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-sm text-muted-foreground">{doc.courseName}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setLocation(`/courses/${doc.courseId}?doc=${doc.id}`)}
                      >
                        Study
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* How It Works */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>How Your AI Tutor Works</CardTitle>
              <CardDescription>
                The only AI tutor that learns your course materials and verifies understanding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">1. Upload Materials</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload PDFs, PowerPoints, documents, and notes from your courses
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Brain className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">2. Ask Questions</h3>
                  <p className="text-sm text-muted-foreground">
                    Use voice commands to ask about specific topics from your materials
                  </p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">3. Verify Learning</h3>
                  <p className="text-sm text-muted-foreground">
                    Take instant quizzes to prove you understand the concepts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}