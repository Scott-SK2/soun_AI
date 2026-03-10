import { createContext, useState, useContext, ReactNode, useEffect } from "react";

// Local storage key
const SOUND_PERMISSION_KEY = "study-assistant-sound-permission";

interface SoundPermissionContextType {
  isSoundEnabled: boolean;
  enableSound: () => void;
  disableSound: () => void;
  toggleSound: () => void;
}

const SoundPermissionContext = createContext<SoundPermissionContextType | undefined>(undefined);

export function SoundPermissionProvider({ children }: { children: ReactNode }) {
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(false);
  
  // Initialize from local storage on mount
  useEffect(() => {
    const permission = localStorage.getItem(SOUND_PERMISSION_KEY);
    if (permission === "granted") {
      setIsSoundEnabled(true);
    }
  }, []);
  
  const enableSound = () => {
    setIsSoundEnabled(true);
    localStorage.setItem(SOUND_PERMISSION_KEY, "granted");
  };
  
  const disableSound = () => {
    setIsSoundEnabled(false);
    localStorage.setItem(SOUND_PERMISSION_KEY, "denied");
  };
  
  const toggleSound = () => {
    if (isSoundEnabled) {
      disableSound();
    } else {
      enableSound();
    }
  };
  
  return (
    <SoundPermissionContext.Provider
      value={{
        isSoundEnabled,
        enableSound,
        disableSound,
        toggleSound
      }}
    >
      {children}
    </SoundPermissionContext.Provider>
  );
}

export function useSoundPermission() {
  const context = useContext(SoundPermissionContext);
  
  if (context === undefined) {
    throw new Error("useSoundPermission must be used within a SoundPermissionProvider");
  }
  
  return context;
}
