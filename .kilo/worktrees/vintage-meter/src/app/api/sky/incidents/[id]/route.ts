/** GET /api/sky/incidents/[id] — fetch single incident. */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Incident } from "@/lib/models/incident";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const incident = await Incident.findById(id).lean();
    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ incident });
  } catch (err) {
    console.error("[api/incidents/[id]] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
