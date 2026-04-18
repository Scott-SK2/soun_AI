/**
 * Voice / NLP service — delegates to soun_AI FastAPI.
 * Replaces the direct OpenAI SDK calls; same public interface is preserved.
 *
 * LLM backend (GPT-4o or Phi-3 Mini) is controlled by the FastAPI's
 * LLM_BACKEND env var — Soun itself no longer needs OPENAI_API_KEY.
 */

import { apiVoiceCommand, apiDetectIntent } from "./soun-ai-client";

// ── Interfaces (unchanged) ─────────────────────────────────────────────────

export interface EmotionDetectionResult {
  primaryEmotion: string;
  confidence: number;
  secondaryEmotions: { emotion: string; confidence: number }[];
  emotionalTone: "positive" | "negative" | "neutral";
}

export interface AcousticAnalysisResult {
  clarity: number;
  pacing: number;
  volume: number;
  backgroundNoise: number;
  improvements: string[];
}

// ── NLP ────────────────────────────────────────────────────────────────────

export async function processWithNLP(text: string): Promise<string> {
  try {
    const result = await apiVoiceCommand(text, [], [], "en");
    return result.response || "I couldn't process that. Could you rephrase your request?";
  } catch (err) {
    console.error("[openai-service] processWithNLP error:", err);
    return generateFallbackResponse(text);
  }
}

// ── Emotion detection ──────────────────────────────────────────────────────

export async function detectEmotion(text: string): Promise<EmotionDetectionResult> {
  try {
    const intent = await apiDetectIntent(text, "", "en");
    const emotion = intent.emotion || "neutral";
    const tone: "positive" | "negative" | "neutral" =
      ["happy", "excited", "satisfied"].includes(emotion)
        ? "positive"
        : ["frustrated", "sad", "angry", "confused"].includes(emotion)
        ? "negative"
        : "neutral";
    return {
      primaryEmotion: emotion,
      confidence: intent.confidence ?? 0.6,
      secondaryEmotions: [{ emotion: "interested", confidence: 0.4 }],
      emotionalTone: tone,
    };
  } catch {
    return generateFallbackEmotionAnalysis(text);
  }
}

// ── Acoustics (local only — no server equivalent) ──────────────────────────

export async function analyzeAcoustics(
  _audioDescription: string,
): Promise<AcousticAnalysisResult> {
  return generateFallbackAcousticAnalysis();
}

// ── Advanced voice command ─────────────────────────────────────────────────

export async function processAdvancedVoiceCommand(
  text: string,
  context?: {
    userId?: number;
    courseId?: string;
    previousInteractions?: { role: string; content: string }[];
    emotionalState?: string;
    speechQuality?: AcousticAnalysisResult;
    documentContext?: string;
    availableDocuments?: { title: string; summary?: string }[];
    userProfile?: { name?: string; school?: string; program?: string; year?: string };
    contextSwitch?: { detectedCourse: string; switchedFrom: string | null; confidence: number };
    audioFeatures?: { pitch: number; speed: number; volume: number; pauses: number };
  },
): Promise<{
  response: string;
  category: string;
  confidenceScore: number;
  emotionDetected?: EmotionDetectionResult;
  suggestedFollowUp?: string[];
  action?: string;
  data?: unknown;
  contextSwitch?: unknown;
  adaptiveResponse?: {
    originalResponse: string;
    adaptedResponse: string;
    adaptationReason: string;
    emotionalSupport: string[];
  };
}> {
  try {
    const history = (context?.previousInteractions ?? []).slice(-10);
    const userId = context?.userId?.toString() ?? "default";
    const courseId = context?.courseId ?? "default_course";

    const result = await apiVoiceCommand(text, history, [], "en", userId, courseId);
    const emotion = await detectEmotion(text);

    return {
      response: result.response,
      category: result.action || determineFallbackCategory(text),
      confidenceScore: 0.85,
      emotionDetected: emotion,
      suggestedFollowUp: [],
      action: result.action || undefined,
      data: result.parameters || undefined,
    };
  } catch (err) {
    console.error("[openai-service] processAdvancedVoiceCommand error:", err);
    return {
      response: generateFallbackResponse(text),
      category: determineFallbackCategory(text),
      confidenceScore: 0.7,
    };
  }
}

export function isOpenAIConfigured(): boolean {
  // FastAPI is always available as long as SOUN_AI_URL is reachable
  return true;
}

// ── Local fallbacks ────────────────────────────────────────────────────────

function generateFallbackResponse(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("hello") || t.includes("hi")) return "Hello! How can I help with your studies today?";
  if (t.includes("help")) return "I can help you with quizzes, explanations, planning, and tracking your progress.";
  if (t.includes("quiz") || t.includes("test")) return "I'd be happy to quiz you. What subject would you like to focus on?";
  if (t.includes("explain")) return "I'd be happy to explain that concept. Could you give me more details?";
  if (t.includes("progress")) return "Let me check your progress. Which course would you like to review?";
  return "I'm here to help with your studies. Could you be more specific?";
}

function determineFallbackCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("quiz") || t.includes("test") || t.includes("exam")) return "Quiz";
  if (t.includes("schedule") || t.includes("plan")) return "Planning";
  if (t.includes("explain") || t.includes("what is") || t.includes("how")) return "Learning";
  if (t.includes("progress") || t.includes("stats")) return "Progress";
  if (t.includes("presentation")) return "Presentation";
  return "General";
}

function generateFallbackEmotionAnalysis(text: string): EmotionDetectionResult {
  const t = text.toLowerCase();
  const positive = ["happy", "glad", "excited", "great", "excellent"].some((w) => t.includes(w));
  const negative = ["sad", "angry", "frustrated", "bad", "annoyed"].some((w) => t.includes(w));
  return {
    primaryEmotion: positive ? "happy" : negative ? "frustrated" : "neutral",
    confidence: 0.6,
    secondaryEmotions: [{ emotion: "interested", confidence: 0.4 }],
    emotionalTone: positive ? "positive" : negative ? "negative" : "neutral",
  };
}

function generateFallbackAcousticAnalysis(): AcousticAnalysisResult {
  return {
    clarity: 0.8,
    pacing: 0.7,
    volume: 0.8,
    backgroundNoise: 0.2,
    improvements: ["Try to speak slightly louder for better recognition"],
  };
}

function analyzeAudioEmotion(audioFeatures: {
  pitch: number;
  speed: number;
  volume: number;
  pauses: number;
}): EmotionDetectionResult {
  let primaryEmotion = "neutral";
  let emotionalTone: "positive" | "negative" | "neutral" = "neutral";
  let confidence = 0.6;

  if (audioFeatures.pitch > 0.7 && audioFeatures.speed > 0.8 && audioFeatures.pauses > 0.6) {
    primaryEmotion = "frustrated"; emotionalTone = "negative"; confidence = 0.8;
  } else if (audioFeatures.volume < 0.4 && audioFeatures.speed < 0.5 && audioFeatures.pauses > 0.5) {
    primaryEmotion = "confused"; emotionalTone = "neutral"; confidence = 0.75;
  } else if (audioFeatures.volume > 0.7 && audioFeatures.pitch > 0.5 && audioFeatures.speed > 0.6) {
    primaryEmotion = "excited"; emotionalTone = "positive"; confidence = 0.7;
  } else if (audioFeatures.volume < 0.3 && audioFeatures.speed < 0.4) {
    primaryEmotion = "discouraged"; emotionalTone = "negative"; confidence = 0.65;
  }

  return {
    primaryEmotion,
    confidence,
    secondaryEmotions: [{ emotion: "interested", confidence: 0.4 }],
    emotionalTone,
  };
}
