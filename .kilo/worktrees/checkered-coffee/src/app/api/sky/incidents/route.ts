/** GET /api/sky/incidents — list with filters; POST not needed (use analyze/*). */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Incident } from "@/lib/models/incident";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const modality = searchParams.get("modality");
    const risk = searchParams.get("risk");
    const reviewStatus = searchParams.get("reviewStatus");
    const q = searchParams.get("q");
    const limit = Number(searchParams.get("limit") ?? 100);
    const skip = Number(searchParams.get("skip") ?? 0);

    const filter: Record<string, unknown> = {};
    if (modality) filter.modality = modality;
    if (risk) filter.riskLevel = risk;
    if (reviewStatus) filter.reviewStatus = reviewStatus;
    if (q) {
      filter.$or = [
        { caseId: { $regex: q, $options: "i" } },
        { explanation: { $regex: q, $options: "i" } },
        { detectedCategories: { $regex: q, $options: "i" } },
        { transcript: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Incident.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(limit, 200))
        .lean(),
      Incident.countDocuments(filter),
    ]);

    return NextResponse.json({ incidents: items, total });
  } catch (err) {
    console.error("[api/incidents] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
