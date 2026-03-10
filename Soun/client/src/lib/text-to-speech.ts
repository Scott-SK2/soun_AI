/**
 * Utility for text-to-speech functionality
 */

// Check if the browser supports speech synthesis
const isSpeechSynthesisSupported = () => 
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Preprocesses text to make it sound more natural when spoken
 * Adds appropriate pauses and improves phrasing for human-like delivery
 */
const preprocessTextForNaturalSpeech = (text: string): string => {
  if (!text) return text;
  
  let processedText = text
    // Add pauses after punctuation for more natural flow
    .replace(/\./g, '. ')
    .replace(/,/g, ', ')
    .replace(/;/g, '; ')
    .replace(/:/g, ': ')
    .replace(/\?/g, '? ')
    .replace(/!/g, '! ')
    
    // Add longer pauses for paragraph breaks and line breaks
    .replace(/\n\n/g, '... ')
    .replace(/\n/g, ', ')
    
    // Handle common abbreviations that should be spoken naturally
    .replace(/\be\.g\./gi, 'for example')
    .replace(/\bi\.e\./gi, 'that is')
    .replace(/\betc\./gi, 'and so on')
    .replace(/\bvs\./gi, 'versus')
    .replace(/\bDr\./gi, 'Doctor')
    .replace(/\bMr\./gi, 'Mister')
    .replace(/\bMrs\./gi, 'Missus')
    .replace(/\bMs\./gi, 'Miss')
    
    // Add slight pauses around parenthetical information
    .replace(/\(/g, ', ')
    .replace(/\)/g, ', ')
    
    // Handle numbers to sound more natural (optional enhancement)
    .replace(/(\d+)%/g, '$1 percent')
    
    // Clean up multiple spaces and normalize
    .replace(/\s+/g, ' ')
    .trim();
  
  return processedText;
};

/**
 * Speaks the given text using the browser's speech synthesis API
 * @param text - The text to speak
 * @param options - Optional configuration for the speech
 */
export const speak = (text: string, options?: {
  rate?: number;   // Speed of speech: 0.1 to 10 (default: 1)
  pitch?: number;  // Pitch of voice: 0 to 2 (default: 1)
  volume?: number; // Volume: 0 to 1 (default: 1)
  voice?: SpeechSynthesisVoice | null; // Specific voice to use
  onEnd?: () => void; // Callback when speech ends
  skipPreprocessing?: boolean; // Skip natural text preprocessing
}) => {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech synthesis is not supported in this browser');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Preprocess text for more natural speech unless explicitly skipped
  const processedText = options?.skipPreprocessing ? text : preprocessTextForNaturalSpeech(text);

  // Create a new speech utterance
  const utterance = new SpeechSynthesisUtterance(processedText);
  
  // Apply options if provided
  if (options) {
    if (options.rate !== undefined) utterance.rate = options.rate;
    if (options.pitch !== undefined) utterance.pitch = options.pitch;
    if (options.volume !== undefined) utterance.volume = options.volume;
    if (options.voice) {
      utterance.voice = options.voice;
      // Explicitly set language to prevent fallback to system default
      utterance.lang = options.voice.lang || 'en-US';
    } else {
      // Default to American English when no voice is specified
      utterance.lang = 'en-US';
    }
    if (options.onEnd) utterance.onend = options.onEnd;
  } else {
    // Ensure we always default to American English
    utterance.lang = 'en-US';
  }
  
  // Debug log to verify voice selection
  console.log('Speaking with voice:', utterance.voice?.name || 'system default', 'language:', utterance.lang);
  
  // Speak the text
  window.speechSynthesis.speak(utterance);
};

/**
 * Get available voices for speech synthesis
 * @returns Array of available speech synthesis voices
 */
export const getVoices = (): SpeechSynthesisVoice[] => {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech synthesis is not supported in this browser');
    return [];
  }
  
  return window.speechSynthesis.getVoices();
};

/**
 * Find a voice by language
 * @param language - Language code (e.g., 'en-US', 'fr-FR')
 * @returns The found voice or null if not found
 */
export const findVoiceByLanguage = (language: string): SpeechSynthesisVoice | null => {
  const voices = getVoices();
  return voices.find(voice => voice.lang.includes(language)) || null;
};

/**
 * Debug function to list all available voices in the browser console
 * This is helpful for diagnosing voice selection issues
 */
export const debugVoices = (): void => {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech synthesis is not supported in this browser');
    return;
  }
  
  const voices = getVoices();
  
  if (voices.length === 0) {
    console.warn('No speech synthesis voices available');
    return;
  }
  
  console.group('Available Speech Synthesis Voices');
  
  voices.forEach((voice, index) => {
    console.log(`Voice #${index + 1}:`);
    console.log(`- Name: ${voice.name}`);
    console.log(`- Language: ${voice.lang}`);
    console.log(`- Local: ${voice.localService ? 'Yes' : 'No'}`);
    console.log(`- Default: ${voice.default ? 'Yes' : 'No'}`);
  });
  
  console.groupEnd();
};