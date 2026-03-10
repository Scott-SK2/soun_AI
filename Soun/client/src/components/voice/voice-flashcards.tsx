
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mic, Play, SkipForward, Square, RotateCcw, Brain, Target, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface VoiceFlashcardResponse {
  type: 'question' | 'feedback' | 'summary' | 'instructions';
  content: string;
  flashcard?: {
    id: string;
    front: string;
    back: string;
    difficulty: string;
    category: string;
  };
  sessionStats?: {
    current: number;
    total: number;
    correctCount: number;
    accuracy: number;
  };
  nextAction?: 'continue' | 'end' | 'repeat';
}

interface VoiceFlashcardsProps {
  sessionId?: string;
  onSessionEnd?: () => void;
}

export function VoiceFlashcards({ sessionId: initialSessionId, onSessionEnd }: VoiceFlashcardsProps) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [currentResponse, setCurrentResponse] = useState<VoiceFlashcardResponse | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [sessionType, setSessionType] = useState<'practice' | 'review' | 'challenge'>('practice');
  const [isActive, setIsActive] = useState(false);
  
  const { speak, speaking } = useTextToSpeech();
  const { toast } = useToast();

  // Start new flashcard session
  const startSessionMutation = useMutation({
    mutationFn: async (data: { 
      command: string; 
      sessionType: string; 
      courseId?: string 
    }) => {
      const response = await apiRequest("POST", "/api/flashcards/start-voice-session", data);
      return response.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setCurrentResponse(data.response);
      setIsActive(true);
      
      toast({
        title: "Flashcard Session Started",
        description: "Voice session is ready. Listen for your first question!",
      });

      // Speak the initial instructions
      setTimeout(() => {
        speak(data.response.content);
      }, 500);
    },
    onError: (error) => {
      console.error('Failed to start flashcard session:', error);
      toast({
        title: "Error",
        description: "Failed to start flashcard session. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Process voice answer
  const processAnswerMutation = useMutation({
    mutationFn: async (data: { sessionId: string; answer: string }) => {
      const response = await apiRequest("POST", "/api/flashcards/process-voice-answer", data);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentResponse(data);
      
      // Speak the feedback
      speak(data.content);
      
      if (data.nextAction === 'end') {
        setIsActive(false);
        setSessionId(null);
        onSessionEnd?.();
      }
    },
    onError: (error) => {
      console.error('Failed to process answer:', error);
      toast({
        title: "Error",
        description: "Failed to process your answer. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Get next question
  const getNextQuestionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest("GET", `/api/flashcards/next-question/${sessionId}`);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentResponse(data);
      speak(data.content);
    }
  });

  // Speech recognition setup
  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        
        if (sessionId) {
          processAnswerMutation.mutate({
            sessionId,
            answer: transcript
          });
        }
      };
      
      recognition.onerror = () => {
        setIsListening(false);
        toast({
          title: "Speech Recognition Error",
          description: "Could not recognize your speech. Please try again.",
          variant: "destructive",
        });
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive",
      });
    }
  };

  const handleStartSession = (type: 'practice' | 'review' | 'challenge') => {
    setSessionType(type);
    startSessionMutation.mutate({
      command: `start ${type} flashcard session`,
      sessionType: type,
      courseId: window.location.pathname.match(/\/courses\/([^\/]+)/)?.[1]
    });
  };

  const handleSkip = () => {
    if (sessionId) {
      processAnswerMutation.mutate({
        sessionId,
        answer: 'skip'
      });
    }
  };

  const handleRepeat = () => {
    if (sessionId) {
      processAnswerMutation.mutate({
        sessionId,
        answer: 'repeat'
      });
    }
  };

  const handleEndSession = () => {
    if (sessionId) {
      processAnswerMutation.mutate({
        sessionId,
        answer: 'end session'
      });
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

  const getResponseTypeIcon = (type: string) => {
    switch (type) {
      case 'question': return <Target className="h-4 w-4" />;
      case 'feedback': return <Brain className="h-4 w-4" />;
      case 'summary': return <Zap className="h-4 w-4" />;
      case 'instructions': return <Play className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  if (!isActive && !sessionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Voice-Driven Flashcards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Practice with flashcards using only your voice. Ask questions, get answers, and receive instant feedback.
          </div>
          
          <div className="grid gap-3">
            <Button 
              onClick={() => handleStartSession('practice')}
              disabled={startSessionMutation.isPending}
              className="w-full justify-start"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Practice Session
              <Badge variant="outline" className="ml-auto">General</Badge>
            </Button>
            
            <Button 
              onClick={() => handleStartSession('review')}
              disabled={startSessionMutation.isPending}
              variant="outline"
              className="w-full justify-start"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Review Difficult Cards
              <Badge variant="outline" className="ml-auto">Focused</Badge>
            </Button>
            
            <Button 
              onClick={() => handleStartSession('challenge')}
              disabled={startSessionMutation.isPending}
              variant="outline"
              className="w-full justify-start"
            >
              <Zap className="h-4 w-4 mr-2" />
              Challenge Mode
              <Badge variant="outline" className="ml-auto">Advanced</Badge>
            </Button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium mb-2">💡 Voice Commands:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Say your answer naturally</li>
              <li>• Say "skip" to move to the next card</li>
              <li>• Say "repeat" to hear the question again</li>
              <li>• Say "end session" to finish</li>
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
            {currentResponse && getResponseTypeIcon(currentResponse.type)}
            Voice Flashcards - {sessionType.charAt(0).toUpperCase() + sessionType.slice(1)}
          </span>
          {currentResponse?.sessionStats && (
            <Badge variant="outline">
              {currentResponse.sessionStats.current} / {currentResponse.sessionStats.total}
            </Badge>
          )}
        </CardTitle>
        
        {currentResponse?.sessionStats && (
          <div className="space-y-2">
            <Progress 
              value={(currentResponse.sessionStats.current / currentResponse.sessionStats.total) * 100} 
              className="h-2" 
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Accuracy: {Math.round(currentResponse.sessionStats.accuracy * 100)}%</span>
              <span>Correct: {currentResponse.sessionStats.correctCount}</span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Response */}
        {currentResponse && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {getResponseTypeIcon(currentResponse.type)}
              <span className="font-medium capitalize">{currentResponse.type}</span>
              {currentResponse.flashcard && (
                <Badge className={getDifficultyColor(currentResponse.flashcard.difficulty)}>
                  {currentResponse.flashcard.difficulty}
                </Badge>
              )}
            </div>
            <p className="text-sm">{currentResponse.content}</p>
            
            {currentResponse.flashcard && currentResponse.type === 'feedback' && (
              <div className="mt-3 p-3 bg-white rounded border">
                <p className="text-xs text-gray-600">Question:</p>
                <p className="text-sm font-medium">{currentResponse.flashcard.front}</p>
                <p className="text-xs text-gray-600 mt-2">Answer:</p>
                <p className="text-sm">{currentResponse.flashcard.back}</p>
              </div>
            )}
          </div>
        )}

        {/* Voice Controls */}
        <div className="flex gap-2">
          <Button
            onClick={startListening}
            disabled={isListening || speaking || !isActive}
            className={cn(
              "flex-1 flex items-center gap-2",
              isListening && "bg-red-500 hover:bg-red-600"
            )}
          >
            <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
            {isListening ? "Listening..." : "Answer"}
          </Button>

          <Button
            onClick={handleSkip}
            disabled={!isActive || speaking}
            variant="outline"
            size="icon"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            onClick={handleRepeat}
            disabled={!isActive || speaking}
            variant="outline"
            size="icon"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            onClick={handleEndSession}
            disabled={!isActive}
            variant="destructive"
            size="icon"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {speaking && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Speaking...
            </div>
          )}
          {isListening && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              Listening...
            </div>
          )}
          {!speaking && !isListening && isActive && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Ready for input
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
