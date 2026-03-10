import { useState, useCallback, useEffect } from 'react';
import * as tts from '@/lib/text-to-speech';
import { useVoiceSettings } from '@/context/voice-settings-context';

export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const { voiceSettings, updateVoiceSettings } = useVoiceSettings();

  // Get available voices and apply saved settings
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = tts.getVoices();
      setVoices(availableVoices);

      if (availableVoices.length > 0) {
        let selectedVoice = null;

        // First try to load the saved voice from settings
        if (voiceSettings.selectedVoiceURI) {
          selectedVoice = availableVoices.find(v => v.voiceURI === voiceSettings.selectedVoiceURI);
          if (selectedVoice) {
            console.log(`Loaded saved voice: ${selectedVoice.name} (${selectedVoice.lang})`);
          }
        }

        // If no saved voice or saved voice not found, use default selection logic
        if (!selectedVoice) {
          console.log('Searching for a high-quality English voice...');

          // Detect mobile devices for better voice selection
          const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

          // Priority 1: Mobile-optimized American English voices
          let americanVoices: string[] = [];

          if (isMobile) {
            // Mobile-specific voice priorities
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isAndroid = /Android/.test(navigator.userAgent);

            if (isIOS) {
              // iOS devices - prioritize Apple voices
              americanVoices = [
                'Samantha', 'Ava', 'Allison', 'Susan', 'Tom', 'Alex', 'Daniel', 'Fred', 'Victoria', 'Karen',
                'Microsoft Jenny Online (Natural) - English (United States)',
                'Microsoft Guy Online (Natural) - English (United States)',
                'Google US English'
              ];
            } else if (isAndroid) {
              // Android devices - prioritize Google voices
              americanVoices = [
                'Google US English', 'Google US English Male', 'Google US English Female',
                'Microsoft Jenny Online (Natural) - English (United States)',
                'Microsoft Guy Online (Natural) - English (United States)',
                'Microsoft Zira - English (United States)'
              ];
            } else {
              // Other mobile devices - general mobile preferences
              americanVoices = [
                'Google US English', 'Samantha', 'Alex', 
                'Microsoft Jenny Online (Natural) - English (United States)',
                'Microsoft Guy Online (Natural) - English (United States)'
              ];
            }
            console.log(`Mobile device detected (${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Other'}), using mobile voice priorities`);
          } else {
            // Desktop - original priorities
            americanVoices = [
              'Microsoft Jenny Online (Natural) - English (United States)', // Clear American female
              'Microsoft Guy Online (Natural) - English (United States)',  // Clear American male
              'Google US English',  // Google's American English voice
              'Microsoft Zira - English (United States)', // Standard US voice
              'Microsoft David - English (United States)', // Another clear US voice
              'Alex', 'Karen', 'Samantha', 'Fred', 'Victoria', 'Daniel', 'Ava', 'Allison', 'Tom'
            ];
          }

          selectedVoice = availableVoices.find(v => americanVoices.includes(v.name));

          // Priority 2: Any Microsoft Natural US voices (known for human-like quality)
          if (!selectedVoice) {
            selectedVoice = availableVoices.find(v => 
              v.name.includes('Microsoft') && 
              v.name.includes('Natural') && 
              (v.lang === 'en-US' || v.name.includes('United States'))
            );
          }

          // Priority 3: Google US English voices specifically 
          if (!selectedVoice) {
            selectedVoice = availableVoices.find(v => 
              v.name.includes('Google') && 
              (v.lang === 'en-US' || v.name.includes('US'))
            );
          }

          // Priority 4: Clear American system voices (macOS/Windows)
          if (!selectedVoice) {
            selectedVoice = availableVoices.find(v => 
              (v.name.includes('Alex') || 
               v.name.includes('David') || 
               v.name.includes('Zira') ||
               v.name.includes('Mark')) && 
              v.lang === 'en-US'
            );
          }

          // Priority 5: Any US English voice (avoiding UK/AU accents)
          if (!selectedVoice) {
            selectedVoice = availableVoices.find(v => 
              v.lang === 'en-US' && 
              !v.name.toLowerCase().includes('enhanced') &&
              !v.name.toLowerCase().includes('compact')
            );
          }

          // Priority 6: Fallback to any English voice as last resort
          if (!selectedVoice) {
            selectedVoice = availableVoices.find(v => v.lang.startsWith('en-'));
          }

          // Fallback: First available voice
          if (!selectedVoice && availableVoices.length > 0) {
            selectedVoice = availableVoices[0];
          }

          if (selectedVoice) {
            console.log(`Selected voice: ${selectedVoice.name} (${selectedVoice.lang})`);
            // Save the automatically selected voice to settings
            updateVoiceSettings({ selectedVoiceURI: selectedVoice.voiceURI });
          } else {
            console.warn('No voice could be selected');
          }
        }

        if (selectedVoice) {
          setSelectedVoice(selectedVoice);
        }
      }
    };

    // Chrome loads voices asynchronously
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

      // Initial load attempt
      loadVoices();
    }
  }, [voiceSettings.selectedVoiceURI, updateVoiceSettings]);

  // Speak text
  const speak = useCallback((text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
  }) => {
    if (!text.trim()) return;

    setSpeaking(true);

    // Use voice settings with optional overrides
    tts.speak(text, {
      voice: selectedVoice,
      rate: options?.rate || voiceSettings.rate,
      pitch: options?.pitch || voiceSettings.pitch,
      volume: options?.volume || voiceSettings.volume,
      onEnd: () => setSpeaking(false)
    });
  }, [selectedVoice]);

  // Cancel speaking
  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  // Change voice and save to settings
  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
    updateVoiceSettings({ selectedVoiceURI: voice.voiceURI });
  }, [updateVoiceSettings]);

  return {
    speak,
    cancel,
    speaking,
    voices,
    selectedVoice,
    setVoice
  };
}