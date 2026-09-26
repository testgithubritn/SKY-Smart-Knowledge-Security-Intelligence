/**
 * Gemini provider — uses @google/generative-ai for:
 *  - Image analysis (gemini-2.0-flash or gemini-1.5-flash)
 *  - Video analysis (gemini-1.5-flash supports video_url)
 *  - Multimodal LLM (text + image + video)
 *
 * Reads GEMINI_API_KEY (or GOOGLE_API_KEY) from environment.
 * If not set, all methods throw with a clear error.
 */
import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return null;
  if (!client) {
    client = new GoogleGenerativeAI(key);
  }
  return client;
}

export function isGeminiAvailable(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

export function geminiStatus() {
  return {
    available: isGeminiAvailable(),
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      ? "set ✓"
      : "missing ✗",
    provider: "Google Gemini",
    models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
  };
}

/**
 * Analyze an image with a strict-JSON prompt.
 * Accepts a data URL OR a public HTTP URL.
 * Tries multiple Gemini model names in case one is deprecated.
 */
export async function geminiAnalyzeImage(
  imageDataUrlOrUrl: string,
  prompt: string
): Promise<string> {
  const c = getClient();
  if (!c) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env to enable Gemini vision."
    );
  }
  // Try multiple model names — Google deprecates models frequently
  const modelNames = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemini-pro-vision",
  ];
  let lastErr: unknown = null;
  for (const modelName of modelNames) {
    try {
      const model = c.getGenerativeModel({ model: modelName });
      const parts: Part[] = [{ text: prompt }];
      if (imageDataUrlOrUrl.startsWith("data:")) {
        const match = imageDataUrlOrUrl.match(
          /^data:(image\/[^;]+);base64,(.+)$/i
        );
        if (!match) throw new Error("Invalid image data URL format.");
        parts.push({
          inlineData: { mimeType: match[1], data: match[2] },
        });
      } else {
        parts.push({
          fileData: { mimeType: "image/jpeg", fileUri: imageDataUrlOrUrl },
        });
      }
      const res = await model.generateContent({
        contents: [{ role: "user", parts }],
      });
      return res.response.text() ?? "";
    } catch (e) {
      lastErr = e;
      // 404 = model not found, try next. 400/403 = region/auth issue, throw immediately.
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("404") || msg.includes("no longer available") || msg.includes("not found")) {
        continue;
      }
      // For region errors, throw immediately — no point trying other models
      throw e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("All Gemini models failed");
}

/**
 * Analyze a video with a strict-JSON prompt.
 * Accepts a data URL (base64 mp4/webm) only — Gemini fileData requires
 * Google Cloud Storage URIs, which we can't use in this sandbox.
 */
export async function geminiAnalyzeVideo(
  videoDataUrl: string,
  prompt: string
): Promise<string> {
  const c = getClient();
  if (!c) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env to enable Gemini video analysis."
    );
  }
  const modelNames = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
  let lastErr: unknown = null;
  for (const modelName of modelNames) {
    try {
      const model = c.getGenerativeModel({ model: modelName });
      const parts: Part[] = [{ text: prompt }];
      if (videoDataUrl.startsWith("data:")) {
        const match = videoDataUrl.match(/^data:(video\/[^;]+);base64,(.+)$/i);
        if (!match) throw new Error("Invalid video data URL format.");
        parts.push({
          inlineData: { mimeType: match[1], data: match[2] },
        });
      } else {
        throw new Error(
          "Video analysis requires a data URL (base64 mp4). HTTP URLs are not supported by Gemini inline."
        );
      }
      const res = await model.generateContent({
        contents: [{ role: "user", parts }],
      });
      return res.response.text() ?? "";
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("404") || msg.includes("no longer available") || msg.includes("not found")) {
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("All Gemini video models failed");
}

/**
 * Run a text-only LLM completion with Gemini (used as fallback for Groq).
 */
export async function geminiChat(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const c = getClient();
  if (!c) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env to enable Gemini LLM."
    );
  }
  const modelNames = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  let lastErr: unknown = null;
  for (const modelName of modelNames) {
    try {
      const model = c.getGenerativeModel({ model: modelName });
      const res = await model.generateContent({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
        ],
      });
      return res.response.text() ?? "";
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("404") || msg.includes("no longer available") || msg.includes("not found")) {
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("All Gemini LLM models failed");
}
