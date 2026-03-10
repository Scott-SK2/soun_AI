
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Brain, Target } from "lucide-react";
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

interface QuizResult {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  explanation: string;
  conceptMastery: number;
}

interface PostExplanationQuizProps {
  topic?: string;
  explanation?: string;
  documentId?: number;
  courseId?: string;
  documents?: any[];
  initialDocument?: any;
  onComplete?: (results: any) => void;
  onDocumentSelect?: (doc: any) => void;
  onBack?: () => void;
}

export function PostExplanationQuiz({ 
  topic, 
  explanation, 
  documentId, 
  courseId,
  documents,
  initialDocument,
  onComplete,
  onDocumentSelect,
  onBack
}: PostExplanationQuizProps) {
  const [selectedDocument, setSelectedDocument] = useState(initialDocument || null);
  const [showDocumentSelector, setShowDocumentSelector] = useState(!topic && !initialDocument && documents && documents.length > 0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [questionId: string]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);
  const { toast } = useToast();

  // Generate quiz questions
  const generateQuizMutation = useMutation({
    mutationFn: async () => {
      const quizTopic = topic || selectedDocument?.title || 'Understanding Check';
      const quizExplanation = explanation || selectedDocument?.content || '';
      const quizDocumentId = documentId || selectedDocument?.id;
      
      console.log('🎯 Starting quiz generation:', { quizTopic, quizDocumentId, hasExplanation: !!quizExplanation });
      
      const response = await fetch('/api/quiz/post-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic: quizTopic, 
          explanation: quizExplanation,
          documentId: quizDocumentId 
        })
      });
      
      console.log('✅ Quiz API response:', response.status, response.ok);
      
      if (!response.ok) throw new Error('Failed to generate quiz');
      const data = await response.json();
      console.log('📝 Quiz data received:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('🎉 Quiz generation success!', data);
      setShowDocumentSelector(false);
      toast({
        title: "Quiz Ready!",
        description: "Answer the questions to test your understanding.",
      });
    },
    onError: (error) => {
      console.error('❌ Quiz generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate quiz questions. Please try again.",
        variant: "destructive"
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
      
      toast({
        title: "Quiz Complete!",
        description: `You scored ${Math.round(results.overallScore * 100)}%. Check your detailed feedback below.`,
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Show document selector if needed
  if (showDocumentSelector && documents && documents.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Select Material for Quiz
          </CardTitle>
          <CardDescription>
            Choose a document to generate quiz questions from
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.map((doc: any) => (
            <div 
              key={doc.id} 
              className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => {
                setSelectedDocument(doc);
                if (onDocumentSelect) {
                  onDocumentSelect(doc);
                }
              }}
            >
              <h4 className="font-medium">{doc.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{doc.filename}</p>
            </div>
          ))}
          {onBack && (
            <Button variant="outline" onClick={onBack} className="w-full">
              Back to Quiz Selection
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }
  
  if (!generateQuizMutation.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Understanding Check
          </CardTitle>
          <CardDescription>
            Test your comprehension of: {topic || selectedDocument?.title || 'selected material'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => {
              console.log('🔵 Start button clicked!');
              generateQuizMutation.mutate();
            }}
            disabled={generateQuizMutation.isPending}
            className="w-full"
            data-testid="button-start-quiz"
          >
            {generateQuizMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Quiz Questions...
              </>
            ) : (
              'Start Understanding Check'
            )}
          </Button>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="w-full">
              Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quiz Results & Feedback
          </CardTitle>
          <CardDescription>
            Overall Score: {Math.round(quizResults.overallScore * 100)}%
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Results by question */}
          {quizResults.results.map((result: QuizResult, index: number) => (
            <div key={result.questionId} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {result.isCorrect ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-medium">Question {index + 1}</span>
                <Badge variant="outline">
                  Mastery: {Math.round(result.conceptMastery * 100)}%
                </Badge>
              </div>
              <p className="text-sm mb-2"><strong>Your Answer:</strong> {result.userAnswer}</p>
              <p className="text-sm text-gray-600">{result.explanation}</p>
            </div>
          ))}

          {/* Concept assessments */}
          {quizResults.conceptAssessments && quizResults.conceptAssessments.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Concept Mastery</h4>
              {quizResults.conceptAssessments.map((assessment: any, index: number) => (
                <div key={index} className="border rounded-lg p-3 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{assessment.concept}</span>
                    <Badge className={assessment.masteryLevel > 0.7 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {Math.round(assessment.masteryLevel * 100)}% mastery
                    </Badge>
                  </div>
                  {assessment.weaknesses && assessment.weaknesses.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-red-700">Areas to improve: </span>
                      <span className="text-sm">{assessment.weaknesses.join(', ')}</span>
                    </div>
                  )}
                  {assessment.recommendedActions && assessment.recommendedActions.length > 0 && (
                    <div className="mt-1">
                      <span className="text-sm font-medium text-blue-700">Recommendations: </span>
                      <span className="text-sm">{assessment.recommendedActions.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Overall recommendations */}
          {quizResults.recommendations && quizResults.recommendations.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2">Next Steps</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {quizResults.recommendations.map((rec: string, index: number) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Understanding Check
          </span>
          <span className="text-sm font-normal">
            {currentQuestionIndex + 1} of {questions.length}
          </span>
        </CardTitle>
        <CardDescription>
          Question about: {currentQuestion?.conceptTested}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Badge className={getDifficultyColor(currentQuestion?.difficulty)}>
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
              'Submit Quiz'
            ) : (
              'Next Question'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
