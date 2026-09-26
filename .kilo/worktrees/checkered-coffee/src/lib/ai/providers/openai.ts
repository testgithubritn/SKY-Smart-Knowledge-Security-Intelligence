/**
 * OpenAI provider — uses openai SDK for:
 *  - GPT-4o vision (image + video analysis)
 *  - GPT-4o-mini LLM (text classification, report generation)
 *  - Whisper-1 ASR (audio transcription)
 *
 * Reads OPENAI_API_KEY from environment. If not set, all methods throw.
 *
 * Supports custom base URL via OPENAI_BASE_URL env var — useful for
 * OpenAI-compatible services (OpenRouter, Together, Anyscale, internal
 * proxies, etc.) that use the same SDK.
 */
import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // Allow custom base URL for OpenAI-compatible services
      // (e.g. OPENAI_BASE_URL=https://api.openrouter.ai/api/v1)
      ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    });
  }
  return client;
}

export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function openaiStatus() {
  return {
    available: isOpenAIAvailable(),
    apiKey: process.env.OPENAI_API_KEY ? "set ✓" : "missing ✗",
    provider: "OpenAI",
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1 (default)",
    models: ["gpt-4o", "gpt-4o-mini", "whisper-1"],
  };
}

/** Analyze image with GPT-4o (vision). Accepts data URL or HTTP URL. */
export async function openaiAnalyzeImage(
  imageDataUrlOrUrl: string,
  prompt: string
): Promise<string> {
  const c = getClient();
  if (!c) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env to enable OpenAI vision."
    );
  }
  const res = await c.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: imageDataUrlOrUrl, detail: "high" },
          },
        ],
      },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

/** Analyze video with GPT-4o (vision). Accepts data URL only. */
export async function openaiAnalyzeVideo(
  videoDataUrl: string,
  prompt: string
): Promise<string> {
  // OpenAI does not yet support video inline; convert video frames to images OR
  // use Gemini for video. We'll throw a clear error here.
  throw new Error(
    "OpenAI does not support inline video. Use Gemini for video analysis."
  );
}

/** Transcribe audio with OpenAI Whisper-1. */
export async function openaiTranscribe(audioBase64OrDataUrl: string): Promise<string> {
  const c = getClient();
  if (!c) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env to enable OpenAI Whisper."
    );
  }
  let mimeType = "audio/wav";
  let base64 = audioBase64OrDataUrl;
  const match = audioBase64OrDataUrl.match(/^data:(audio\/[^;]+);base64,(.+)$/i);
  if (match) {
    mimeType = match[1];
    base64 = match[2];
  }
  const buffer = Buffer.from(base64, "base64");
  const file = new File([new Blob([buffer], { type: mimeType })], "audio.wav", {
    type: mimeType,
  });
  const res = await c.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "json",
  });
  return (res.text ?? "").trim();
}

/** LLM chat with GPT-4o-mini. */
export async function openaiChat(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const c = getClient();
  if (!c) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env to enable OpenAI LLM."
    );
  }
  const res = await c.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 1500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}
