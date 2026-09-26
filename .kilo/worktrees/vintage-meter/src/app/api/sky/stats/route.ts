/** GET /api/sky/stats — aggregate dashboard stats. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Incident } from "@/lib/models/incident";
import { Knowledge } from "@/lib/models/knowledge";
import { Report } from "@/lib/models/report";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();

    const [
      totalIncidents,
      pending,
      approved,
      rejected,
      escalated,
      criticalCount,
      knowledgeCount,
      reportsCount,
      modalityCounts,
      riskCounts,
      recent,
    ] = await Promise.all([
      Incident.countDocuments(),
      Incident.countDocuments({ reviewStatus: "pending" }),
      Incident.countDocuments({ reviewStatus: "approved" }),
      Incident.countDocuments({ reviewStatus: "rejected" }),
      Incident.countDocuments({ reviewStatus: "escalated" }),
      Incident.countDocuments({ riskLevel: "critical" }),
      Knowledge.countDocuments({ isPublished: true }),
      Report.countDocuments(),
      Incident.aggregate([
        { $group: { _id: "$modality", count: { $sum: 1 } } },
      ]),
      Incident.aggregate([
        { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
      ]),
      Incident.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const modality = modalityCounts.reduce<Record<string, number>>(
      (acc, x) => {
        acc[x._id] = x.count;
        return acc;
      },
      {}
    );
    const risk = riskCounts.reduce<Record<string, number>>((acc, x) => {
      acc[x._id] = x.count;
      return acc;
    }, {});

    return NextResponse.json({
      totals: {
        incidents: totalIncidents,
        pending,
        approved,
        rejected,
        escalated,
        critical: criticalCount,
        knowledge: knowledgeCount,
        reports: reportsCount,
      },
      modality,
      risk,
      recentIncidents: recent,
    });
  } catch (err) {
    console.error("[api/stats] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
