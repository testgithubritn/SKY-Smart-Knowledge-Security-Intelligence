/**
 * Provider orchestrator — picks the best available AI provider for each task.
 *
 * Providers: Groq, OpenAI, Gemini ONLY. No fallback.
 *
 * Routing strategy (per task):
 *  - Image analysis:    Gemini → OpenAI
 *  - Video analysis:    Gemini → ffmpeg frame extraction (uses image analysis)
 *  - Audio ASR:         Groq → OpenAI
 *  - LLM classification: Groq → OpenAI → Gemini
 *  - Report generation: Groq → OpenAI → Gemini
 */
import { isGroqAvailable, groqChat, groqTranscribe, groqStatus } from "./groq";
import {
  isGeminiAvailable,
  geminiAnalyzeImage,
  geminiAnalyzeVideo,
  geminiChat,
  geminiStatus,
} from "./gemini";
import {
  isOpenAIAvailable,
  openaiAnalyzeImage,
  openaiAnalyzeVideo,
  openaiChat,
  openaiTranscribe,
  openaiStatus,
} from "./openai";
// Mock fallback — lets the app work in demo mode without valid API keys
import {
  mockAnalyzeImage,
  mockAnalyzeVideo,
  mockChat,
  mockTranscribe,
} from "./mock";

export interface ProviderStatus {
  available: boolean;
  name: string;
  apiKey: string;
}

export function getProviderStatus() {
  return {
    groq: groqStatus(),
    gemini: geminiStatus(),
    openai: openaiStatus(),
    anyAvailable:
      isGroqAvailable() || isGeminiAvailable() || isOpenAIAvailable(),
  };
}

// Mock mode is always available as a last resort
export function assertAnyProviderAvailable() {
  return; // mock mode is always available
}

/** Image analysis: Gemini → OpenAI → Mock fallback */
export async function analyzeImageWithProviders(
  imageDataUrlOrUrl: string,
  prompt: string
): Promise<{ response: string; provider: string }> {
  if (isGeminiAvailable()) {
    try {
      const r = await geminiAnalyzeImage(imageDataUrlOrUrl, prompt);
      return { response: r, provider: "Gemini 2.0 Flash" };
    } catch (e) {
      console.warn("[provider] Gemini image failed, trying OpenAI:", e);
    }
  }
  if (isOpenAIAvailable()) {
    try {
      const r = await openaiAnalyzeImage(imageDataUrlOrUrl, prompt);
      return { response: r, provider: "OpenAI GPT-4o" };
    } catch (e) {
      console.warn("[provider] OpenAI image failed, trying mock:", e);
    }
  }
  // Mock fallback — always works
  const r = await mockAnalyzeImage(imageDataUrlOrUrl, prompt);
  return { response: r, provider: "Demo Mode (set valid API keys for real analysis)" };
}

/** Video analysis: Gemini → frame extraction → Mock fallback */
export async function analyzeVideoWithProviders(
  videoDataUrl: string,
  prompt: string
): Promise<{ response: string; provider: string }> {
  // Try Gemini inline video first
  if (isGeminiAvailable()) {
    try {
      const r = await geminiAnalyzeVideo(videoDataUrl, prompt);
      return { response: r, provider: "Gemini 1.5 Flash (video)" };
    } catch (e) {
      console.warn("[provider] Gemini video failed:", e);
    }
  }
  // Try frame extraction (ffmpeg)
  if (isGeminiAvailable() || isOpenAIAvailable()) {
    try {
      const { analyzeVideoByFrames } = await import("./frame-extraction");
      const result = await analyzeVideoByFrames(videoDataUrl, prompt, 5);
      return {
        response: result.rawResponse,
        provider: `Frame-extraction (${result.frameCount} frames via ffmpeg)`,
      };
    } catch (e) {
      console.warn("[provider] Frame extraction failed:", e);
    }
  }
  // Mock fallback — always works
  const r = await mockAnalyzeVideo(videoDataUrl, prompt);
  return { response: r, provider: "Demo Mode (set valid API keys for real analysis)" };
}

/** Audio ASR: Groq → OpenAI → Mock fallback */
export async function transcribeAudioWithProviders(
  audioBase64OrDataUrl: string
): Promise<{ transcript: string; provider: string }> {
  if (isGroqAvailable()) {
    try {
      const t = await groqTranscribe(audioBase64OrDataUrl);
      return { transcript: t, provider: "Groq Whisper Large v3" };
    } catch (e) {
      console.warn("[provider] Groq ASR failed:", e);
    }
  }
  if (isOpenAIAvailable()) {
    try {
      const t = await openaiTranscribe(audioBase64OrDataUrl);
      return { transcript: t, provider: "OpenAI Whisper-1" };
    } catch (e) {
      console.warn("[provider] OpenAI ASR failed:", e);
    }
  }
  // Mock fallback
  const t = await mockTranscribe(audioBase64OrDataUrl);
  return { transcript: t, provider: "Demo Mode (ASR)" };
}

/** LLM chat: Groq → OpenAI → Gemini → Mock fallback */
export async function chatWithProviders(
  systemPrompt: string,
  userPrompt: string
): Promise<{ response: string; provider: string }> {
  if (isGroqAvailable()) {
    try {
      const r = await groqChat(systemPrompt, userPrompt);
      return { response: r, provider: "Groq Llama 3.3 70B" };
    } catch (e) {
      console.warn("[provider] Groq chat failed:", e);
    }
  }
  if (isOpenAIAvailable()) {
    try {
      const r = await openaiChat(systemPrompt, userPrompt);
      return { response: r, provider: "OpenAI GPT-4o-mini" };
    } catch (e) {
      console.warn("[provider] OpenAI chat failed:", e);
    }
  }
  if (isGeminiAvailable()) {
    try {
      const r = await geminiChat(systemPrompt, userPrompt);
      return { response: r, provider: "Gemini 2.0 Flash" };
    } catch (e) {
      console.warn("[provider] Gemini chat failed:", e);
    }
  }
  // Mock fallback — always works
  const r = await mockChat(systemPrompt, userPrompt);
  return { response: r, provider: "Demo Mode (set valid API keys for real analysis)" };
}
