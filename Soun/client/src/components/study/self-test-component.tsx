import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Brain, 
  Target, 
  Clock, 
  ClockIcon,
  Mic,
  MicOff,
  Volume2,
  BookOpen,
  Settings,
  RotateCcw,
  Trophy
} from 'lucide-react';
import { useMutation } from "@tanstack/react-query";
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';

interface SelfTestQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'explanation' | 'approach-selection';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  conceptTested: string;
  documentSource?: string;
  requiresVocalExplanation?: boolean;
  approachChoices?: string[];
}

interface SelfTestConfig {
  selectedTopics: string[];
  difficulty: 'mixed' | 'easy' | 'medium' | 'hard';
  questionCount: number;
  timeLimit: number; // in minutes, 0 for unlimited
  includeVocalExplanations: boolean;
  focusAreas: string[];
  testMode: 'comprehensive' | 'weak-areas' | 'custom';
}

interface SelfTestResult {
  questionId: string;
  userAnswer: string;
  vocalExplanation?: string;
  isCorrect: boolean;
  timeSpent: number;
  confidence: number; // 1-5 scale
  explanation: string;
  conceptMastery: number;
}

interface SelfTestProps {
  availableTopics: string[];
  userDocuments: any[];
  weakAreas?: string[];
  onComplete?: (results: any) => void;
}

export function SelfTestComponent({ availableTopics, userDocuments, weakAreas = [], onComplete }: SelfTestProps) {
  const [currentPhase, setCurrentPhase] = useState<'setup' | 'testing' | 'results'>('setup');
  const [testConfig, setTestConfig] = useState<SelfTestConfig>({
    selectedTopics: [],
    difficulty: 'mixed',
    questionCount: 10,
    timeLimit: 0,
    includeVocalExplanations: true,
    focusAreas: [],
    testMode: 'comprehensive'
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [questionId: string]: any }>({});
  const [testStartTime, setTestStartTime] = useState<Date | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [isRecordingExplanation, setIsRecordingExplanation] = useState(false);

  const { toast } = useToast();
  const { transcript, isListening, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const { speak, speaking } = useTextToSpeech();

  // Timer effect
  useEffect(() => {
    if (testConfig.timeLimit > 0 && testStartTime && currentPhase === 'testing') {
      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - testStartTime.getTime()) / 1000 / 60);
        const remaining = testConfig.timeLimit - elapsed;
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          handleTimeUp();
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [testStartTime, testConfig.timeLimit, currentPhase]);

  // Generate self-test questions
  const generateTestMutation = useMutation({
    mutationFn: async (config: SelfTestConfig) => {
      const response = await fetch('/api/quiz/generate-self-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config,
          userDocuments: userDocuments.map(doc => ({ id: doc.id, title: doc.title, content: doc.content })),
          weakAreas
        })
      });

      if (!response.ok) throw new Error('Failed to generate self-test');
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentPhase('testing');
      setTestStartTime(new Date());
      setQuestionStartTime(new Date());
      setTimeRemaining(testConfig.timeLimit);

      toast({
        title: "Self-Test Ready!",
        description: `${data.questions.length} questions prepared. Good luck!`,
      });
    }
  });

  // Submit self-test
  const submitTestMutation = useMutation({
    mutationFn: async (answers: any[]) => {
      const response = await fetch('/api/quiz/evaluate-self-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questions: generateTestMutation.data?.questions,
          userAnswers: answers,
          testConfig,
          totalTime: testStartTime ? Date.now() - testStartTime.getTime() : 0
        })
      });

      if (!response.ok) throw new Error('Failed to evaluate self-test');
      return response.json();
    },
    onSuccess: (results) => {
      setTestResults(results);
      setShowResults(true);
      setCurrentPhase('results');
      onComplete?.(results);

      const score = Math.round(results.overallScore * 100);
      toast({
        title: "Self-Test Complete!",
        description: `Your score: ${score}%. Check detailed feedback below.`,
      });
    }
  });

  const questions: SelfTestQuestion[] = generateTestMutation.data?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  const handleConfigChange = (key: keyof SelfTestConfig, value: any) => {
    setTestConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleTopicToggle = (topic: string) => {
    setTestConfig(prev => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(topic)
        ? prev.selectedTopics.filter(t => t !== topic)
        : [...prev.selectedTopics, topic]
    }));
  };

  const startTest = () => {
    if (testConfig.selectedTopics.length === 0 && testConfig.testMode !== 'weak-areas') {
      toast({
        title: "Please select topics",
        description: "Choose at least one topic for your self-test.",
        variant: "destructive"
      });
      return;
    }

    generateTestMutation.mutate(testConfig);
  };

  const handleAnswerChange = (value: string, field: 'answer' | 'confidence' = 'answer') => {
    const currentAnswer = userAnswers[currentQuestion.id] || {};
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...currentAnswer,
        [field]: value,
        timeSpent: questionStartTime ? Date.now() - questionStartTime.getTime() : 0
      }
    }));
  };

  const startVocalExplanation = () => {
    resetTranscript();
    setIsRecordingExplanation(true);
    startListening();

    const prompt = `Please explain your answer for this question: "${currentQuestion.question}". Speak as if you're teaching this concept to someone else.`;
    speak(prompt);
  };

  const stopVocalExplanation = () => {
    stopListening();
    setIsRecordingExplanation(false);

    handleAnswerChange(transcript, 'vocalExplanation' as any);

    toast({
      title: "Vocal explanation recorded",
      description: "Your explanation has been saved for evaluation.",
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(new Date());
    } else {
      // Submit test
      const answers = questions.map(q => ({
        questionId: q.id,
        ...userAnswers[q.id]
      }));
      submitTestMutation.mutate(answers);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setQuestionStartTime(new Date());
    }
  };

  const handleTimeUp = () => {
    const answers = questions.map(q => ({
      questionId: q.id,
      ...userAnswers[q.id]
    }));
    submitTestMutation.mutate(answers);

    toast({
      title: "Time's up!",
      description: "Your test has been automatically submitted.",
      variant: "destructive"
    });
  };

  const resetTest = () => {
    setCurrentPhase('setup');
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setTestStartTime(null);
    setQuestionStartTime(null);
    setShowResults(false);
    setTestResults(null);
    setIsRecordingExplanation(false);
    resetTranscript();
  };

  // Setup Phase
  if (currentPhase === 'setup') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Self-Test Configuration
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Create a personalized test to assess your knowledge and identify areas for improvement
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Mode Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Test Mode</Label>
            <RadioGroup 
              value={testConfig.testMode} 
              onValueChange={(value) => handleConfigChange('testMode', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="comprehensive" id="comprehensive" />
                <Label htmlFor="comprehensive">Comprehensive Test - All selected topics</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weak-areas" id="weak-areas" />
                <Label htmlFor="weak-areas">Focus on Weak Areas - Target identified problem areas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Custom Test - Choose specific topics and focus areas</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Topic Selection */}
          {testConfig.testMode !== 'weak-areas' && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Select Topics to Test</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableTopics.map((topic) => (
                  <Badge
                    key={topic}
                    variant={testConfig.selectedTopics.includes(topic) ? "default" : "outline"}
                    className="cursor-pointer p-2 text-center"
                    onClick={() => handleTopicToggle(topic)}
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Weak Areas Display */}
          {testConfig.testMode === 'weak-areas' && weakAreas.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Focus Areas (Identified Weak Points)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {weakAreas.map((area) => (
                  <Badge key={area} variant="destructive" className="p-2 text-center">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Test Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Number of Questions</Label>
              <RadioGroup 
                value={testConfig.questionCount.toString()} 
                onValueChange={(value) => handleConfigChange('questionCount', parseInt(value))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5" id="q5" />
                  <Label htmlFor="q5">5 questions (Quick check)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="10" id="q10" />
                  <Label htmlFor="q10">10 questions (Standard)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="20" id="q20" />
                  <Label htmlFor="q20">20 questions (Comprehensive)</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Difficulty Level</Label>
              <RadioGroup 
                value={testConfig.difficulty} 
                onValueChange={(value) => handleConfigChange('difficulty', value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="easy" id="easy" />
                  <Label htmlFor="easy">Easy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mixed" id="mixed" />
                  <Label htmlFor="mixed">Mixed (Recommended)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hard" id="hard" />
                  <Label htmlFor="hard">Challenging</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Include Vocal Explanations</Label>
                <p className="text-xs text-muted-foreground">Record explanations for deeper learning</p>
              </div>
              <Switch
                checked={testConfig.includeVocalExplanations}
                onCheckedChange={(checked) => handleConfigChange('includeVocalExplanations', checked)}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Time Limit</Label>
              <RadioGroup 
                value={testConfig.timeLimit.toString()} 
                onValueChange={(value) => handleConfigChange('timeLimit', parseInt(value))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="0" id="unlimited" />
                  <Label htmlFor="unlimited">No time limit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="15" id="t15" />
                  <Label htmlFor="t15">15 minutes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="30" id="t30" />
                  <Label htmlFor="t30">30 minutes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="60" id="t60" />
                  <Label htmlFor="t60">60 minutes</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <Button 
            onClick={startTest}
            disabled={generateTestMutation.isPending}
            className="w-full"
            size="lg"
          >
            {generateTestMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing Your Test...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Start Self-Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Testing Phase
  if (currentPhase === 'testing' && currentQuestion) {
    const currentAnswer = userAnswers[currentQuestion.id] || {};
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Self-Test in Progress
            </CardTitle>
            {testConfig.timeLimit > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                {timeRemaining}m remaining
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge className={
              currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
              currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }>
              {currentQuestion.difficulty}
            </Badge>
            <Badge variant="outline">{currentQuestion.type}</Badge>
            {currentQuestion.documentSource && (
              <Badge variant="secondary" className="text-xs">
                From: {currentQuestion.documentSource}
              </Badge>
            )}
          </div>

          <div className="text-sm font-medium mb-3">
            {currentQuestion.question}
          </div>

          {/* Answer Input */}
          {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
            <RadioGroup 
              value={currentAnswer.answer || ""} 
              onValueChange={(value) => handleAnswerChange(value)}
            >
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="text-sm">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQuestion.type === 'approach-selection' && currentQuestion.approachChoices && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Select the best approach:</Label>
              <RadioGroup 
                value={currentAnswer.answer || ""} 
                onValueChange={(value) => handleAnswerChange(value)}
              >
                {currentQuestion.approachChoices.map((approach, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={approach} id={`approach-${index}`} />
                    <Label htmlFor={`approach-${index}`} className="text-sm">
                      {approach}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {currentQuestion.type === 'true-false' && (
            <RadioGroup 
              value={currentAnswer.answer || ""} 
              onValueChange={(value) => handleAnswerChange(value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true">True</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="false" />
                <Label htmlFor="false">False</Label>
              </div>
            </RadioGroup>
          )}

          {(currentQuestion.type === 'short-answer' || currentQuestion.type === 'explanation') && (
            <Textarea
              placeholder="Type your answer here..."
              value={currentAnswer.answer || ""}
              onChange={(e) => handleAnswerChange(e.target.value)}
              rows={currentQuestion.type === 'explanation' ? 4 : 2}
            />
          )}

          {/* Confidence Rating */}
          <div>
            <Label className="text-sm font-medium mb-2 block">How confident are you in this answer?</Label>
            <RadioGroup 
              value={currentAnswer.confidence?.toString() || ""} 
              onValueChange={(value) => handleAnswerChange(value, 'confidence')}
            >
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div key={level} className="flex items-center space-x-1">
                    <RadioGroupItem value={level.toString()} id={`conf-${level}`} />
                    <Label htmlFor={`conf-${level}`} className="text-xs">
                      {level === 1 ? 'Guessing' : level === 5 ? 'Very Sure' : level.toString()}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Vocal Explanation */}
          {testConfig.includeVocalExplanations && currentQuestion.requiresVocalExplanation && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <Label className="text-sm font-medium mb-2 block">Vocal Explanation (Required)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Explain your reasoning out loud to demonstrate understanding
              </p>

              <Button
                onClick={isRecordingExplanation ? stopVocalExplanation : startVocalExplanation}
                variant={isRecordingExplanation ? "destructive" : "default"}
                disabled={speaking}
                className="mb-2"
              >
                {isRecordingExplanation ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Record Explanation
                  </>
                )}
              </Button>

              {isRecordingExplanation && (
                <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-700 text-xs">Recording your explanation...</span>
                  </div>
                </div>
              )}

              {transcript && (
                <div className="bg-gray-50 border rounded p-2 text-xs">
                  <strong>Your explanation:</strong> {transcript}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <Button 
              onClick={handleNext}
              disabled={!currentAnswer.answer || (currentQuestion.requiresVocalExplanation && testConfig.includeVocalExplanations && !transcript)}
            >
              {currentQuestionIndex === questions.length - 1 ? 'Finish Test' : 'Next Question'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Results Phase
  if (showResults && testResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Self-Test Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Score */}
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              {Math.round(testResults.overallScore * 100)}%
            </div>
            <Badge 
              variant={testResults.overallScore >= 0.8 ? "default" : testResults.overallScore >= 0.6 ? "secondary" : "destructive"}
              className="text-lg px-4 py-1"
            >
              {testResults.overallScore >= 0.8 ? "Excellent" : testResults.overallScore >= 0.6 ? "Good" : "Needs Improvement"}
            </Badge>
          </div>

          {/* Performance Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="border rounded-lg p-3">
              <div className="text-lg font-semibold">{testResults.correctAnswers}/{testResults.totalQuestions}</div>
              <div className="text-xs text-muted-foreground">Correct Answers</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-lg font-semibold">{Math.round(testResults.averageConfidence * 100)}%</div>
              <div className="text-xs text-muted-foreground">Avg Confidence</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-lg font-semibold">{Math.round(testResults.totalTimeMinutes)}m</div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-lg font-semibold">{testResults.strongAreas?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Strong Areas</div>
            </div>
          </div>

          {/* Readiness Assessment */}
          {testResults.readinessAssessment && (
            <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-green-50">
              <h4 className="font-semibold mb-2">Readiness Assessment</h4>
              <p className="text-sm mb-2">{testResults.readinessAssessment.message}</p>
              {testResults.readinessAssessment.recommendations && (
                <ul className="text-sm space-y-1">
                  {testResults.readinessAssessment.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Areas for Improvement */}
          {testResults.weakAreas && testResults.weakAreas.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Areas for Improvement</h4>
              <div className="grid gap-2">
                {testResults.weakAreas.map((area: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3 bg-red-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{area.concept}</span>
                      <Badge variant="destructive">{Math.round(area.score * 100)}%</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{area.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {testResults.nextSteps && testResults.nextSteps.length > 0 && (
            <div className="border rounded-lg p-4 bg-green-50">
              <h4 className="font-semibold mb-2">Recommended Next Steps</h4>
              <ul className="text-sm space-y-1">
                {testResults.nextSteps.map((step: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={resetTest} variant="outline" className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Take Another Test
            </Button>
            <Button onClick={() => setCurrentPhase('setup')} className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              Change Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}