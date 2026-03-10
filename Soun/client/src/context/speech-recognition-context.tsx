import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

type SpeechRecognitionUser = 'wake-word' | 'voice-assistant' | null;

interface SpeechRecognitionContextType {
  currentUser: SpeechRecognitionUser;
  requestMicrophone: (user: SpeechRecognitionUser) => boolean;
  releaseMicrophone: (user: SpeechRecognitionUser) => void;
  isMicrophoneAvailable: () => boolean;
}

const SpeechRecognitionContext = createContext<SpeechRecognitionContextType | undefined>(undefined);

export function SpeechRecognitionProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SpeechRecognitionUser>(null);
  const lockRef = useRef<SpeechRecognitionUser>(null);

  const requestMicrophone = useCallback((user: SpeechRecognitionUser): boolean => {
    // Voice assistant has priority - force release if wake-word has it
    if (user === 'voice-assistant' && lockRef.current === 'wake-word') {
      lockRef.current = user;
      setCurrentUser(user);
      return true;
    }

    if (lockRef.current === null || lockRef.current === user) {
      lockRef.current = user;
      setCurrentUser(user);
      return true;
    }
    return false;
  }, []);

  const releaseMicrophone = useCallback((user: SpeechRecognitionUser) => {
    if (lockRef.current === user) {
      lockRef.current = null;
      setCurrentUser(null);
    }
  }, []);

  const isMicrophoneAvailable = useCallback(() => {
    return lockRef.current === null;
  }, []);

  return (
    <SpeechRecognitionContext.Provider value={{
      currentUser,
      requestMicrophone,
      releaseMicrophone,
      isMicrophoneAvailable
    }}>
      {children}
    </SpeechRecognitionContext.Provider>
  );
}

export function useSpeechRecognitionCoordinator() {
  const context = useContext(SpeechRecognitionContext);
  if (!context) {
    throw new Error('useSpeechRecognitionCoordinator must be used within SpeechRecognitionProvider');
  }
  return context;
}
