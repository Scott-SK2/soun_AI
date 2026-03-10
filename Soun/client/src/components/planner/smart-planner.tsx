import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, Calendar, Clock, History, PlusCircle, 
  Lightbulb, TrendingUp, UserRoundCheck, Flame, 
  Star, CheckCircle, AlertTriangle
} from 'lucide-react';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { StudySuggestion, StudySuggestions, useStudySuggestions } from './study-suggestions';
import { useStudySessionNotifications, requestNotificationPermission } from '@/lib/notifications';
import { useMotivation } from '@/context/motivation-context';

// Types
export interface StudySession {
  id: number;
  title: string;
  subject: string;
  startTime: string;
  endTime: string;
  date: string;
  notes?: string;
  isPriority: boolean;
  status: 'scheduled' | 'completed' | 'missed';
  completionRate?: number;
  type?: 'session' | 'deadline' | 'exam';
  courseId?: string;
}

export interface StudyMetric {
  totalStudyTime: number; // in minutes
  sessionsCompleted: number;
  averageDailyStudyTime: number; // in minutes
  currentStreak: number;
  bestStreak: number;
  progressTrend: 'up' | 'down' | 'stable';
  weeklyGoalProgress: number; // 0-100
  weakAreas: string[];
  strongAreas: string[];
}

interface SmartPlannerProps {
  initialDate?: Date;
}

export function SmartPlanner({ initialDate = new Date() }: SmartPlannerProps) {
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [activeTab, setActiveTab] = useState('calendar');
  const { toast } = useToast();
  const { notifyStudySuggestion } = useStudySessionNotifications();
  const { recordCompletedTask, showMotivation } = useMotivation();

  // Get the formatted date for API requests
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';

  // Query to get study sessions for the selected date
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<StudySession[]>({
    queryKey: ['/api/study-sessions', formattedDate],
    queryFn: async () => {
      try {
        // In a real implementation, fetch from API
        // const response = await fetch(`/api/study-sessions?date=${formattedDate}`);
        // if (!response.ok) throw new Error('Failed to fetch sessions');
        // return await response.json();

        // Return empty array - no test data
        return [];
      } catch (error) {
        console.error("Error fetching study sessions:", error);
        return [];
      }
    },
    enabled: !!formattedDate
  });

  // Query to get study metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<StudyMetric>({
    queryKey: ['/api/study-metrics'],
    queryFn: async () => {
      try {
        // In a real implementation, fetch from API
        // const response = await fetch('/api/study-metrics');
        // if (!response.ok) throw new Error('Failed to fetch metrics');
        // return await response.json();

        // For now, return mock data
        return {
          totalStudyTime: 2340, // 39 hours
          sessionsCompleted: 28,
          averageDailyStudyTime: 120, // 2 hours
          currentStreak: 5,
          bestStreak: 7,
          progressTrend: 'up',
          weeklyGoalProgress: 75,
          weakAreas: ['Database Normalization', 'Advanced Algorithms'],
          strongAreas: ['Data Structures', 'Web Development']
        };
      } catch (error) {
        console.error("Error fetching study metrics:", error);
        return {
          totalStudyTime: 0,
          weeklyGoal: 600,
          streakDays: 0,
          completedSessions: 0,
          averageSessionLength: 0
        };
      }
    }
  });

  // Query to get study suggestions
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery<StudySuggestion[]>({
    queryKey: ['/api/study-suggestions'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/progress/subjects', {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        const subjects = await response.json();

        // Transform subjects into study suggestions
        return subjects.map((subject: any, index: number) => ({
          id: `suggestion-${index}`,
          title: `Study ${subject.name}`,
          subject: subject.name,
          estimatedTime: Math.max(30, 120 - subject.minutes), // Suggest more time for less studied subjects
          priority: subject.percentage < 20 ? 'high' : subject.percentage < 30 ? 'medium' : 'low',
          reason: `You've spent ${subject.minutes} minutes on ${subject.name} this week`
        })) as StudySuggestion[];
      } catch (error) {
        console.error("Error fetching study suggestions:", error);
        return [];
      }
    }
  });

  // Get study suggestions
  const { suggestionsQuery, scheduleSuggestion } = useStudySuggestions();
  const { data: suggestionss = [], isLoading: suggestionsLoadingg } = useQuery(suggestionsQuery);

  // Handle scheduling a suggestion
  const handleScheduleSuggestion = (suggestion: StudySuggestion) => {
    scheduleSuggestion.mutate(suggestion, {
      onSuccess: () => {
        toast({
          title: "Session Scheduled",
          description: `${suggestion.title} has been added to your study plan`
        });
      }
    });
  };

  // Complete a session
  const completeSession = useMutation({
    mutationFn: async (sessionId: number) => {
      // In a real implementation, call the API
      // return apiRequest("POST", `/api/study-sessions/${sessionId}/complete`, {});

      // For now, simulate success
      return new Promise(resolve => setTimeout(resolve, 500));
    },
    onSuccess: () => {
      toast({
        title: "Session Completed",
        description: "Great job! Your progress has been recorded."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/study-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study-metrics'] });

      // Record the completed task to potentially trigger motivation
      recordCompletedTask();

      // Randomly trigger motivation approximately 30% of the time
      if (Math.random() < 0.3) {
        showMotivation();
      }
    }
  });

  // Request notification permissions on component mount
  useEffect(() => {
    // Check if Notification API is available in the browser
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        requestNotificationPermission();
      }
    }
  }, []);

  // Helper to format study time
  const formatStudyTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins} minutes`;
    if (mins === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Calendar and Sessions Column */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Study Planner</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex justify-end mb-4">
                <TabsList>
                  <TabsTrigger value="calendar" className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Calendar
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Insights
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="calendar" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      className="rounded-md border"
                    />
                    <div className="mt-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm mb-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">{date ? format(date, 'PPPP') : 'Select a date'}</span>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1 mt-1">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Completed
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Scheduled
                        </Badge>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Missed
                        </Badge>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1 mt-1">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          Exam
                        </Badge>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          Deadline
                        </Badge>
                      </div>
                    </div>
                  </div>

                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">
                      {sessions.length === 0 
                        ? 'No sessions scheduled' 
                        : `${sessions.length} session${sessions.length !== 1 ? 's' : ''} for this day`}
                    </h3>
                    <Button size="sm">
                      <PlusCircle className="h-4 w-4 mr-1.5" />
                      Add Session
                    </Button>
                  </div>

                  {sessionsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg">
                      <Calendar className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                      <p className="mt-2 text-muted-foreground">No study sessions for this day</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Schedule a session or check suggestions
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <SessionCard 
                          key={session.id} 
                          session={session} 
                          onComplete={() => completeSession.mutate(session.id)}
                          isCompleting={completeSession.isPending}
                        />
                      ))}
                    </div>
                  )}
                  </div>
                </div>
              </TabsContent>

            <TabsContent value="insights" className="mt-0">
              {metricsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : !metrics ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                  <p className="mt-2 text-muted-foreground">No study data available yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete some study sessions to see insights
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <MetricCard 
                      title="Total Study Time" 
                      value={formatStudyTime(metrics.totalStudyTime)}
                      icon={<Clock className="h-4 w-4" />}
                    />
                    <MetricCard 
                      title="Sessions Completed" 
                      value={metrics.sessionsCompleted.toString()}
                      icon={<CheckCircle className="h-4 w-4" />}
                    />
                    <MetricCard 
                      title="Daily Average" 
                      value={formatStudyTime(metrics.averageDailyStudyTime)}
                      icon={<History className="h-4 w-4" />}
                    />
                    <MetricCard 
                      title="Current Streak" 
                      value={`${metrics.currentStreak} days`}
                      icon={<Flame className="h-4 w-4" />}
                      badge={`Best: ${metrics.bestStreak}`}
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium">Weekly Goal Progress</h3>
                        <span className="text-sm">{metrics.weeklyGoalProgress}%</span>
                      </div>
                      <Progress value={metrics.weeklyGoalProgress} className="h-2" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <h3 className="text-sm font-medium flex items-center mb-2">
                          <Star className="h-4 w-4 mr-1.5 text-amber-500" />
                          Strong Areas
                        </h3>
                        <div className="space-y-1">
                          {metrics.strongAreas.map((area, idx) => (
                            <div key={idx} className="flex items-center">
                              <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                              <span className="text-sm">{area}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h3 className="text-sm font-medium flex items-center mb-2">
                          <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-500" />
                          Areas to Improve
                        </h3>
                        <div className="space-y-1">
                          {metrics.weakAreas.map((area, idx) => (
                            <div key={idx} className="flex items-center">
                              <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                              <span className="text-sm">{area}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Suggestions Column */}
      <div className="md:col-span-1">
        <StudySuggestions 
          suggestions={suggestions} 
          onSchedule={handleScheduleSuggestion}
          isLoading={suggestionsLoading}
        />
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: StudySession;
  onComplete: () => void;
  isCompleting: boolean;
}

function SessionCard({ session, onComplete, isCompleting }: SessionCardProps) {
  // Status styling
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-700',
          icon: <CheckCircle className="h-4 w-4 text-green-500" />
        };
      case 'missed':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-700',
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-700',
          icon: <Calendar className="h-4 w-4 text-blue-500" />
        };
    }
  };

  // Type styling
  const getTypeStyles = (type?: string) => {
    switch (type) {
      case 'exam':
        return {
          bg: 'bg-purple-50 border-purple-200',
          text: 'text-purple-700',
          icon: <Brain className="h-4 w-4 text-purple-500" />,
          label: 'Exam'
        };
      case 'deadline':
        return {
          bg: 'bg-orange-50 border-orange-200',
          text: 'text-orange-700',
          icon: <Clock className="h-4 w-4 text-orange-500" />,
          label: 'Deadline'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-700',
          icon: <Calendar className="h-4 w-4 text-blue-500" />,
          label: 'Session'
        };
    }
  };

  const statusStyle = getStatusStyles(session.status);
  const typeStyle = getTypeStyles(session.type);

  // Days until calculation for exams and deadlines
  const calculateDaysUntil = () => {
    if (!session.date) return null;

    const eventDate = new Date(session.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const daysUntil = calculateDaysUntil();

  return (
    <div className={`p-3 border rounded-lg ${session.type ? typeStyle.bg : statusStyle.bg}`}>
      <div className="flex justify-between">
        <div>
          <div className="flex items-center flex-wrap gap-2">
            <h3 className="font-medium">
              {session.title}
            </h3>
            {session.isPriority && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                Priority
              </Badge>
            )}
            {session.type && (
              <Badge className={`${typeStyle.text} bg-opacity-20`}>
                {typeStyle.icon}
                <span className="ml-1">{typeStyle.label}</span>
              </Badge>
            )}
            {(session.type === 'exam' || session.type === 'deadline') && daysUntil !== null && daysUntil > 0 && (
              <Badge variant="outline" className="ml-auto">
                {daysUntil} day{daysUntil !== 1 ? 's' : ''} left
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {session.subject} • {session.startTime} - {session.endTime}
          </p>
          {session.notes && (
            <p className="text-sm mt-2">{session.notes}</p>
          )}
          {session.courseId && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                Course ID: {session.courseId}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-start">
          <div className="flex h-6 items-center justify-center rounded-full px-2 text-xs font-medium">
            {session.type ? typeStyle.icon : statusStyle.icon}
            <span className={`ml-1 ${session.type ? typeStyle.text : statusStyle.text}`}>
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {session.status === 'scheduled' && session.type === 'session' && (
        <div className="mt-3 flex justify-end">
          <Button 
            size="sm" 
            onClick={onComplete}
            disabled={isCompleting}
          >
            {isCompleting ? 'Completing...' : 'Mark Complete'}
          </Button>
        </div>
      )}

      {session.status === 'completed' && session.completionRate !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Completion</span>
            <span className="text-xs font-medium">{session.completionRate}%</span>
          </div>
          <Progress value={session.completionRate} className="h-1.5" />
        </div>
      )}

      {(session.type === 'exam' || session.type === 'deadline') && (
        <div className="mt-3 flex justify-end gap-2">
          {session.courseId && (
            <Button size="sm" variant="outline">
              View Course
            </Button>
          )}
          {session.type === 'exam' && (
            <Button size="sm">
              Prepare
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  badge?: string;
}

function MetricCard({ title, value, icon, badge }: MetricCardProps) {
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center text-xs text-muted-foreground mb-1">
        {icon}
        <span className="ml-1.5">{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-lg font-semibold">{value}</span>
        {badge && (
          <Badge variant="secondary" className="text-xs h-5">
            {badge}
          </Badge>
        )}
      </div>
    </div>
  );
}