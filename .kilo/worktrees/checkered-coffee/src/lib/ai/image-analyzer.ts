/**
 * Image analyzer — uses Gemini (vision) → OpenAI (vision) via the
 * provider orchestrator
 *
 * Prompts Gemini/GPT-4o with a strict-JSON security brief, parses the
 * response, then runs RAG retrieval for evidence.
 */
import { analyzeImageWithProviders } from "./providers";
import { mapCategory, retrieveEvidence, type RagEvidence } from "./rag";

export interface ImageAnalysisResult {
  categories: string[];
  riskLevel: "low" | "moderate" | "high" | "critical";
  confidence: number;
  explanation: string;
  evidence: RagEvidence[];
  rawResponse: string;
  provider: string;
}

const IMAGE_PROMPT = `You are SKY, a security-intelligence analyst reviewing surveillance / user-uploaded images for an AI-assisted decision-support platform. Your output is advisory and will be reviewed by a human.

Carefully examine this image for any of the following security-relevant activities:
- violence, physical assault, brawl, raised weapons
- theft, snatch-theft, shoplifting, pickpocketing
- unauthorized-entry, intrusion, perimeter breach
- fire, smoke, arson
- accident, vehicle collision, injury on ground
- fraud cues (skimmers on ATMs, modified POS terminals, suspicious hardware)
- manipulated-media cues (deepfake artifacts, inconsistent facial geometry)

Respond with STRICT JSON only (no markdown, no prose). Use this exact schema:
{
  "categories": ["array of one-word category labels from the list above, lowercase, kebab-case; empty array if nothing suspicious"],
  "riskLevel": "low | moderate | high | critical",
  "confidence": "number 0-1 indicating your confidence in the detection",
  "explanation": "2-4 sentences explaining what you observed and why you reached this risk level. Be specific about visible cues."
}

If the image shows nothing concerning, return {"categories":[],"riskLevel":"low","confidence":0.1,"explanation":"No security-relevant activity detected in this image."}`;

interface VLMJson {
  categories?: string[];
  riskLevel?: string;
  confidence?: number;
  explanation?: string;
}

function parseVlmJson(raw: string): VLMJson {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    s = s.slice(start, end + 1);
  }
  try {
    return JSON.parse(s) as VLMJson;
  } catch {
    return {};
  }
}

function normalizeRisk(
  v: string | undefined
): "low" | "moderate" | "high" | "critical" {
  const r = (v ?? "low").toLowerCase();
  if (r.includes("crit")) return "critical";
  if (r.includes("high")) return "high";
  if (r.includes("mod")) return "moderate";
  return "low";
}

export async function analyzeImage(
  imageDataUrl: string
): Promise<ImageAnalysisResult> {
  const { response: raw, provider } = await analyzeImageWithProviders(
    imageDataUrl,
    IMAGE_PROMPT
  );
  const parsed = parseVlmJson(raw);
  const categories = (parsed.categories ?? []).map((c) => c.toLowerCase());
  const riskLevel = normalizeRisk(parsed.riskLevel);
  const confidence = Number(parsed.confidence ?? 0.3) || 0.3;
  const explanation =
    parsed.explanation ??
    "AI analysis did not return a structured explanation.";

  const evidence = await retrieveEvidence({
    modality: "image",
    categories: categories.map(mapCategory),
    explanation,
  });

  return {
    categories,
    riskLevel,
    confidence,
    explanation,
    evidence,
    rawResponse: raw,
    provider,
  };
}
