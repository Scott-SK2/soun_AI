
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { queryClient } from '@/lib/queryClient';
import { 
  ArrowRight, BookOpen, Brain, CheckCircle, Clock, 
  Lightbulb, Target, TrendingUp, Zap, AlertTriangle,
  Play, Star, Trophy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LearningPathStep {
  id: string;
  topic: string;
  courseId?: string;
  priority: 1 | 2 | 3 | 4 | 5;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
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

interface AdaptiveLearningPath {
  pathId: string;
  title: string;
  description: string;
  totalEstimatedTime: number;
  steps: LearningPathStep[];
  completedSteps: string[];
  adaptiveInsights: {
    strugglingTopics: string[];
    masteredTopics: string[];
    learningVelocity: number;
    preferredDifficulty: 'beginner' | 'intermediate' | 'advanced';
    voiceInteractionPatterns: string[];
  };
}

export function AdaptiveLearningDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);

  // Fetch both adaptive learning path and next step in a SINGLE API call to reduce requests
  const { data: combinedData, isLoading, refetch } = useQuery({
    queryKey: ['/api/learning-path/combined', user?.id, selectedCourse],
    queryFn: async () => {
      // Use the unified endpoint that returns both pieces of data in one request
      const response = await fetch(`/api/learning-path/combined/${user?.id}${selectedCourse ? `?courseId=${selectedCourse}` : ''}`);
      
      if (!response.ok) {
        return { learningPath: null, nextStep: null };
      }

      const data = await response.json();
      return {
        learningPath: data.learningPath,
        nextStep: data.nextStep
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - learning paths don't change rapidly
    placeholderData: (previousData) => previousData, // Keep showing old data while refetching
  });

  // Complete step mutation
  const completeStepMutation = useMutation({
    mutationFn: async ({ stepId, performance }: { stepId: string; performance: 'excellent' | 'good' | 'struggling' }) => {
      const response = await fetch('/api/learning-path/complete-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, stepId, performance })
      });
      if (!response.ok) throw new Error('Failed to complete step');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Step completed!",
        description: "Your learning path has been updated based on your performance."
      });
      // Invalidate the combined query to refetch both learning path and next step
      queryClient.invalidateQueries({ queryKey: ['/api/learning-path/combined', user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update learning progress. Please try again.",
        variant: "destructive"
      });
    }
  });

  const learningPath: AdaptiveLearningPath | null = combinedData?.learningPath || null;
  const nextStep: LearningPathStep | null = combinedData?.nextStep || null;

  const handleCompleteStep = (stepId: string, performance: 'excellent' | 'good' | 'struggling') => {
    completeStepMutation.mutate({ stepId, performance });
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-700 border-red-200';
      case 2: return 'bg-orange-100 text-orange-700 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 4: return 'bg-blue-100 text-blue-700 border-blue-200';
      case 5: return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getAdaptiveReasonIcon = (reason: string) => {
    switch (reason) {
      case 'weakness_detected': return <AlertTriangle className="h-4 w-4" />;
      case 'prerequisite_missing': return <Target className="h-4 w-4" />;
      case 'natural_progression': return <TrendingUp className="h-4 w-4" />;
      case 'reinforcement_needed': return <Brain className="h-4 w-4" />;
      case 'struggle_pattern': return <Lightbulb className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Adaptive Learning Path</h2>
          <p className="text-muted-foreground">
            AI-powered study recommendations based on your progress and interactions
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
          <Zap className="mr-1 h-4 w-4" />
          AI-Powered
        </Badge>
      </div>

      {/* Next Recommended Step */}
      {nextStep && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Next Recommended Step
              </CardTitle>
              <Badge className={getPriorityColor(nextStep.priority)}>
                Priority {nextStep.priority}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">{nextStep.topic}</h3>
                <p className="text-muted-foreground">{nextStep.reason}</p>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {nextStep.estimatedTime} minutes
                </div>
                <Badge variant="outline" className={getDifficultyColor(nextStep.difficulty)}>
                  {nextStep.difficulty}
                </Badge>
                <div className="flex items-center gap-1">
                  {getAdaptiveReasonIcon(nextStep.adaptiveReason)}
                  <span className="capitalize">{nextStep.adaptiveReason.replace('_', ' ')}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => setCurrentStepId(nextStep.id)}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Learning
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Path Overview */}
      {learningPath && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Steps</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{learningPath.steps.length}</div>
              <p className="text-xs text-muted-foreground">
                {learningPath.completedSteps.length} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(learningPath.totalEstimatedTime / 60)}h {learningPath.totalEstimatedTime % 60}m
              </div>
              <p className="text-xs text-muted-foreground">
                Total learning time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((learningPath.completedSteps.length / learningPath.steps.length) * 100)}%
              </div>
              <Progress 
                value={(learningPath.completedSteps.length / learningPath.steps.length) * 100} 
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Adaptive Insights */}
      {learningPath?.adaptiveInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Learning Insights
            </CardTitle>
            <CardDescription>
              Personalized insights based on your learning patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Areas for Improvement</h4>
                <div className="flex flex-wrap gap-1">
                  {learningPath.adaptiveInsights.strugglingTopics.slice(0, 5).map((topic) => (
                    <Badge key={topic} variant="outline" className="bg-amber-50 text-amber-700">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Strong Areas</h4>
                <div className="flex flex-wrap gap-1">
                  {learningPath.adaptiveInsights.masteredTopics.slice(0, 5).map((topic) => (
                    <Badge key={topic} variant="outline" className="bg-green-50 text-green-700">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Learning Velocity:</span>
                  <span className="ml-2 font-medium">
                    {learningPath.adaptiveInsights.learningVelocity} topics/week
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Preferred Difficulty:</span>
                  <Badge variant="outline" className={`ml-2 ${getDifficultyColor(learningPath.adaptiveInsights.preferredDifficulty)}`}>
                    {learningPath.adaptiveInsights.preferredDifficulty}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Voice Interactions:</span>
                  <span className="ml-2 font-medium">
                    {learningPath.adaptiveInsights.voiceInteractionPatterns.length} patterns
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Steps */}
      {learningPath && (
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">Upcoming Steps</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All Steps</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-4">
            {learningPath.steps
              .filter(step => !learningPath.completedSteps.includes(step.id))
              .slice(0, 5)
              .map((step) => (
                <StepCard 
                  key={step.id}
                  step={step}
                  isCompleted={false}
                  onComplete={handleCompleteStep}
                  isActive={currentStepId === step.id}
                  onSetActive={() => setCurrentStepId(step.id)}
                />
              ))}
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-4">
            {learningPath.steps
              .filter(step => learningPath.completedSteps.includes(step.id))
              .map((step) => (
                <StepCard 
                  key={step.id}
                  step={step}
                  isCompleted={true}
                  onComplete={handleCompleteStep}
                  isActive={false}
                  onSetActive={() => {}}
                />
              ))}
          </TabsContent>
          
          <TabsContent value="all" className="space-y-4">
            {learningPath.steps.map((step) => (
              <StepCard 
                key={step.id}
                step={step}
                isCompleted={learningPath.completedSteps.includes(step.id)}
                onComplete={handleCompleteStep}
                isActive={currentStepId === step.id}
                onSetActive={() => setCurrentStepId(step.id)}
              />
            ))}
          </TabsContent>
        </Tabs>
      )}

      {!learningPath && (
        <Card>
          <CardContent className="text-center py-10">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-medium">No Learning Path Available</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete some quizzes or interact with the voice assistant to generate your personalized learning path.
            </p>
            <Button 
              className="mt-4" 
              onClick={() => refetch()}
            >
              Generate Learning Path
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Step Card Component
interface StepCardProps {
  step: LearningPathStep;
  isCompleted: boolean;
  onComplete: (stepId: string, performance: 'excellent' | 'good' | 'struggling') => void;
  isActive: boolean;
  onSetActive: () => void;
}

function StepCard({ step, isCompleted, onComplete, isActive, onSetActive }: StepCardProps) {
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-700 border-red-200';
      case 2: return 'bg-orange-100 text-orange-700 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 4: return 'bg-blue-100 text-blue-700 border-blue-200';
      case 5: return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getAdaptiveReasonIcon = (reason: string) => {
    switch (reason) {
      case 'weakness_detected': return <AlertTriangle className="h-4 w-4" />;
      case 'prerequisite_missing': return <Target className="h-4 w-4" />;
      case 'natural_progression': return <TrendingUp className="h-4 w-4" />;
      case 'reinforcement_needed': return <Brain className="h-4 w-4" />;
      case 'struggle_pattern': return <Lightbulb className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className={`${isActive ? 'ring-2 ring-primary' : ''} ${isCompleted ? 'opacity-75' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isCompleted && <CheckCircle className="h-5 w-5 text-green-600" />}
              <h3 className="font-medium">{step.topic}</h3>
              <Badge className={getPriorityColor(step.priority)} variant="outline">
                P{step.priority}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">{step.reason}</p>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {step.estimatedTime}min
              </div>
              <Badge variant="outline" className={getDifficultyColor(step.difficulty)}>
                {step.difficulty}
              </Badge>
              <div className="flex items-center gap-1">
                {getAdaptiveReasonIcon(step.adaptiveReason)}
                <span className="capitalize">{step.adaptiveReason.replace('_', ' ')}</span>
              </div>
            </div>

            {step.prerequisites.length > 0 && (
              <div className="text-xs text-muted-foreground mb-3">
                Prerequisites: {step.prerequisites.join(', ')}
              </div>
            )}

            {/* Resources */}
            {step.resources.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Resources:</h4>
                <div className="flex flex-wrap gap-1">
                  {step.resources.slice(0, 3).map((resource, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {resource.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {!isCompleted && (
          <div className="flex gap-2 mt-4">
            {!isActive ? (
              <Button variant="outline" size="sm" onClick={onSetActive}>
                Start Step
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => onComplete(step.id, 'excellent')}
                >
                  <Trophy className="h-4 w-4 mr-1" />
                  Excellent
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onComplete(step.id, 'good')}
                >
                  Good
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-amber-600 hover:text-amber-700"
                  onClick={() => onComplete(step.id, 'struggling')}
                >
                  Need Help
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
