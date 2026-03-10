import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, Brain, HelpCircle, Target, Loader2, CheckCircle, Lightbulb } from "lucide-react"; // Removed unused imports and added CheckCircle and Lightbulb
import { PostExplanationQuiz } from "@/components/quiz/post-explanation-quiz"; // Import the new quiz component

interface DocumentAnalysisViewerProps {
  documentId: number;
  documentTitle: string;
}

interface DocumentAnalysis {
  summary: string;
  keyTopics: string[];
  learningObjectives: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedStudyTime: number;
  concepts: ConceptAnalysis[];
  questions: StudyQuestion[];
  prerequisites: string[];
  relatedTopics: string[];
  teachingPoints: TeachingPoint[];
}

interface ConceptAnalysis {
  concept: string;
  definition: string;
  importance: 'high' | 'medium' | 'low';
  examples: string[];
  applications: string[];
}

interface StudyQuestion {
  question: string;
  type: 'multiple-choice' | 'short-answer' | 'essay' | 'practical';
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  answer?: string;
}

interface TeachingPoint {
  point: string;
  explanation: string;
  examples: string[];
  commonMistakes: string[];
}

export function DocumentAnalysisViewer({ documentId, documentTitle }: DocumentAnalysisViewerProps) {
  const [studentLevel, setStudentLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [explanationRequest, setExplanationRequest] = useState("");
  const [lastExplanationData, setLastExplanationData] = useState<{ topic: string; explanation: string } | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [examples, setExamples] = useState<any>(null);
  const [showExamples, setShowExamples] = useState(false);
  const { toast } = useToast();

  // Fetch document analysis
  const { data: analysisData, isLoading: isAnalysisLoading } = useQuery({
    queryKey: [`/api/documents/${documentId}/analysis`],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/analysis`);
      if (!response.ok) {
        throw new Error('Failed to fetch document analysis');
      }
      return response.json();
    }
  });

  const analysis: DocumentAnalysis | null = analysisData?.analysis || null;

  // Generate explanation mutation
  const explanationMutation = useMutation({
    mutationFn: async ({ topic, level }: { topic: string; level: string }) => {
      const response = await fetch(`/api/documents/${documentId}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, studentLevel: level })
      });

      if (!response.ok) {
        throw new Error('Failed to generate explanation');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Set explanation state and trigger toast with quiz option
      setExplanationRequest(""); // Clear the input after successful generation
      setLastExplanationData({
        topic: data.topic, // Use the topic from the response
        explanation: data.explanation
      });
      toast({
        title: "Explanation Generated",
        description: "The AI has provided a detailed explanation. Generate examples or take a quiz!",
        action: (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => generateExamples(data.topic, data.explanation)}>
              Get Examples
            </Button>
            <Button size="sm" onClick={() => setShowQuiz(true)}>
              Take Quiz
            </Button>
          </div>
        ),
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Generate examples mutation
  const examplesMutation = useMutation({
    mutationFn: async ({ topic, explanation }: { topic: string; explanation: string }) => {
      const response = await fetch(`/api/documents/${documentId}/examples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, explanation, exampleCount: 3 }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate examples');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setExamples(data);
      setShowExamples(true);
      toast({
        title: "Examples Generated",
        description: "Personalized examples have been created to help you understand the concept better!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleExplainTopic = () => {
    if (!explanationRequest.trim()) {
      toast({
        title: "Error",
        description: "Please enter a topic to explain.",
        variant: "destructive",
      });
      return;
    }

    explanationMutation.mutate({
      topic: explanationRequest,
      level: studentLevel
    });
  };

  const generateExamples = (topic: string, explanation: string) => {
    examplesMutation.mutate({ topic, explanation });
  };


  if (isAnalysisLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing Document Content...
          </CardTitle>
          <CardDescription>
            Our AI is analyzing the document for educational insights and teaching opportunities.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Document Analysis Unavailable
          </CardTitle>
          <CardDescription>
            Unable to analyze this document. The content may not have been processed yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': case 'easy': return 'bg-green-100 text-green-800';
      case 'intermediate': case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Intelligent Document Analysis
          </CardTitle>
          <CardDescription>
            AI-powered analysis of {documentTitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Difficulty:</span>
              <Badge className={getDifficultyColor(analysis.difficulty)}>
                {analysis.difficulty}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-green-500" /> {/* Changed Clock to BookOpen for study time */}
              <span className="text-sm font-medium">Study Time:</span>
              <span className="text-sm">{analysis.estimatedStudyTime} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-purple-500" /> {/* Changed BookOpen to HelpCircle for topics */}
              <span className="text-sm font-medium">Topics:</span>
              <span className="text-sm">{analysis.keyTopics.length} identified</span>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold mb-2">Document Summary</h4>
            <p className="text-sm text-gray-600">{analysis.summary}</p>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold mb-2">Key Topics</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.keyTopics.map((topic, index) => (
                <Badge key={index} variant="outline">{topic}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="analysis" className="w-full"> {/* Changed default tab to analysis */}
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="explanation">Explanation</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="quiz">Understanding Check</TabsTrigger> {/* Added new tab for quiz */}
        </TabsList>

        <TabsContent value="analysis" className="space-y-4"> {/* Added analysis tab content */}
          <Card>
            <CardHeader>
              <CardTitle>Document Analysis</CardTitle>
              <CardDescription>
                Overview of the document's structure and content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Key Concepts</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.keyTopics.map((topic, index) => (
                    <Badge key={index} variant="outline">{topic}</Badge>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Learning Objectives</h4>
                <ul className="space-y-2">
                  {analysis.learningObjectives.map((objective, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {analysis.prerequisites && analysis.prerequisites.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Prerequisites</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.prerequisites.map((prereq, index) => (
                      <Badge key={index} variant="secondary">{prereq}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="explanation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Ask AI to Explain
              </CardTitle>
              <CardDescription>
                Request detailed explanations about specific topics from this document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">What would you like explained?</label>
                <Textarea
                  placeholder="e.g., 'Explain the main algorithm described in section 3' or 'How does this concept relate to machine learning?'"
                  value={explanationRequest}
                  onChange={(e) => setExplanationRequest(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Your level of understanding</label>
                <Select value={studentLevel} onValueChange={(value: any) => setStudentLevel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner - Simple explanations</SelectItem>
                    <SelectItem value="intermediate">Intermediate - Balanced detail</SelectItem>
                    <SelectItem value="advanced">Advanced - Technical depth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleExplainTopic}
                disabled={explanationMutation.isPending}
                className="w-full"
              >
                {explanationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Explanation...
                  </>
                ) : (
                  'Get AI Explanation'
                )}
              </Button>

              {lastExplanationData && (
                <div className="mt-4 space-y-4">
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-semibold mb-2">AI Explanation</h4>
                    <div className="text-sm space-y-2">
                      <p><strong>Topic:</strong> {lastExplanationData.topic}</p> {/* Display the requested topic */}
                      <p><strong>Level:</strong> {studentLevel}</p> {/* Display the selected level */}
                      <div className="mt-2 p-3 bg-white rounded border">
                        <p>{lastExplanationData.explanation}</p>
                      </div>
                    </div>
                  </div>

                  {showExamples && examples && (
                    <div className="mt-4 space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-yellow-500" />
                            Personalized Examples
                          </CardTitle>
                          <CardDescription>
                            Examples tailored to help you grasp the concept
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {examples.examples.map((example: string, index: number) => (
                            <div key={index} className="mb-4 last:mb-0">
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {index + 1}. {example}
                              </p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Practice Questions</CardTitle>
              <CardDescription>
                Test your knowledge with questions generated from the document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis.questions.map((q, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold">{q.question}</h4>
                  <p className="text-sm text-gray-600">{q.type} - {q.difficulty}</p>
                  {q.answer && (
                    <div className="mt-2 p-3 bg-gray-100 rounded text-sm">
                      <span className="font-medium">Answer:</span> {q.answer}
                    </div>
                  )}
                </div>
              ))}
              {analysis.questions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No practice questions found for this document.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiz Tab Content */}
        <TabsContent value="quiz" className="space-y-4">
          {showQuiz && lastExplanationData ? (
            <PostExplanationQuiz
              topic={lastExplanationData.topic}
              explanation={lastExplanationData.explanation}
              documentId={documentId}
              onComplete={(results) => {
                toast({
                  title: "Quiz Complete!",
                  description: `You scored ${Math.round(results.overallScore * 100)}%. Great job!`,
                });
                setShowQuiz(false); // Optionally hide quiz after completion
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Understanding Check
                </CardTitle>
                <CardDescription>
                  Get an explanation first, then test your understanding with an AI-generated quiz
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Generate an explanation in the "Explanation" tab first</p>
                  <p className="text-sm">Then return here to test your understanding</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}