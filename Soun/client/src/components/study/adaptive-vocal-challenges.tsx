
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TrendingUp, Brain, Clock, Star, Mic } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';

interface VocalChallenge {
  id: string;
  type: 'speed_explanation' | 'concept_teaching' | 'problem_solving' | 'memory_recall' | 'peer_teaching';
  title: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeLimit: number; // seconds
  subject: string;
  topic: string;
  prompt: string;
  successCriteria: {
    minClarity: number;
    minCompleteness: number;
    maxTime?: number;
    specificRequirements: string[];
  };
  rewards: {
    xp: number;
    badges: string[];
    unlocks?: string[];
  };
}

interface ChallengeProgress {
  challengeId: string;
  attempts: number;
  bestScore: number;
  completed: boolean;
  completedAt?: Date;
  feedback: string[];
}

export function AdaptiveVocalChallenges() {
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(3);
  const [activeChallenge, setActiveChallenge] = useState<VocalChallenge | null>(null);
  const [isAttempting, setIsAttempting] = useState(false);
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress[]>([]);

  // Fetch adaptive challenges based on user performance
  const { data: challenges, isLoading } = useQuery<VocalChallenge[]>({
    queryKey: ['/api/vocal-challenges/adaptive', selectedDifficulty],
    queryFn: async () => {
      // In production, this would fetch from your API
      return generateAdaptiveChallenges(selectedDifficulty);
    }
  });

  const attemptChallengeMutation = useMutation({
    mutationFn: async (data: { challengeId: string; audioBlob: Blob; transcript: string }) => {
      // Submit challenge attempt for evaluation
      const formData = new FormData();
      formData.append('challengeId', data.challengeId);
      formData.append('audio', data.audioBlob);
      formData.append('transcript', data.transcript);
      
      const response = await fetch('/api/vocal-challenges/attempt', {
        method: 'POST',
        body: formData
      });
      
      return response.json();
    },
    onSuccess: (result) => {
      // Update progress and show results
      console.log('Challenge completed:', result);
      setIsAttempting(false);
    }
  });

  const generateAdaptiveChallenges = (difficulty: number): VocalChallenge[] => {
    const baseChallenges: VocalChallenge[] = [
      {
        id: `speed_${difficulty}`,
        type: 'speed_explanation',
        title: '60-Second Concept Master',
        description: 'Explain a complex concept clearly in under 60 seconds',
        difficulty: difficulty as 1 | 2 | 3 | 4 | 5,
        timeLimit: difficulty > 3 ? 45 : 60,
        subject: 'mathematics',
        topic: 'Calculus Integration',
        prompt: 'Explain integration by parts method and when to use it',
        successCriteria: {
          minClarity: 70 + (difficulty * 5),
          minCompleteness: 60 + (difficulty * 8),
          maxTime: difficulty > 3 ? 45 : 60,
          specificRequirements: [
            'Mention the formula',
            'Provide an example',
            'Explain when to use this method'
          ]
        },
        rewards: {
          xp: 50 * difficulty,
          badges: difficulty >= 4 ? ['Speed Teacher', 'Clarity Master'] : ['Quick Explainer'],
          unlocks: difficulty >= 5 ? ['Expert Challenges'] : undefined
        }
      },
      {
        id: `teaching_${difficulty}`,
        type: 'concept_teaching',
        title: 'Teach Like a Pro',
        description: 'Explain a concept as if teaching a complete beginner',
        difficulty: difficulty as 1 | 2 | 3 | 4 | 5,
        timeLimit: 120 + (difficulty * 30),
        subject: 'physics',
        topic: 'Newton\'s Laws',
        prompt: 'Teach Newton\'s second law to someone who has never heard of it',
        successCriteria: {
          minClarity: 80,
          minCompleteness: 75 + (difficulty * 5),
          specificRequirements: [
            'Use simple language',
            'Provide real-world examples',
            'Build understanding step by step',
            'Check for understanding'
          ]
        },
        rewards: {
          xp: 75 * difficulty,
          badges: ['Natural Teacher', 'Clarity Champion'],
          unlocks: difficulty >= 4 ? ['Advanced Teaching Challenges'] : undefined
        }
      },
      {
        id: `memory_${difficulty}`,
        type: 'memory_recall',
        title: 'Instant Recall Challenge',
        description: 'Recall and explain key facts without notes',
        difficulty: difficulty as 1 | 2 | 3 | 4 | 5,
        timeLimit: 90,
        subject: 'chemistry',
        topic: 'Periodic Table Trends',
        prompt: 'Explain atomic radius trends across periods and groups',
        successCriteria: {
          minClarity: 70,
          minCompleteness: 80,
          specificRequirements: [
            'No reference materials',
            'Accurate facts only',
            'Logical explanation flow'
          ]
        },
        rewards: {
          xp: 60 * difficulty,
          badges: ['Memory Master', 'Fact Recall Pro'],
        }
      }
    ];

    return baseChallenges.filter(c => c.difficulty <= difficulty);
  };

  const startChallenge = (challenge: VocalChallenge) => {
    setActiveChallenge(challenge);
    setIsAttempting(true);
  };

  const getDifficultyColor = (diff: number) => {
    const colors = ['green', 'blue', 'yellow', 'orange', 'red'];
    return colors[diff - 1] || 'gray';
  };

  const getDifficultyLabel = (diff: number) => {
    const labels = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert'];
    return labels[diff - 1] || 'Unknown';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Adaptive Vocal Challenges
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Personalized challenges that adapt to your vocal learning progress
          </p>
        </CardHeader>
      </Card>

      {/* Difficulty Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">Challenge Difficulty</span>
            <Badge variant="outline" className={`text-${getDifficultyColor(selectedDifficulty)}-600`}>
              {getDifficultyLabel(selectedDifficulty)}
            </Badge>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((diff) => (
              <Button
                key={diff}
                size="sm"
                variant={selectedDifficulty === diff ? "default" : "outline"}
                onClick={() => setSelectedDifficulty(diff)}
              >
                {diff}
              </Button>
            ))}
          </div>
          <Progress value={selectedDifficulty * 20} className="mt-2" />
        </CardContent>
      </Card>

      {/* Available Challenges */}
      <div className="grid gap-4">
        {challenges?.map((challenge) => {
          const progress = challengeProgress.find(p => p.challengeId === challenge.id);
          
          return (
            <Card key={challenge.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{challenge.title}</h3>
                      <Badge variant="outline" className={`text-${getDifficultyColor(challenge.difficulty)}-600`}>
                        Level {challenge.difficulty}
                      </Badge>
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {challenge.timeLimit}s
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {challenge.description}
                    </p>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-medium">Subject:</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {challenge.subject}
                        </Badge>
                      </div>
                      
                      <div>
                        <span className="text-xs font-medium">Topic:</span>
                        <span className="text-xs ml-2 text-muted-foreground">
                          {challenge.topic}
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-xs font-medium">Challenge:</span>
                        <p className="text-xs mt-1 p-2 bg-blue-50 rounded">
                          {challenge.prompt}
                        </p>
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    {progress && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <span>Attempts: {progress.attempts}</span>
                          <span>Best Score: {progress.bestScore}%</span>
                          {progress.completed && (
                            <Badge variant="default" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rewards Preview */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {challenge.rewards.xp} XP
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {challenge.rewards.badges.length} badges
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => startChallenge(challenge)}
                    disabled={isAttempting}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    {progress?.completed ? 'Retry' : 'Start'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active Challenge Interface */}
      {activeChallenge && isAttempting && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-red-500 animate-pulse" />
              Active Challenge: {activeChallenge.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">Your Challenge:</h4>
                <p>{activeChallenge.prompt}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Time Limit:</span>
                  <span className="ml-2">{activeChallenge.timeLimit} seconds</span>
                </div>
                <div>
                  <span className="font-medium">Min. Clarity:</span>
                  <span className="ml-2">{activeChallenge.successCriteria.minClarity}%</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Requirements:</h4>
                <ul className="text-xs space-y-1">
                  {activeChallenge.successCriteria.specificRequirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setIsAttempting(false)} variant="outline">
                  Cancel
                </Button>
                <Button className="flex-1">
                  <Mic className="h-4 w-4 mr-2" />
                  Start Recording
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
