import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, RotateCcw, Brain, MessageSquare } from 'lucide-react';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface QuizQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  explanation?: string;
  conceptTested: string;
}

interface QuizResult {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  adaptiveFeedback?: string;
  shouldRevealAnswer?: boolean;
  conceptMastery: number;
}

const AdaptiveFeedbackDemo: React.FC = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [attemptHistory, setAttemptHistory] = useState<Record<string, number>>({});
  const [results, setResults] = useState<QuizResult[]>([]);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<QuizResult | null>(null);

  const { toast } = useToast();
  const { speak, speaking } = useTextToSpeech();

  // Demo questions to showcase adaptive feedback
  const demoQuestions: QuizQuestion[] = [
    {
      id: '1',
      question: 'What is the capital of France?',
      correctAnswer: 'Paris',
      explanation: 'Paris is the capital and most populous city of France, located in the north-central part of the country.',
      conceptTested: 'Geography'
    },
    {
      id: '2',
      question: 'What is 2 + 2?',
      correctAnswer: '4',
      explanation: 'Basic arithmetic: 2 + 2 equals 4.',
      conceptTested: 'Mathematics'
    },
    {
      id: '3',
      question: 'Who wrote Romeo and Juliet?',
      correctAnswer: 'William Shakespeare',
      explanation: 'William Shakespeare wrote Romeo and Juliet around 1594-1596.',
      conceptTested: 'Literature'
    }
  ];

  const evaluateAnswerMutation = useMutation({
    mutationFn: async (data: { questions: QuizQuestion[], userAnswers: any[], attemptHistory: Record<string, number> }) => {
      const response = await fetch('/api/quiz/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to evaluate answer');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        setCurrentFeedback(result);
        setShowingFeedback(true);
        setResults(prev => [...prev, result]);

        // Speak the adaptive feedback
        if (result.adaptiveFeedback) {
          speak(result.adaptiveFeedback);
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Evaluation Error",
        description: "Failed to evaluate your answer. Please try again.",
        variant: "destructive"
      });
    }
  });

  const currentQuestion = demoQuestions[currentQuestionIndex];

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) return;

    const questionId = currentQuestion.id;
    const currentAttempts = attemptHistory[questionId] || 0;

    setAttemptHistory(prev => ({
      ...prev,
      [questionId]: currentAttempts + 1
    }));

    evaluateAnswerMutation.mutate({
      questions: [currentQuestion],
      userAnswers: [{ questionId, answer: userAnswer.trim() }],
      attemptHistory: {
        ...attemptHistory,
        [questionId]: currentAttempts + 1
      }
    });
  };

  const handleNextQuestion = () => {
    if (currentFeedback?.shouldRevealAnswer || currentFeedback?.isCorrect) {
      // Move to next question
      if (currentQuestionIndex < demoQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setUserAnswer('');
        setShowingFeedback(false);
        setCurrentFeedback(null);
      } else {
        // Quiz complete
        toast({
          title: "Demo Complete!",
          description: `You've experienced the adaptive feedback system. ${results.filter(r => r.isCorrect).length}/${results.length} correct answers.`,
        });
      }
    } else {
      // Stay on current question for another attempt
      setShowingFeedback(false);
      setCurrentFeedback(null);
    }
  };

  const resetDemo = () => {
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setAttemptHistory({});
    setResults([]);
    setShowingFeedback(false);
    setCurrentFeedback(null);
  };

  const isQuizComplete = currentQuestionIndex >= demoQuestions.length && currentFeedback?.shouldRevealAnswer;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Adaptive Feedback System Demo
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Experience intelligent feedback that adapts to your learning progress. Try answering incorrectly on purpose to see the escalating help system in action.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Badge variant="outline">
              Question {currentQuestionIndex + 1} of {demoQuestions.length}
            </Badge>
            <Badge variant="secondary">
              Concept: {currentQuestion?.conceptTested}
            </Badge>
            {attemptHistory[currentQuestion?.id] && (
              <Badge variant={attemptHistory[currentQuestion.id] === 1 ? "default" : "destructive"}>
                Attempt {attemptHistory[currentQuestion.id]}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {!isQuizComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{currentQuestion?.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showingFeedback ? (
              <>
                <Input
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                />
                <Button 
                  onClick={handleSubmitAnswer} 
                  disabled={!userAnswer.trim() || evaluateAnswerMutation.isPending}
                  className="w-full"
                >
                  {evaluateAnswerMutation.isPending ? 'Evaluating...' : 'Submit Answer'}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
                  <MessageSquare className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium text-sm text-muted-foreground mb-1">Adaptive Feedback:</p>
                    <p>{currentFeedback?.adaptiveFeedback}</p>
                  </div>
                </div>

                {currentFeedback?.shouldRevealAnswer && (
                  <div className="flex items-start gap-3 p-4 rounded-lg border border-green-200 bg-green-50">
                    <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm text-green-600 mb-1">Correct Answer:</p>
                      <p>{currentFeedback.correctAnswer}</p>
                      {currentFeedback.explanation && (
                        <p className="text-sm text-muted-foreground mt-2">{currentFeedback.explanation}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {currentFeedback?.isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="text-sm">
                    Your answer: <strong>"{currentFeedback?.userAnswer}"</strong>
                  </span>
                </div>

                <Button onClick={handleNextQuestion} className="w-full">
                  {currentFeedback?.shouldRevealAnswer || currentFeedback?.isCorrect 
                    ? (currentQuestionIndex < demoQuestions.length - 1 ? 'Next Question' : 'Complete Demo')
                    : 'Try Again'
                  }
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isQuizComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Demo Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>You've experienced the adaptive feedback system:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Correct answers:</strong> Immediate short confirmation</li>
              <li><strong>First incorrect attempt:</strong> Gentle encouragement to try again</li>
              <li><strong>Second incorrect attempt:</strong> Hint with encouragement</li>
              <li><strong>Third+ attempts:</strong> Detailed explanation with correct answer</li>
            </ul>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Your Results:</h4>
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {result.isCorrect ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>Question {index + 1}: {result.isCorrect ? 'Correct' : 'Incorrect'}</span>
                  <Badge variant="outline" className="text-xs">
                    {attemptHistory[demoQuestions[index].id]} attempt{attemptHistory[demoQuestions[index].id] > 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>

            <Button onClick={resetDemo} variant="outline" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Demo Again
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>How to test the adaptive feedback:</strong></p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Try answering a question incorrectly on purpose</li>
              <li>Notice the gentle encouragement message</li>
              <li>Try again with another incorrect answer</li>
              <li>See how the system provides hints and then reveals the answer</li>
              <li>Answer correctly to see immediate confirmation</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdaptiveFeedbackDemo;