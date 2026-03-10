import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useSpeechRecognitionCoordinator } from '@/context/speech-recognition-context';

interface WakeWordOptions {
  wakeWord?: string;
  enabled?: boolean;
  onWakeWordDetected?: () => void;
  onCommandReceived?: (command: string) => void;
}

interface NavigationCommand {
  type: 'course' | 'page' | 'unknown';
  target?: string;
  courseName?: string;
}

export function useWakeWordDetection(options: WakeWordOptions = {}) {
  const {
    wakeWord = 'soun',
    enabled = true,
    onWakeWordDetected,
    onCommandReceived
  } = options;

  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [isListeningForCommand, setIsListeningForCommand] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { requestMicrophone, releaseMicrophone, currentUser } = useSpeechRecognitionCoordinator();
  
  const wakeWordRecognitionRef = useRef<any>(null);
  const commandRecognitionRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const hasMicrophoneRef = useRef(false);
  const isRestartingRef = useRef(false);
  const isWakeWordRunningRef = useRef(false);
  const hasFatalErrorRef = useRef(false);
  const hasShownErrorToastRef = useRef(false);

  // Parse voice command to extract navigation intent
  const parseCommand = useCallback((command: string): NavigationCommand => {
    const lowerCommand = command.toLowerCase().trim();
    
    console.log('🎤 Parsing command:', lowerCommand);

    // Course navigation patterns
    if (lowerCommand.includes('study') || lowerCommand.includes('course')) {
      // Extract course name after "study" or "course"
      let courseName = '';
      
      if (lowerCommand.includes('study')) {
        courseName = lowerCommand.split('study')[1]?.trim() || '';
      } else if (lowerCommand.includes('course')) {
        courseName = lowerCommand.split('course')[1]?.trim() || '';
      }

      // Clean up common words
      courseName = courseName
        .replace(/^(the|a|an)\s+/i, '')
        .replace(/\s+(course|class)$/i, '')
        .trim();

      if (courseName) {
        return { type: 'course', courseName };
      }
    }

    // Page navigation patterns
    const pagePatterns: Record<string, string> = {
      'courses': '/courses',
      'my courses': '/courses',
      'dashboard': '/dashboard',
      'home': '/dashboard',
      'settings': '/settings',
      'documents': '/documents',
      'planner': '/planner',
      'progress': '/progress',
      'voice': '/voice',
      'presentation': '/presentation'
    };

    for (const [pattern, path] of Object.entries(pagePatterns)) {
      if (lowerCommand.includes(pattern)) {
        return { type: 'page', target: path };
      }
    }

    return { type: 'unknown' };
  }, []);

  // Handle navigation based on parsed command
  const executeNavigation = useCallback(async (command: string) => {
    const navCommand = parseCommand(command);
    console.log('🎯 Navigation command:', navCommand);

    if (navCommand.type === 'page' && navCommand.target) {
      setLocation(navCommand.target);
      toast({
        title: "Navigating...",
        description: `Taking you to ${navCommand.target.replace('/', '')}`,
      });
      return true;
    }

    if (navCommand.type === 'course' && navCommand.courseName) {
      // Fetch courses and find match
      try {
        const response = await fetch('/api/courses', {
          credentials: 'include'
        });

        if (response.ok) {
          const courses = await response.json();
          
          // Find course by name (fuzzy match)
          const matchedCourse = courses.find((course: any) => {
            const courseName = course.courseName.toLowerCase();
            const searchName = navCommand.courseName!.toLowerCase();
            return courseName.includes(searchName) || searchName.includes(courseName);
          });

          if (matchedCourse) {
            setLocation(`/courses/${matchedCourse.courseId}/study`);
            toast({
              title: "Opening Course",
              description: `Taking you to ${matchedCourse.courseName}`,
            });
            return true;
          } else {
            toast({
              title: "Course Not Found",
              description: `Couldn't find a course matching "${navCommand.courseName}"`,
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast({
          title: "Error",
          description: "Failed to fetch courses",
          variant: "destructive"
        });
      }
    }

    if (navCommand.type === 'unknown') {
      toast({
        title: "Command Not Understood",
        description: `Try saying "Hi Soun, show me my courses" or "Hi Soun, I want to study [course name]"`,
      });
    }

    return false;
  }, [parseCommand, setLocation, toast]);

  // Start listening for wake word
  const startWakeWordListening = useCallback(() => {
    if (!wakeWordRecognitionRef.current || !enabled) return;

    // Prevent multiple starts
    if (isWakeWordRunningRef.current) {
      return;
    }

    // Don't retry if we've hit a fatal error (like microphone permission denied)
    if (hasFatalErrorRef.current) {
      return;
    }

    // Request microphone access
    if (!requestMicrophone('wake-word')) {
      // Retry after a delay if microphone is not available
      setTimeout(() => {
        if (enabled && !isWakeWordRunningRef.current) {
          startWakeWordListening();
        }
      }, 3000);
      return;
    }

    hasMicrophoneRef.current = true;

    try {
      // Stop any existing recognition first to avoid "already started" errors
      try {
        wakeWordRecognitionRef.current.stop();
        isWakeWordRunningRef.current = false;
      } catch {
        // Ignore if not running
      }
      
      // Longer delay to ensure previous session ended completely
      setTimeout(() => {
        if (!enabled || !isInitializedRef.current) {
          if (hasMicrophoneRef.current) {
            releaseMicrophone('wake-word');
            hasMicrophoneRef.current = false;
          }
          return;
        }

        try {
          wakeWordRecognitionRef.current.start();
          isWakeWordRunningRef.current = true;
        } catch (error: any) {
          isWakeWordRunningRef.current = false;
          if (error.message !== 'recognition has already been started') {
            if (hasMicrophoneRef.current) {
              releaseMicrophone('wake-word');
              hasMicrophoneRef.current = false;
            }

            // Retry after a longer delay if start fails
            setTimeout(() => {
              if (enabled && !isWakeWordRunningRef.current) {
                startWakeWordListening();
              }
            }, 3000);
          }
        }
      }, 300);
    } catch (error: any) {
      isWakeWordRunningRef.current = false;
      if (hasMicrophoneRef.current) {
        releaseMicrophone('wake-word');
        hasMicrophoneRef.current = false;
      }
    }
  }, [enabled, requestMicrophone, releaseMicrophone]);

  // Start listening for command after wake word detected
  const startCommandListening = useCallback(() => {
    if (!commandRecognitionRef.current) return;

    // Keep the microphone (wake-word already has it)
    setIsListeningForCommand(true);
    console.log('🎤 Command listening started');

    try {
      commandRecognitionRef.current.start();
    } catch (error: any) {
      if (error.message !== 'recognition has already been started') {
        console.error('Failed to start command recognition:', error);
        setIsListeningForCommand(false);
        // Release and restart wake word
        releaseMicrophone('wake-word');
        hasMicrophoneRef.current = false;
        setTimeout(() => startWakeWordListening(), 1000);
      }
    }
  }, [releaseMicrophone, startWakeWordListening]);

  // Initialize speech recognition for wake word
  useEffect(() => {
    if (!enabled) {
      // Clean up if disabled
      if (isInitializedRef.current) {
        if (wakeWordRecognitionRef.current) {
          try {
            wakeWordRecognitionRef.current.stop();
          } catch (err) {
            // Ignore
          }
        }
        if (hasMicrophoneRef.current) {
          releaseMicrophone('wake-word');
          hasMicrophoneRef.current = false;
        }
        isInitializedRef.current = false;
      }
      return;
    }

    if (isInitializedRef.current) return;

    const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    
    if (!isSupported) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    // Wake word recognition (continuous)
    wakeWordRecognitionRef.current = new SpeechRecognition();
    wakeWordRecognitionRef.current.continuous = true;
    wakeWordRecognitionRef.current.interimResults = true;
    wakeWordRecognitionRef.current.lang = 'en-US';

    wakeWordRecognitionRef.current.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();

      // Check if transcript contains wake word
      if (transcript.includes(wakeWord)) {
        console.log('🎯 Wake word detected!', transcript);
        setIsWakeWordActive(true);
        isWakeWordRunningRef.current = false;
        
        // Stop wake word listening temporarily (but keep the microphone)
        if (wakeWordRecognitionRef.current) {
          try {
            wakeWordRecognitionRef.current.stop();
          } catch (err) {
            console.error('Error stopping wake word recognition:', err);
          }
        }

        // Trigger callback
        onWakeWordDetected?.();

        // Start command listening
        setTimeout(() => {
          startCommandListening();
        }, 300);
      }
    };

    wakeWordRecognitionRef.current.onend = () => {
      console.log('🔚 Wake word recognition ended');
      isWakeWordRunningRef.current = false;
      
      // Don't restart if not initialized (component unmounted)
      if (!isInitializedRef.current) {
        if (hasMicrophoneRef.current) {
          releaseMicrophone('wake-word');
          hasMicrophoneRef.current = false;
        }
        return;
      }

      // Don't restart if we've hit a fatal error
      if (hasFatalErrorRef.current) {
        return;
      }

      // Release microphone if we're done
      if (!isListeningForCommand && hasMicrophoneRef.current) {
        releaseMicrophone('wake-word');
        hasMicrophoneRef.current = false;
      }

      // Don't restart if microphone is in use by someone else
      if (currentUser !== null && currentUser !== 'wake-word') {
        return;
      }

      // Restart wake word listening with longer delay to prevent loop
      if (enabled && !isListeningForCommand && !isRestartingRef.current && isInitializedRef.current && !isWakeWordRunningRef.current) {
        isRestartingRef.current = true;
        setTimeout(() => {
          isRestartingRef.current = false;
          if (isInitializedRef.current && !isWakeWordRunningRef.current && !hasFatalErrorRef.current && (currentUser === null || currentUser === 'wake-word')) {
            startWakeWordListening();
          }
        }, 3000);
      }
    };

    wakeWordRecognitionRef.current.onerror = (event: any) => {
      // Ignore "no-speech" error - it's normal when user is not speaking
      if (event.error === 'no-speech') {
        return;
      }

      // Ignore "aborted" error - usually happens when we stop recognition manually
      if (event.error === 'aborted') {
        return;
      }

      // Release microphone on error
      if (hasMicrophoneRef.current) {
        releaseMicrophone('wake-word');
        hasMicrophoneRef.current = false;
      }

      // Fatal errors that should stop all retries
      const fatalErrors = ['not-allowed', 'service-not-allowed', 'audio-capture'];

      if (fatalErrors.includes(event.error)) {
        // Mark as fatal to prevent infinite retries
        hasFatalErrorRef.current = true;
        isWakeWordRunningRef.current = false;
        
        // Show error toast only ONCE
        if (!hasShownErrorToastRef.current) {
          hasShownErrorToastRef.current = true;
          console.error('Fatal wake word recognition error:', event.error);
          toast({
            title: "Microphone Access Denied",
            description: "Voice wake word detection is disabled. You can still use the voice assistant by clicking the microphone button.",
            variant: "destructive"
          });
        }
        return; // Stop here, don't let onend restart
      }

      // For other errors (no-speech, aborted, etc), let onend handle restart
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Wake word recognition error:', event.error);
      }
    };

    // Command recognition (non-continuous)
    commandRecognitionRef.current = new SpeechRecognition();
    commandRecognitionRef.current.continuous = false;
    commandRecognitionRef.current.interimResults = false;
    commandRecognitionRef.current.lang = 'en-US';
    commandRecognitionRef.current.maxAlternatives = 1;

    commandRecognitionRef.current.onresult = (event: any) => {
      const command = event.results[0][0].transcript;
      console.log('📝 Command received:', command);
      
      setLastCommand(command);
      onCommandReceived?.(command);
      
      // Execute navigation
      executeNavigation(command);
    };

    commandRecognitionRef.current.onend = () => {
      console.log('🎤 Command listening ended');
      setIsListeningForCommand(false);
      setIsWakeWordActive(false);

      // Release microphone
      if (hasMicrophoneRef.current) {
        releaseMicrophone('wake-word');
        hasMicrophoneRef.current = false;
      }

      // Restart wake word listening
      setTimeout(() => {
        if (enabled) {
          startWakeWordListening();
        }
      }, 500);
    };

    commandRecognitionRef.current.onerror = (event: any) => {
      console.error('Command recognition error:', event.error);
      setIsListeningForCommand(false);
      setIsWakeWordActive(false);

      // Release microphone
      if (hasMicrophoneRef.current) {
        releaseMicrophone('wake-word');
        hasMicrophoneRef.current = false;
      }

      // Surface fatal errors
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast({
          title: "Command Recognition Error",
          description: `Failed to process command: ${event.error}`,
          variant: "destructive"
        });
      }

      // Restart wake word listening
      setTimeout(() => {
        if (enabled) {
          startWakeWordListening();
        }
      }, 1000);
    };

    isInitializedRef.current = true;

    // Start wake word listening
    startWakeWordListening();

    return () => {
      if (wakeWordRecognitionRef.current) {
        try {
          wakeWordRecognitionRef.current.stop();
        } catch (err) {
          console.error('Error stopping wake word recognition on cleanup:', err);
        }
      }
      if (commandRecognitionRef.current) {
        try {
          commandRecognitionRef.current.stop();
        } catch (err) {
          console.error('Error stopping command recognition on cleanup:', err);
        }
      }
      if (hasMicrophoneRef.current) {
        releaseMicrophone('wake-word');
        hasMicrophoneRef.current = false;
      }
      isInitializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, wakeWord]); // Removed circular dependencies that cause re-initialization

  // Stop wake word recognition when another component takes the microphone
  useEffect(() => {
    if (currentUser !== 'wake-word' && currentUser !== null && isWakeWordRunningRef.current) {
      if (wakeWordRecognitionRef.current) {
        try {
          wakeWordRecognitionRef.current.stop();
          isWakeWordRunningRef.current = false;
        } catch (err) {
          // Ignore errors
        }
      }
      hasMicrophoneRef.current = false;
      setIsListeningForCommand(false);
      setIsWakeWordActive(false);
    }
  }, [currentUser]);

  const stopListening = useCallback(() => {
    if (wakeWordRecognitionRef.current) {
      try {
        wakeWordRecognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping wake word recognition:', err);
      }
    }
    if (commandRecognitionRef.current) {
      try {
        commandRecognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping command recognition:', err);
      }
    }
    if (hasMicrophoneRef.current) {
      releaseMicrophone('wake-word');
      hasMicrophoneRef.current = false;
    }
    setIsListeningForCommand(false);
    setIsWakeWordActive(false);
  }, [releaseMicrophone]);

  return {
    isWakeWordActive,
    isListeningForCommand,
    lastCommand,
    stopListening,
    executeNavigation
  };
}
