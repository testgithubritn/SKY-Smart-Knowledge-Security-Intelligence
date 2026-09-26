/** GET /api/sky/knowledge — list knowledge sources. POST — add new source. */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Knowledge } from "@/lib/models/knowledge";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const modality = searchParams.get("modality");
    const q = searchParams.get("q");

    const filter: Record<string, unknown> = { isPublished: true };
    if (category) filter.category = category;
    if (modality) filter.modality = modality;
    if (q) {
      filter.$text = { $search: q };
    }

    const items = await Knowledge.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ knowledge: items, total: items.length });
  } catch (err) {
    console.error("[api/knowledge GET] error:", err);
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
    if (!body || !body.title || !body.content) {
      return NextResponse.json(
        { error: "Missing title or content." },
        { status: 400 }
      );
    }
    const created = await Knowledge.create({
      title: body.title,
      content: body.content,
      category: body.category ?? "other",
      modality: body.modality ?? "any",
      keywords: body.keywords ?? [],
      severityHint: body.severityHint ?? "moderate",
      source: body.source ?? "custom",
      isPublished: body.isPublished ?? true,
    });
    return NextResponse.json({ knowledge: created });
  } catch (err) {
    console.error("[api/knowledge POST] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
