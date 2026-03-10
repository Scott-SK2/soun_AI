import OpenAI from "openai";

// Check if we have an API key
const apiKey = process.env.OPENAI_API_KEY;

// Initialize OpenAI client if API key is available
const openai = apiKey ? new OpenAI({ apiKey }) : null;

// Interface for emotion detection results
export interface EmotionDetectionResult {
  primaryEmotion: string;
  confidence: number;
  secondaryEmotions: { emotion: string; confidence: number }[];
  emotionalTone: 'positive' | 'negative' | 'neutral';
}

// Interface for acoustic analysis results
export interface AcousticAnalysisResult {
  clarity: number;  // 0-1 rating of speech clarity
  pacing: number;   // speech rate analysis (words per minute normalized to 0-1)
  volume: number;   // normalized volume level 0-1
  backgroundNoise: number; // estimated background noise level 0-1
  improvements: string[]; // suggestions for improvement
}

/**
 * Process text using NLP capabilities
 * @param text The text to process
 * @returns The processed response
 */
export async function processWithNLP(text: string): Promise<string> {
  try {
    if (!openai) {
      console.log("OpenAI API key not available. Using fallback NLP processing.");
      return generateFallbackResponse(text);
    }

    console.log("Processing with OpenAI NLP:", text);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system" as const, 
          content: `You are an advanced educational assistant helping a student. 
                   Respond with concise, accurate, and helpful information. 
                   If you're unsure about something, acknowledge the limits of your knowledge.
                   Focus on providing educational value.`
        },
        { role: "user" as const, content: text }
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content || "I couldn't process that. Could you rephrase your request?";
  } catch (error) {
    console.error("Error processing with NLP:", error);
    return "I'm having trouble processing that right now. Please try again later.";
  }
}

/**
 * Analyze the emotion in text
 * @param text The text to analyze for emotion
 * @returns Emotion analysis result
 */
export async function detectEmotion(text: string): Promise<EmotionDetectionResult> {
  try {
    if (!openai) {
      console.log("OpenAI API key not available. Using fallback emotion detection.");
      return generateFallbackEmotionAnalysis(text);
    }

    console.log("Analyzing emotion with OpenAI:", text);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system" as const, 
          content: "Analyze the emotion in the following text and return a JSON object with the primary emotion, confidence (0-1), secondary emotions with their confidence scores, and overall emotional tone (positive/negative/neutral)."
        },
        { role: "user" as const, content: text }
      ],
      response_format: { type: "json_object" },
    });

    const resultText = response.choices[0].message.content || "{}";
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Error detecting emotion:", error);
    return generateFallbackEmotionAnalysis(text);
  }
}

/**
 * Analyze the acoustic qualities of speech
 * This would normally use audio processing APIs, but for this example,
 * we're simulating with text description of audio
 * @param audioDescription Description of audio to analyze
 * @returns Acoustic analysis results
 */
export async function analyzeAcoustics(audioDescription: string): Promise<AcousticAnalysisResult> {
  try {
    if (!openai) {
      console.log("OpenAI API key not available. Using fallback acoustic analysis.");
      return generateFallbackAcousticAnalysis();
    }

    console.log("Analyzing acoustics with OpenAI:", audioDescription);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system" as const, 
          content: "Analyze the described audio and return a JSON object with clarity (0-1), pacing (0-1), volume (0-1), backgroundNoise (0-1), and an array of improvement suggestions."
        },
        { role: "user" as const, content: audioDescription }
      ],
      response_format: { type: "json_object" },
    });

    const resultText = response.choices[0].message.content || "{}";
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Error analyzing acoustics:", error);
    return generateFallbackAcousticAnalysis();
  }
}

/**
 * Advanced voice assistant processing combining NLP, emotion, and context
 * @param text The text to process
 * @param context Additional context about the user or situation
 * @returns Enhanced response
 */
export async function processAdvancedVoiceCommand(
  text: string, 
  context?: { 
    userId?: number, 
    courseId?: string, 
    previousInteractions?: {role: string, content: string}[],
    emotionalState?: string,
    speechQuality?: AcousticAnalysisResult,
    documentContext?: string,
    availableDocuments?: { title: string, summary?: string }[],
    userProfile?: {
      name?: string;
      school?: string;
      program?: string;
      year?: string;
    },
    contextSwitch?: {
      detectedCourse: string,
      switchedFrom: string | null,
      confidence: number
    },
    audioFeatures?: {
      pitch: number;
      speed: number;
      volume: number;
      pauses: number;
    }
  }
): Promise<{
  response: string,
  category: string,
  confidenceScore: number,
  emotionDetected?: EmotionDetectionResult,
  suggestedFollowUp?: string[],
  action?: string,
  data?: any,
  contextSwitch?: any,
  adaptiveResponse?: {
    originalResponse: string;
    adaptedResponse: string;
    adaptationReason: string;
    emotionalSupport: string[];
  }
}> {
  try {
    if (!openai) {
      console.log("OpenAI API key not available. Using fallback advanced processing.");
      return {
        response: generateFallbackResponse(text),
        category: determineFallbackCategory(text),
        confidenceScore: 0.7
      };
    }

    // First, detect emotion from text and audio features
    const emotionDetected = await detectEmotion(text);
    
    // Analyze audio features for additional emotional cues
    let emotionalContext = "";
    if (context?.audioFeatures) {
      const audioEmotion = analyzeAudioEmotion(context.audioFeatures);
      emotionalContext = ` Audio analysis suggests: ${audioEmotion.primaryEmotion} (confidence: ${audioEmotion.confidence}).`;
      
      // Combine text and audio emotion detection
      if (audioEmotion.confidence > emotionDetected.confidence) {
        emotionDetected.primaryEmotion = audioEmotion.primaryEmotion;
        emotionDetected.confidence = audioEmotion.confidence;
        emotionDetected.emotionalTone = audioEmotion.emotionalTone;
      }
    }

    // Construct rich context for the AI
    let contextDescription = "The user is a student using an educational assistant.";
    if (context) {
      if (context.courseId) {
        contextDescription += ` They are currently studying course ${context.courseId}.`;
      }
      if (context.contextSwitch) {
        contextDescription += ` IMPORTANT: The user has automatically switched context from ${context.contextSwitch.switchedFrom || 'general'} to course ${context.contextSwitch.detectedCourse} based on their question. Focus your response on ${context.contextSwitch.detectedCourse} course materials and context.`;
      }
      if (context.emotionalState) {
        contextDescription += ` They appear to be ${context.emotionalState}.`;
      }
      if (context.speechQuality) {
        const sq = context.speechQuality;
        contextDescription += ` Their speech has clarity: ${sq.clarity}, pacing: ${sq.pacing}, volume: ${sq.volume}.`;
      }
      if (context.availableDocuments && context.availableDocuments.length > 0) {
        contextDescription += ` Available study materials: ${context.availableDocuments.map(d => d.title).join(', ')}.`;
      }
      if (context.documentContext) {
        contextDescription += ` Use the following course materials to answer questions: ${context.documentContext.substring(0, 2000)}...`;
      }
    }

    // Add emotional context
    contextDescription += ` EMOTION DETECTED: ${emotionDetected.primaryEmotion} (${emotionDetected.emotionalTone}) with ${Math.round(emotionDetected.confidence * 100)}% confidence.${emotionalContext}`;
    
    // Add adaptive instructions based on detected emotion
    if (emotionDetected.primaryEmotion === 'frustrated' || emotionDetected.emotionalTone === 'negative') {
      contextDescription += ` IMPORTANT: The student appears frustrated. Use a more patient, supportive tone. Break down complex concepts into simpler steps. Offer encouragement and alternative explanations.`;
    } else if (emotionDetected.primaryEmotion === 'confused' || text.toLowerCase().includes('don\'t understand')) {
      contextDescription += ` IMPORTANT: The student seems confused. Provide clearer, more detailed explanations with examples. Ask if they need clarification on specific parts.`;
    } else if (emotionDetected.primaryEmotion === 'excited' || emotionDetected.emotionalTone === 'positive') {
      contextDescription += ` IMPORTANT: The student seems engaged and positive. Match their energy and consider offering more advanced or challenging content.`;
    }

    // Previous conversation context
    const messages = [
      {
        role: "system" as const,
        content: `You are an advanced educational voice assistant with expertise in helping students learn effectively.
                 Respond with helpful, accurate information that enhances their understanding.
                 ${contextDescription}
                 
                 Special capabilities:
                 - If user asks for examples after an explanation, suggest they use "Get Examples" feature
                 - If user asks to explain something, provide the explanation and mention examples are available
                 - Personalize responses based on user's academic background when available
                 
                 Analyze the user's query and respond with JSON in the following format:
                 {
                   "response": "Your helpful response to the user",
                   "category": "One of: Quiz, Planning, Learning, Progress, System, Presentation, Examples, General",
                   "confidenceScore": 0.1-1.0,
                   "emotionDetected": {
                     "primaryEmotion": "identified emotion",
                     "confidence": 0.1-1.0
                   },
                   "suggestedFollowUp": ["1-3 follow-up questions or suggestions"],
                   "action": "Optional: 'generate_examples' if user requests examples",
                   "data": "Optional: additional data for actions",
                   "adaptiveResponse": {
                     "originalResponse": "Standard response without emotional adaptation",
                     "adaptedResponse": "Response adapted for detected emotion",
                     "adaptationReason": "Why the response was adapted",
                     "emotionalSupport": ["Supportive phrases or encouragement"]
                   }
                 }`
      }
    ] as OpenAI.Chat.ChatCompletionMessageParam[];

    // Add conversation history if available
    if (context?.previousInteractions && context.previousInteractions.length > 0) {
      // Add up to 5 previous interactions for context
      const recentInteractions = context.previousInteractions.slice(-10);
      
      // Convert to proper OpenAI message format
      for (const interaction of recentInteractions) {
        if (interaction.role === 'user') {
          messages.push({
            role: "user" as const,
            content: interaction.content
          });
        } else if (interaction.role === 'assistant') {
          messages.push({
            role: "assistant" as const,
            content: interaction.content
          });
        } else if (interaction.role === 'system') {
          messages.push({
            role: "system" as const,
            content: interaction.content
          });
        }
      }
    }

    // Add the current user query
    messages.push({ role: "user" as const, content: text });

    console.log("Processing advanced voice command with OpenAI");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages,
      response_format: { type: "json_object" },
    });

    const resultText = response.choices[0].message.content || "{}";
    const result = JSON.parse(resultText);
    
    // Enhance result with detected emotion
    result.emotionDetected = emotionDetected;
    
    return result;
  } catch (error) {
    console.error("Error in advanced voice processing:", error);
    return {
      response: generateFallbackResponse(text),
      category: determineFallbackCategory(text),
      confidenceScore: 0.7
    };
  }
}

// Fallback functions when OpenAI is not available

function generateFallbackResponse(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("hello") || lowerText.includes("hi")) {
    return "Hello! How can I help with your studies today?";
  } else if (lowerText.includes("help")) {
    return "I can help you with quizzes, explanations, planning, and tracking your progress. What would you like assistance with?";
  } else if (lowerText.includes("quiz") || lowerText.includes("test")) {
    return "I'd be happy to quiz you. What subject would you like to focus on?";
  } else if (lowerText.includes("explain")) {
    return "I'd be happy to explain that concept. Could you provide more specific details about what you'd like to learn?";
  } else if (lowerText.includes("progress")) {
    return "Let me check your progress. Which course would you like to review?";
  } else if (lowerText.includes("presentation")) {
    return "I can help you prepare for your presentation. Would you like to practice now?";
  } else {
    return "I'm here to help with your studies. Could you be more specific about what you'd like assistance with?";
  }
}

function determineFallbackCategory(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("quiz") || lowerText.includes("test") || lowerText.includes("exam")) {
    return "Quiz";
  } else if (lowerText.includes("schedule") || lowerText.includes("plan") || lowerText.includes("assignment")) {
    return "Planning";
  } else if (lowerText.includes("explain") || lowerText.includes("what is") || lowerText.includes("how to")) {
    return "Learning";
  } else if (lowerText.includes("progress") || lowerText.includes("stats")) {
    return "Progress";
  } else if (lowerText.includes("presentation") || lowerText.includes("rehearse")) {
    return "Presentation";
  } else if (lowerText.includes("help") || lowerText.includes("settings")) {
    return "System";
  } else {
    return "General";
  }
}

function generateFallbackEmotionAnalysis(text: string): EmotionDetectionResult {
  // Very basic sentiment detection
  const lowerText = text.toLowerCase();
  let primaryEmotion = "neutral";
  let emotionalTone: 'positive' | 'negative' | 'neutral' = 'neutral';
  
  // Simple word-based detection
  const positiveWords = ["happy", "glad", "excited", "pleased", "good", "great", "excellent"];
  const negativeWords = ["sad", "angry", "upset", "frustrated", "bad", "terrible", "annoyed"];
  
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) {
    primaryEmotion = "happy";
    emotionalTone = 'positive';
  } else if (negativeCount > positiveCount) {
    primaryEmotion = "frustrated";
    emotionalTone = 'negative';
  }
  
  return {
    primaryEmotion,
    confidence: 0.6,
    secondaryEmotions: [
      { emotion: "interested", confidence: 0.4 },
      { emotion: "curious", confidence: 0.3 }
    ],
    emotionalTone
  };
}

function generateFallbackAcousticAnalysis(): AcousticAnalysisResult {
  return {
    clarity: 0.8,
    pacing: 0.7,
    volume: 0.8,
    backgroundNoise: 0.2,
    improvements: [
      "Try to speak slightly louder for better recognition",
      "Reduce background noise if possible"
    ]
  };
}

/**
 * Analyze audio features to detect emotional state
 * @param audioFeatures Audio characteristics
 * @returns Emotion analysis from audio
 */
function analyzeAudioEmotion(audioFeatures: {
  pitch: number;
  speed: number;
  volume: number;
  pauses: number;
}): EmotionDetectionResult {
  let primaryEmotion = "neutral";
  let emotionalTone: 'positive' | 'negative' | 'neutral' = 'neutral';
  let confidence = 0.6;

  // High pitch + fast speech + many pauses = frustrated/anxious
  if (audioFeatures.pitch > 0.7 && audioFeatures.speed > 0.8 && audioFeatures.pauses > 0.6) {
    primaryEmotion = "frustrated";
    emotionalTone = 'negative';
    confidence = 0.8;
  }
  // Low volume + slow speech + many pauses = confused/uncertain
  else if (audioFeatures.volume < 0.4 && audioFeatures.speed < 0.5 && audioFeatures.pauses > 0.5) {
    primaryEmotion = "confused";
    emotionalTone = 'neutral';
    confidence = 0.75;
  }
  // High volume + moderate pitch + fast speech = excited/engaged
  else if (audioFeatures.volume > 0.7 && audioFeatures.pitch > 0.5 && audioFeatures.speed > 0.6) {
    primaryEmotion = "excited";
    emotionalTone = 'positive';
    confidence = 0.7;
  }
  // Very low volume + slow speech = sad/discouraged
  else if (audioFeatures.volume < 0.3 && audioFeatures.speed < 0.4) {
    primaryEmotion = "discouraged";
    emotionalTone = 'negative';
    confidence = 0.65;
  }

  return {
    primaryEmotion,
    confidence,
    secondaryEmotions: [
      { emotion: "interested", confidence: 0.4 },
      { emotion: "focused", confidence: 0.3 }
    ],
    emotionalTone
  };
}

// Check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return !!openai;
}