
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Brain, Target, Shuffle, TrendingUp } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'explanation';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  conceptTested: string;
}

interface InterleavedPracticeQuizProps {
  subject?: string;
  topics?: string[];
  approaches?: string[];
  courseId?: string;
  onComplete?: (results: any) => void;
  onBack?: () => void;
}

export function InterleavedPracticeQuiz({ subject, topics, approaches, courseId, onComplete, onBack }: InterleavedPracticeQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [questionId: string]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);
  const { toast } = useToast();

  // Generate interleaved practice quiz
  const generateQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/quiz/generate-interleaved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subject: subject || 'General Topics',
          topics: topics || [],
          approaches: approaches || [],
          courseId,
          targetCount: 8
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate interleaved quiz');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Interleaved Practice Ready!",
        description: "Practice discriminating between different approaches and methods.",
      });
    }
  });

  // Submit quiz answers
  const submitQuizMutation = useMutation({
    mutationFn: async (answers: { questionId: string; answer: string }[]) => {
      const response = await fetch('/api/quiz/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questions: generateQuizMutation.data?.questions,
          userAnswers: answers 
        })
      });
      
      if (!response.ok) throw new Error('Failed to evaluate quiz');
      return response.json();
    },
    onSuccess: (results) => {
      setQuizResults(results);
      setShowResults(true);
      onComplete?.(results);
      
      // Calculate approach discrimination score
      const approachQuestions = results.results.filter((r: any) => 
        r.questionId && generateQuizMutation.data?.questions.find((q: any) => 
          q.id === r.questionId && 
          (q.question.toLowerCase().includes('approach') || 
           q.question.toLowerCase().includes('method') ||
           q.question.toLowerCase().includes('which'))
        )
      );
      
      const approachScore = approachQuestions.length > 0 
        ? Math.round((approachQuestions.filter((r: any) => r.isCorrect).length / approachQuestions.length) * 100)
        : 0;

      toast({
        title: "Interleaved Practice Complete!",
        description: `Overall: ${Math.round(results.overallScore * 100)}% | Approach Discrimination: ${approachScore}%`,
      });
    }
  });

  const questions: QuizQuestion[] = generateQuizMutation.data?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerChange = (value: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Submit quiz
      const answers = questions.map(q => ({
        questionId: q.id,
        answer: userAnswers[q.id] || ''
      }));
      submitQuizMutation.mutate(answers);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const isApproachQuestion = (question: QuizQuestion) => {
    return question.question.toLowerCase().includes('approach') ||
           question.question.toLowerCase().includes('method') ||
           question.question.toLowerCase().includes('which') ||
           question.question.toLowerCase().includes('best for') ||
           question.question.toLowerCase().includes('should use');
  };

  if (!generateQuizMutation.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Interleaved Practice
          </CardTitle>
          <CardDescription>
            Practice discriminating between different approaches in {subject}
          </CardDescription>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="text-sm text-gray-600">Topics:</div>
            {topics.map((topic, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="text-sm text-gray-600">Approaches:</div>
            {approaches.map((approach, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {approach}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => generateQuizMutation.mutate()}
            disabled={generateQuizMutation.isPending}
            className="w-full"
            data-testid="button-start-interleaved-quiz"
          >
            {generateQuizMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Interleaved Practice...
              </>
            ) : (
              'Start Interleaved Practice'
            )}
          </Button>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="w-full">
              Back to Quiz Selection
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    // Calculate approach discrimination metrics
    const approachQuestions = quizResults.results.filter((r: any) => {
      const question = questions.find(q => q.id === r.questionId);
      return question && isApproachQuestion(question);
    });
    
    const approachScore = approachQuestions.length > 0 
      ? (approachQuestions.filter((r: any) => r.isCorrect).length / approachQuestions.length) * 100
      : 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Interleaved Practice Results
          </CardTitle>
          <CardDescription className="space-y-1">
            <div>Overall Score: {Math.round(quizResults.overallScore * 100)}%</div>
            <div>Approach Discrimination: {Math.round(approachScore)}%</div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Approach discrimination summary */}
          {approachQuestions.length > 0 && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Approach Discrimination Analysis
              </h4>
              <p className="text-sm mb-2">
                You answered {approachQuestions.filter((r: any) => r.isCorrect).length} out of {approachQuestions.length} approach selection questions correctly.
              </p>
              {approachScore < 70 && (
                <p className="text-sm text-orange-700">
                  Focus on understanding when to use different methods. Practice identifying problem characteristics that indicate which approach to use.
                </p>
              )}
              {approachScore >= 70 && approachScore < 90 && (
                <p className="text-sm text-blue-700">
                  Good progress! Continue practicing to strengthen your ability to discriminate between similar approaches.
                </p>
              )}
              {approachScore >= 90 && (
                <p className="text-sm text-green-700">
                  Excellent approach discrimination! You're effectively identifying when to use different methods.
                </p>
              )}
            </div>
          )}

          {/* Question-by-question results */}
          {quizResults.results.map((result: any, index: number) => {
            const question = questions.find(q => q.id === result.questionId);
            const isApproachQ = question && isApproachQuestion(question);
            
            return (
              <div key={result.questionId} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {result.isCorrect ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">Question {index + 1}</span>
                  {isApproachQ && (
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
                      Approach Selection
                    </Badge>
                  )}
                  <Badge variant="outline">
                    Mastery: {Math.round(result.conceptMastery * 100)}%
                  </Badge>
                </div>
                <p className="text-sm mb-2"><strong>Your Answer:</strong> {result.userAnswer}</p>
                <p className="text-sm text-gray-600">{result.explanation}</p>
              </div>
            );
          })}

          {/* Concept assessments and recommendations */}
          {quizResults.conceptAssessments && quizResults.conceptAssessments.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Learning Progress</h4>
              {quizResults.conceptAssessments.map((assessment: any, index: number) => (
                <div key={index} className="border rounded-lg p-3 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{assessment.concept}</span>
                    <Badge className={assessment.masteryLevel > 0.7 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {Math.round(assessment.masteryLevel * 100)}% mastery
                    </Badge>
                  </div>
                  {assessment.recommendedActions && assessment.recommendedActions.length > 0 && (
                    <div className="mt-1">
                      <span className="text-sm font-medium text-blue-700">Next steps: </span>
                      <span className="text-sm">{assessment.recommendedActions.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Interleaving-specific recommendations */}
          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <h4 className="font-semibold mb-2">Interleaved Practice Recommendations</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              {approachScore < 70 && (
                <li>Practice more problems where you must first identify the correct approach before solving</li>
              )}
              <li>Study similar problems that require different methods to improve discrimination</li>
              <li>Create comparison charts showing when to use each approach</li>
              <li>Practice explaining why you chose one method over another</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Interleaved Practice
            {isApproachQuestion(currentQuestion) && (
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
                Approach Selection
              </Badge>
            )}
          </span>
          <span className="text-sm font-normal">
            {currentQuestionIndex + 1} of {questions.length}
          </span>
        </CardTitle>
        <CardDescription>
          Testing: {currentQuestion?.conceptTested}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Badge className={
            currentQuestion?.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
            currentQuestion?.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }>
            {currentQuestion?.difficulty}
          </Badge>
          <Badge variant="outline">{currentQuestion?.type}</Badge>
        </div>

        <div className="text-sm font-medium mb-3">
          {currentQuestion?.question}
        </div>

        {currentQuestion?.type === 'multiple-choice' && currentQuestion.options && (
          <RadioGroup 
            value={userAnswers[currentQuestion.id] || ""} 
            onValueChange={handleAnswerChange}
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

        {currentQuestion?.type === 'true-false' && (
          <RadioGroup 
            value={userAnswers[currentQuestion.id] || ""} 
            onValueChange={handleAnswerChange}
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

        {(currentQuestion?.type === 'short-answer' || currentQuestion?.type === 'explanation') && (
          <Textarea
            placeholder="Type your answer here..."
            value={userAnswers[currentQuestion.id] || ""}
            onChange={(e) => handleAnswerChange(e.target.value)}
            rows={currentQuestion.type === 'explanation' ? 4 : 2}
          />
        )}

        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!userAnswers[currentQuestion?.id] || submitQuizMutation.isPending}
          >
            {submitQuizMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Evaluating...
              </>
            ) : currentQuestionIndex === questions.length - 1 ? (
              'Complete Practice'
            ) : (
              'Next Question'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
