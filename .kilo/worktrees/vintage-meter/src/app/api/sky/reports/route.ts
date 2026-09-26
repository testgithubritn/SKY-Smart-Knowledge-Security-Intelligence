/** GET /api/sky/reports — list reports. POST — generate a new report. */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Incident } from "@/lib/models/incident";
import { Report } from "@/lib/models/report";
import { generateIncidentReport } from "@/lib/ai/report-generator";

export const runtime = "nodejs";
export const maxDuration = 90;

function shortId() {
  return "SKY-RPT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? 50);
    const items = await Report.find()
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean();
    return NextResponse.json({ reports: items, total: items.length });
  } catch (err) {
    console.error("[api/reports GET] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.incidentIds)) {
      return NextResponse.json(
        { error: "Body must include incidentIds array." },
        { status: 400 }
      );
    }

    const incidents = await Incident.find({
      _id: { $in: body.incidentIds },
    }).lean();

    if (incidents.length === 0) {
      return NextResponse.json(
        { error: "No matching incidents found." },
        { status: 404 }
      );
    }

    const generated = await generateIncidentReport(incidents);
    const report = await Report.create({
      reportId: shortId(),
      title: generated.title,
      incidentIds: incidents.map((i) => i.caseId),
      summary: generated.summary,
      fullReport: generated.fullReport,
      recommendations: generated.recommendations,
      riskProfile: generated.riskProfile,
      generatedBy: "SKY-AI",
      status: "draft",
    });

    return NextResponse.json({ report });
  } catch (err) {
    console.error("[api/reports POST] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
