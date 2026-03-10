import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Play, Square, Mic, MicOff, Volume2, SkipForward, RotateCcw } from 'lucide-react';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  source?: string;
  lastReviewed?: Date;
  correctCount: number;
  incorrectCount: number;
  masteryLevel: number;
}

interface FlashcardSession {
  sessionId: string;
  flashcards: Flashcard[];
  currentIndex: number;
  correctAnswers: number;
  totalAnswers: number;
  sessionType: 'practice' | 'review' | 'challenge';
}

interface VoiceFlashcardResponse {
  type: 'question' | 'feedback' | 'summary' | 'instructions';
  content: string;
  flashcard?: Flashcard;
  sessionStats?: {
    current: number;
    total: number;
    correctCount: number;
    accuracy: number;
  };
  nextAction?: 'continue' | 'end' | 'repeat';
}

interface VoiceFlashcardsProps {
  courseId?: string;
  onSessionEnd?: () => void;
}

const VoiceFlashcards: React.FC<VoiceFlashcardsProps> = ({ courseId, onSessionEnd }) => {
  const [currentSession, setCurrentSession] = useState<FlashcardSession | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentFlashcard, setCurrentFlashcard] = useState<Flashcard | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [sessionStats, setSessionStats] = useState({
    current: 0,
    total: 0,
    correctCount: 0,
    accuracy: 0
  });

  const { toast } = useToast();
  const { speak, speaking, cancel } = useTextToSpeech();
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Start voice session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (command: string) => {
      const response = await apiRequest('/api/flashcards/start-voice-session', 'POST', {
        command,
        sessionType: 'practice',
        courseId
      });
      return response as any; // Type assertion for now
    },
    onSuccess: (data) => {
      if (data.sessionId) {
        setCurrentSession(data);
        setIsSessionActive(true);
        setCurrentFlashcard(data.flashcard);
        setSessionStats({
          current: 1,
          total: data.flashcards?.length || 0,
          correctCount: 0,
          accuracy: 0
        });
        speak(data.response?.content || 'Let\'s start practicing flashcards!');
      }
    },
    onError: (error) => {
      toast({
        title: "Session Error",
        description: "Failed to start flashcard session. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Process voice answer mutation with adaptive feedback
  const processAnswerMutation = useMutation({
    mutationFn: async ({ sessionId, answer }: { sessionId: string; answer: string }) => {
      return await apiRequest('/api/flashcards/process-voice-answer', {
        method: 'POST',
        body: { sessionId, answer }
      });
    },
    onSuccess: (data: VoiceFlashcardResponse) => {
      speak(data.content);

      if (data.sessionStats) {
        setSessionStats(data.sessionStats);
      }

      if (data.nextAction === 'continue' && data.flashcard) {
        setTimeout(() => {
          setCurrentFlashcard(data.flashcard!);
          setShowAnswer(false);
          setUserAnswer('');
          resetTranscript();
        }, 3000);
      } else if (data.nextAction === 'end') {
        setIsSessionActive(false);
        onSessionEnd?.();
      }
    },
    onError: (error) => {
      toast({
        title: "Processing Error",
        description: "Failed to process your answer. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle voice input
  useEffect(() => {
    if (transcript && transcript.trim()) {
      setUserAnswer(transcript.trim());
    }
  }, [transcript]);

  // Handle starting a new session
  const handleStartSession = () => {
    const command = `Start a flashcard practice session${courseId ? ` for course ${courseId}` : ''}`;
    startSessionMutation.mutate(command);
  };

  // Handle submitting an answer
  const handleSubmitAnswer = () => {
    if (!currentSession || !userAnswer.trim()) return;

    processAnswerMutation.mutate({
      sessionId: currentSession.sessionId,
      answer: userAnswer.trim()
    });

    stopListening();
  };

  // Handle showing the answer
  const handleShowAnswer = () => {
    if (currentFlashcard) {
      setShowAnswer(true);
      speak(currentFlashcard.back);
    }
  };

  // Handle ending the session
  const handleEndSession = () => {
    setIsSessionActive(false);
    setCurrentSession(null);
    setCurrentFlashcard(null);
    setShowAnswer(false);
    setUserAnswer('');
    resetTranscript();
    cancel();
    onSessionEnd?.();
  };

  // Handle voice control
  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Your browser doesn't support speech recognition. Please use a modern browser like Chrome or Edge.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!isSessionActive ? (
        // Session setup
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Voice Flashcards
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Practice flashcards using voice commands. Say your answers out loud for an interactive learning experience.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleStartSession}
              disabled={startSessionMutation.isPending}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              {startSessionMutation.isPending ? 'Starting Session...' : 'Start Voice Practice'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        // Active session
        <div className="space-y-4">
          {/* Session progress */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">
                  {sessionStats.current} of {sessionStats.total}
                </span>
              </div>
              <Progress value={(sessionStats.current / sessionStats.total) * 100} className="mb-2" />
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Accuracy: {Math.round(sessionStats.accuracy)}%</span>
                <span>Correct: {sessionStats.correctCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Current flashcard */}
          {currentFlashcard && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Question</CardTitle>
                  <Badge variant={
                    currentFlashcard.difficulty === 'easy' ? 'secondary' :
                    currentFlashcard.difficulty === 'medium' ? 'default' : 'destructive'
                  }>
                    {currentFlashcard.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-lg font-medium p-4 bg-muted rounded-lg">
                    {currentFlashcard.front}
                  </div>

                  {showAnswer && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">Answer:</div>
                        <div className="text-lg p-4 bg-green-50 border border-green-200 rounded-lg">
                          {currentFlashcard.back}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Voice input controls */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Your Answer:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVoiceToggle}
                    className={isListening ? 'bg-red-100 border-red-300' : ''}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {isListening ? 'Stop Listening' : 'Start Listening'}
                  </Button>
                </div>

                {userAnswer && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-600 mb-1">You said:</div>
                    <div className="font-medium">{userAnswer}</div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!userAnswer.trim() || processAnswerMutation.isPending}
                    className="flex-1"
                  >
                    Submit Answer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleShowAnswer}
                    disabled={showAnswer}
                  >
                    <Volume2 className="h-4 w-4 mr-1" />
                    Show Answer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session controls */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleEndSession}>
                  <Square className="h-4 w-4 mr-2" />
                  End Session
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetTranscript();
                    setUserAnswer('');
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Answer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VoiceFlashcards;