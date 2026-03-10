import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Brain, FileText, MessageSquare, BookOpen, Target, Upload, Shuffle, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { VoiceAssistant } from "@/components/dashboard/voice-assistant";
import type { Course } from "@shared/schema";
import { PostExplanationQuiz } from '@/components/quiz/post-explanation-quiz';
import { InterleavedPracticeQuiz } from '@/components/quiz/interleaved-practice-quiz';

export default function CourseStudyPage() {
  const [, params] = useRoute("/courses/:courseId/study");
  const courseId = params?.courseId;
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("overview");
  const [quizMode, setQuizMode] = useState<'document' | 'interleaved' | null>(null);
  const [documentForQuiz, setDocumentForQuiz] = useState<any>(null);

  // Get course details
  const { data: courses = [] } = useQuery({
    queryKey: ['/api/courses'],
    queryFn: async () => {
      const response = await fetch('/api/courses');
      return response.json();
    }
  });

  // Get documents for this course
  const { data: documents = [] } = useQuery({
    queryKey: ['/api/courses', courseId, 'documents'],
    queryFn: async () => {
      if (!courseId) return [];
      const response = await fetch(`/api/courses/${courseId}/documents`);
      return response.json();
    },
    enabled: !!courseId
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: courseId,
          courseName: course?.name || 'Unknown Course',
          filename: file.name,
          fileType: file.type
        }),
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Material uploaded and processed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/courses', courseId, 'documents'] });
      setUploading(false);
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your material",
        variant: "destructive",
      });
      setUploading(false);
    }
  });

  const course = courses.find((c: Course) => c.courseId === courseId);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && course && courseId) {
      setUploading(true);
      console.log('Uploading file:', file.name, 'for course:', course.name, 'courseId:', courseId);
      uploadMutation.mutate(file);
    } else {
      toast({
        title: "Error", 
        description: "Please wait for course information to load before uploading.",
        variant: "destructive",
      });
    }
  };

  if (!course) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
          <Link href="/courses">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/courses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{course.name}</h1>
            <p className="text-muted-foreground">{course.courseId} • {course.instructor}</p>
          </div>
        </div>
        <Badge variant="secondary">{course.credits} Credits</Badge>
      </div>

      {/* Study Tabs */}
      <Tabs defaultValue="voice-assistant" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="voice-assistant">
            <MessageSquare className="h-4 w-4 mr-2" />
            Soun
          </TabsTrigger>
          <TabsTrigger value="materials">
            <FileText className="h-4 w-4 mr-2" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="quiz">
            <Target className="h-4 w-4 mr-2" />
            Quiz
          </TabsTrigger>
          <TabsTrigger value="notes">
            <BookOpen className="h-4 w-4 mr-2" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Soun Tab */}
        <TabsContent value="voice-assistant" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Soun - {course.name} Study Assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-h-[400px]">
                <VoiceAssistant />
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Course Context</h4>
                  <p className="text-sm text-muted-foreground">
                    Soun is focused on {course.name} ({course.courseId}) taught by {course.instructor}.
                    Ask questions about the course material, get help with assignments, or practice for exams.
                  </p>
                  {documents.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="font-medium text-sm mb-2">Available Study Materials:</p>
                      <div className="flex flex-wrap gap-2">
                        {documents.map((doc: any) => (
                          <Badge key={doc.id} variant="outline" className="text-xs">
                            {doc.title}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        The AI can answer questions based on your uploaded materials.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Materials</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="border rounded-lg p-4 hover:bg-muted/50">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium">{doc.title}</h4>
                            <p className="text-sm text-muted-foreground">{doc.filename}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{doc.fileType.toUpperCase()}</span>
                            </div>
                          </div>
                          <Badge variant="secondary">Ready for Study</Badge>
                        </div>
                        {doc.content && (
                          <div className="mt-3 p-3 bg-muted rounded text-sm">
                            <p className="font-medium mb-2">Extracted Content:</p>
                            <p className="text-muted-foreground">{doc.content.substring(0, 200)}...</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-center pt-4">
                    <input
                      type="file"
                      id="material-upload"
                      accept=".pdf,.pptx,.docx,.doc,.jpg,.jpeg,.png,.txt"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <Button 
                      variant="outline"
                      onClick={() => document.getElementById('material-upload')?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload More Materials"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No materials uploaded yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload your course materials to study with AI assistance
                  </p>
                  <Link href="/courses">
                    <Button>
                      <FileText className="h-4 w-4 mr-2" />
                      Upload Materials
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Practice Quiz</CardTitle>
            </CardHeader>
            <CardContent>
              {quizMode === null && (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Practice with Quizzes</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose a quiz mode to test your knowledge.
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button onClick={() => { setQuizMode('document'); }}>
                      <FileText className="h-4 w-4 mr-2" />
                      Quiz from Material
                    </Button>
                    <Button onClick={() => { setQuizMode('interleaved'); }}>
                      <Shuffle className="h-4 w-4 mr-2" />
                      Interleaved Practice
                    </Button>
                  </div>
                </div>
              )}
              {quizMode === 'document' && !documentForQuiz && (
                <PostExplanationQuiz 
                  documents={documents}
                  onDocumentSelect={(doc) => {
                    setDocumentForQuiz(doc);
                  }}
                  onBack={() => setQuizMode(null)}
                />
              )}
              {quizMode === 'document' && documentForQuiz && (
                <PostExplanationQuiz 
                  courseId={courseId!} 
                  initialDocument={documentForQuiz} 
                  onBack={() => {
                    setDocumentForQuiz(null);
                    setQuizMode(null);
                  }}
                />
              )}
              {quizMode === 'interleaved' && (
                <InterleavedPracticeQuiz 
                  courseId={courseId!} 
                  onBack={() => setQuizMode(null)} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Study Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No notes yet</h3>
                <p className="text-muted-foreground mb-4">
                  Take notes during your study sessions
                </p>
                <Button>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Create Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}