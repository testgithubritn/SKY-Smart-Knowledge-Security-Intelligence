/** GET /api/sky/test-providers — tests each API key independently and returns
 *  the exact status + error message so you know exactly what's wrong. */
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const results: Record<string, unknown> = {};

  // --- Test Groq ---
  try {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      results.groq = { status: "missing", message: "GROQ_API_KEY not set in .env" };
    } else if (!key.startsWith("gsk_")) {
      results.groq = {
        status: "wrong_format",
        message: `Key starts with "${key.slice(0, 4)}" — Groq keys should start with "gsk_". Get a valid key at https://console.groq.com/keys`,
        keyPrefix: key.slice(0, 8) + "...",
      };
    } else {
      const client = new Groq({ apiKey: key });
      const completion = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Reply: OK" }],
        max_tokens: 5,
      });
      results.groq = {
        status: "ok",
        message: "Groq is working!",
        model: "llama-3.3-70b-versatile",
        response: completion.choices[0]?.message?.content ?? "",
      };
    }
  } catch (e) {
    results.groq = {
      status: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  // --- Test Gemini ---
  try {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) {
      results.gemini = { status: "missing", message: "GEMINI_API_KEY not set in .env" };
    } else if (!key.startsWith("AIza")) {
      results.gemini = {
        status: "wrong_format",
        message: `Key starts with "${key.slice(0, 6)}" — standard Gemini API keys start with "AIza". Your key format is unusual. Get a valid key at https://aistudio.google.com/app/apikey`,
        keyPrefix: key.slice(0, 10) + "...",
      };
    } else {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const res = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Reply: OK" }] }],
      });
      results.gemini = {
        status: "ok",
        message: "Gemini is working!",
        model: "gemini-1.5-flash",
        response: res.response.text(),
      };
    }
  } catch (e) {
    results.gemini = {
      status: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  // --- Test OpenAI ---
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      results.openai = { status: "missing", message: "OPENAI_API_KEY not set in .env" };
    } else if (!key.startsWith("sk-")) {
      results.openai = {
        status: "wrong_format",
        message: `Key starts with "${key.slice(0, 6)}" — standard OpenAI keys start with "sk-". If this is from an OpenAI-compatible service (e.g., OpenRouter), set OPENAI_BASE_URL in .env. Get a standard key at https://platform.openai.com/api-keys`,
        keyPrefix: key.slice(0, 10) + "...",
        baseURL: process.env.OPENAI_BASE_URL || "(default: https://api.openai.com/v1)",
      };
    } else {
      const client = new OpenAI({
        apiKey: key,
        ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
      });
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Reply: OK" }],
        max_tokens: 5,
      });
      results.openai = {
        status: "ok",
        message: "OpenAI is working!",
        model: "gpt-4o-mini",
        response: completion.choices[0]?.message?.content ?? "",
      };
    }
  } catch (e) {
    results.openai = {
      status: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  // Summary
  const allOk =
    results.groq?.status === "ok" ||
    results.gemini?.status === "ok" ||
    results.openai?.status === "ok";

  return NextResponse.json({
    summary: allOk
      ? "At least one provider is working. Analysis will succeed."
      : "No providers are working. Check the errors below.",
    results,
  });
}
