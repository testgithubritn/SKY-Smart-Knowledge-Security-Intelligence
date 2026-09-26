/** GET /api/sky/providers — returns the availability status of each AI provider. */
import { NextResponse } from "next/server";
import { getProviderStatus } from "@/lib/ai/providers";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getProviderStatus());
}
