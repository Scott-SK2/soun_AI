import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Settings } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { VoiceSettingsDialog } from "@/components/voice/voice-settings-dialog";

interface VoiceAssistantProps {
  courseId?: string;
  courseName?: string;
}

export function VoiceAssistant({ courseId, courseName }: VoiceAssistantProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [shouldKeepListening, setShouldKeepListening] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'assistant';
    message: string;
    timestamp: Date;
    courseContext?: string;
  }>>([]);

  const recognitionRef = useRef<any>(null);
  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldKeepListeningRef = useRef<boolean>(false);
  const { toast } = useToast();
  const textToSpeechHook = useTextToSpeech();
  const { speak, cancel, speaking } = textToSpeechHook;

  // Update speaking state when TTS speaking state changes
  useEffect(() => {
    if (speaking !== undefined) {
      setIsSpeaking(speaking);
    }
  }, [speaking]);

  // Stop listening when assistant starts speaking to avoid audio loop
  useEffect(() => {
    if (isSpeaking && isListening) {
      // Assistant is speaking, stop listening immediately
      setShouldKeepListening(false);
      shouldKeepListeningRef.current = false;

      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
        autoStopTimeoutRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
      setIsListening(false);
    }
  }, [isSpeaking, isListening]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      if (recognitionRef.current) {
        recognitionRef.current.continuous = true; // Keep listening for 20 seconds
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const lastResult = event.results[event.results.length - 1];
          const transcript = lastResult[0].transcript;

          // Show interim results
          if (!lastResult.isFinal) {
            setTranscript(transcript);
            return;
          }

          // Process final result
          if (lastResult.isFinal) {
            setTranscript(transcript);
            processCommand(transcript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          // Ignore no-speech error
          if (event.error === 'no-speech') {
            return;
          }
          setIsListening(false);
          setShouldKeepListening(false);
          shouldKeepListeningRef.current = false;
        };

        recognitionRef.current.onend = () => {
          // Don't restart if assistant is speaking (avoid audio loop)
          if (speaking) {
            setIsListening(false);
            setShouldKeepListening(false);
            shouldKeepListeningRef.current = false;
            if (autoStopTimeoutRef.current) {
              clearTimeout(autoStopTimeoutRef.current);
              autoStopTimeoutRef.current = null;
            }
            return;
          }

          // Auto-restart if still within 20 second window
          if (shouldKeepListeningRef.current && autoStopTimeoutRef.current) {
            setTimeout(() => {
              try {
                // Double-check assistant is not speaking before restarting
                if (shouldKeepListeningRef.current && !speaking) {
                  recognitionRef.current.start();
                }
              } catch (error) {
                setIsListening(false);
                setShouldKeepListening(false);
                shouldKeepListeningRef.current = false;
                if (autoStopTimeoutRef.current) {
                  clearTimeout(autoStopTimeoutRef.current);
                  autoStopTimeoutRef.current = null;
                }
              }
            }, 200);
            return;
          }

          // Normal end
          setIsListening(false);
          setShouldKeepListening(false);
          shouldKeepListeningRef.current = false;
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }
      shouldKeepListeningRef.current = false;
    };
  }, []);

  // Process voice commands using AI only
  const processVoiceCommand = useMutation({
    mutationFn: async (command: string) => {
      const currentPath = window.location.pathname;
      const courseMatch = currentPath.match(/\/courses\/([^\/]+)/);
      const detectedCourseId = courseMatch ? courseMatch[1] : courseId;

      const payload = {
        command,
        courseId: detectedCourseId,
        sessionId,
        context: {
          path: currentPath,
          page: currentPath.split('/')[1] || 'dashboard',
          timestamp: new Date().toISOString()
        }
      };

      const response = await apiRequest("POST", "/api/voice/process", payload);
      return await response.json();
    },
    onSuccess: (data) => {
      setResponse(data.response);

      // Stop listening immediately when we get a response
      setShouldKeepListening(false);
      shouldKeepListeningRef.current = false;

      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
        autoStopTimeoutRef.current = null;
      }

      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
      setIsListening(false);

      setConversationHistory(prev => [
        ...prev.slice(-4),
        {
          type: 'user',
          message: transcript,
          timestamp: new Date()
        },
        {
          type: 'assistant',
          message: data.response,
          timestamp: new Date(),
          courseContext: data.courseContext
        }
      ]);

      // Speak the response using voice settings
      if (data.response) {
        speak(data.response);
      }
    },
    onError: (error) => {
      console.error("Voice processing error:", error);
      const errorMessage = "I'm unable to process your request right now. Please check your connection and try again.";
      setResponse(errorMessage);
      toast({
        title: "Voice Processing Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const processCommand = (command: string) => {
    if (command.trim()) {
      processVoiceCommand.mutate(command);
    }
  };

  const startListening = () => {
    // Don't start listening if assistant is speaking (avoid audio loop)
    if (isSpeaking) {
      toast({
        title: "Please Wait",
        description: "Let me finish speaking first!",
        variant: "default"
      });
      return;
    }

    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setShouldKeepListening(true);
      shouldKeepListeningRef.current = true;
      setTranscript("");

      // Start recognition
      recognitionRef.current.start();

      // Set 20 second timeout
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }
      autoStopTimeoutRef.current = setTimeout(() => {
        setShouldKeepListening(false);
        shouldKeepListeningRef.current = false;
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 20000);

      toast({
        title: "🎤 Listening...",
        description: "Ask me about your course materials!",
        duration: 3000
      });
    } else {
      toast({
        title: "Speech Recognition Unavailable",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    setShouldKeepListening(false);
    shouldKeepListeningRef.current = false;

    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const stopSpeaking = () => {
    cancel();
    setIsSpeaking(false);
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setResponse("");
    setTranscript("");
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            AI Study Assistant
            {courseName && (
              <span className="text-sm font-normal text-gray-600">
                ({courseName})
              </span>
            )}
          </div>
          <VoiceSettingsDialog />
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Conversation History */}
        <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-gray-50 rounded-lg">
          {conversationHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <MessageCircle className="h-6 w-6 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Ask me about your course materials!</p>
            </div>
          ) : (
            conversationHistory.map((entry, index) => (
              <div
                key={index}
                className={`text-sm p-2 rounded ${
                  entry.type === 'user' 
                    ? 'bg-blue-100 text-blue-800 ml-4' 
                    : 'bg-green-100 text-green-800 mr-4'
                }`}
              >
                <strong>{entry.type === 'user' ? 'You:' : 'AI:'}</strong> {entry.message}
                {entry.courseContext && (
                  <div className="text-xs mt-1 opacity-75">
                    📚 {entry.courseContext}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Current interaction */}
        {isListening && (
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-red-600 font-medium mb-1">🎙️ Listening...</div>
            {transcript && (
              <div className="text-sm text-gray-600">"{transcript}"</div>
            )}
          </div>
        )}

        {processVoiceCommand.isPending && (
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-blue-600 font-medium">🤔 Processing your question...</div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={processVoiceCommand.isPending}
            className={`flex-1 ${
              isListening
                ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                {processVoiceCommand.isPending ? 'Processing...' : 'Ask Question'}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={isSpeaking ? stopSpeaking : undefined}
            disabled={!isSpeaking}
          >
            {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={clearConversation}
            title="Clear conversation"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}