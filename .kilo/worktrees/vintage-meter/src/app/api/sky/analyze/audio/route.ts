/** POST /api/sky/analyze/audio
 * Accepts: { audio: <base64 or data URL>, source?: string, location?: string, transcript?: string }
 * If `transcript` is provided, ASR is skipped (used for demo scenarios).
 * The LLM is asked to ALSO extract any named persons (claimed names + roles)
 * from the transcript — these are persisted as Subject records and linked
 * to the new Incident. Historical context is fetched and attached.
 *
 *
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Incident, type IncidentDoc } from "@/lib/models/incident";
import { Subject } from "@/lib/models/subject";
import {
  transcribeAudioWithProviders,
  chatWithProviders,
} from "@/lib/ai/providers";
import { mapCategory, retrieveEvidence } from "@/lib/ai/rag";
import { getHistoricalContext } from "@/lib/ai/historical-context";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for ASR + LLM

function shortId() {
  return "SKY-AUD-" + Math.random().toString(36).slice(2, 8).toUpperCase();
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

function normalizeRisk(v: string | undefined) {
  const r = (v ?? "low").toLowerCase();
  if (r.includes("crit")) return "critical" as const;
  if (r.includes("high")) return "high" as const;
  if (r.includes("mod")) return "moderate" as const;
  return "low" as const;
}

async function upsertSubject(
  claimedName: string,
  claimedRole: string,
  isImpersonated: boolean,
  notes: string,
  incidentCaseId: string,
  incidentId: string,
  location: string,
  modality: string,
  categories: string[],
  riskLevel: string
) {
  if (!claimedName?.trim()) return null;
  const existing = await Subject.findOne({
    claimedName: { $regex: `^${claimedName.trim()}$`, $options: "i" },
  });

  const appearance = {
    caseId: incidentCaseId,
    incidentId,
    role: claimedRole,
    isImpersonated,
    notes: notes || "",
    seenAt: new Date(),
  };

  if (existing) {
    const locations = new Set<string>(existing.locations ?? []);
    if (location && location !== "unknown") locations.add(location);
    const rolesClaimed = new Set<string>(existing.rolesClaimed ?? []);
    if (claimedRole) rolesClaimed.add(claimedRole);
    const cats = new Set<string>(existing.categories ?? []);
    for (const c of categories) cats.add(c);
    const modalities = new Set<string>(existing.modalities ?? []);
    modalities.add(modality);
    const isRepeat = (existing.totalIncidents ?? 0) + 1 >= 2;
    const updated = await Subject.findByIdAndUpdate(
      existing._id,
      {
        $set: {
          isRepeatOffender: isRepeat,
          lastSeenCaseId: incidentCaseId,
          lastSeenAt: new Date(),
          totalIncidents: (existing.totalIncidents ?? 0) + 1,
          locations: Array.from(locations),
          rolesClaimed: Array.from(rolesClaimed),
          categories: Array.from(cats),
          modalities: Array.from(modalities),
          riskProfile:
            ["low", "moderate", "high", "critical"].indexOf(riskLevel) >
            ["low", "moderate", "high", "critical"].indexOf(
              existing.riskProfile ?? "moderate"
            )
              ? riskLevel
              : existing.riskProfile,
        },
        $push: { appearances: appearance as never },
      },
      { new: true }
    ).lean();
    return updated;
  }

  const subjectId =
    "SUBJ-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const created = await Subject.create({
    subjectId,
    claimedName: claimedName.trim(),
    rolesClaimed: claimedRole ? [claimedRole] : [],
    isImpersonated,
    isRepeatOffender: false,
    locations: location && location !== "unknown" ? [location] : [],
    modalities: [modality],
    categories,
    firstSeenCaseId: incidentCaseId,
    firstSeenAt: new Date(),
    lastSeenCaseId: incidentCaseId,
    lastSeenAt: new Date(),
    totalIncidents: 1,
    riskProfile: riskLevel,
    status: "active",
    appearances: [appearance],
    notes: "",
  });
  return created;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    await connectDB();

    let transcript = "";
    let rawResponse = "";
    let asrProvider = "";
    let llmProvider = "";

    if (typeof body.transcript === "string" && body.transcript.trim()) {
      // Demo mode: skip ASR, use provided transcript directly.
      transcript = body.transcript.trim();
      // LLM classification with subject extraction
      const chatResult = await chatWithProviders(
        AUDIO_LLM_SYSTEM_PROMPT,
        `Transcript:\n"""${transcript}"""`
      );
      rawResponse = chatResult.response;
      llmProvider = chatResult.provider;
    } else if (body.audio) {
      // Real audio mode: run ASR first via Groq/OpenAI.
      const base64 = body.audio.startsWith("data:")
        ? body.audio.split(",")[1]
        : body.audio;
      const audioInput = body.audio.startsWith("data:")
        ? body.audio
        : `data:audio/wav;base64,${body.audio}`;
      const asrResult = await transcribeAudioWithProviders(audioInput);
      transcript = asrResult.transcript;
      asrProvider = asrResult.provider;
      // Then LLM classification
      const chatResult = await chatWithProviders(
        AUDIO_LLM_SYSTEM_PROMPT,
        `Transcript:\n"""${transcript}"""`
      );
      rawResponse = chatResult.response;
      llmProvider = chatResult.provider;
    } else {
      return NextResponse.json(
        { error: "Either 'audio' or 'transcript' is required." },
        { status: 400 }
      );
    }

    // Parse LLM classification
    const parsed = parseLlmJson(rawResponse);
    const categories = (parsed.categories ?? []).map((c) => c.toLowerCase());
    const riskLevel = normalizeRisk(parsed.riskLevel);
    const confidence = Number(parsed.confidence ?? 0.3) || 0.3;
    const explanation =
      parsed.explanation ??
      "AI analysis did not return a structured explanation.";
    const llmSubjects = parsed.subjects ?? [];

    // RAG retrieval
    const evidence = await retrieveEvidence({
      modality: "audio",
      categories: categories.map(mapCategory),
      transcript,
      explanation,
    });

    const location = body.location ?? "unknown";
    const caseId = shortId();

    // First, fetch historical context (BEFORE creating the new incident
    // so the snapshot excludes this incident itself)
    const historicalContext = await getHistoricalContext(
      location,
      categories.map(mapCategory)
    );

    const doc: Partial<IncidentDoc> = {
      caseId,
      modality: "audio",
      source: body.source ?? "voip-call",
      location,
      inputRef:
        typeof body.audio === "string"
          ? body.audio.startsWith("data:")
            ? body.audio
            : `data:audio/wav;base64,${body.audio}`
          : "demo-transcript",
      previewRef: "",
      transcript,
      detectedCategories: categories,
      riskLevel,
      confidence,
      explanation,
      evidence,
      subjects: [],
      historicalContext,
      reviewStatus: "pending",
      alerts: {
        email: ["high", "critical"].includes(riskLevel),
        sms: riskLevel === "critical",
        webhook: ["high", "critical"].includes(riskLevel),
      },
      tags: categories.map(mapCategory),
    };

    const incident = await Incident.create(doc);
    const incidentId = (incident._id as { toString(): string }).toString();

    // Upsert subjects — for each named person in the transcript
    const subjectRefs: Array<{
      subjectId: string;
      claimedName: string;
      role: string;
      isImpersonated: boolean;
      notes: string;
    }> = [];

    for (const s of llmSubjects) {
      const updated = await upsertSubject(
        s.claimedName,
        s.claimedRole,
        s.isImpersonated,
        s.notes,
        caseId,
        incidentId,
        location,
        "audio",
        categories,
        riskLevel
      );
      if (updated) {
        subjectRefs.push({
          subjectId: updated.subjectId,
          claimedName: updated.claimedName,
          role: s.claimedRole,
          isImpersonated: s.isImpersonated,
          notes: s.notes || "",
        });
      }
    }

    // Link subjects back to the incident
    if (subjectRefs.length > 0) {
      await Incident.findByIdAndUpdate(incidentId, {
        $set: { subjects: subjectRefs },
      });
      incident.subjects = subjectRefs as never;
    }

    // Attach provider info for transparency
    (incident as unknown as { aiProviders: { asr: string; llm: string } }).aiProviders = {
      asr: asrProvider,
      llm: llmProvider,
    };

    return NextResponse.json({ incident });
  } catch (err) {
    console.error("[api/analyze/audio] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
