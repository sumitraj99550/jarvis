import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { generateDailyBriefing } from "@/lib/briefing/generate";

export const dynamic = "force-dynamic";

/**
 * POST /api/briefings/generate
 * Generates a briefing on demand — same real aggregation + Gemini call the
 * scheduled 8 AM UTC worker job uses, just triggered immediately instead of
 * waiting for the cron.
 */
export async function POST() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const { id, summary, stats } = await generateDailyBriefing();
    return NextResponse.json(
      { briefing: { id, summary, stats, createdAt: new Date().toISOString() } },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to generate briefing.",
      },
      { status: 502 },
    );
  }
}
