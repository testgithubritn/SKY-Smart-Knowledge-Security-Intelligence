/**
 * Video analyzer — uses Gemini 1.5 Flash (video) via the provider orchestrator.
 * Gemini is the ONLY provider that supports inline video data URLs.
 *
 * If GEMINI_API_KEY is not set, this throws with a
 * clear actionable error.
 */
import { analyzeVideoWithProviders } from "./providers";
import { mapCategory, retrieveEvidence, type RagEvidence } from "./rag";

export interface VideoAnalysisResult {
  categories: string[];
  riskLevel: "low" | "moderate" | "high" | "critical";
  confidence: number;
  explanation: string;
  evidence: RagEvidence[];
  rawResponse: string;
  provider: string;
}

const VIDEO_PROMPT = `You are SKY, a security-intelligence analyst reviewing surveillance / user-uploaded video for an AI-assisted decision-support platform. Your output is advisory and will be reviewed by a human.

Examine the video clip for any of the following security-relevant activities:
- violence, physical assault, brawl, raised weapons, active shooter
- theft, snatch-theft (e.g. motorcycle grab-and-run), shoplifting, pickpocketing
- unauthorized-entry, intrusion, perimeter breach, tailgating
- fire, smoke, arson
- accident, vehicle collision, hit-and-run, pedestrian struck
- fraud cues (skimming devices, hardware tampering)
- deepfake / manipulated-media cues (lip-sync mismatch, uncanny facial geometry)

Respond with STRICT JSON only (no markdown, no prose). Use this exact schema:
{
  "categories": ["array of one-word category labels, lowercase kebab-case; empty array if nothing suspicious"],
  "riskLevel": "low | moderate | high | critical",
  "confidence": "number 0-1 indicating your confidence",
  "explanation": "2-4 sentences describing the timeline of events you observed in the video, including approximate timing of any suspicious activity."
}

If the video shows nothing concerning, return {"categories":[],"riskLevel":"low","confidence":0.1,"explanation":"No security-relevant activity detected in this video."}`;

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
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
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

export async function analyzeVideo(
  videoDataUrl: string
): Promise<VideoAnalysisResult> {
  const { response: raw, provider } = await analyzeVideoWithProviders(
    videoDataUrl,
    VIDEO_PROMPT
  );
  const parsed = parseVlmJson(raw);
  const categories = (parsed.categories ?? []).map((c) => c.toLowerCase());
  const riskLevel = normalizeRisk(parsed.riskLevel);
  const confidence = Number(parsed.confidence ?? 0.3) || 0.3;
  const explanation =
    parsed.explanation ??
    "AI analysis did not return a structured explanation.";

  const evidence = await retrieveEvidence({
    modality: "video",
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
