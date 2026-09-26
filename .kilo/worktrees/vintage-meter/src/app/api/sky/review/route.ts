/** GET /api/sky/review — list pending-review incidents, highest-risk first. */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Incident } from "@/lib/models/incident";

export const runtime = "nodejs";

const RISK_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  low: 3,
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "pending";
    const limit = Number(searchParams.get("limit") ?? 50);

    const items = await Incident.find({ reviewStatus: status })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean();

    // Sort by risk severity (critical first)
    items.sort((a, b) => {
      const ra = RISK_ORDER[a.riskLevel] ?? 9;
      const rb = RISK_ORDER[b.riskLevel] ?? 9;
      if (ra !== rb) return ra - rb;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return NextResponse.json({ incidents: items, total: items.length });
  } catch (err) {
    console.error("[api/review] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
