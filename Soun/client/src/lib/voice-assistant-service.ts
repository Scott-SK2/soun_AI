
export interface VoiceCommand {
  id: string;
  text: string;
  timestamp: Date;
  context?: {
    page: string;
    courseId?: string;
    documentId?: string;
  };
}

export interface VoiceResponse {
  text: string;
  action?: 'navigate' | 'search' | 'explain' | 'summarize';
  data?: any;
}

class VoiceAssistantService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis;
  private isListening = false;
  private conversationHistory: VoiceCommand[] = [];
  
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeRecognition();
  }
  
  private initializeRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
    }
  }
  
  async processCommand(text: string, context?: any): Promise<VoiceResponse> {
    // Add to conversation history
    this.conversationHistory.push({
      id: `cmd-${Date.now()}`,
      text,
      timestamp: new Date(),
      context
    });
    
    // Process with backend
    try {
      const response = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: text,
          context,
          history: this.conversationHistory.slice(-5) // Last 5 interactions
        })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return {
        text: data.response,
        action: data.action,
        data: data.data
      };
    } catch (error) {
      return {
        text: "I'm having trouble processing that right now. Please try again.",
        action: undefined
      };
    }
  }
  
  speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }) {
    this.synthesis.cancel(); // Stop any current speech
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate || 0.9;
    utterance.pitch = options?.pitch || 1;
    utterance.volume = options?.volume || 1;
    
    this.synthesis.speak(utterance);
  }
  
  startListening(onResult: (text: string) => void, onError?: (error: string) => void) {
    if (!this.recognition) {
      onError?.('Speech recognition not supported');
      return;
    }
    
    this.recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };
    
    this.recognition.onerror = (event: any) => {
      onError?.(event.error);
    };
    
    this.recognition.start();
    this.isListening = true;
  }
  
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
  
  getConversationHistory() {
    return this.conversationHistory;
  }
}

export const voiceAssistantService = new VoiceAssistantService();
