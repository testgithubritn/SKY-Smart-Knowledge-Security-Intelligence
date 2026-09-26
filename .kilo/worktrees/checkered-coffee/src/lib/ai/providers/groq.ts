/**
 * Groq provider — uses groq-sdk for:
 *  - Whisper ASR (audio transcription)
 *  - Llama-3.3-70b LLM (text classification, report generation)
 *
 * Reads GROQ_API_KEY from environment. If not set, all methods throw
 * with a clear error so the UI can prompt the user to set it.
 */
import Groq from "groq-sdk";

let client: Groq | null = null;

function getClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

export function isGroqAvailable(): boolean {
  return !!process.env.GROQ_API_KEY;
}

export function groqStatus() {
  return {
    available: isGroqAvailable(),
    apiKey: process.env.GROQ_API_KEY ? "set ✓" : "missing ✗",
    provider: "Groq",
    models: ["whisper-large-v3", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  };
}

/**
 * Transcribe audio using Groq's Whisper-large-v3.
 * Accepts a base64 string OR a data URL.
 */
export async function groqTranscribe(audioBase64OrDataUrl: string): Promise<string> {
  const c = getClient();
  if (!c) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env to enable Groq Whisper ASR."
    );
  }
  // Extract mime + base64 from data URL, or assume audio/wav
  let mimeType = "audio/wav";
  let base64 = audioBase64OrDataUrl;
  const match = audioBase64OrDataUrl.match(/^data:(audio\/[^;]+);base64,(.+)$/i);
  if (match) {
    mimeType = match[1];
    base64 = match[2];
  }
  // Convert base64 to Blob for Groq SDK
  const buffer = Buffer.from(base64, "base64");
  const blob = new Blob([buffer], { type: mimeType });
  const file = new File([blob], "audio.wav", { type: mimeType });

  const res = await c.audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
    response_format: "json",
    language: "en",
  });
  return (res.text ?? "").trim();
}

/**
 * Run an LLM completion with Groq's Llama-3.3-70b.
 * Returns the assistant's text response.
 */
export async function groqChat(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const c = getClient();
  if (!c) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env to enable Groq LLM."
    );
  }
  const completion = await c.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 1500,
    response_format: { type: "json_object" as const },
  });
  return completion.choices[0]?.message?.content ?? "";
}
