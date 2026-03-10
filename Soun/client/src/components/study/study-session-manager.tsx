import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { useMotivation } from '@/context/motivation-context';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import { useSpeechRecognition } from 'react-speech-recognition';


import {
  Play, Pause, Square, Timer, Coffee, BookOpen,
  Brain, Target, Clock, CheckCircle, AlertCircle,
  Volume2, VolumeX, Settings, RotateCcw
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Types
interface StudySessionConfig {
  duration: number; // in minutes
  breakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  sessionsUntilLongBreak: number;
  subject: string;
  topic: string;
  enableVoiceAnnouncements: boolean;
  autoStartBreaks: boolean;
  enableNotifications: boolean;
}

interface StudySessionState {
  status: 'idle' | 'active' | 'paused' | 'break' | 'completed';
  currentPhase: 'study' | 'short_break' | 'long_break';
  timeRemaining: number; // in seconds
  totalTime: number; // in seconds
  sessionCount: number;
  completedSessions: number;
  currentSessionStartTime?: Date;
  totalStudyTime: number; // total study time in session
  keyTopics: string[];
}

interface StudySessionSummary {
  totalDuration: number;
  studyTime: number;
  breakTime: number;
  completedSessions: number;
  keyTopics: string[];
  focusScore: number;
  recommendationsForNext: string[];
}

const DEFAULT_CONFIG: StudySessionConfig = {
  duration: 25, // Pomodoro technique
  breakDuration: 5,
  longBreakDuration: 30,
  sessionsUntilLongBreak: 4,
  subject: '',
  topic: '',
  enableVoiceAnnouncements: true,
  autoStartBreaks: true,
  enableNotifications: true
};

// Mock state and handlers for example purposes (replace with actual context/hooks)
const useMockState = () => {
  const [sessionSettings, setSessionSettings] = useState({
    duration: 25,
    subject: '',
    voiceAnnouncements: true,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4
  });
  const [sessionActive, setSessionActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'study' | 'shortBreak' | 'longBreak'>('study');
  const [timeRemaining, setTimeRemaining] = useState(1500); // 25 minutes
  const [sessionCount, setSessionCount] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [sessionSummary, setSessionSummary] = useState<StudySessionSummary | null>(null);

  const startSession = () => {
    setSessionActive(true);
    setCurrentPhase('study');
    setTimeRemaining(sessionSettings.duration * 60);
    setSessionCount(prev => prev + 1);
    setTotalStudyTime(prev => prev + sessionSettings.duration); // Add current session duration to total
  };

  const pauseSession = () => {
    setSessionActive(false);
  };

  const endSession = () => {
    const summary: StudySessionSummary = {
      totalDuration: totalStudyTime,
      studyTime: totalStudyTime, // Approximation for this mock
      breakTime: (sessionCount - 1) * sessionSettings.breakDuration, // Approximate break time
      completedSessions: completedSessions,
      keyTopics: sessionSettings.subject ? [sessionSettings.subject] : [],
      focusScore: Math.round((completedSessions / Math.max(sessionCount, 1)) * 100),
      recommendationsForNext: ["Take regular breaks", "Review material"]
    };
    setSessionSummary(summary);
    setSessionActive(false);
    // Reset state after summary
    setSessionCount(0);
    setCompletedSessions(0);
    setTotalStudyTime(0);
    setCurrentPhase('study');
    setTimeRemaining(1500);
  };

  // Simulate timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (sessionActive && timeRemaining === 0) {
      // Phase complete logic would go here
      if (currentPhase === 'study') {
        const isLongBreak = sessionCount % sessionSettings.sessionsUntilLongBreak === 0;
        const nextPhase = isLongBreak ? 'longBreak' : 'shortBreak';
        const breakTime = isLongBreak ? sessionSettings.longBreakDuration : sessionSettings.breakDuration;
        setCurrentPhase(nextPhase);
        setTimeRemaining(breakTime * 60);
        setCompletedSessions(prev => prev + 1);
      } else {
        setCurrentPhase('study');
        setTimeRemaining(sessionSettings.duration * 60);
      }
    }
    return () => clearInterval(interval);
  }, [sessionActive, timeRemaining, sessionSettings, sessionCount, currentPhase, completedSessions]);

  const getTotalTimeForPhase = () => {
    if (currentPhase === 'study') return sessionSettings.duration * 60;
    if (currentPhase === 'shortBreak') return sessionSettings.breakDuration * 60;
    return sessionSettings.longBreakDuration * 60;
  };

  return {
    sessionSettings, setSessionSettings,
    sessionActive, setSessionActive,
    currentPhase, setCurrentPhase,
    timeRemaining, setTimeRemaining,
    sessionCount, setSessionCount,
    completedSessions, setCompletedSessions,
    totalStudyTime, setTotalStudyTime,
    sessionSummary, setSessionSummary,
    startSession, pauseSession, endSession,
    getTotalTimeForPhase
  };
};

export function StudySessionManager() {
  // Replace mock state with actual context/hooks if available
  // const { sessionSettings, sessionActive, currentPhase, timeRemaining, startSession, pauseSession, endSession, getTotalTimeForPhase, setSessionSettings, setSessionActive, setCurrentPhase, setTimeRemaining, setSessionCount, setCompletedSessions, setTotalStudyTime, sessionSummary, setSessionSummary } = useMotivation();
  const {
    sessionSettings, setSessionSettings,
    sessionActive, setSessionActive,
    currentPhase,
    timeRemaining,
    startSession,
    pauseSession,
    endSession,
    getTotalTimeForPhase,
    sessionSummary, setSessionSummary
  } = useMockState(); // Using mock state for demonstration

  const [sessionStats, setSessionStats] = useState({
    current: 0,
    total: 0,
    correctCount: 0,
    accuracy: 0
  });

  // Pre-session recall states
  const [showRecallChallenge, setShowRecallChallenge] = useState(false);
  const [recallQuestion, setRecallQuestion] = useState('');
  const [recallAnswer, setRecallAnswer] = useState('');
  const [isAnsweringRecall, setIsAnsweringRecall] = useState(false);

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

  // Sync voice transcript to recall answer
  useEffect(() => {
    if (isAnsweringRecall && transcript) {
      setRecallAnswer(prev => prev ? `${prev} ${transcript}` : transcript);
    }
  }, [transcript, isAnsweringRecall]);


  const handleConfigChange = (key: keyof typeof sessionSettings, value: string | number | boolean) => {
    setSessionSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleStartSession = () => {
    if (sessionSettings.subject.trim()) {
      setRecallQuestion(`What do you remember from the last session or the ${sessionSettings.subject} chapter you are about to revise?`);
      setShowRecallChallenge(true);
    } else {
      startSession();
      if (sessionSettings.voiceAnnouncements) {
        speak(`Starting ${sessionSettings.duration} minute study session. Let's focus!`);
      }
    }
  };

  const handlePauseSession = () => {
    pauseSession();
    if (sessionSettings.voiceAnnouncements) {
      speak("Session paused. Take a moment to relax.");
    }
  };

  const handleEndSession = () => {
    endSession();
    if (sessionSettings.voiceAnnouncements) {
      speak("Study session ended. Good job today!");
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    const totalTime = getTotalTimeForPhase();
    return totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;
  };

  const getPhaseDetails = () => {
    switch (currentPhase) {
      case 'study':
        return { title: 'Study Time', color: 'text-blue-600', bgColor: 'bg-blue-50' };
      case 'shortBreak':
        return { title: 'Short Break', color: 'text-green-600', bgColor: 'bg-green-50' };
      case 'longBreak':
        return { title: 'Long Break', color: 'text-purple-600', bgColor: 'bg-purple-50' };
      default:
        return { title: 'Idle', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    }
  };

  const { title: phaseTitle, color: phaseColor, bgColor: phaseBgColor } = getPhaseDetails();

  const handleRecallAnswer = () => {
    setIsAnsweringRecall(false);
    stopListening();
    if (sessionSettings.voiceAnnouncements) {
      speak(`You remembered: ${recallAnswer}. Great job! Let's start the session.`);
    }
    toast({
      title: "Recall Challenge Complete",
      description: `You remembered: "${recallAnswer}".`,
      variant: "success"
    });
    // Proceed to start the actual study session
    startSession();
    setShowRecallChallenge(false);
    setRecallAnswer(''); // Reset for next time
  };

  const handleStartRecall = () => {
    setIsAnsweringRecall(true);
    setRecallAnswer(''); // Clear previous answer
    resetTranscript();
    if (browserSupportsSpeechRecognition) {
      startListening();
      if (sessionSettings.voiceAnnouncements) {
        speak("What do you remember? You can speak your answer.");
      }
    } else {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser does not support speech recognition. Please type your answer.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {showRecallChallenge && (
        <Dialog open={showRecallChallenge} onOpenChange={setShowRecallChallenge}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Recall Challenge</DialogTitle>
              <CardDescription>{recallQuestion}</CardDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="recallAnswer">Your Answer</Label>
                <Input
                  id="recallAnswer"
                  value={recallAnswer}
                  onChange={(e) => setRecallAnswer(e.target.value)}
                  placeholder="Type or speak your answer..."
                  className="min-h-[100px] resize-y"
                />
              </div>
              <div className="flex items-center justify-center space-x-4">
                {isAnsweringRecall ? (
                  <>
                    <Button onClick={stopListening} variant="outline" disabled={!isListening}>
                      Stop Listening
                    </Button>
                    <Button onClick={handleRecallAnswer} disabled={!recallAnswer.trim()}>
                      Submit Answer
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleStartRecall} disabled={!browserSupportsSpeechRecognition}>
                    <Brain className="mr-2 h-4 w-4" /> Start Speaking
                  </Button>
                )}
              </div>
              {isListening && (
                <div className="text-center text-sm text-gray-500">Listening...</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Timer className="h-4 w-4 md:h-5 md:w-5" />
            Study Session Manager
          </CardTitle>
          <CardDescription className="text-sm">
            Focused study sessions with voice guidance and progress tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {!sessionActive ? (
            <>
              {/* Mobile-optimized Session Setup */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Study Duration (minutes)</label>
                  <select
                    value={sessionSettings.duration}
                    onChange={(e) => handleConfigChange('duration', parseInt(e.target.value))}
                    className="w-full p-3 md:p-2 border rounded-md text-base md:text-sm"
                  >
                    <option value={25}>25 minutes (Pomodoro)</option>
                    <option value={45}>45 minutes (Extended)</option>
                    <option value={60}>60 minutes (Deep Focus)</option>
                    <option value={90}>90 minutes (Marathon)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject/Topic</label>
                  <input
                    type="text"
                    value={sessionSettings.subject}
                    onChange={(e) => handleConfigChange('subject', e.target.value)}
                    placeholder="e.g., Mathematics, History, etc."
                    className="w-full p-3 md:p-2 border rounded-md text-base md:text-sm"
                  />
                </div>

                <div className="flex items-center space-x-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="voiceAnnouncements"
                      checked={sessionSettings.voiceAnnouncements}
                      onChange={(e) => handleConfigChange('voiceAnnouncements', e.target.checked)}
                      className="rounded w-4 h-4"
                    />
                    <label htmlFor="voiceAnnouncements" className="text-sm">
                      Voice announcements
                    </label>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStartSession}
                className="w-full flex items-center gap-2 h-12 md:h-10 text-base md:text-sm"
                disabled={!sessionSettings.subject.trim()}
              >
                <Play className="h-4 w-4" />
                Start Study Session
              </Button>
            </>
          ) : (
            <>
              {/* Mobile-optimized Active Session */}
              <div className="text-center space-y-4">
                <div className={`${phaseBgColor} p-4 md:p-6 rounded-lg shadow-inner`}>
                  <h3 className="text-lg md:text-xl font-semibold mb-2">
                    {phaseTitle}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 break-words">{sessionSettings.subject}</p>

                  <div className="text-3xl md:text-4xl font-bold font-mono text-gray-800 mb-4">
                    {formatTime(timeRemaining)}
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-3 md:h-2 mb-4">
                    <div
                      className={`bg-gradient-to-r from-blue-400 to-purple-500 h-3 md:h-2 rounded-full transition-all duration-1000`}
                      style={{
                        width: `${getProgress()}%`
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={handlePauseSession}
                    variant="outline"
                    className="flex items-center gap-2 h-11 md:h-10 px-4 md:px-3"
                  >
                    <Pause className="h-4 w-4" />
                    <span className="hidden md:inline">Pause</span>
                  </Button>

                  <Button
                    onClick={handleEndSession}
                    variant="destructive"
                    className="flex items-center gap-2 h-11 md:h-10 px-4 md:px-3"
                  >
                    <Square className="h-4 w-4" />
                    <span className="hidden md:inline">End Session</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Session Summary Display */}
      {sessionSummary && (
        <Card>
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Session Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="font-semibold">Study Time:</span> {Math.floor(sessionSummary.studyTime / 60)}h {sessionSummary.studyTime % 60}m
              </div>
              <div>
                <span className="font-semibold">Sessions Completed:</span> {sessionSummary.completedSessions}
              </div>
              <div>
                <span className="font-semibold">Focus Score:</span> {sessionSummary.focusScore}%
              </div>
              <div>
                <span className="font-semibold">Topics Covered:</span> {sessionSummary.keyTopics.length > 0 ? sessionSummary.keyTopics.join(', ') : 'N/A'}
              </div>
            </div>

            {sessionSummary.keyTopics.length > 0 && (
              <div>
                <div className="font-semibold mb-2">Topics Covered:</div>
                <div className="flex flex-wrap gap-1">
                  {sessionSummary.keyTopics.map((topic, index) => (
                    <Badge key={index} variant="outline">{topic}</Badge>
                  ))}
                </div>
              </div>
            )}

            {sessionSummary.recommendationsForNext.length > 0 && (
              <div>
                <div className="font-semibold mb-2">Recommendations:</div>
                <ul className="list-disc list-inside space-y-1">
                  {sessionSummary.recommendationsForNext.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={() => setSessionSummary(null)} className="w-full h-11 md:h-10">
              Start New Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Configuration Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-10 h-12 w-12 rounded-full shadow-lg">
            <Settings className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Study Session Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="studyDuration">Study (min)</Label>
                <Input
                  id="studyDuration"
                  type="number"
                  value={sessionSettings.duration}
                  onChange={(e) => handleConfigChange('duration', parseInt(e.target.value) || 25)}
                  className="[&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breakDuration">Break (min)</Label>
                <Input
                  id="breakDuration"
                  type="number"
                  value={sessionSettings.breakDuration}
                  onChange={(e) => handleConfigChange('breakDuration', parseInt(e.target.value) || 5)}
                  className="[&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
             <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="longBreakDuration">Long Break (min)</Label>
                <Input
                  id="longBreakDuration"
                  type="number"
                  value={sessionSettings.longBreakDuration}
                  onChange={(e) => handleConfigChange('longBreakDuration', parseInt(e.target.value) || 15)}
                  className="[&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="space-y-2">
                 <Label htmlFor="sessionsUntilLongBreak">Sessions/Long Break</Label>
                 <Input
                   id="sessionsUntilLongBreak"
                   type="number"
                   value={sessionSettings.sessionsUntilLongBreak}
                   onChange={(e) => handleConfigChange('sessionsUntilLongBreak', parseInt(e.target.value) || 4)}
                   className="[&::-webkit-inner-spin-button]:appearance-none"
                 />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="configSubject">Subject</Label>
              <Input
                id="configSubject"
                value={sessionSettings.subject}
                onChange={(e) => handleConfigChange('subject', e.target.value)}
                placeholder="e.g., Calculus"
              />
            </div>
            <div className="flex items-center justify-between space-y-0 pt-2">
              <Label htmlFor="configVoiceAnnouncements">Voice Announcements</Label>
              <Switch
                id="configVoiceAnnouncements"
                checked={sessionSettings.voiceAnnouncements}
                onCheckedChange={(checked) => handleConfigChange('voiceAnnouncements', checked)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={() => setSessionActive(false)}>Save & Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}