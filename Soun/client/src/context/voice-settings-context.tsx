import { createContext, useState, useContext, ReactNode, useEffect } from "react";

// Local storage keys
const VOICE_SETTINGS_KEY = "study-assistant-voice-settings";
const VOICE_SETTINGS_VERSION = "2.0"; // Version for humanized voice settings

export interface VoiceSettings {
  selectedVoiceURI: string | null;
  rate: number;
  pitch: number;
  volume: number;
  version?: string; // Track settings version for upgrades
}

interface VoiceSettingsContextType {
  voiceSettings: VoiceSettings;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  resetVoiceSettings: () => void;
}

const defaultVoiceSettings: VoiceSettings = {
  selectedVoiceURI: null,
  rate: 0.92,     // Slightly slower for more natural conversation flow
  pitch: 0.96,    // Slightly lower pitch for warmer, less robotic tone
  volume: 0.95,   // Slightly quieter to sound less mechanical
  version: VOICE_SETTINGS_VERSION,
};

const VoiceSettingsContext = createContext<VoiceSettingsContextType | undefined>(undefined);

export function VoiceSettingsProvider({ children }: { children: ReactNode }) {
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(defaultVoiceSettings);
  
  // Initialize from local storage on mount with version upgrade
  useEffect(() => {
    const savedSettings = localStorage.getItem(VOICE_SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        
        // Check if settings need to be upgraded to new humanized defaults
        if (!parsed.version || parsed.version !== VOICE_SETTINGS_VERSION) {
          console.log('Upgrading voice settings to humanized version 2.0');
          
          // Upgrade to new humanized settings, keeping only the selected voice
          const upgradedSettings = {
            ...defaultVoiceSettings,
            selectedVoiceURI: parsed.selectedVoiceURI, // Keep user's voice preference
          };
          
          setVoiceSettings(upgradedSettings);
          localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(upgradedSettings));
        } else {
          // Settings are current version, load as-is
          setVoiceSettings({ ...defaultVoiceSettings, ...parsed });
        }
      } catch (error) {
        console.error("Failed to parse saved voice settings:", error);
        // Reset to defaults if parsing fails
        localStorage.removeItem(VOICE_SETTINGS_KEY);
        setVoiceSettings(defaultVoiceSettings);
      }
    } else {
      // No saved settings, use new humanized defaults
      setVoiceSettings(defaultVoiceSettings);
    }
  }, []);
  
  const updateVoiceSettings = (newSettings: Partial<VoiceSettings>) => {
    setVoiceSettings(prev => {
      const updated = { ...prev, ...newSettings, version: VOICE_SETTINGS_VERSION };
      localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  };
  
  const resetVoiceSettings = () => {
    setVoiceSettings(defaultVoiceSettings);
    localStorage.removeItem(VOICE_SETTINGS_KEY);
  };
  
  return (
    <VoiceSettingsContext.Provider
      value={{
        voiceSettings,
        updateVoiceSettings,
        resetVoiceSettings
      }}
    >
      {children}
    </VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings() {
  const context = useContext(VoiceSettingsContext);
  
  if (context === undefined) {
    throw new Error("useVoiceSettings must be used within a VoiceSettingsProvider");
  }
  
  return context;
}