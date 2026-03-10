import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mic, MicOff, Play, Volume2, VolumeX, Send, Timer, Square, Trash2, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as tts from "@/lib/text-to-speech";
import { VoiceSettingsDialog } from "@/components/voice/voice-settings-dialog";
import { GlobalVoiceAssistant } from "@/components/voice/global-voice-assistant";
import { SoundPermissionDialog } from "@/components/voice/sound-permission-dialog";
import { StudySessionManager } from "@/components/study/study-session-manager";
import { MultiModalResponse } from "@/components/voice/multi-modal-response";
import { cn } from "@/lib/utils"; // Assuming cn utility is available for conditional styling
import VoiceFlashcards from "@/components/study/voice-flashcards";
import { PerformanceSettings } from "@/components/voice/performance-settings";
import { VoiceAnalyticsDashboard } from "@/components/voice/voice-analytics-dashboard";

interface VoiceCommand {
  id: number;
  userId: number;
  command: string;
  response: string;
  timestamp: string;
  category: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  visualAid?: { type: 'image' | 'diagram' | 'chart', data: string }; // Added for multi-modal
}

export default function VoicePage() {
  const [activeTab, setActiveTab] = useState("assistant");
  const [command, setCommand] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localIsListening, setLocalIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 1,
    pitch: 1,
    volume: 1
  });

  // Mobile optimization states
  const [isPushToTalkMode, setIsPushToTalkMode] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCommands, setPendingCommands] = useState<Array<{command: string, timestamp: Date}>>([]);
  const [pushToTalkActive, setPushToTalkActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Speech recognition
  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported
  } = useSpeechRecognition();

  // Text to speech
  const { speak, cancel, speaking } = useTextToSpeech();

  // Fetch voice command history
  const { data: voiceHistory = [], isLoading: historyLoading } = useQuery<VoiceCommand[]>({
    queryKey: ['/api/voice/history'],
    refetchOnWindowFocus: false
  });

  // Auto-detect course context from command (similar to global assistant)
  const detectCourseFromCommand = (command: string): string | null => {
    const lowerCommand = command.toLowerCase();

    const coursePatterns = [
      /(?:course|class|subject)\s+([a-zA-Z0-9\-_]+)/i,
      /([a-zA-Z0-9\-_]+)\s+(?:course|class)/i,
    ];

    for (const pattern of coursePatterns) {
      const match = command.match(pattern);
      if (match && match[1]) {
        const potential = match[1].trim();
        if (/\d/.test(potential) || potential.length <= 8) {
          return potential;
        }
      }
    }

    const subjectToCourseMap: Record<string, string> = {
      'entrepreneurship': '011274',
      'business': '011274',
      'technological entrepreneurship': '011274',
      'tech entrepreneurship': '011274',
    };

    for (const [subject, courseId] of Object.entries(subjectToCourseMap)) {
      if (lowerCommand.includes(subject)) {
        return courseId;
      }
    }

    return null;
  };

  // Process voice command mutation with context switching
  const processCommandMutation = useMutation({
    mutationFn: async (text: string) => {
      const currentPath = window.location.pathname;
      const pageBasedCourseId = currentPath.match(/\/courses\/([^\/]+)/)?.[1] || null;
      const commandDetectedCourseId = detectCourseFromCommand(text);
      const finalCourseId = commandDetectedCourseId || pageBasedCourseId;

      if (commandDetectedCourseId && commandDetectedCourseId !== pageBasedCourseId) {
        toast({
          title: "Context Switched",
          description: `Switched to ${commandDetectedCourseId} course context`,
        });
      }

      const response = await fetch("/api/voice/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: text,
          courseId: finalCourseId,
          contextSwitch: commandDetectedCourseId ? {
            detectedCourse: commandDetectedCourseId,
            switchedFrom: pageBasedCourseId,
            confidence: 0.8
          } : null,
          context: {
            path: currentPath,
            page: currentPath.split('/')[1] || 'voice',
            timestamp: new Date().toISOString(),
            autoDetectedCourse: !!commandDetectedCourseId
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        content: data.response || "I'm not sure how to respond to that.",
        timestamp: new Date(),
        visualAid: data.visualAid // Include visual aid if provided
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle navigation actions
      if (data.action === 'navigate' && data.data) {
        const { page, courseId } = data.data;

        // Speak the response first
        if (data.response) {
          speak(data.response);
        }

        // Navigate after a short delay
        setTimeout(() => {
          let navigationPath = '/';

          switch (page) {
            case 'dashboard':
              navigationPath = '/dashboard';
              break;
            case 'courses':
              navigationPath = courseId ? `/courses/${courseId}` : '/courses';
              break;
            case 'documents':
              navigationPath = '/documents';
              break;
            case 'voice':
              navigationPath = '/voice';
              break;
            case 'progress':
              navigationPath = '/progress';
              break;
            case 'planner':
              navigationPath = '/planner';
              break;
            case 'presentation':
              navigationPath = '/presentation';
              break;
            case 'settings':
              navigationPath = '/settings';
              break;
            default:
              navigationPath = '/dashboard';
          }

          window.location.href = navigationPath;
        }, 1500);
      } else {
        // Regular response, just speak it
        if (data.response) {
          speak(data.response);
        }
      }
    },
    onError: (error) => {
      console.error("Voice command error:", error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        content: "I'm having trouble processing that command. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  // Add a message to the chat
  const addMessage = (sender: 'user' | 'assistant', content: string, visualAid?: ChatMessage['visualAid']) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender,
      content,
      timestamp: new Date(),
      visualAid
    };

    setMessages(prev => [...prev, newMessage]);
  };

  // Process the voice command
  const processCommand = (text: string) => {
    if (!text.trim()) return;

    // Add user message to chat
    addMessage('user', text);

    if (isOfflineMode) {
      handleOfflineCommand(text);
    } else {
      // Process the command
      processCommandMutation.mutate(text);
    }

    // Reset the input
    setCommand("");
    resetTranscript();
  };

  // Handle microphone toggle
  const toggleListening = () => {
    if (!isOnline && !isOfflineMode) {
      toast({
        title: "Network Required",
        description: "Speech recognition requires an internet connection.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      stopListening();
      setLocalIsListening(false);
      if (transcript) {
        processCommand(transcript);
      }
    } else {
      if (!isSupported) {
        toast({
          title: "Speech Recognition Unavailable",
          description: "Your browser does not support speech recognition.",
          variant: "destructive",
        });
        return;
      }

      resetTranscript();
      startListening();
      setLocalIsListening(true);
    }
  };

  // Push-to-talk handlers
  const handlePushToTalkStart = () => {
    if (isPushToTalkMode && !isListening) {
      setPushToTalkActive(true);
      resetTranscript();
      startListening();
    }
  };

  const handlePushToTalkEnd = () => {
    if (isPushToTalkMode && isListening) {
      setPushToTalkActive(false);
      stopListening();
      if (transcript) {
        processCommand(transcript);
      }
    }
  };

  // Handle text-to-speech
  const handleSpeak = (text: string) => {
    setIsSpeaking(true);
    speak(text, {
      rate: voiceSettings.rate,
      pitch: voiceSettings.pitch,
      volume: voiceSettings.volume
    });
  };

  // Handle voice settings changes
  const handleVoiceChange = (voice: SpeechSynthesisVoice) => {
    // Voice is handled by the useTextToSpeech hook internally
    toast({
      title: "Voice Changed",
      description: `Voice set to ${voice.name}`,
    });
  };

  const handleRateChange = (rate: number) => {
    setVoiceSettings(prev => ({ ...prev, rate }));
  };

  const handlePitchChange = (pitch: number) => {
    setVoiceSettings(prev => ({ ...prev, pitch }));
  };

  const handleVolumeChange = (volume: number) => {
    setVoiceSettings(prev => ({ ...prev, volume }));
  };

  // Toggle text-to-speech
  const toggleSpeaking = () => {
    if (speaking) {
      cancel();
      setIsSpeaking(false);
    }
  };

  // Handle manual command submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processCommand(command);
  };

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update command state when transcript changes
  useEffect(() => {
    if (transcript) {
      setCommand(transcript);
    }
  }, [transcript]);

  // Update listening state based on the hook
  useEffect(() => {
    setLocalIsListening(isListening);
  }, [isListening]);

  // Update speaking state based on the hook
  useEffect(() => {
    setIsSpeaking(speaking);
  }, [speaking]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsOfflineMode(false);
      if (pendingCommands.length > 0) {
        toast({
          title: "Connection Restored",
          description: `Processing ${pendingCommands.length} pending commands...`,
        });
        processPendingCommands();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsOfflineMode(true);
      toast({
        title: "Offline Mode",
        description: "Voice commands will be queued for processing.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingCommands]);

  // Process pending commands when back online
  const processPendingCommands = async () => {
    const commands = [...pendingCommands];
    setPendingCommands([]);

    for (const command of commands) {
      try {
        processCommandMutation.mutate(command.command);
      } catch (error) {
        console.error('Failed to process pending command:', error);
      }
    }
  };

  // Handle offline commands
  const handleOfflineCommand = (text: string) => {
    setPendingCommands(prev => [...prev, { command: text, timestamp: new Date() }]);

    const offlineResponse = `I'll process "${text}" when we're back online. Command queued.`;
    const assistantMessage: ChatMessage = {
      id: `offline-${Date.now()}`,
      sender: 'assistant',
      content: offlineResponse,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
    speak(offlineResponse);
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Add a welcome message on component mount and debug voice configuration
  useEffect(() => {
    // Debug available voices to help diagnose any issues
    tts.debugVoices();

    const welcomeMessage = "Welcome! I'm Soun, your voice study assistant. How can I help you today?";
    setMessages([{
      id: "welcome",
      sender: "assistant",
      content: welcomeMessage,
      timestamp: new Date()
    }]);

    // Speak the welcome message
    handleSpeak(welcomeMessage);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container py-8">
      <div className="flex flex-col mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Soun</h1>
        <p className="text-muted-foreground mt-1">
          Interact with Soun using voice commands and natural conversation
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="assistant">Soun Chat</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="sessions">Study Sessions</TabsTrigger>
          <TabsTrigger value="practice">Practice Mode</TabsTrigger>
          <TabsTrigger value="history">Conversation History</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Mic className="h-4 w-4 md:h-5 md:w-5" />
                Voice Interaction
              </CardTitle>
              <CardDescription className="text-sm">
                Tap the microphone to start speaking or use voice commands
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mobile Optimization Status */}
              <div className="flex items-center gap-2 text-xs mb-2">
                <div className={cn("flex items-center gap-1", isOnline ? "text-green-600" : "text-red-600")}>
                  {isOnline ? "🟢" : "🔴"} {isOnline ? "Online" : "Offline"}
                </div>
                {isPushToTalkMode && (
                  <div className="text-blue-600">⚡ Push-to-Talk</div>
                )}
                {pendingCommands.length > 0 && (
                  <div className="text-orange-600">{pendingCommands.length} pending</div>
                )}
              </div>

              {/* Mobile-optimized Voice Controls */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-2 md:gap-3">
                  <Button
                    onClick={isPushToTalkMode ? undefined : startListening}
                    onMouseDown={isPushToTalkMode ? handlePushToTalkStart : undefined}
                    onMouseUp={isPushToTalkMode ? handlePushToTalkEnd : undefined}
                    onTouchStart={isPushToTalkMode ? handlePushToTalkStart : undefined}
                    onTouchEnd={isPushToTalkMode ? handlePushToTalkEnd : undefined}
                    disabled={(!isPushToTalkMode && (isListening || isSpeaking)) || (!isOnline && !isOfflineMode)}
                    className={cn(
                      "flex items-center gap-2 flex-1 md:flex-initial h-12 md:h-10 text-sm md:text-base",
                      (isListening || pushToTalkActive) && "bg-red-500 hover:bg-red-600",
                      isPushToTalkMode && "select-none"
                    )}
                  >
                    <Mic className={cn("h-4 w-4", (isListening || pushToTalkActive) && "animate-pulse")} />
                    {isPushToTalkMode
                      ? (pushToTalkActive ? "Release to Send" : "Hold to Speak")
                      : (isListening ? "Listening..." : "Start Listening")
                    }
                  </Button>

                  {!isPushToTalkMode && (
                    <Button
                      onClick={stopListening}
                      disabled={!isListening}
                      variant="outline"
                      className="h-12 md:h-10 px-3 md:px-4"
                    >
                      <Square className="h-4 w-4" />
                      <span className="hidden md:inline ml-2">Stop</span>
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsPushToTalkMode(!isPushToTalkMode)}
                    variant={isPushToTalkMode ? "default" : "outline"}
                    size="sm"
                    className="h-10 md:h-9"
                  >
                    ⚡ {isPushToTalkMode ? "Tap Mode" : "Push Mode"}
                  </Button>

                  <Button
                    onClick={() => setMessages([])}
                    variant="outline"
                    size="sm"
                    className="h-10 md:h-9"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden md:inline ml-2">Clear</span>
                  </Button>
                </div>
              </div>
              {/* Mobile-optimized Chat Interface */}
              <div className="border rounded-lg h-64 md:h-96 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <Mic className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm md:text-base">Start a conversation by tapping the microphone</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg max-w-[85%] md:max-w-[80%]",
                        message.sender === "user"
                          ? "ml-auto bg-blue-600 text-white"
                          : "bg-white border"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm break-words">{message.content}</p>
                        {message.visualAid && (
                          <div className="mt-2">
                            <MultiModalResponse 
                              content={message.content}
                              visualAids={message.visualAid ? [message.visualAid] : undefined}
                            />
                          </div>
                        )}
                        <p className={cn(
                          "text-xs mt-1",
                          message.sender === "user" ? "text-blue-100" : "text-gray-500"
                        )}>
                          {formatTime(message.timestamp.toISOString())}
                        </p>
                      </div>
                      {message.sender === "assistant" && (
                        <Button
                          onClick={() => handleSpeak(message.content)}
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-6 w-6 md:h-8 md:w-8 shrink-0",
                            message.sender === "user" ? "text-blue-100 hover:text-white hover:bg-blue-700" : ""
                          )}
                        >
                          <Volume2 className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flashcards" className="space-y-4">
          <VoiceFlashcards onSessionEnd={() => {
            toast({
              title: "Session Complete",
              description: "Great work! You can start a new session anytime.",
            });
          }} />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <div className="flex items-center space-x-2 mb-6">
            <Timer className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold">Study Session Manager</h2>
              <p className="text-muted-foreground">
                Focused study sessions with voice guidance, automatic breaks, and progress tracking
              </p>
            </div>
          </div>
          <StudySessionManager />
        </TabsContent>

        <TabsContent value="practice" className="space-y-6">
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Practice Mode</CardTitle>
                <CardDescription>
                  Practice your knowledge with interactive quizzes and flashcards
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {/* Placeholder for Practice Mode content */}
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                Practice Mode is under development.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Voice Command History</CardTitle>
              <CardDescription>
                Your previous interactions with Soun
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : voiceHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No voice commands found</p>
                  <p className="text-sm">Try speaking to the assistant to see your history here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {voiceHistory.map((command) => (
                    <div key={command.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{command.category}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(command.timestamp)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSpeak(command.response)}
                          className="h-6 w-6 p-0"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">You said:</p>
                          <p className="font-medium">{command.command}</p>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-sm text-muted-foreground">Assistant responded:</p>
                          <p>{command.response}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <VoiceAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}