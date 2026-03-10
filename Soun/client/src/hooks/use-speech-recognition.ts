
import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}) {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  useEffect(() => {
    const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setIsSupported(isSupported);
    
    if (isSupported) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = options.continuous ?? false;
      recognition.interimResults = options.interimResults ?? true;
      recognition.lang = options.language ?? 'en-US';
      
      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        
        if (event.results[current].isFinal) {
          setTranscript(transcript);
        }
      };
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, [options.continuous, options.interimResults, options.language]);
  
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    }
  }, [isListening]);
  
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);
  
  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);
  
  return {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  };
}
