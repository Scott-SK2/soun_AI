import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Mic, 
  BookOpen, 
  Loader2, 
  Download, 
  Eye,
  Volume2,
  MessageSquare,
  Brain,
  Lightbulb,
  Clock,
  Target,
  CheckCircle
} from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";

interface EnhancedDocumentProcessorProps {
  documents: Array<{
    id: number;
    title: string;
    filename: string;
    courseId: string;
    courseName: string;
  }>;
  userId: number;
}

export function EnhancedDocumentProcessor({ documents, userId }: EnhancedDocumentProcessorProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [studyGuide, setStudyGuide] = useState<any>(null);
  const [documentSummary, setSummaryData] = useState<any>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [voiceNote, setVoiceNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'long'>('medium');

  const { toast } = useToast();
  const { speak } = useTextToSpeech();

  // Generate study guide mutation
  const generateStudyGuide = useMutation({
    mutationFn: async (data: { documentIds: number[]; courseId?: string; title?: string }) => {
      const response = await apiRequest("POST", "/api/documents/study-guide", data);
      return await response.json();
    },
    onSuccess: (data) => {
      setStudyGuide(data.studyGuide);
      toast({
        title: "Study Guide Generated",
        description: "Your comprehensive study guide is ready!",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate study guide. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Generate document summary mutation
  const generateSummary = useMutation({
    mutationFn: async (data: { documentId: number; length: string }) => {
      const response = await apiRequest("POST", `/api/documents/${data.documentId}/summary`, { length: data.length });
      return await response.json();
    },
    onSuccess: (data) => {
      setSummaryData(data.summary);
      toast({
        title: "Summary Generated",
        description: "Document summary is ready!",
      });
    },
    onError: () => {
      toast({
        title: "Summary Failed",
        description: "Failed to generate summary. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create voice annotation mutation
  const createVoiceAnnotation = useMutation({
    mutationFn: async (data: { documentId: number; voiceNote: string; type: string }) => {
      const response = await apiRequest("POST", `/api/documents/${data.documentId}/voice-annotation`, {
        voiceNote: data.voiceNote,
        type: data.type
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setAnnotations(prev => [...prev, data.annotation]);
      setVoiceNote("");
      toast({
        title: "Annotation Created",
        description: "Voice annotation added successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Annotation Failed",
        description: "Failed to create voice annotation. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDocumentSelection = (documentId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleGenerateStudyGuide = () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to generate a study guide.",
        variant: "destructive",
      });
      return;
    }

    const courseId = documents.find(doc => selectedDocuments.includes(doc.id))?.courseId;
    generateStudyGuide.mutate({
      documentIds: selectedDocuments,
      courseId,
      title: `Study Guide - ${new Date().toLocaleDateString()}`
    });
  };

  const handleGenerateSummary = (documentId: number) => {
    generateSummary.mutate({ documentId, length: summaryLength });
  };

  const handleVoiceAnnotation = (documentId: number, type: string = 'note') => {
    if (!voiceNote.trim()) {
      toast({
        title: "Empty Voice Note",
        description: "Please enter a voice note before creating annotation.",
        variant: "destructive",
      });
      return;
    }

    createVoiceAnnotation.mutate({
      documentId,
      voiceNote,
      type
    });
  };

  // Mock voice recording (in real app, integrate with speech recognition)
  const toggleVoiceRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Start recording
      toast({
        title: "Recording Started",
        description: "Speak your annotation...",
      });
      // In real implementation, start speech recognition here
    } else {
      // Stop recording
      toast({
        title: "Recording Stopped",
        description: "Voice note saved.",
      });
      // In real implementation, stop speech recognition and process audio
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Enhanced Document Processing
          </CardTitle>
          <CardDescription>
            Generate study guides, create voice annotations, and summarize documents with AI
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="study-guide" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="study-guide">Study Guides</TabsTrigger>
          <TabsTrigger value="annotations">Voice Annotations</TabsTrigger>
          <TabsTrigger value="summaries">Document Summaries</TabsTrigger>
        </TabsList>

        {/* Study Guide Generation */}
        <TabsContent value="study-guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Generate Study Guide
              </CardTitle>
              <CardDescription>
                Select documents to create a comprehensive study guide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <h4 className="font-medium">Select Documents:</h4>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedDocuments.includes(doc.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleDocumentSelection(doc.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 border-2 rounded ${
                        selectedDocuments.includes(doc.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {selectedDocuments.includes(doc.id) && (
                          <CheckCircle className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-sm text-gray-500">{doc.courseName}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{doc.courseId}</Badge>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleGenerateStudyGuide}
                disabled={generateStudyGuide.isPending || selectedDocuments.length === 0}
                className="w-full"
              >
                {generateStudyGuide.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Study Guide...
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Generate Study Guide ({selectedDocuments.length} docs)
                  </>
                )}
              </Button>

              {/* Display Generated Study Guide */}
              {studyGuide && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {studyGuide.title}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => speak(studyGuide.summary)}>
                          <Volume2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <Badge>{studyGuide.difficulty}</Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {studyGuide.estimatedStudyTime} min
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Summary</h4>
                      <p className="text-sm text-gray-600">{studyGuide.summary}</p>
                    </div>

                    {studyGuide.keyTerms && studyGuide.keyTerms.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Key Terms</h4>
                        <div className="grid gap-2">
                          {studyGuide.keyTerms.slice(0, 5).map((term: any, index: number) => (
                            <div key={index} className="p-2 bg-gray-50 rounded">
                              <span className="font-medium">{term.term}:</span> {term.definition}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {studyGuide.sections && studyGuide.sections.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Study Sections</h4>
                        <div className="space-y-2">
                          {studyGuide.sections.map((section: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <h5 className="font-medium">{section.title}</h5>
                              <p className="text-sm text-gray-600 mt-1">{section.content}</p>
                              {section.keyPoints && (
                                <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
                                  {section.keyPoints.slice(0, 3).map((point: string, i: number) => (
                                    <li key={i}>{point}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice Annotations */}
        <TabsContent value="annotations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Annotations
              </CardTitle>
              <CardDescription>
                Create voice-activated annotations for your documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={toggleVoiceRecording}
                  variant={isRecording ? "destructive" : "default"}
                  size="sm"
                >
                  <Mic className={`h-4 w-4 mr-2 ${isRecording ? 'animate-pulse' : ''}`} />
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Button>
              </div>

              <Textarea
                placeholder="Your voice note will appear here, or type manually..."
                value={voiceNote}
                onChange={(e) => setVoiceNote(e.target.value)}
                className="min-h-[100px]"
              />

              <div className="grid gap-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-gray-500">{doc.courseName}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVoiceAnnotation(doc.id, 'note')}
                        disabled={createVoiceAnnotation.isPending}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Note
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVoiceAnnotation(doc.id, 'question')}
                        disabled={createVoiceAnnotation.isPending}
                      >
                        <Lightbulb className="h-4 w-4 mr-1" />
                        Question
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Display Recent Annotations */}
              {annotations.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Recent Annotations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {annotations.map((annotation, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary">{annotation.type}</Badge>
                            <Button size="sm" variant="ghost" onClick={() => speak(annotation.content)}>
                              <Volume2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm">{annotation.content}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(annotation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Summaries */}
        <TabsContent value="summaries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Summaries
              </CardTitle>
              <CardDescription>
                Generate intelligent summaries for long documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Summary Length:</label>
                <Select value={summaryLength} onValueChange={(value: any) => setSummaryLength(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-gray-500">{doc.courseName}</p>
                    </div>
                    <Button
                      onClick={() => handleGenerateSummary(doc.id)}
                      disabled={generateSummary.isPending}
                      size="sm"
                    >
                      {generateSummary.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Summarize
                    </Button>
                  </div>
                ))}
              </div>

              {/* Display Generated Summary */}
              {documentSummary && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Summary: {documentSummary.title}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => speak(documentSummary.executiveSummary)}>
                          <Volume2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {documentSummary.readingTime} min read
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {Math.round(documentSummary.compressionRatio * 100)}% compression
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Executive Summary</h4>
                      <p className="text-sm text-gray-600">{documentSummary.executiveSummary}</p>
                    </div>

                    {documentSummary.keyPoints && documentSummary.keyPoints.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Key Points</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {documentSummary.keyPoints.map((point: string, index: number) => (
                            <li key={index}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {documentSummary.conclusions && documentSummary.conclusions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Conclusions</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {documentSummary.conclusions.map((conclusion: string, index: number) => (
                            <li key={index}>{conclusion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}