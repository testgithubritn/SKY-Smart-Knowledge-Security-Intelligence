/** PATCH /api/sky/incidents/[id] — update review status / notes / reviewer. */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Incident } from "@/lib/models/incident";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (body.reviewStatus) update.reviewStatus = body.reviewStatus;
    if (typeof body.reviewer === "string") update.reviewer = body.reviewer;
    if (typeof body.reviewerNote === "string")
      update.reviewerNote = body.reviewerNote;
    update.reviewedAt = new Date();

    const updated = await Incident.findByIdAndUpdate(id, { $set: update }, {
      new: true,
    }).lean();

    if (!updated) {
      return NextResponse.json(
        { error: "Incident not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ incident: updated });
  } catch (err) {
    console.error("[api/incidents/[id] PATCH] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
