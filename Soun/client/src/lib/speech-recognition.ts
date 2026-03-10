type SpeechRecognitionCallback = {
  onResult: (transcript: string) => void;
  onEnd: () => void;
  onError: (error: string) => void;
};

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

// Define window with SpeechRecognition types
declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

export function useSpeechRecognition(callbacks: SpeechRecognitionCallback) {
  let recognition: ISpeechRecognition | null = null;
  
  // Check if browser supports speech recognition
  const hasRecognitionSupport = () => {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  };
  
  const initializeRecognition = () => {
    if (!hasRecognitionSupport()) return null;
    
    // Initialize the SpeechRecognition object
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    // Configure recognition
    if (recognition) {
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join(' ');
        
        callbacks.onResult(transcript);
      };
      
      recognition.onerror = (event: any) => {
        callbacks.onError(event.error);
      };
      
      recognition.onend = () => {
        callbacks.onEnd();
      };
    }
    
    return recognition;
  };
  
  const startListening = () => {
    if (!recognition) {
      recognition = initializeRecognition();
    }
    
    if (recognition) {
      try {
        recognition.start();
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        callbacks.onError("Failed to start speech recognition");
      }
    } else {
      callbacks.onError("Speech recognition not supported");
    }
  };
  
  const stopListening = () => {
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
  };
  
  return {
    startListening,
    stopListening,
    hasRecognitionSupport: hasRecognitionSupport()
  };
}
