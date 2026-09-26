/** POST /api/sky/analyze/video
 * Accepts: { video: <data URL or http URL>, source?: string, location?: string }
 * Returns: the created Incident document with historical context attached.
 *
 * Uses Gemini 1.5 Flash (video)
 * Gemini is the ONLY provider that supports inline video data URLs.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Incident, type IncidentDoc } from "@/lib/models/incident";
import { analyzeVideo } from "@/lib/ai/video-analyzer";
import { mapCategory } from "@/lib/ai/rag";
import { getHistoricalContext } from "@/lib/ai/historical-context";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for video analysis
export const dynamic = "force-dynamic"; // bypass body size cache for large video uploads

function shortId() {
  return "SKY-VID-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.video) {
      return NextResponse.json(
        { error: "Missing 'video' field (data URL or HTTP URL)." },
        { status: 400 }
      );
    }

    await connectDB();
    const result = await analyzeVideo(body.video);

    const categories = result.categories.map(mapCategory);
    const location = body.location ?? "unknown";
    const historicalContext = await getHistoricalContext(location, categories);

    const doc: Partial<IncidentDoc> = {
      caseId: shortId(),
      modality: "video",
      source: body.source ?? "manual-upload",
      location,
      inputRef: body.video,
      previewRef: body.preview ?? "",
      detectedCategories: result.categories,
      riskLevel: result.riskLevel,
      confidence: result.confidence,
      explanation: result.explanation,
      evidence: result.evidence,
      subjects: [],
      historicalContext,
      reviewStatus: "pending",
      alerts: {
        email: ["high", "critical"].includes(result.riskLevel),
        sms: result.riskLevel === "critical",
        webhook: ["high", "critical"].includes(result.riskLevel),
      },
      tags: categories,
    };

    const incident = await Incident.create(doc);
    (incident as unknown as { aiProvider: string }).aiProvider = result.provider;
    return NextResponse.json({ incident });
  } catch (err) {
    console.error("[api/analyze/video] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
