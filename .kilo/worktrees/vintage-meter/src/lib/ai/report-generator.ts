/**
 * Report generator — uses Groq Llama → OpenAI GPT-4o-mini → Gemini Flash
 * to compose a formal incident report from one or more SKY incidents.
 */
import { chatWithProviders } from "./providers";
import type { IncidentDoc } from "@/lib/models/incident";

export interface GeneratedReport {
  title: string;
  summary: string;
  fullReport: string;
  recommendations: string[];
  riskProfile: "low" | "moderate" | "high" | "critical";
}

const SYSTEM_PROMPT = `You are SKY's automated report composer. Given one or more incident records (modality, categories, risk level, AI explanation, transcript, evidence, review status), produce a formal security-incident report.

Output STRICT JSON only — no markdown fences, no prose. Use this schema:
{
  "title": "short title, ≤10 words, mention modality and primary category",
  "summary": "2-3 sentence executive summary",
  "fullReport": "structured markdown report with sections: ## Background, ## Findings, ## Evidence Reviewed, ## Risk Assessment, ## Next Steps. Quote specific phrases where relevant.",
  "recommendations": ["3-5 bullet-string actionable recommendations"],
  "riskProfile": "low | moderate | high | critical"
}`;

interface LLMJson {
  title?: string;
  summary?: string;
  fullReport?: string;
  recommendations?: string[];
  riskProfile?: string;
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

function normalizeRisk(v: string | undefined) {
  const r = (v ?? "moderate").toLowerCase();
  if (r.includes("crit")) return "critical" as const;
  if (r.includes("high")) return "high" as const;
  if (r.includes("mod")) return "moderate" as const;
  return "low" as const;
}

export async function generateIncidentReport(
  incidents: IncidentDoc[]
): Promise<GeneratedReport> {
  if (incidents.length === 0) {
    return {
      title: "Empty Incident Report",
      summary: "No incidents were provided to compose a report.",
      fullReport: "No content.",
      recommendations: [],
      riskProfile: "low",
    };
  }

  const compact = incidents.map((i) => ({
    caseId: i.caseId,
    modality: i.modality,
    source: i.source,
    location: i.location,
    categories: i.detectedCategories,
    risk: i.riskLevel,
    confidence: i.confidence,
    explanation: i.explanation,
    transcript: i.transcript ? i.transcript.slice(0, 500) : undefined,
    evidence: (i.evidence ?? []).map((e) => e.title),
    reviewStatus: i.reviewStatus,
    createdAt: i.createdAt,
  }));

  const { response: raw } = await chatWithProviders(
    SYSTEM_PROMPT,
    `Incident data:\n${JSON.stringify(compact, null, 2)}`
  );
  const parsed = parseLlmJson(raw);

  return {
    title: parsed.title ?? `SKY Incident Report — ${incidents.length} case(s)`,
    summary:
      parsed.summary ??
      `Report covering ${incidents.length} incident(s) spanning modalities ${[
        ...new Set(incidents.map((i) => i.modality)),
      ].join(", ")}.`,
    fullReport: parsed.fullReport ?? "(LLM did not return a full report body.)",
    recommendations: parsed.recommendations ?? [],
    riskProfile: normalizeRisk(parsed.riskProfile),
  };
}
