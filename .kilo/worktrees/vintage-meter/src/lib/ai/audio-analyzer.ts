/**
 * Audio analyzer — two-stage:
 *  1. ASR (Groq Whisper-large-v3 → OpenAI Whisper-1 fallback)
 *  2. LLM classification (Groq Llama-3.3-70b → OpenAI GPT-4o-mini → Gemini Flash)
 *
 * The provider orchestrator picks the best available
 * provider and throws a clear error if no API key is configured.
 */
import {
  transcribeAudioWithProviders,
  chatWithProviders,
} from "./providers";
import { mapCategory, retrieveEvidence, type RagEvidence } from "./rag";

export interface AudioAnalysisResult {
  transcript: string;
  categories: string[];
  riskLevel: "low" | "moderate" | "high" | "critical";
  confidence: number;
  explanation: string;
  subjects: Array<{
    claimedName: string;
    claimedRole: string;
    isImpersonated: boolean;
    notes: string;
  }>;
  evidence: RagEvidence[];
  rawResponse: string;
  asrProvider: string;
  llmProvider: string;
}

const AUDIO_LLM_SYSTEM_PROMPT = `You are SKY, a security-intelligence analyst reviewing transcribed phone calls / voice notes for an AI-assisted decision-support platform. Your output is advisory and will be reviewed by a human.

OPERATING REGION: Telangana state, India. Common jurisdictions referenced by genuine officials:
- Cyberabad Police (West Hyderabad: Hitech City, Madhapur, Kukatpally, Kondapur, Gachibowli)
- Hyderabad City Police (Old City, Abids, Charminar, Koti, Begumpet)
- Rachakonda Police (East Hyderabad: LB Nagar, Uppal, Nacharam, Ghatkesar)
- Warangal/Sangareddy/Karimnagar local police
Genuine Telangana officials never demand money or OTPs over phone. Real police summons come via written notice.

Examine the transcript carefully for any of the following security-relevant patterns:
- payment-fraud (urgent money transfer, OTP request, "send 1 to verify", impersonated bank official)
- scam (refund scam, lottery scam, tech-support scam, fake customer-service impersonation)
- impersonation (caller claims to be SI/CI/Inspector/Collector/Judge/CBI/customs officer)
- threat / extortion / ransom demand
- misleading-info (false claims, fake news, market manipulation intent)
- voice-clone / synthetic-voice cues (rehearsed cadence, no breath sounds, uncanny consistency)
- information-exfiltration attempts (asking for Aadhaar, PAN, OTP, passwords, account numbers)

Respond with STRICT JSON only (no markdown, no prose). Use this exact schema:
{
  "categories": ["array of one-word category labels, lowercase kebab-case; empty array if nothing suspicious"],
  "riskLevel": "low | moderate | high | critical",
  "confidence": "number 0-1 indicating your confidence",
  "explanation": "3-5 sentences quoting specific phrases from the transcript that triggered your classification and explaining the reasoning.",
  "subjects": [
    {
      "claimedName": "the name the caller identifies themselves with or is called by (e.g. 'SI Krishna Reddy', 'Srinivas', 'Vijay Babu'). If the caller only gives a role with no name, use the role as the claimedName.",
      "claimedRole": "the role/authority they claim (e.g. 'cybercrime-sub-inspector', 'amazon-support', 'district-collector', 'microsoft-support', 'son', 'bank-official')",
      "isImpersonated": true if the caller is impersonating an authority figure or someone they are not, false otherwise,
      "notes": "short note on this subject's role in THIS incident"
    }
  ]
}

If the transcript is benign, return {"categories":[],"riskLevel":"low","confidence":0.1,"explanation":"No suspicious or fraudulent content identified in the transcript.","subjects":[]}`;

interface LLMJson {
  categories?: string[];
  riskLevel?: string;
  confidence?: number;
  explanation?: string;
  subjects?: Array<{
    claimedName: string;
    claimedRole: string;
    isImpersonated: boolean;
    notes: string;
  }>;
}

function parseLlmJson(raw: string): LLMJson {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  try {
    return JSON.parse(s) as LLMJson;
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

/** Transcribe audio only — used when the caller already has the LLM classification prompt. */
export async function transcribeAudioBase64(
  base64Audio: string
): Promise<{ transcript: string; provider: string }> {
  return transcribeAudioWithProviders(base64Audio);
}

/** Full audio analysis: ASR + LLM classification + RAG evidence. */
export async function analyzeAudio(
  base64Audio: string
): Promise<AudioAnalysisResult> {
  // Stage 1: ASR
  const { transcript, provider: asrProvider } =
    await transcribeAudioWithProviders(base64Audio);
  if (!transcript) {
    return {
      transcript: "",
      categories: [],
      riskLevel: "low",
      confidence: 0.1,
      explanation: "ASR returned an empty transcript. Cannot analyze further.",
      subjects: [],
      evidence: [],
      rawResponse: "",
      asrProvider,
      llmProvider: "",
    };
  }

  // Stage 2: LLM classification
  const { response: raw, provider: llmProvider } = await chatWithProviders(
    AUDIO_LLM_SYSTEM_PROMPT,
    `Transcript:\n"""${transcript}"""`
  );

  const parsed = parseLlmJson(raw);
  const categories = (parsed.categories ?? []).map((c) => c.toLowerCase());
  const riskLevel = normalizeRisk(parsed.riskLevel);
  const confidence = Number(parsed.confidence ?? 0.3) || 0.3;
  const explanation =
    parsed.explanation ??
    "AI analysis did not return a structured explanation.";
  const subjects = parsed.subjects ?? [];

  // Stage 3: RAG retrieval
  const evidence = await retrieveEvidence({
    modality: "audio",
    categories: categories.map(mapCategory),
    transcript,
    explanation,
  });

  return {
    transcript,
    categories,
    riskLevel,
    confidence,
    explanation,
    subjects,
    evidence,
    rawResponse: raw,
    asrProvider,
    llmProvider,
  };
}
