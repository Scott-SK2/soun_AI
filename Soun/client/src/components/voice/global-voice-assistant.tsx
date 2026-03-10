import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Volume2, VolumeX, X, Square, MessageSquare, Zap, Wifi, WifiOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/auth-context";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PostExplanationQuiz } from "@/components/quiz/post-explanation-quiz";
import { MultiModalResponse } from "@/components/voice/multi-modal-response";
import { AnimatePresence, motion } from "framer-motion";
import { useSpeechRecognitionCoordinator } from "@/context/speech-recognition-context";

// Define a simple ErrorBoundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-100 text-red-700 rounded-lg border border-red-300">
          <h2 className="text-xl font-semibold mb-2">Something went wrong!</h2>
          <p className="text-sm">We're sorry, an unexpected error occurred. Please try again or reload the page.</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Define VoiceMessage type
interface VoiceMessage {
  id: number;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  courseContext?: string | null;
}

// Speech Recognition types
interface ISpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
    length: number;
  };
}

// Audio analysis for emotion detection
interface AudioFeatures {
  pitch: number;
  speed: number;
  volume: number;
  pauses: number;
}

// Mocking performance service imports (replace with actual imports)
const webRTCAudioService = {
  initialize: async () => console.log('WebRTC initialized'),
  destroy: () => console.log('WebRTC destroyed'),
  startProcessing: () => console.log('WebRTC started'),
  stopProcessing: () => console.log('WebRTC stopped'),
  adjustForEnvironment: async () => console.log('WebRTC adjusted')
};

const backgroundProcessor = {
  initialize: async () => console.log('Background processor initialized'),
  destroy: () => console.log('Background processor destroyed'),
  processText: async (text: string) => ({ keywords: text.split(' ') }),
};

const responseCache = {
  preloadCommonResponses: async () => console.log('Preloading common responses'),
  getCachedVoiceResponse: (query: string, context?: string) => null,
  findSemanticMatch: (keywords: string[], context?: string) => null,
  cacheVoiceResponse: (query: string, response: string, context?: string) => console.log('Voice response cached'),
  cacheSemanticResponse: (keywords: string[], response: string, context?: string) => console.log('Semantic response cached'),
  getStats: () => ({ hits: 0, misses: 0, hitRate: 0 }),
  destroy: () => console.log('Response cache destroyed')
};


export function GlobalVoiceAssistant() {
  const { user } = useAuth();
  const { requestMicrophone, releaseMicrophone } = useSpeechRecognitionCoordinator();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [shouldKeepListening, setShouldKeepListening] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'assistant';
    message: string;
    timestamp: Date;
    courseContext?: string;
    contextSwitch?: any;
    semanticContext?: {
      strugglingTopics?: string[];
      recommendations?: string[];
    };
    emotionDetected?: any;
    adaptiveResponse?: {
      originalResponse: string;
      adaptedResponse: string;
      adaptationReason: string;
      emotionalSupport: string[];
    };
  }>>([]);

  // Quiz related states
  const [showQuiz, setShowQuiz] = useState(false);
  const [lastExplanation, setLastExplanation] = useState<{topic: string, explanation: string} | null>(null);

  // Multi-modal response states
  const [lastMultiModalResponse, setLastMultiModalResponse] = useState<any>(null);

  // Mobile optimization states
  const [isPushToTalkMode, setIsPushToTalkMode] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCommands, setPendingCommands] = useState<Array<{command: string, timestamp: Date}>>([]);
  const [pushToTalkActive, setPushToTalkActive] = useState(false);

  // Performance optimization states
  const [isWebRTCEnabled, setIsWebRTCEnabled] = useState(false);
  const [audioQuality, setAudioQuality] = useState<'standard' | 'high' | 'ultra'>('high');
  const [processingLatency, setProcessingLatency] = useState<number>(0);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0, hitRate: 0 });

  // Audio analysis for emotion detection
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);

  // Background processing state
  const [backgroundProcessingEnabled, setBackgroundProcessingEnabled] = useState(true);

  // State for service initialization and loading
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);


  const recognitionRef = useRef<any>(null);
  const backgroundWorkerRef = useRef<Worker | null>(null);
  const offlineTranscriptRef = useRef<string>("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldKeepListeningRef = useRef<boolean>(false);
  const audioAnalysisRef = useRef<{
    startTime: number;
    pitchSamples: number[];
    volumeSamples: number[];
    speechStartTime: number | null;
    silenceThreshold: number;
    pauseCount: number;
  }>({
    startTime: 0,
    pitchSamples: [],
    volumeSamples: [],
    speechStartTime: null,
    silenceThreshold: 0.01,
    pauseCount: 0
  });
  const { speak, cancel, speaking } = useTextToSpeech();
  const { toast } = useToast(); // Hook for toast notifications

  const updateCacheStats = () => {
    const stats = responseCache.getStats();
    setCacheStats(stats);
  };

  // Update speaking state when TTS speaking state changes
  useEffect(() => {
    setIsSpeaking(speaking);
  }, [speaking]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsOfflineMode(false);
      // Process pending commands when back online
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
        description: "Voice commands will be queued for processing when connection is restored.",
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

  // Initialize speech recognition and performance services
  useEffect(() => {
    // Speech recognition initialization handled by individual components

    // Component initialized

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }
      shouldKeepListeningRef.current = false;
      cleanupPerformanceServices();
    };
  }, [user]);

  // Lazy initialize voice services with staggered loading
  useEffect(() => {
    const initializeServices = async () => {
      // Only initialize when voice assistant is actually opened
      if (!isOpen || isInitialized) return;

      setIsLoading(true);
      try {
        // Initialize services one by one to avoid blocking
        setTimeout(async () => {
          try {
            await webRTCAudioService.initialize();
            setIsWebRTCEnabled(true);
          } catch (error) {
            console.warn('WebRTC initialization failed:', error);
          }
        }, 100);

        setTimeout(async () => {
          try {
            await backgroundProcessor.initialize();
            setBackgroundProcessingEnabled(true);
          } catch (error) {
            console.warn('Background processor initialization failed:', error);
          }
        }, 200);

        // Basic initialization complete
        setIsInitialized(true);
        console.log('Core voice services initialized');
      } catch (error) {
        console.error('Failed to initialize core services:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeServices();
  }, [isOpen, isInitialized]);


  const initializePerformanceServices = async () => {
    try {
      // Initialize WebRTC audio service
      await webRTCAudioService.initialize();
      setIsWebRTCEnabled(true);

      // Initialize background processor
      await backgroundProcessor.initialize();

      // Preload common responses
      await responseCache.preloadCommonResponses();

      console.log('Performance services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize performance services:', error);
    }
  };

  const cleanupPerformanceServices = () => {
    webRTCAudioService.destroy();
    backgroundProcessor.destroy();
    responseCache.destroy();
  };

  // Initialize background worker for continued learning
  useEffect(() => {
    if (backgroundProcessingEnabled && 'Worker' in window) {
      const workerCode = `
        let learningData = [];
        let processingInterval;

        self.onmessage = function(e) {
          const { type, data } = e.data;

          switch(type) {
            case 'addInteraction':
              learningData.push({
                ...data,
                timestamp: Date.now()
              });
              break;

            case 'startProcessing':
              if (processingInterval) clearInterval(processingInterval);
              processingInterval = setInterval(() => {
                if (learningData.length > 0) {
                  // Analyze patterns and send insights
                  const insights = analyzeLearningPatterns(learningData);
                  self.postMessage({
                    type: 'learningInsights',
                    data: insights
                  });
                }
              }, 30000); // Process every 30 seconds
              break;

            case 'stopProcessing':
              if (processingInterval) {
                clearInterval(processingInterval);
                processingInterval = null;
              }
              break;
          }
        };

        function analyzeLearningPatterns(data) {
          const recentInteractions = data.filter(d => 
            Date.now() - d.timestamp < 300000 // Last 5 minutes
          );

          const topics = recentInteractions.map(d => d.topic).filter(Boolean);
          const difficulties = recentInteractions.map(d => d.difficulty).filter(Boolean);

          return {
            activeTopics: [...new Set(topics)],
            averageDifficulty: difficulties.length > 0 ? 
              difficulties.reduce((a, b) => a + b, 0) / difficulties.length : 0,
            interactionFrequency: recentInteractions.length,
            suggestions: generateSuggestions(recentInteractions)
          };
        }

        function generateSuggestions(interactions) {
          const suggestions = [];

          if (interactions.length > 5) {
            suggestions.push("You're actively learning! Consider taking a short break.");
          }

          const topics = interactions.map(i => i.topic).filter(Boolean);
          const uniqueTopics = [...new Set(topics)];

          if (uniqueTopics.length > 3) {
            suggestions.push("You're covering multiple topics. Consider focusing on one at a time.");
          }

          return suggestions;
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      backgroundWorkerRef.current = new Worker(URL.createObjectURL(blob));

      backgroundWorkerRef.current.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === 'learningInsights') {
          // Show learning insights as notifications
          if (data.suggestions && data.suggestions.length > 0) {
            toast({
              title: "Learning Insight",
              description: data.suggestions[0],
            });
          }
        }
      };

      backgroundWorkerRef.current.postMessage({ type: 'startProcessing' });
    }

    return () => {
      if (backgroundWorkerRef.current) {
        backgroundWorkerRef.current.postMessage({ type: 'stopProcessing' });
        backgroundWorkerRef.current.terminate();
      }
    };
  }, [backgroundProcessingEnabled]);

  // Process pending commands when back online
  const processPendingCommands = async () => {
    const commands = [...pendingCommands];
    setPendingCommands([]);

    for (const command of commands) {
      try {
        await processVoiceCommand.mutateAsync(command.command);
      } catch (error) {
        console.error('Failed to process pending command:', error);
      }
    }
  };

  // Keyboard shortcuts and push-to-talk
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + V to toggle voice assistant
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        setIsOpen(prev => !prev);
      }

      // Escape to close
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }

      // Push-to-talk functionality
      if (isPushToTalkMode && isOpen && !(event.target as HTMLElement)?.matches?.('input, textarea')) {
        // Hold space for push-to-talk
        if (event.code === 'Space' && !pushToTalkActive) {
          event.preventDefault();
          setPushToTalkActive(true);
          startListening();
        }
      } else {
        // Space to start/stop listening when assistant is open (normal mode)
        if (event.code === 'Space' && isOpen && !(event.target as HTMLElement)?.matches?.('input, textarea')) {
          event.preventDefault();
          if (isListening) {
            stopListening();
          } else {
            startListening();
          }
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Release space for push-to-talk
      if (isPushToTalkMode && event.code === 'Space' && pushToTalkActive) {
        event.preventDefault();
        setPushToTalkActive(false);
        stopListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, isListening, isPushToTalkMode, pushToTalkActive]);

  // Initialize audio context for emotion analysis
  useEffect(() => {
    const initializeAudioContext = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.8;
      } catch (error) {
        console.warn('Audio context initialization failed:', error);
      }
    };

    initializeAudioContext();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Initialize speech recognition with offline fallback
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      if (recognitionRef.current) {
        recognitionRef.current.continuous = true; // Keep listening for longer input
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onresult = (event: any) => {
          const lastResult = event.results[event.results.length - 1];
          const transcript = lastResult[0].transcript;

          // Show interim results to user
          if (!lastResult.isFinal) {
            setTranscript(transcript);
            // Don't set timeout on interim results - keep listening
            return;
          }

          // Only process final results
          if (lastResult.isFinal) {
            setTranscript(transcript);

            if (isOfflineMode) {
              // Store for offline processing
              offlineTranscriptRef.current = transcript;
              handleOfflineCommand(transcript);
            } else {
              processCommand(transcript);
            }
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          // Don't stop on "no-speech" error - this is normal when user is silent
          if (event.error === 'no-speech') {
            return; // Don't stop, let onend handle it
          }

          setIsListening(false);
          setShouldKeepListening(false);
          shouldKeepListeningRef.current = false;

          // Fallback to offline mode on network errors
          if (event.error === 'network' || event.error === 'service-not-allowed') {
            setIsOfflineMode(true);
            toast({
              title: "Network Error",
              description: "Switching to offline voice recognition.",
              variant: "destructive",
            });
          }
        };

        recognitionRef.current.onend = () => {
          console.log('🔚 Recognition ended. shouldKeepListening:', shouldKeepListeningRef.current, 'hasTimeout:', !!autoStopTimeoutRef.current);

          // Check if we should keep listening (timeout not reached yet)
          if (shouldKeepListeningRef.current && autoStopTimeoutRef.current) {
            // Browser stopped recognition automatically, but we still have time left
            // Restart it after a short delay
            console.log('🔄 Auto-restarting recognition...');
            setTimeout(() => {
              try {
                if (shouldKeepListeningRef.current) {
                  recognitionRef.current.start();
                  console.log('✅ Recognition restarted successfully');
                }
              } catch (error) {
                console.error('❌ Error restarting recognition:', error);
                setIsListening(false);
                setShouldKeepListening(false);
                shouldKeepListeningRef.current = false;
                if (autoStopTimeoutRef.current) {
                  clearTimeout(autoStopTimeoutRef.current);
                  autoStopTimeoutRef.current = null;
                }
                releaseMicrophone('voice-assistant');
              }
            }, 200);
            return;
          }

          // Normal end - user stopped manually or timeout reached
          console.log('🛑 Final stop - cleaning up');
          setIsListening(false);
          setShouldKeepListening(false);
          shouldKeepListeningRef.current = false;

          // Clear auto-stop timeout
          if (autoStopTimeoutRef.current) {
            clearTimeout(autoStopTimeoutRef.current);
            autoStopTimeoutRef.current = null;
          }

          // Release microphone when done
          releaseMicrophone('voice-assistant');

          // Auto-restart for push-to-talk mode only
          if (isPushToTalkMode && pushToTalkActive) {
            setTimeout(() => {
              if (pushToTalkActive) {
                startListening();
              }
            }, 100);
          }
        };
      }
    }
  }, [isOfflineMode, isPushToTalkMode, pushToTalkActive]);

  // Handle offline voice commands
  const handleOfflineCommand = (command: string) => {
    // Add to pending commands
    setPendingCommands(prev => [...prev, { command, timestamp: new Date() }]);

    // Provide immediate offline response
    const offlineResponse = generateOfflineResponse(command);
    setResponse(offlineResponse);

    // Add to conversation history
    setConversationHistory(prev => [
      ...prev,
      {
        type: 'user',
        message: command,
        timestamp: new Date()
      },
      {
        type: 'assistant',
        message: offlineResponse,
        timestamp: new Date(),
        courseContext: "(Offline Mode)"
      }
    ]);

    speak(offlineResponse);
  };

  // Generate offline responses
  const generateOfflineResponse = (command: string): string => {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('navigate') || lowerCommand.includes('go to')) {
      return "I'll queue that navigation request for when we're back online.";
    }

    if (lowerCommand.includes('study') || lowerCommand.includes('learn')) {
      return "I can help you with offline study sessions. Try 'start study timer' or 'review my notes'.";
    }

    if (lowerCommand.includes('timer') || lowerCommand.includes('pomodoro')) {
      return "Starting an offline study timer. I'll track your progress locally.";
    }

    if (lowerCommand.includes('notes') || lowerCommand.includes('review')) {
      return "I can help you review your locally stored notes and documents.";
    }

    if (lowerCommand.includes('progress') || lowerCommand.includes('stats')) {
      return "Showing your locally cached progress data. Full sync will happen when online.";
    }

    if (lowerCommand.includes('flashcard') || lowerCommand.includes('quiz')) {
      return "I can run offline flashcards using your previously loaded content.";
    }

    if (lowerCommand.includes('explain') || lowerCommand.includes('what is')) {
      return "I'll prepare a detailed explanation for you once we reconnect. In the meantime, try reviewing your saved notes.";
    }

    if (lowerCommand.includes('quiz') || lowerCommand.includes('test')) {
      return "I'll set up a quiz for you when we're back online. Consider reviewing your course materials now.";
    }

    return `I've recorded your request: "${command}". I'll process it fully when we're back online.`;
  };

  // Auto-detect course context from command
  const detectCourseFromCommand = (command: string): string | null => {
    const lowerCommand = command.toLowerCase();

    // Common course patterns
    const coursePatterns = [
      // Direct course mentions
      /(?:course|class|subject)\s+([a-zA-Z0-9\-_]+)/i,
      /([a-zA-Z0-9\-_]+)\s+(?:course|class)/i,

      // Subject keywords that might map to courses
      /(?:about|in|for|regarding)\s+([a-zA-Z\s]+?)(?:\s|$|\.|\?|!)/i,

      // Academic subjects
      /(?:mathematics?|math|calculus|algebra|geometry)/i,
      /(?:physics|chemistry|biology|science)/i,
      /(?:history|geography|literature|english)/i,
      /(?:computer science|programming|coding|software)/i,
      /(?:business|economics|finance|accounting)/i,
      /(?:entrepreneurship|management|marketing)/i,
      /(?:psychology|sociology|philosophy)/i,
    ];

    // Check for direct course ID patterns first
    for (const pattern of coursePatterns.slice(0, 2)) {
      const match = command.match(pattern);
      if (match && match[1]) {
        // Check if it looks like a course ID (contains numbers or is short)
        const potential = match[1].trim();
        if (/\d/.test(potential) || potential.length <= 8) {
          return potential;
        }
      }
    }

    // Map common subject names to potential course IDs (this could be enhanced with user's actual courses)
    const subjectToCourseMap: Record<string, string> = {
      'entrepreneurship': '011274',
      'business': '011274',
      'technological entrepreneurship': '011274',
      'tech entrepreneurship': '011274',
      // Add more mappings as needed based on user's courses
    };

    for (const [subject, courseId] of Object.entries(subjectToCourseMap)) {
      if (lowerCommand.includes(subject)) {
        return courseId;
      }
    }

    return null;
  };

  // Process voice commands with automatic context switching
  const processVoiceCommand = useMutation({
    mutationFn: async (transcript: string) => {
      const startTime = Date.now();
      const currentPath = window.location.pathname;
      const currentUrl = window.location.href;

      // Check cache first for faster responses
      const courseContext = currentPath.includes('/courses/') ?
        currentPath.split('/courses/')[1]?.split('/')[0] : undefined;

      const cachedResponse = responseCache.getCachedVoiceResponse(transcript, courseContext);
      if (cachedResponse) {
        const latency = Date.now() - startTime;
        setProcessingLatency(latency);
        updateCacheStats();
        return { response: cachedResponse, cached: true };
      }

      // Process text in background for optimization
      const processedText = await backgroundProcessor.processText(transcript);

      // Check semantic cache for similar questions
      const semanticMatch = responseCache.findSemanticMatch(processedText.keywords, courseContext);
      if (semanticMatch) {
        const latency = Date.now() - startTime;
        setProcessingLatency(latency);
        updateCacheStats();
        return { response: semanticMatch, cached: true, semantic: true };
      }

      // Simplified context tracking
      const semanticContext = null;

      const sessionId = Date.now().toString(); // Generate simple session ID

      const response = await apiRequest('POST', '/api/voice/process', {
        command: transcript,
        courseId: courseContext, // Send courseId to backend
        sessionId,
        currentPath,
        currentUrl,
        userId: user?.id,
        semanticContext: semanticContext || {},
        processedText: processedText
      });

      const result = await response.json();

      // Cache the response for future use
      if (result.response) {
        responseCache.cacheVoiceResponse(transcript, result.response, courseContext);
        responseCache.cacheSemanticResponse(processedText.keywords, result.response, courseContext);
      }

      const latency = Date.now() - startTime;
      setProcessingLatency(latency);
      updateCacheStats();

      return result;
    },
    onSuccess: async (data, transcript) => {
      if (data.response) {
        setResponse(data.response);
      }

      // Add to conversation history with context information
      const userMessage = {
        type: 'user' as const,
        message: transcript,
        timestamp: new Date(),
        courseContext: data.courseContext,
        contextSwitch: data.contextSwitch,
        semanticContext: data.semanticContext
      };

      const assistantMessage = {
        type: 'assistant' as const,
        message: data.response || 'No response received',
        timestamp: new Date(),
        courseContext: data.courseContext,
        contextSwitch: data.contextSwitch,
        semanticContext: data.semanticContext
      };

      // Store multi-modal response for display (if it exists)
      if (data.multiModal) {
        setLastMultiModalResponse(data.multiModal);
      }

      setConversationHistory(prev => [
        ...prev,
        userMessage,
        assistantMessage
      ]);

      // Send interaction data to background worker for learning analysis
      if (backgroundWorkerRef.current && backgroundProcessingEnabled) {
        backgroundWorkerRef.current.postMessage({
          type: 'addInteraction',
          data: {
            userCommand: transcript,
            assistantResponse: data.response,
            courseContext: data.courseContext,
            topic: extractTopicFromCommand(transcript),
            difficulty: estimateDifficulty(transcript)
          }
        });
      }

      // Check for navigation commands first
      const navigationCommands = {
        'dashboard': /(?:go to|open|show|navigate to)?\s*(?:dashboard|home)/i,
        'courses': /(?:go to|open|show|navigate to)?\s*(?:courses?|my courses?)/i,
        'documents': /(?:go to|open|show|navigate to)?\s*(?:documents?|my documents?|files?)/i,
        'voice': /(?:go to|open|show|navigate to)?\s*(?:voice|voice assistant|voice page)/i,
        'progress': /(?:go to|open|show|navigate to)?\s*(?:progress|my progress|analytics)/i,
        'planner': /(?:go to|open|show|navigate to)?\s*(?:planner|study planner|schedule)/i,
        'presentation': /(?:go to|open|show|navigate to)?\s*(?:presentation|presentations?)/i,
        'settings': /(?:go to|open|show|navigate to)?\s*(?:settings?|preferences?)/i,
        'study-sessions': /(?:go to|open|show|navigate to)?\s*(?:study sessions?|sessions?|study timer|pomodoro)/i
      };

      let navigated = false;
      for (const [page, regex] of Object.entries(navigationCommands)) {
        if (regex.test(transcript)) {
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
                navigationPath = `/courses${data.courseContext ? `/${data.courseContext}` : ''}`;
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
              case 'study-sessions':
                navigationPath = '/voice?tab=sessions';
                break;
              default:
                console.warn('Unknown navigation target:', page);
            }
            window.location.href = navigationPath;
          }, 1000);
          navigated = true;
          break; // Exit loop once a match is found
        }
      }

      if (navigated) return; // Don't process other actions if navigation occurred

      // Handle flashcard commands - simplified without complex session management
      if (transcript.toLowerCase().includes('flashcard') ||
          transcript.toLowerCase().includes('flash card') ||
          transcript.toLowerCase().includes('quiz me') ||
          transcript.toLowerCase().includes('practice cards')) {

        const responseText = "I can help you with flashcards! Try asking me to explain a topic, and I'll offer a quiz afterward to test your understanding.";
        setConversationHistory(prev => [
          ...prev,
          {
            type: 'assistant',
            message: responseText,
            timestamp: new Date(),
            courseContext: data.courseContext
          }
        ]);
        speak(responseText);
        return;
      }

      // Handle learning recommendation commands - simplified
      if (transcript.toLowerCase().includes('next step') ||
          transcript.toLowerCase().includes('what should i study') ||
          transcript.toLowerCase().includes('learning path') ||
          transcript.toLowerCase().includes('study recommendation')) {

        const responseText = "Based on your recent activity, I recommend continuing with your current course materials. Try asking me to explain specific topics you're struggling with!";
        setConversationHistory(prev => [
          ...prev,
          {
            type: 'assistant',
            message: responseText,
            timestamp: new Date()
          }
        ]);
        speak(responseText);
        return;
      }

      // Handle context switching and course-specific queries
      if (transcript.toLowerCase().includes('switch to') || transcript.toLowerCase().includes('go to')) {
        const courseMatch = transcript.match(/(?:switch to|go to)\s+(.+?)(?:\s+course)?$/i);
        if (courseMatch) {
          const courseName = courseMatch[1].toLowerCase();
          // This would typically involve fetching available courses or using a known list.
          // For this example, we'll use a mock list.
          const availableCourses = [
            { id: "CS101", name: "Introduction to Computer Science" },
            { id: "MATH203", name: "Calculus III" },
            { id: "PHYS101", name: "General Physics I" },
          ];
          const course = availableCourses.find(c =>
            c.name.toLowerCase().includes(courseName) ||
            c.id.toLowerCase().includes(courseName)
          );

          if (course) {
            // In a real app, you would likely have a state for currentCourseContext
            // For this example, we'll just add it to the conversation history.
            const responseText = `Switched to ${course.name} context. I can now help you with course-specific questions using your uploaded materials.`;
            setConversationHistory(prev => [
              ...prev,
              {
                type: 'assistant',
                message: responseText,
                timestamp: new Date(),
                courseContext: course.name
              }
            ]);
            speak(responseText);
            return;
          }
        }
      }


      // Check if this was an explanation and offer quiz
      const commandLower = transcript.toLowerCase();
      const isExplanationRequest = commandLower.includes('explain') ||
                                 commandLower.includes('what is') ||
                                 commandLower.includes('how does') ||
                                 commandLower.includes('tell me about');

      if (isExplanationRequest && data.response && data.response.length > 100) {
        // Extract topic from command for quiz
        const topic = transcript.replace(/^(explain|what is|how does|tell me about)\s*/i, '').trim();
        setLastExplanation({
          topic: topic || 'the explained concept',
          explanation: data.response
        });

        // Show quiz offer after a short delay
        setTimeout(() => {
          toast({
            title: "Test Your Understanding",
            description: "Would you like to take a quick quiz to verify you understood the explanation?",
            action: (
              <Button size="sm" onClick={() => setShowQuiz(true)}>
                Take Quiz
              </Button>
            ),
          });
        }, 2000);
      }

      // Speak the response using voice settings
      if (data.response) {
        speak(data.response);
      }
    },
    onError: (error) => {
      console.error("Voice processing error:", error);
      const errorMessage = "Sorry, I couldn't process your request right now. Please try again.";
      setResponse(errorMessage);
      speak(errorMessage);
    }
  });

  // Calculate confidence for context switching
  const calculateContextSwitchConfidence = (command: string, detectedCourse: string): number => {
    const lowerCommand = command.toLowerCase();
    let confidence = 0.5; // Base confidence

    // Higher confidence for explicit course mentions
    if (lowerCommand.includes('course') || lowerCommand.includes('class')) {
      confidence += 0.3;
    }

    // Higher confidence for specific course ID patterns
    if (/\d/.test(detectedCourse)) {
      confidence += 0.2;
    }

    // Higher confidence for subject-specific terms
    const subjectTerms = ['explain', 'about', 'homework', 'assignment', 'exam', 'test', 'quiz'];
    const foundTerms = subjectTerms.filter(term => lowerCommand.includes(term));
    confidence += foundTerms.length * 0.1;

    return Math.min(confidence, 0.95); // Cap at 95%
  };

  // Helper functions for background learning analysis
  const extractTopicFromCommand = (command: string): string => {
    const lowerCommand = command.toLowerCase();

    // Extract common academic topics
    const topicKeywords = ['math', 'science', 'history', 'english', 'physics', 'chemistry', 'biology', 'literature', 'calculus', 'algebra'];
    const foundTopic = topicKeywords.find(topic => lowerCommand.includes(topic));

    if (foundTopic) return foundTopic;

    // Try to extract noun phrases (simplified)
    const words = command.split(' ');
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].toLowerCase() === 'about' || words[i].toLowerCase() === 'explain') {
        return words.slice(i + 1).join(' ');
      }
    }

    return '';
  };

  const estimateDifficulty = (command: string): number => {
    const lowerCommand = command.toLowerCase();

    // Simple difficulty estimation based on keywords
    if (lowerCommand.includes('basic') || lowerCommand.includes('simple') || lowerCommand.includes('beginner')) {
      return 1;
    }

    if (lowerCommand.includes('advanced') || lowerCommand.includes('complex') || lowerCommand.includes('difficult')) {
      return 5;
    }

    if (lowerCommand.includes('explain') || lowerCommand.includes('how') || lowerCommand.includes('why')) {
      return 3;
    }

    return 2; // Default moderate difficulty
  };

  const processCommand = (command: string) => {
    if (command.trim()) {
      if (isOfflineMode) {
        handleOfflineCommand(command);
      } else {
        processVoiceCommand.mutate(command);
      }
    }
  };

  // Audio analysis functions
  const startAudioAnalysis = async () => {
    if (!audioContextRef.current || !analyserRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      setIsAnalyzingAudio(true);

      // Reset analysis data
      audioAnalysisRef.current = {
        startTime: Date.now(),
        pitchSamples: [],
        volumeSamples: [],
        speechStartTime: null,
        silenceThreshold: 0.01,
        pauseCount: 0
      };

      // Start continuous audio analysis
      analyzeAudioContinuously();
    } catch (error) {
      console.error('Failed to start audio analysis:', error);
    }
  };

  const analyzeAudioContinuously = () => {
    if (!isAnalyzingAudio || !analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyArray = new Uint8Array(bufferLength);

    const analyze = () => {
      if (!isAnalyzingAudio) return;

      analyserRef.current!.getByteTimeDomainData(dataArray);
      analyserRef.current!.getByteFrequencyData(frequencyArray);

      // Calculate volume (RMS)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const amplitude = (dataArray[i] - 128) / 128;
        sum += amplitude * amplitude;
      }
      const volume = Math.sqrt(sum / bufferLength);
      audioAnalysisRef.current.volumeSamples.push(volume);

      // Estimate pitch using frequency analysis
      let maxAmp = 0;
      let maxIndex = 0;
      for (let i = 0; i < bufferLength; i++) {
        if (frequencyArray[i] > maxAmp) {
          maxAmp = frequencyArray[i];
          maxIndex = i;
        }
      }
      const pitch = (maxIndex * audioContextRef.current!.sampleRate) / (2 * bufferLength);
      audioAnalysisRef.current.pitchSamples.push(pitch);

      // Detect speech/silence for pause counting
      const currentTime = Date.now();
      if (volume > audioAnalysisRef.current.silenceThreshold) {
        if (!audioAnalysisRef.current.speechStartTime) {
          audioAnalysisRef.current.speechStartTime = currentTime;
        }
      } else {
        if (audioAnalysisRef.current.speechStartTime &&
            currentTime - audioAnalysisRef.current.speechStartTime > 500) { // 500ms pause
          audioAnalysisRef.current.pauseCount++;
          audioAnalysisRef.current.speechStartTime = null;
        }
      }

      requestAnimationFrame(analyze);
    };

    analyze();
  };

  const stopAudioAnalysis = (): AudioFeatures => {
    setIsAnalyzingAudio(false);

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    const analysis = audioAnalysisRef.current;
    const duration = (Date.now() - analysis.startTime) / 1000; // seconds

    // Calculate normalized features (0-1 scale)
    const avgPitch = analysis.pitchSamples.length > 0
      ? analysis.pitchSamples.reduce((a, b) => a + b, 0) / analysis.pitchSamples.length
      : 0;
    const avgVolume = analysis.volumeSamples.length > 0
      ? analysis.volumeSamples.reduce((a, b) => a + b, 0) / analysis.volumeSamples.length
      : 0;

    const features: AudioFeatures = {
      pitch: Math.min(1, avgPitch / 500), // Normalize pitch (assuming max ~500 Hz)
      speed: Math.min(1, Math.max(0, (60 / duration) / 150)), // Normalize speaking rate
      volume: Math.min(1, avgVolume * 10), // Normalize volume
      pauses: Math.min(1, analysis.pauseCount / Math.max(1, duration / 10)) // Pauses per 10 seconds
    };

    return features;
  };

  const startListening = async () => {
    if (!recognitionRef.current) return;

    // Request microphone access from coordinator
    if (!requestMicrophone('voice-assistant')) {
      toast({
        title: "Microphone Busy",
        description: "The microphone is currently in use. Please try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Start WebRTC audio processing for better quality
      if (isWebRTCEnabled) {
        webRTCAudioService.startProcessing();
        await webRTCAudioService.adjustForEnvironment();
      }

      // Stop any existing recognition first
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }

      setTimeout(() => {
        setIsListening(true);
        setShouldKeepListening(true);
        shouldKeepListeningRef.current = true;

        try {
          recognitionRef.current.start();
          console.log('🎤 Voice assistant started - 20 second timer begins');

          // Set auto-stop timeout for 20 seconds
          if (autoStopTimeoutRef.current) {
            clearTimeout(autoStopTimeoutRef.current);
          }
          autoStopTimeoutRef.current = setTimeout(() => {
            console.log('⏰ 20 seconds reached - stopping recognition');
            setShouldKeepListening(false);
            shouldKeepListeningRef.current = false;
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
          }, 20000);

          toast({
            title: "🎤 Listening...",
            description: "Speak now, I'm listening for your question",
            duration: 3000
          });
        } catch (error) {
          console.error('❌ Error starting recognition:', error);
          releaseMicrophone('voice-assistant');
          setIsListening(false);
          setShouldKeepListening(false);
          shouldKeepListeningRef.current = false;
        }
      }, 300);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      releaseMicrophone('voice-assistant');
      toast({
        title: "Error",
        description: "Failed to start speech recognition",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    // Disable auto-restart first
    setShouldKeepListening(false);
    shouldKeepListeningRef.current = false;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Clear auto-stop timeout
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    // Release microphone access
    releaseMicrophone('voice-assistant');

    // Stop WebRTC audio processing
    if (isWebRTCEnabled) {
      webRTCAudioService.stopProcessing();
    }

    setIsListening(false);
  };

  const stopSpeaking = () => {
    cancel();
    setIsSpeaking(false);
  };

  // Don't show if user is not authenticated
  console.log('GlobalVoiceAssistant - User auth check:', { user: !!user, userId: user?.id });
  if (!user) {
    console.log('GlobalVoiceAssistant - User not authenticated, hiding component');
    return null;
  }

  return (
    <ErrorBoundary>
      {/* Mobile-optimized Floating Voice Assistant Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-20 md:bottom-6 right-4 z-50"
          >
            <Button
              onClick={() => {
                console.log('Voice assistant button clicked! Current isOpen:', isOpen);
                setIsOpen(true);
                console.log('Voice assistant button - setting isOpen to true');
              }}
              className={cn(
                "w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 touch-manipulation",
                (isListening || isSpeaking) && "animate-pulse"
              )}
            >
              <Mic className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile-optimized Voice Assistant Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-4 z-50 md:w-96 max-h-[70vh] md:max-h-[80vh]"
          >
            <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Mic className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                    Voice Assistant
                  </CardTitle>
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 touch-manipulation"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mobile Optimization Status */}
                <div className="flex items-center gap-2 text-xs">
                  <div className={cn("flex items-center gap-1", isOnline ? "text-green-600" : "text-red-600")}>
                    {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    {isOnline ? "Online" : "Offline"}
                  </div>
                  {isPushToTalkMode && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Zap className="h-3 w-3" />
                      Push-to-Talk
                    </div>
                  )}
                  {backgroundProcessingEnabled && (
                    <div className="flex items-center gap-1 text-purple-600">
                      <MessageSquare className="h-3 w-3" />
                      Learning
                    </div>
                  )}
                  {pendingCommands.length > 0 && (
                    <div className="text-orange-600">
                      {pendingCommands.length} pending
                    </div>
                  )}
                </div>

                {/* Performance Metrics */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isWebRTCEnabled && (
                    <div className="text-blue-600">🎵 WebRTC</div>
                  )}
                  <div>⚡ {processingLatency}ms</div>
                  <div>📊 {Math.round(cacheStats.hitRate * 100)}% cached</div>
                  <div className={cn("flex items-center gap-1", audioQuality === 'ultra' ? "text-green-600" : "text-yellow-600")}>
                    🎤 {audioQuality}
                  </div>
                </div>

                {/* Real-time Transcript Display */}
                {isListening && transcript && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 animate-pulse">
                    <div className="flex items-center gap-2 mb-1">
                      <Mic className="h-4 w-4 text-blue-600 animate-pulse" />
                      <span className="text-xs font-medium text-blue-700">You're saying:</span>
                    </div>
                    <p className="text-sm text-blue-900">{transcript}</p>
                  </div>
                )}

                {/* Mobile-optimized Conversation History */}
                <div className="max-h-48 md:max-h-64 overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-2 md:p-3">
                  {conversationHistory.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">
                      <MessageSquare className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs md:text-sm">No conversation yet</p>
                    </div>
                  ) : (
                    conversationHistory.slice(-3).map((entry, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-2 rounded text-xs md:text-sm",
                          entry.type === 'user'
                            ? "bg-blue-100 text-blue-900 ml-2 md:ml-4"
                            : "bg-white text-gray-900 mr-2 md:mr-4"
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="flex-1 break-words">{entry.message}</p>
                          {entry.type === 'assistant' && (
                            <Button
                              onClick={() => speak(entry.message)}
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 md:h-6 md:w-6 ml-1 md:ml-2 shrink-0 touch-manipulation"
                            >
                              <Volume2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {entry.courseContext && (
                          <div className="text-xs text-gray-500 mt-1 break-words">
                            📚 {entry.courseContext}
                          </div>
                        )}

                        {entry.contextSwitch && (
                          <div className="text-xs text-blue-600 mt-1 break-words">
                            🔄 Context switch detected
                          </div>
                        )}
                        {entry.type === 'assistant' && entry.semanticContext && (
                          <div className="text-xs text-purple-600 mt-1 break-words">
                            💡 AI context applied
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Multi-Modal Response Display */}
                {lastMultiModalResponse && lastMultiModalResponse.visualAids && lastMultiModalResponse.visualAids.length > 0 && (
                  <div className="mt-4">
                    <MultiModalResponse
                      textResponse={lastMultiModalResponse.textResponse}
                      visualAids={lastMultiModalResponse.visualAids}
                      audioNotes={lastMultiModalResponse.audioNotes}
                      suggestedFollowUp={lastMultiModalResponse.suggestedFollowUp}
                      onFollowUpClick={(question) => {
                        processCommand(question);
                      }}
                      onSpeak={(text) => speak(text)}
                    />
                  </div>
                )}

                {/* Mobile-optimized Voice Controls */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={isPushToTalkMode ? undefined : startListening}
                      onMouseDown={isPushToTalkMode ? () => { setPushToTalkActive(true); startListening(); } : undefined}
                      onMouseUp={isPushToTalkMode ? () => { setPushToTalkActive(false); stopListening(); } : undefined}
                      onTouchStart={isPushToTalkMode ? () => { setPushToTalkActive(true); startListening(); } : undefined}
                      onTouchEnd={isPushToTalkMode ? () => { setPushToTalkActive(false); stopListening(); } : undefined}
                      disabled={(!isPushToTalkMode && (isListening || isSpeaking)) || (!isOnline && !isOfflineMode)}
                      className={cn(
                        "flex-1 flex items-center gap-2 h-11 md:h-10 touch-manipulation",
                        (isListening || pushToTalkActive) && "bg-red-500 hover:bg-red-600",
                        isPushToTalkMode && "select-none"
                      )}
                    >
                      <Mic className={cn("h-4 w-4", (isListening || pushToTalkActive) && "animate-pulse")} />
                      {isPushToTalkMode
                        ? (pushToTalkActive ? "Release to Send" : "Hold to Speak")
                        : (isListening ? "Listening..." : "Speak")
                      }
                    </Button>

                    {!isPushToTalkMode && (
                      <Button
                        onClick={stopListening}
                        disabled={!isListening}
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 md:h-10 md:w-10 touch-manipulation"
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      onClick={() => {
                        cancel();
                        setResponse("");
                      }}
                      variant="outline"
                      size="icon"
                      disabled={!isSpeaking}
                      className="h-11 w-11 md:h-10 md:w-10 touch-manipulation"
                    >
                      <VolumeX className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Mobile Optimization Toggles */}
                  <div className="flex gap-1 text-xs">
                    <Button
                      onClick={() => setIsPushToTalkMode(!isPushToTalkMode)}
                      variant={isPushToTalkMode ? "default" : "outline"}
                      size="sm"
                      className="flex-1 h-8"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Push-to-Talk
                    </Button>

                    <Button
                      onClick={() => setBackgroundProcessingEnabled(!backgroundProcessingEnabled)}
                      variant={backgroundProcessingEnabled ? "default" : "outline"}
                      size="sm"
                      className="flex-1 h-8"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Learning
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz Modal */}
      {showQuiz && lastExplanation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Understanding Check: {lastExplanation.topic}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowQuiz(false)}>
                ✕
              </Button>
            </div>
            <div className="p-4">
              <PostExplanationQuiz
                topic={lastExplanation.topic}
                explanation={lastExplanation.explanation}
                onComplete={(results) => {
                  setShowQuiz(false);
                  toast({
                    title: "Quiz Complete!",
                    description: `You scored ${Math.round(results.overallScore * 100)}%. Your understanding has been verified!`,
                  });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}